/**
 * HNSA — Brute Force Protection
 *
 * Progressive account lockout on failed authentication attempts.
 * Lock levels: 0=none → 1=5min → 2=15min → 3=1h → 4=24h → 5=permanent
 *
 * Uses AccountLockout model in database for persistence.
 *
 * @module hnsa/brute-force
 */

import { db } from '@/lib/db';
import { logAudit, AUDIT_ACTIONS } from './audit';
import { createSIEMEvent, forwardToSIEM } from './siem';

// ===== Lock Level Configuration =====

/**
 * Progressive lockout levels based on cumulative failed login attempts.
 * Each level defines a threshold (maxAttempts) and a lockout duration.
 * Once an account reaches level 5, only admin intervention can unlock it.
 */
export const LOCK_LEVELS = [
  { level: 0, maxAttempts: 0,  durationMs: 0 },                        // no lock
  { level: 1, maxAttempts: 3,  durationMs: 5 * 60_000 },                // 5 min
  { level: 2, maxAttempts: 6,  durationMs: 15 * 60_000 },               // 15 min
  { level: 3, maxAttempts: 10, durationMs: 60 * 60_000 },               // 1 hour
  { level: 4, maxAttempts: 15, durationMs: 24 * 60 * 60_000 },          // 24 hours
  { level: 5, maxAttempts: 20, durationMs: Infinity },                   // permanent (admin unlock only)
] as const;

// ===== In-Memory Cache =====

/** Cached lock status entry for fast checks without hitting the database. */
interface CacheEntry {
  /** Whether the account is currently locked. */
  locked: boolean;
  /** Unix timestamp (ms) when this cache entry should be considered stale. */
  expiresAt: number;
}

/** In-memory cache with 1-minute TTL for fast lock checks. Database is the source of truth. */
const lockCache = new Map<string, CacheEntry>();

/** Cache TTL in milliseconds (1 minute). */
const CACHE_TTL_MS = 60_000;

/**
 * Get a cached lock status for the given email.
 * Returns `null` if not cached or if the entry has expired.
 */
function getCachedLock(email: string): CacheEntry | null {
  const entry = lockCache.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    lockCache.delete(email);
    return null;
  }
  return entry;
}

/**
 * Store a lock status in the in-memory cache.
 */
