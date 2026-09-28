/**
 * HireNova Subscription Management — Public API
 *
 * Import from '@/lib/subscription' to use any subscription function.
 */

// ─── Types ────────────────────────────────────────────

export type {
  HireNovaPlan,
  PlanFeatures,
  AccessCheckResult,
  SubscriptionEvent,
} from './types'

// ─── Plans (SINGLE SOURCE OF TRUTH) ────────────────────

export { getPlanFeatures, ALL_PLANS } from './plans'

// ─── Access Control ───────────────────────────────────

export {
  checkFeatureAccess,
  checkAndIncrementUsage,
  hasAccess,
  getAccessibleProducts,
} from './access-control'

// ─── Subscription Manager ─────────────────────────────

export {
  activateSubscription,
  cancelSubscription,
  processPaymentConfirmation,
  processPaymentFailure,
  getSubscriptionInfo,
  getSubscriptionHistory,
} from './manager'
