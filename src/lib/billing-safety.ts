/**
 * @module billing-safety
 * @description HireNova Billing Safety Layer — payment idempotency, validation,
 *   grace-period management, entitlement revocation/restoration, webhook
 *   signature verification, and transaction logging.
 *
 * SERVER-ONLY — do not import in client components.
 */

import { createHash, createHmac, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/hnsa/audit'
import { forwardToSIEM, createSIEMEvent } from '@/lib/hnsa/siem'
import { getB2CBundlePrice, getModulePrice } from '@/lib/pricing-engine'
import type { Currency, BillingPeriod } from '@/lib/pricing-engine'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Idempotency Key System
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a deterministic SHA-256 idempotency key.
 * Combines userId + planType + billing + current calendar month so that
 * the same user cannot be double-charged for the same subscription in the
 * same billing period.
 */
export function generateIdempotencyKey(
  userId: string,
  planType: string,
  billing: string,
): string {
  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const payload = `${userId}:${planType}:${billing}:${monthKey}`
  return createHash('sha256').update(payload).digest('hex')
}

/**
 * Checks if an idempotency key already exists in the Payment table.
 * Returns `true` if this is a duplicate (should be rejected).
 */
export async function isDuplicatePayment(idempotencyKey: string): Promise<boolean> {
  try {
    const existing = await db.payment.findUnique({ where: { idempotencyKey } })
    return existing !== null
  } catch {
    // If the DB query fails, fail open (allow the payment to proceed)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Payment Validation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All valid plan identifiers accepted by the checkout flow.
 */
const VALID_PLANS_SET = new Set([
  // Legacy plans
  'starter', 'pro', 'career_plus', 'employer', 'annual',
  // B2C bundles
  'hirenova_start', 'hirenova_career', 'hirenova_professional', 'hirenova_ai_power',
  // Individual modules
  'mod_cv', 'mod_ats', 'mod_jobs', 'mod_global', 'mod_mobility',
  'mod_interview', 'mod_linkedin', 'mod_career', 'mod_coach',
  'mod_formation', 'mod_freelance',
])

/**
 * Plans that represent a full subscription (cannot have two simultaneously).
 */
const SUBSCRIPTION_PLANS = new Set([
  'starter', 'pro', 'career_plus', 'employer', 'annual',
  'hirenova_start', 'hirenova_career', 'hirenova_professional', 'hirenova_ai_power',
])

/**
 * Canonical plan ordering from lowest to highest value.
 * Used for downgrade detection.
 */
const PLAN_TIER_ORDER: string[] = [
  'free',
  'hirenova_start', 'starter',
  'hirenova_career', 'career_plus',
  'hirenova_professional', 'pro',
  'hirenova_ai_power',
  'employer', 'annual',
]

/**
 * Returns the numeric tier rank for a plan. Higher = more valuable.
 */
function getPlanRank(plan: string): number {
  const idx = PLAN_TIER_ORDER.indexOf(plan)
  return idx >= 0 ? idx : -1
}

/**
 * Validates a payment intent before checkout is created.
 *
 * Checks:
 * - User does not already have an active paid subscription (for bundle/legacy plans)
 * - Amount matches the pricing engine
 * - Plan is valid
 * - Not a silent downgrade (without explicit intent)
 */
export async function validatePaymentIntent(params: {
  userId: string
  planType: string
  amount: number
  currency: string
  billing?: string
}): Promise<{ valid: boolean; reason?: string }> {
  const { userId, planType, amount, currency, billing = 'monthly' } = params

  // ── Plan validity ──
  if (!VALID_PLANS_SET.has(planType)) {
    return { valid: false, reason: `Invalid plan type: ${planType}` }
  }

  // ── Fetch user's current plan ──
  let currentUser: { plan: string } | null
  try {
    currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })
  } catch {
    return { valid: false, reason: 'Database error fetching user' }
  }

  if (!currentUser) {
    return { valid: false, reason: 'User not found' }
  }

  // ── Duplicate subscription check (bundle / legacy plans) ──
  if (SUBSCRIPTION_PLANS.has(planType) && currentUser.plan !== 'free') {
    return { valid: false, reason: 'User already has an active paid subscription' }
  }

  // ── Amount validation against pricing engine ──
  const peCurrency = (['eur', 'usd', 'gbp', 'mad'].includes(currency) ? currency : 'eur') as Currency
  const peBilling = (billing === 'annual' ? 'annual' : 'monthly') as BillingPeriod

  let expectedPrice: number | null = null

  if (planType.startsWith('hirenova_')) {
    const result = getB2CBundlePrice(planType, peCurrency, peBilling)
    expectedPrice = result ? Math.round(result.price) : null
  } else if (planType.startsWith('mod_')) {
    const result = getModulePrice(planType, peCurrency, peBilling)
    expectedPrice = result ? Math.round(result.price) : null
  } else {
    // Legacy plans — use static prices
    const legacyPrices: Record<string, number> = {
      starter: 9.90, pro: 29.90, career_plus: 19.90, employer: 49, annual: 299,
    }
    const baseEur = legacyPrices[planType]
    if (baseEur === undefined) {
      return { valid: false, reason: `No pricing found for legacy plan: ${planType}` }
    }
    const rates: Record<string, number> = { eur: 1, usd: 1.08, gbp: 0.86, mad: 10.84 }
    const multiplier = billing === 'annual' ? 10 : 1
    expectedPrice = Math.round(baseEur * multiplier * (rates[peCurrency] ?? 1))
  }

  if (expectedPrice === null) {
    return { valid: false, reason: `Cannot determine expected price for plan: ${planType}` }
  }

  // Allow 5% tolerance for rounding differences
  const tolerance = expectedPrice * 0.05
  if (Math.abs(amount - expectedPrice) > tolerance) {
    return {
      valid: false,
      reason: `Amount mismatch: expected ~${expectedPrice} ${currency}, got ${amount} ${currency}`,
    }
  }

  // ── Downgrade detection ──
  // Modules can always be added. For subscription plans, check tier ordering.
  if (SUBSCRIPTION_PLANS.has(planType)) {
    const currentRank = getPlanRank(currentUser.plan)
    const newRank = getPlanRank(planType)
    if (currentRank > newRank && newRank >= 0) {
      return {
        valid: false,
        reason: `Downgrade from ${currentUser.plan} to ${planType} requires explicit intent`,
      }
    }
  }

  return { valid: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Grace Period Manager
// ═══════════════════════════════════════════════════════════════════════════════

/** Number of days after expiry before the plan is fully revoked. */
export const GRACE_PERIOD_DAYS = 7

/** All possible subscription lifecycle states. */
export type SubscriptionStatus =
  | 'active'
  | 'renewal_pending'
  | 'payment_failed'
  | 'grace_period'
  | 'expired'
  | 'cancelled'
  | 'reactivated'

/**
 * Determines the current subscription status for a user.
 *
 * Logic:
 * - `plan === 'free'` → `'expired'`
 * - No `planExpiresAt` set and plan is not free → `'active'` (perpetual / manual)
 * - `planExpiresAt` in the future → `'active'`
 * - `planExpiresAt` in the past but within grace window → `'grace_period'`
 * - `planExpiresAt` in the past and past grace window → `'expired'`
 */
export function getSubscriptionStatus(user: {
  plan: string
  updatedAt: Date
  planExpiresAt?: Date | null
  gracePeriodUntil?: Date | null
}): SubscriptionStatus {
  if (user.plan === 'free') {
    return 'expired'
  }

  // If no expiry is set, the subscription is considered active indefinitely
  if (!user.planExpiresAt) {
    return 'active'
  }

  const now = Date.now()
  const expiresAt = new Date(user.planExpiresAt).getTime()

  // Still within the subscription period
  if (expiresAt > now) {
    return 'active'
  }

  // Past expiry — check grace period
  const graceUntil = user.gracePeriodUntil
    ? new Date(user.gracePeriodUntil).getTime()
    : expiresAt + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000

  if (now <= graceUntil) {
    return 'grace_period'
  }

  return 'expired'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Entitlement Revoker
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Revokes all paid entitlements for a user, resetting them to the free tier.
 * Logs the action to the audit trail and forwards a critical SIEM event.
 *
 * This should be called after the grace period expires or on explicit cancellation.
 */
export async function revokeEntitlements(
  userId: string,
  reason: string,
): Promise<void> {
  const userBefore = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, email: true },
  })

  await db.user.update({
    where: { id: userId },
    data: {
      plan: 'free',
      planExpiresAt: null,
      gracePeriodUntil: null,
    },
  })

  // Non-blocking audit log
  logAudit({
    actorId: userId,
    actorEmail: userBefore?.email ?? null,
    action: 'SUBSCRIPTION_CANCELLED',
    resource: 'user',
    resourceId: userId,
    outcome: 'success',
    details: { previousPlan: userBefore?.plan, reason },
  }).catch(() => {})

  // Forward critical SIEM event (ACCOUNT_LOCKOUT severity = critical)
  forwardToSIEM(
    createSIEMEvent({
      type: 'ACCOUNT_LOCKOUT',
      severity: 'critical',
      userId,
      metadata: {
        source: 'billing-safety',
        reason,
        previousPlan: userBefore?.plan,
      },
    }),
  ).catch(() => {})
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Entitlement Restorer
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Restores a user's plan after a successful re-payment or manual reactivation.
 * Logs the action to the audit trail.
 */
export async function restoreEntitlements(
  userId: string,
  plan: string,
  reason: string,
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { plan },
  })

  // Non-blocking audit log
  logAudit({
    actorId: userId,
    action: 'SUBSCRIPTION_CREATED',
    resource: 'user',
    resourceId: userId,
    outcome: 'success',
    details: { restoredPlan: plan, reason },
  }).catch(() => {})
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Webhook Signature Verifier (enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifies a webhook signature from Stripe or PayMob.
 *
 * - **Stripe**: Uses HMAC-SHA256 with the `stripe-signature` header format
 *   `t=<timestamp>,v1=<signature>`. Computes HMAC over `timestamp.payload`
 *   using `STRIPE_WEBHOOK_SECRET`.
 *
 * - **PayMob**: Uses HMAC-SHA256 over the raw payload using `PAYMOB_HMAC_SECRET`.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  provider: 'stripe' | 'paymob',
): boolean {
  try {
    if (provider === 'stripe') {
      return verifyStripeSignature(payload, signature, secret)
    }
    return verifyPaymobSignature(payload, signature, secret)
  } catch {
    return false
  }
}

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  // Stripe signature format: t=timestamp,v1=signature
  const elements = signature.split(',')
  let timestamp = ''
  let v1Sig = ''

  for (const el of elements) {
    const [key, value] = el.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') v1Sig = value
  }

  if (!timestamp || !v1Sig) return false

  // Reject events older than 5 minutes
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  const age = Math.floor(Date.now() / 1000) - ts
  if (age > 300) return false

  const signedPayload = `${timestamp}.${payload}`
  const expectedSig = createHmac('sha256', secret).update(signedPayload).digest('hex')

  // Constant-time comparison
  return timingSafeEqual(v1Sig, expectedSig)
}

function verifyPaymobSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex')
  return timingSafeEqual(signature, expectedSig)
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  try {
    return cryptoTimingSafeEqual(bufA, bufB)
  } catch {
    // Fallback: XOR comparison (still constant-time for equal lengths)
    let result = 0
    for (let i = 0; i < bufA.length; i++) {
      result |= bufA[i] ^ bufB[i]
    }
    return result === 0
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Payment Transaction Logger
// ═══════════════════════════════════════════════════════════════════════════════

export type TransactionStatus =
  | 'initiated'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'

export interface LogPaymentTransactionParams {
  userId: string
  provider: string
  planType: string
  amount: number
  currency: string
  status: TransactionStatus
  transactionId?: string
  metadata?: Record<string, any>
}

/**
 * Logs a payment transaction event to the PaymentEvent table.
 * For 'failed' status, also fires a SIEM PAYMENT_FAILURE event.
 *
 * This function is non-blocking — errors are caught and logged to console.
 */
export async function logPaymentTransaction(
  params: LogPaymentTransactionParams,
): Promise<void> {
  try {
    // Find or create a Payment record to attach the event to.
    // We match by providerPaymentId if a transactionId is provided.
    let paymentId: string | undefined

    if (params.transactionId) {
      const existingPayment = await db.payment.findFirst({
        where: { providerPaymentId: params.transactionId },
        select: { id: true },
      })
      if (existingPayment) {
        paymentId = existingPayment.id
      }
    }

    // If no payment record found, create a minimal one
    if (!paymentId) {
      const idempotencyKey = generateIdempotencyKey(
        params.userId,
        params.planType,
        params.status,
      )
      try {
        const newPayment = await db.payment.create({
          data: {
            userId: params.userId,
            provider: params.provider,
            amount: Math.round(params.amount * 100), // store in cents
            currency: params.currency.toUpperCase(),
            status: mapToPaymentStatus(params.status),
            description: `Billing safety log: ${params.planType}`,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            idempotencyKey,
            providerPaymentId: params.transactionId ?? null,
          },
        })
        paymentId = newPayment.id
      } catch {
        // Unique constraint on idempotencyKey — look up the existing one
        const existing = await db.payment.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        })
        if (existing) paymentId = existing.id
      }
    }

    if (paymentId) {
      await db.paymentEvent.create({
        data: {
          paymentId,
          eventType: `payment_${params.status}`,
          statusTo: mapToPaymentStatus(params.status),
          data: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      })
    }
  } catch (err) {
    console.error('[billing-safety] logPaymentTransaction error:', err)
  }

  // Fire SIEM event for payment failures
  if (params.status === 'failed') {
    forwardToSIEM(
      createSIEMEvent({
        type: 'PAYMENT_FAILURE',
        severity: 'warning',
        userId: params.userId,
        metadata: {
          provider: params.provider,
          planType: params.planType,
          amount: params.amount,
          currency: params.currency,
          transactionId: params.transactionId,
        },
      }),
    ).catch(() => {})
  }

  // Also log to the security audit trail
  logAudit({
    actorId: params.userId,
    action: params.status === 'succeeded'
      ? 'PAYMENT_SUCCEEDED'
      : params.status === 'failed'
        ? 'PAYMENT_FAILED'
        : 'PAYMENT_INITIATED',
    resource: 'payment',
    resourceId: params.transactionId,
    outcome: params.status === 'succeeded' ? 'success' : params.status === 'failed' ? 'failure' : 'success',
    details: {
      provider: params.provider,
      planType: params.planType,
      amount: params.amount,
      currency: params.currency,
    },
  }).catch(() => {})
}

/**
 * Maps billing-safety transaction status to the Payment model's status enum.
 */
function mapToPaymentStatus(status: TransactionStatus): string {
  const map: Record<TransactionStatus, string> = {
    initiated: 'created',
    processing: 'pending',
    succeeded: 'succeeded',
    failed: 'failed',
    refunded: 'refunded',
  }
  return map[status]
}