function setCacheLock(email: string, locked: boolean): void {
  lockCache.set(email, {
    locked,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Remove a lock status from the in-memory cache.
 */
function clearCacheLock(email: string): void {
  lockCache.delete(email);
}

// ===== Helper Functions =====

/**
 * Determine the lock level based on the number of failed attempts.
 * Walks the LOCK_LEVELS array from highest to lowest to find the
 * appropriate level for the given attempt count.
 *
 * @param failedAttempts - Total number of cumulative failed attempts.
 * @returns The lock level configuration that applies.
 */
function getLockLevel(failedAttempts: number): (typeof LOCK_LEVELS)[number] {
  let current = LOCK_LEVELS[0];
  for (const config of LOCK_LEVELS) {
    if (failedAttempts >= config.maxAttempts) {
      current = config;
    }
  }
  return current;
}

/**
 * Calculate how many more attempts the account has before it escalates
 * to the next lock level.
 *
 * @param failedAttempts - Total number of cumulative failed attempts so far.
 * @returns Number of remaining attempts before the next lockout.
 */
function getRemainingAttempts(failedAttempts: number): number {
  // Find the next level above the current one
  const currentLevel = getLockLevel(failedAttempts);
  const nextIndex = currentLevel.level + 1;
  if (nextIndex >= LOCK_LEVELS.length) {
    return 0; // Already at max level
  }
  const nextLevel = LOCK_LEVELS[nextIndex];
  return Math.max(0, nextLevel.maxAttempts - failedAttempts);
}

// ===== Exported Types =====

/** Result returned by {@link recordFailedLogin}. */
export interface RecordFailedLoginResult {
  /** Whether the account is now locked. */
  locked: boolean;
  /** The current lock level (0–5). */
  lockLevel: number;
  /** When the lock expires (absent if not locked or permanent). */
  lockedUntil?: Date;
  /** Number of remaining attempts before the next lock escalation. */
  remainingAttempts: number;
}

/** Result returned by {@link isAccountLocked}. */
export interface IsAccountLockedResult {
  /** Whether the account is currently locked. */
  locked: boolean;
  /** When the lock expires (absent if not locked or permanent). */
  lockedUntil?: Date;
  /** The current lock level (0–5). */
  lockLevel: number;
  /** Number of remaining attempts before the next lock escalation. */
  remainingAttempts: number;
}

/** Full lockout status for admin display. */
export interface LockoutStatus {
  /** Total number of failed attempts recorded. */
  failedAttempts: number;
  /** Current lock level (0–5). */
  lockLevel: number;
  /** When the lock expires, or `null` if not locked. */
  lockedUntil: Date | null;
  /** Timestamp of the last failed attempt. */
  lastAttemptAt: Date;
}

// ===== Exported Functions =====

/**
 * Record a failed login attempt for the given email.
 *
 * Finds or creates an `AccountLockout` record, increments the failed attempt
 * counter, and escalates the lock level if a threshold has been crossed.
 * If the lock level escalates, the account is locked and audit events are fired
 * (`BRUTE_FORCE_DETECTED` and `ACCOUNT_LOCKED`).
 *
 * @param email - The email address for which the login attempt failed.
 * @param ip - The client IP address (used for audit logging).
 * @returns The updated lock status. See {@link RecordFailedLoginResult}.
 *
 * @example
 * ```ts
 * const result = await recordFailedLogin('user@example.com', '192.168.1.1');
 * if (result.locked) {
 *   return NextResponse.json({ error: 'Account locked' }, { status: 423 });
 * }
 * ```
 */
export async function recordFailedLogin(
  email: string,
  ip: string,
): Promise<RecordFailedLoginResult> {
  // Upsert the lockout record
  const lockout = await db.accountLockout.upsert({
    where: { email },
    create: {
      email,
      userId: email, // email as placeholder; userId can be updated when user is known
      failedAttempts: 1,
      lastAttemptAt: new Date(),
      lockLevel: 0,
    },
    update: {
      failedAttempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  // Calculate new lock level
  const newLevelConfig = getLockLevel(lockout.failedAttempts);
  const previousLevel = lockout.lockLevel;
  const escalated = newLevelConfig.level > previousLevel;

  let lockedUntil: Date | null = null;

  if (escalated && newLevelConfig.level > 0) {
    // Set lock duration
    if (newLevelConfig.durationMs === Infinity) {
      // Permanent lock — set far future date as sentinel
      lockedUntil = new Date('2099-12-31T23:59:59.999Z');
    } else {
      lockedUntil = new Date(Date.now() + newLevelConfig.durationMs);
    }

    await db.accountLockout.update({
      where: { email },
      data: {
        lockLevel: newLevelConfig.level,
        lockedUntil,
      },
    });

    // Audit: brute force detected
    logAudit({
      actorEmail: email,
      action: AUDIT_ACTIONS.SECURITY.BRUTE_FORCE_DETECTED,
      resource: 'user',
      resourceId: lockout.userId,
      ip,
      outcome: 'failure',
      details: {
        failedAttempts: lockout.failedAttempts,
        newLockLevel: newLevelConfig.level,
        lockDuration: newLevelConfig.durationMs === Infinity
          ? 'permanent'
          : `${newLevelConfig.durationMs / 1000}s`,
      },
    });

    // SIEM: account lockout (critical)
    forwardToSIEM(createSIEMEvent({
      type: 'ACCOUNT_LOCKOUT',
      severity: 'critical',
      ip,
      metadata: {
        action: 'ACCOUNT_LOCKED',
        email,
        lockLevel: newLevelConfig.level,
        failedAttempts: lockout.failedAttempts,
        lockedUntil: lockedUntil.toISOString(),
      },
    })).catch(() => {});

    // Audit: account locked
    logAudit({
      actorEmail: email,
      action: AUDIT_ACTIONS.SECURITY.ACCOUNT_LOCKED,
      resource: 'user',
      resourceId: lockout.userId,
      ip,
      outcome: 'denied',
      details: {
        lockLevel: newLevelConfig.level,
        lockedUntil: lockedUntil.toISOString(),
        failedAttempts: lockout.failedAttempts,
      },
    });
  }

  // SIEM: auth failure on 3rd+ failed attempt (non-blocking)
  if (lockout.failedAttempts >= 3) {
    forwardToSIEM(createSIEMEvent({
      type: 'AUTH_FAILURE',
      severity: 'warning',
      ip,
      metadata: {
        action: 'LOGIN_FAILURE',
        email,
        failedAttempts: lockout.failedAttempts,
        locked: escalated && newLevelConfig.level > 0,
      },
    })).catch(() => {});
  }

  const isLocked = escalated && newLevelConfig.level > 0;

  // Update cache
  setCacheLock(email, isLocked);

  return {
    locked: isLocked,
    lockLevel: newLevelConfig.level,
    lockedUntil: lockedUntil ?? undefined,
    remainingAttempts: getRemainingAttempts(lockout.failedAttempts),
  };
}

/**
 * Record a successful login, resetting all lockout counters for the account.
 *
 * Clears `failedAttempts`, `lockLevel`, and `lockedUntil`. Logs a
 * `LOGIN_SUCCESS` audit event.
 *
 * @param email - The email address of the user who logged in successfully.
 *
 * @example
 * ```ts
 * await recordSuccessfulLogin(user.email);
 * ```
 */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  await db.accountLockout.updateMany({
    where: { email },
    data: {
      failedAttempts: 0,
      lockLevel: 0,
      lockedUntil: null,
    },
  });

  // Clear the cache entry
  clearCacheLock(email);

  // Audit: successful login (counter-event to brute force)
  logAudit({
    actorEmail: email,
    action: AUDIT_ACTIONS.AUTH.LOGIN_SUCCESS,
    resource: 'user',
    outcome: 'success',
    details: { lockoutReset: true },
  });
}

/**
 * Check whether an account is currently locked.
 *
 * First checks the in-memory cache (1-minute TTL) for speed. If not cached
 * or cached as locked, falls back to the database. If the lock period has
 * expired, the account is automatically unlocked.
 *
 * @param email - The email address to check.
 * @returns The current lock status. See {@link IsAccountLockedResult}.
 *
 * @example
 * ```ts
 * const status = await isAccountLocked('user@example.com');
 * if (status.locked) {
 *   return NextResponse.json(
 *     { error: 'Account locked', lockedUntil: status.lockedUntil },
 *     { status: 423 },
 *   );
 * }
 * ```
 */
export async function isAccountLocked(
  email: string,
): Promise<IsAccountLockedResult> {
  // Fast path: check in-memory cache
  const cached = getCachedLock(email);
  if (cached !== null && !cached.locked) {
    return {
      locked: false,
      lockLevel: 0,
      remainingAttempts: 0, // Will be accurate on next DB read
    };
  }

  // Database lookup
  const lockout = await db.accountLockout.findUnique({
    where: { email },
  });

  // No record means no lock
  if (!lockout) {
    setCacheLock(email, false);
    return {
      locked: false,
      lockLevel: 0,
      remainingAttempts: LOCK_LEVELS[1].maxAttempts,
    };
  }

  // Check if lock has expired
  if (lockout.lockedUntil && lockout.lockedUntil < new Date()) {
    // Auto-unlock: the lock period has passed
    await db.accountLockout.update({
      where: { email },
      data: {
        lockLevel: 0,
        lockedUntil: null,
      },
    });

    clearCacheLock(email);

    logAudit({
      actorEmail: email,
      action: AUDIT_ACTIONS.SECURITY.ACCOUNT_UNLOCKED,
      resource: 'user',
      resourceId: lockout.userId,
      outcome: 'success',
      details: { reason: 'auto_unlock_expired' },
    });

    // SIEM: account unlock (auto)
    forwardToSIEM(createSIEMEvent({
      type: 'ACCOUNT_UNLOCK',
      severity: 'info',
      metadata: {
        action: 'ACCOUNT_UNLOCKED',
        email,
        reason: 'auto_unlock_expired',
      },
    })).catch(() => {});

    return {
      locked: false,
      lockLevel: 0,
      remainingAttempts: getRemainingAttempts(lockout.failedAttempts),
    };
  }

  const isLocked = lockout.lockLevel > 0 && lockout.lockedUntil !== null;

  // Update cache
  setCacheLock(email, isLocked);

  return {
    locked: isLocked,
    lockedUntil: lockout.lockedUntil ?? undefined,
    lockLevel: lockout.lockLevel,
    remainingAttempts: getRemainingAttempts(lockout.failedAttempts),
  };
}

/**
 * Manually unlock an account (admin-only).
 *
 * Resets the lockout record completely (failedAttempts, lockLevel, lockedUntil).
 * Logs an `ADMIN_USER_UNLOCKED` audit event for compliance traceability.
 *
 * @param email - The email of the account to unlock.
 * @param adminId - The user ID of the admin performing the unlock.
 * @returns `true` if the account was found and unlocked, `false` otherwise.
 *
 * @example
 * ```ts
 * const success = await unlockAccount('user@example.com', adminUser.id);
 * if (!success) {
 *   return NextResponse.json({ error: 'Account not found' }, { status: 404 });
 * }
 * ```
 */
export async function unlockAccount(
  email: string,
  adminId: string,
): Promise<boolean> {
  const lockout = await db.accountLockout.findUnique({
    where: { email },
  });

  if (!lockout) {
    return false;
  }

  await db.accountLockout.update({
    where: { email },
    data: {
      failedAttempts: 0,
      lockLevel: 0,
      lockedUntil: null,
    },
  });

  // Clear the cache
  clearCacheLock(email);

  // Audit: admin unlocked the account
  logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: AUDIT_ACTIONS.ADMIN.ADMIN_USER_UNLOCKED,
    resource: 'user',
    resourceId: lockout.userId,
    outcome: 'success',
    details: {
      unlockedEmail: email,
      previousLockLevel: lockout.lockLevel,
      previousFailedAttempts: lockout.failedAttempts,
    },
  });

  // SIEM: account unlock (admin)
  forwardToSIEM(createSIEMEvent({
    type: 'ACCOUNT_UNLOCK',
    severity: 'info',
    userId: adminId,
    metadata: {
      action: 'ADMIN_USER_UNLOCKED',
      email,
      previousLockLevel: lockout.lockLevel,
    },
  })).catch(() => {});

  return true;
}

/**
 * Get the full lockout status for an account (for admin display).
 *
 * Returns all lockout fields from the database without modifying them.
 * Useful for admin dashboards that need to show the full picture.
 *
 * @param email - The email address to look up.
 * @returns The full lockout status, or `null` if no record exists.
 *
 * @example
 * ```ts
 * const status = await getLockoutStatus('user@example.com');
 * if (status) {
 *   console.log(`Failed attempts: ${status.failedAttempts}, Level: ${status.lockLevel}`);
 * }
 * ```
 */
export async function getLockoutStatus(
  email: string,
): Promise<LockoutStatus | null> {
  const lockout = await db.accountLockout.findUnique({
    where: { email },
  });

  if (!lockout) {
    return null;
  }

  return {
    failedAttempts: lockout.failedAttempts,
    lockLevel: lockout.lockLevel,
    lockedUntil: lockout.lockedUntil,
    lastAttemptAt: lockout.lastAttemptAt,
  };
}
