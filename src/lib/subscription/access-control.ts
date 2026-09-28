/**
 * BazNova Centralized Access Control
 *
 * Replaces scattered PAID_PLANS arrays. Every feature gate in the
 * application should go through these functions.
 */

import { db } from '@/lib/db'
import { getPlanFeatures, type BazNovaPlan, type PlanFeatures } from './plans'
import type { AccessCheckResult } from './types'

// ─── Helpers ───────────────────────────────────────────

/** Current month as a zero-padded number for comparison with lastResetMonth. */
function currentMonthKey(): number {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1) // e.g. 202507
}

/**
 * Ensure the monthly counters are reset if the month has changed.
 * Returns the (possibly updated) user record.
 */
async function ensureCountersCurrent(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const currentMonth = currentMonthKey()
  if (user.lastResetMonth !== currentMonth) {
    return db.user.update({
      where: { id: userId },
      data: {
        cvCountThisMonth: 0,
        clCountThisMonth: 0,
        lastResetMonth: currentMonth,
      },
    })
  }

  return user
}

// ─── Synchronous helpers (no DB) ───────────────────────

/**
 * Check whether a plan includes a given product — synchronous, no DB.
 * Use this in non-user-facing code (e.g. rendering plan comparison tables).
 */
export function hasAccess(planId: BazNovaPlan, productId: string): boolean {
  const features = getPlanFeatures(planId)
  return features.products.includes(productId)
}

/**
 * Return the full list of product IDs accessible to a plan — synchronous.
 */
export function getAccessibleProducts(planId: BazNovaPlan): string[] {
  return getPlanFeatures(planId).products
}

// ─── Async access checks (require DB) ──────────────────

/**
 * Check if the given user's current plan grants access to `feature`.
 *
 * For `cv` and `cl` features, this also enforces monthly usage limits
 * and auto-resets counters when a new month begins.
 *
 * For any other product (e.g. `jobs`, `interview`, `api`, …) it is a
 * simple plan-product membership check.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string,
): Promise<AccessCheckResult> {
  const user = await ensureCountersCurrent(userId)
  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
      remaining: 0,
      limit: 0,
      planId: 'free',
    }
  }

  const planId = user.plan as BazNovaPlan
  const features = getPlanFeatures(planId)

  // CV-specific check with monthly counter
  if (feature === 'cv') {
    const limit = features.cvLimit
    if (limit === 0) {
      return {
        allowed: false,
        reason: 'Your plan does not include CV generation',
        remaining: 0,
        limit: 0,
        planId,
      }
    }
    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1, planId }
    }
    const used = user.cvCountThisMonth
    const remaining = Math.max(0, limit - used)
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `CV limit reached (${limit} per month). Upgrade your plan for more.`,
        remaining: 0,
        limit,
        planId,
      }
    }
    return { allowed: true, remaining, limit, planId }
  }

  // CL-specific check with monthly counter
  if (feature === 'cl') {
    const limit = features.clLimit
    if (limit === 0) {
      return {
        allowed: false,
        reason: 'Your plan does not include cover letter generation',
        remaining: 0,
        limit: 0,
        planId,
      }
    }
    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1, planId }
    }
    const used = user.clCountThisMonth
    const remaining = Math.max(0, limit - used)
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Cover letter limit reached (${limit} per month). Upgrade your plan for more.`,
        remaining: 0,
        limit,
        planId,
      }
    }
    return { allowed: true, remaining, limit, planId }
  }

  // Generic product check
  const has = features.products.includes(feature)
  return {
    allowed: has,
    reason: has ? undefined : `Your current plan (${planId}) does not include access to "${feature}".`,
    remaining: has ? -1 : 0,
    limit: has ? -1 : 0,
    planId,
  }
}

/**
 * Check access AND atomically increment the usage counter.
 * Only valid for `cv` and `cl` features.
 * Returns { allowed: false } if the limit is already reached.
 */
export async function checkAndIncrementUsage(
  userId: string,
  feature: 'cv' | 'cl',
): Promise<AccessCheckResult> {
  // First do the read-only check
  const check = await checkFeatureAccess(userId, feature)
  if (!check.allowed) return check

  // For unlimited plans (-1), still increment for tracking but always allow
  // Increment the counter
  const field = feature === 'cv' ? 'cvCountThisMonth' : 'clCountThisMonth'
  await db.user.update({
    where: { id: userId },
    data: { [field]: { increment: 1 } },
  })

  // Recalculate remaining
  const planId = check.planId
  const features = getPlanFeatures(planId)
  const limit = feature === 'cv' ? features.cvLimit : features.clLimit

  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1, planId }
  }

  // remaining was check.remaining (pre-increment value), so subtract 1
  return {
    allowed: true,
    remaining: Math.max(0, check.remaining - 1),
    limit,
    planId,
  }
}

// Re-export types for convenience
export type { BazNovaPlan, AccessCheckResult, PlanFeatures } from './types'
export { getPlanFeatures } from './plans'
