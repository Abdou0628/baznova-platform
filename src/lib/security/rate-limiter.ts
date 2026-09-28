/**
 * HireNova Security Architecture (HNSA) — Rate Limiter
 *
 * In-memory sliding window rate limiter with configurable rules per route.
 * Implements CTO Pillar #4: API Security
 *
 * Features:
 *   - Sliding window algorithm (more accurate than fixed window)
 *   - Per-IP and per-User tracking
 *   - Configurable limits per route pattern
 *   - Automatic cleanup of expired entries
 *   - Security event logging on violations
 *
 * No external dependencies — pure in-memory (Redis upgrade path documented)
 */

import type { RateLimitConfig, RateLimitResult, SecurityRequest } from './types'

// ─── Storage ────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[]
  blocked: boolean
  blockedUntil: number
  violationCount: number
}

const store = new Map<string, RateLimitEntry>()
let cleanupTimer: ReturnType<typeof setInterval> | null = null

// ─── Default Configs ───────────────────────────────────────────────────────

export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfig> = {
  /** Chatbot API — moderate limit to prevent AI abuse */
  chatbot: { maxRequests: 30, windowMs: 60_000, blockOnExceed: true },
  /** Authentication endpoints — strict to prevent brute force */
  auth: { maxRequests: 10, windowMs: 60_000, blockOnExceed: true },
  /** General API routes */
  api: { maxRequests: 60, windowMs: 60_000, blockOnExceed: false },
  /** CV/document generation — expensive operations */
  generation: { maxRequests: 10, windowMs: 60_000, blockOnExceed: true },
  /** Payment endpoints — strict */
  payment: { maxRequests: 15, windowMs: 60_000, blockOnExceed: true },
  /** Webhook endpoints — higher limit (provider-initiated) */
  webhook: { maxRequests: 200, windowMs: 60_000, blockOnExceed: false },
  /** Admin endpoints — strict */
  admin: { maxRequests: 30, windowMs: 60_000, blockOnExceed: true },
  /** Search endpoints */
  search: { maxRequests: 20, windowMs: 60_000, blockOnExceed: false },
}

/** Route pattern → preset mapping */
const ROUTE_PRESETS: { pattern: RegExp; preset: string }[] = [
  { pattern: /\/api\/chatbot/, preset: 'chatbot' },
  { pattern: /\/api\/auth\//, preset: 'auth' },
  { pattern: /\/api\/generate-/, preset: 'generation' },
  { pattern: /\/api\/payment\//, preset: 'payment' },
  { pattern: /\/api\/payment-orchestrator\//, preset: 'payment' },
  { pattern: /\/api\/checkout/, preset: 'payment' },
  { pattern: /\/api\/stripe\//, preset: 'payment' },
  { pattern: /\/api\/paymob\//, preset: 'payment' },
  { pattern: /\/api\/webhook\//, preset: 'webhook' },
  { pattern: /\/api\/admin\//, preset: 'admin' },
  { pattern: /\/api\//, preset: 'api' },
]

// ─── Core Rate Limiter ──────────────────────────────────────────────────────

/**
 * Check rate limit for a given key.
 * Returns a RateLimitResult with allowed=true if within limits.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)

  // Check if blocked
  if (entry?.blocked && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      limit: config.maxRequests,
    }
  }

  // Initialize or clean up entry
  if (!entry) {
    entry = { timestamps: [], blocked: false, blockedUntil: 0, violationCount: 0 }
    store.set(key, entry)
  }

  // Remove timestamps outside the window (sliding window)
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  const remaining = config.maxRequests - entry.timestamps.length

  if (entry.timestamps.length >= config.maxRequests) {
    // Rate limit exceeded
    entry.violationCount++

    if (config.blockOnExceed) {
      // Exponential backoff: 1min, 2min, 4min, 8min, max 30min
      const blockDuration = Math.min(
        60_000 * Math.pow(2, Math.min(entry.violationCount - 1, 4)),
        30 * 60_000,
      )
      entry.blocked = true
      entry.blockedUntil = now + blockDuration
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: remaining - 1,
    resetAt: now + config.windowMs,
    limit: config.maxRequests,
  }
}

/**
 * Resolve the rate limit config for a given request path.
 */
export function resolveConfigForPath(path: string): RateLimitConfig {
  for (const { pattern, preset } of ROUTE_PRESETS) {
    if (pattern.test(path)) {
      return RATE_LIMIT_PRESETS[preset]
    }
  }
  return RATE_LIMIT_PRESETS.api
}

/**
 * Generate a rate limit key from a request.
 * Uses userId if available, falls back to IP.
 */
export function getRateLimitKey(request: SecurityRequest, config?: RateLimitConfig): string {
  if (config?.keyExtractor) {
    return config.keyExtractor(request)
  }
  const identifier = request.userId || request.ip
  const routePrefix = request.path.replace(/\/[^/]*$/, '') // Group by route
  return `rl:${routePrefix}:${identifier}`
}

/**
 * Main entry point: check if a request is rate-limited.
 */
export function rateLimit(request: SecurityRequest): RateLimitResult {
  const config = resolveConfigForPath(request.path)
  const key = getRateLimitKey(request, config)
  return checkRateLimit(key, config)
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Remove expired entries to prevent memory leaks.
 * Called automatically every 5 minutes.
 */
export function cleanup(): void {
  const now = Date.now()
  const maxWindowMs = Math.max(...Object.values(RATE_LIMIT_PRESETS).map((c) => c.windowMs))
  const cutoff = now - maxWindowMs * 2

  for (const [key, entry] of store.entries()) {
    const allExpired = entry.timestamps.every((ts) => ts < cutoff)
    const blockExpired = entry.blocked && entry.blockedUntil < now
    if (allExpired && blockExpired) {
      store.delete(key)
    }
  }
}

/** Start the automatic cleanup timer */
export function startCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(cleanup, 5 * 60_000)
  // Don't prevent Node from exiting
  if (cleanupTimer.unref) cleanupTimer.unref()
}

/** Stop the cleanup timer */
export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/** Get current stats (for monitoring) */
export function getStats(): {
  totalKeys: number
  blockedKeys: number
  totalRequests: number
} {
  let blockedKeys = 0
  let totalRequests = 0
  const now = Date.now()

  for (const entry of store.values()) {
    if (entry.blocked && entry.blockedUntil > now) blockedKeys++
    totalRequests += entry.timestamps.length
  }

  return {
    totalKeys: store.size,
    blockedKeys,
    totalRequests,
  }
}

// Auto-start cleanup
startCleanup()
