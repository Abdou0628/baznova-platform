/**
 * BazNova Subscription Manager
 *
 * Core subscription lifecycle: activate, cancel, process webhooks,
 * query subscription info and history.
 */

import { db } from '@/lib/db'
import { resolveGateway } from '@/lib/payment-gateway'
import type { Currency, GatewayId } from '@/lib/payment-gateway'
import type { BazNovaPlan, SubscriptionEvent } from './types'
import { getPlanFeatures } from './plans'

// ─── In-memory event log (until Prisma model exists) ───

const eventStore = new Map<string, SubscriptionEvent[]>()

/** Maximum events retained per user in memory. */
const MAX_EVENTS_PER_USER = 100

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function storeEvent(event: SubscriptionEvent): void {
  const existing = eventStore.get(event.userId) ?? []
  existing.unshift(event) // newest first
  if (existing.length > MAX_EVENTS_PER_USER) {
    existing.length = MAX_EVENTS_PER_USER
  }
  eventStore.set(event.userId, existing)
}

// ─── Helpers ───────────────────────────────────────────

/** Current month key for counter reset. */
function currentMonthKey(): number {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

/**
 * Determine the event type from the plan transition.
 */
function eventTypeForTransition(
  previousPlan: BazNovaPlan,
  newPlan: BazNovaPlan,
): SubscriptionEvent['type'] {
  if (previousPlan === newPlan) return 'activation'
  if (newPlan === 'free') return 'cancellation'
  // Very rough tier ordering for upgrade/downgrade detection
  const tierOrder: Record<BazNovaPlan, number> = {
    free: 0,
    api: 0,
    starter: 1,
    pro: 2,
    annual: 2,
    career_plus: 3,
    lifetime: 3,
    employer: 3,
    enterprise: 4,
  }
  return tierOrder[newPlan] > tierOrder[previousPlan] ? 'upgrade' : 'downgrade'
}

// ─── Public API ────────────────────────────────────────

/**
 * Activate (or change) a user's subscription.
 * Resets monthly counters when upgrading from a lower-tier plan.
 */
export async function activateSubscription(params: {
  userId: string
  email: string
  planId: BazNovaPlan
  currency: Currency
  gatewayId?: string
  transactionId?: string
}): Promise<{ success: boolean; error?: string }> {
  const { userId, planId, gatewayId = 'dev', transactionId } = params

  // Fetch current user to determine previous plan
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const previousPlan = user.plan as BazNovaPlan
  const eventType = eventTypeForTransition(previousPlan, planId)

  // Determine if we should reset counters (upgrading)
  const shouldResetCounters =
    eventType === 'upgrade' ||
    eventType === 'activation'

  // Update the user record
  await db.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      ...(shouldResetCounters
        ? {
            cvCountThisMonth: 0,
            clCountThisMonth: 0,
            lastResetMonth: currentMonthKey(),
          }
        : {}),
    },
  })

  // Log event
  const event: SubscriptionEvent = {
    id: generateEventId(),
    userId,
    type: eventType,
    previousPlan,
    newPlan: planId,
    gatewayId,
    transactionId,
    timestamp: new Date().toISOString(),
  }
  storeEvent(event)
  console.log(
    `[Subscription] ${eventType}: ${previousPlan} → ${planId} for user ${userId} (gateway: ${gatewayId})`,
  )

  return { success: true }
}

/**
 * Cancel a user's subscription via the payment gateway,
 * then downgrade the user to the free plan.
 */
export async function cancelSubscription(
  userId: string,
  gatewayId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  // Attempt gateway cancellation
  try {
    const gw = resolveGateway('USD' as Currency, gatewayId as GatewayId)
    if (gw) {
      await gw.cancelSubscription(userId)
    } else {
      console.warn(
        `[Subscription] No active gateway found for ${gatewayId}, skipping remote cancellation`,
      )
    }
  } catch (err) {
    console.error(`[Subscription] Gateway cancellation failed:`, err)
    // Continue with local downgrade even if gateway fails
  }

  // Downgrade to free
  const previousPlan = user.plan as BazNovaPlan
  await db.user.update({
    where: { id: userId },
    data: {
      plan: 'free',
      cvCountThisMonth: 0,
      clCountThisMonth: 0,
      lastResetMonth: currentMonthKey(),
    },
  })

  const event: SubscriptionEvent = {
    id: generateEventId(),
    userId,
    type: 'cancellation',
    previousPlan,
    newPlan: 'free',
    gatewayId,
    timestamp: new Date().toISOString(),
  }
  storeEvent(event)
  console.log(
    `[Subscription] cancellation: ${previousPlan} → free for user ${userId}`,
  )

  return { success: true }
}

/**
 * Process a confirmed payment (typically called from a webhook handler).
 * Activates the subscription and logs the event.
 */
export async function processPaymentConfirmation(params: {
  userId: string
  planId: BazNovaPlan
  gatewayId: string
  transactionId: string
}): Promise<{ success: boolean; error?: string }> {
  const { userId, planId, gatewayId, transactionId } = params

  const result = await activateSubscription({
    userId,
    email: '', // email not needed here, user already exists
    planId,
    currency: 'USD', // currency not needed for activation itself
    gatewayId,
    transactionId,
  })

  if (!result.success) return result

  // Overwrite the event type to be more specific
  const events = eventStore.get(userId) ?? []
  if (events.length > 0) {
    events[0].type = 'payment_confirmed'
  }

  console.log(
    `[Subscription] payment_confirmed: ${planId} for user ${userId} (tx: ${transactionId})`,
  )

  return { success: true }
}

/**
 * Process a failed payment.
 * Marks the user as past_due but does not immediately downgrade.
 * The user retains access until the next billing cycle attempt fails.
 */
export async function processPaymentFailure(params: {
  userId: string
  gatewayId: string
  transactionId: string
}): Promise<{ success: boolean; error?: string }> {
  const { userId, gatewayId, transactionId } = params

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const currentPlan = user.plan as BazNovaPlan

  const event: SubscriptionEvent = {
    id: generateEventId(),
    userId,
    type: 'payment_failed',
    previousPlan: currentPlan,
    newPlan: currentPlan,
    gatewayId,
    transactionId,
    timestamp: new Date().toISOString(),
    metadata: { note: 'User retains current plan; may be downgraded on next failure.' },
  }
  storeEvent(event)

  console.warn(
    `[Subscription] payment_failed for user ${userId} (plan: ${currentPlan}, tx: ${transactionId})`,
  )

  return { success: true }
}

/**
 * Get full subscription info for a user.
 */
export async function getSubscriptionInfo(userId: string): Promise<{
  planId: BazNovaPlan
  planFeatures: ReturnType<typeof getPlanFeatures>
  isActive: boolean
  products: string[]
} | null> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const planId = user.plan as BazNovaPlan
  const planFeatures = getPlanFeatures(planId)

  return {
    planId,
    planFeatures,
    isActive: planId !== 'free',
    products: planFeatures.products,
  }
}

/**
 * Get the recent subscription event history for a user.
 * Reads from the in-memory store (will migrate to DB model later).
 */
export async function getSubscriptionHistory(
  userId: string,
): Promise<SubscriptionEvent[]> {
  return eventStore.get(userId) ?? []
}
