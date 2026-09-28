/**
 * BazNova Payment Orchestrator — Core Types
 *
 * Independent layer that wraps the existing Payment Gateway Abstraction.
 * Implements the CTO's vision: state machine, event sourcing, idempotency,
 * smart routing, provider capabilities registry.
 *
 * ⚠️ This layer does NOT modify any existing payment code.
 * It delegates to `src/lib/payment-gateway` for actual provider communication.
 */

// ─── Payment State Machine ──────────────────────────────────────────────────

/**
 * Complete payment lifecycle states per CTO specification.
 * Transitions are enforced by the state machine — see state-machine.ts
 */
export type PaymentState =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

/**
 * All events that can trigger a state transition.
 * Each event maps to exactly one target state (see STATE_TRANSITIONS).
 */
export type PaymentEventType =
  | 'payment_created'
  | 'payment_pending'
  | 'payment_authorized'
  | 'payment_captured'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'payment_refunded'
  | 'payment_partially_refunded'
  | 'payment_retry_attempted'

// ─── Subscription States ────────────────────────────────────────────────────

export type SubscriptionState =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PAUSED'

export type SubscriptionEventType =
  | 'subscription_created'
  | 'subscription_activated'
  | 'subscription_renewed'
  | 'subscription_past_due'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_resumed'
  | 'subscription_plan_changed'

// ─── Provider Capabilities ──────────────────────────────────────────────────

/**
 * Describes what a payment provider can do.
 * Used by the smart router to decide which provider to use.
 */
export interface ProviderCapabilities {
  /** Unique provider identifier (e.g. 'payzone', 'stripe') */
  id: string
  /** Human-readable provider name */
  name: string
  /** Supported ISO 4217 currency codes */
  currencies: string[]
  /** ISO 3166-1 alpha-2 country codes where this provider operates */
  countries: string[]
  /** Region classification for routing */
  region: 'morocco' | 'africa' | 'europe' | 'americas' | 'asia' | 'international'
  /** Supported payment method types */
  paymentMethods: PaymentMethodType[]
  /** Whether recurring/subscription billing is supported */
  supportsRecurring: boolean
  /** Whether refunds are supported */
  supportsRefund: boolean
  /** Whether partial refunds are supported */
  supportsPartialRefund: boolean
  /** Whether card tokenization (stored credentials) is supported */
  supportsTokenization: boolean
  /** Whether webhook notifications are supported */
  supportsWebhooks: boolean
  /** Whether signature verification on webhooks is supported */
  supportsWebhookSignature: boolean
  /** Minimum transaction amount in smallest currency unit (cents) */
  minAmount?: number
  /** Maximum transaction amount in smallest currency unit (cents) */
  maxAmount?: number
  /** Routing priority (lower = higher priority) */
  priority: number
  /** Whether this provider is currently active */
  enabled: boolean
}

export type PaymentMethodType =
  | 'card'
  | 'bank_transfer'
  | 'mobile_payment'
  | 'wallet'
  | 'direct_debit'
  | 'buy_now_pay_later'

// ─── Orchestrator Request/Response Types ─────────────────────────────────────

export interface OrchestratorCheckoutRequest {
  userId: string
  email: string
  planId: string
  currency: string
  amount: number // in cents
  country?: string // for smart routing
  paymentMethod?: PaymentMethodType
  preferredProvider?: string
  metadata?: Record<string, string>
}

export interface OrchestratorCheckoutResult {
  success: boolean
  paymentRecordId: string
  providerId: string
  checkoutUrl?: string
  transactionId?: string
  orderId?: string
  state: PaymentState
  error?: string
  routingReason: string // why this provider was chosen
}

export interface OrchestratorWebhookResult {
  success: boolean
  paymentRecordId?: string
  userId?: string
  previousState: PaymentState
  newState: PaymentState
  subscriptionActivated: boolean
  error?: string
}

export interface OrchestratorRefundRequest {
  paymentRecordId: string
  userId: string
  amount?: number // if partial refund (in cents)
  reason?: string
}

export interface OrchestratorRefundResult {
  success: boolean
  refundTransactionId?: string
  newState: PaymentState
  error?: string
}

export interface OrchestratorStatusResult {
  paymentRecordId: string
  state: PaymentState
  providerId: string
  providerTransactionId?: string
  amount: number
  currency: string
  userId: string
  planId: string
  events: PaymentEventRecord[]
  createdAt: string
  updatedAt: string
}

// ─── Event Sourcing (Payment Ledger) ────────────────────────────────────────

/**
 * Immutable event record — each state transition creates one.
 * These events can reconstruct the entire payment history.
 */
export interface PaymentEventRecord {
  id: string
  paymentRecordId: string
  eventType: PaymentEventType
  previousState: PaymentState
  newState: PaymentState
  providerId: string
  providerEventId?: string // for idempotency: the event_id from the provider
  amount?: number
  currency?: string
  metadata?: Record<string, string>
  createdAt: string
}

/**
 * The main payment record — created once, updated via events.
 */
export interface PaymentRecord {
  id: string
  userId: string
  email: string
  subscriptionId?: string
  planId: string
  providerId: string
  providerPaymentId?: string
  providerOrderId?: string
  amount: number
  currency: string
  state: PaymentState
  idempotencyKey: string
  metadata?: Record<string, string>
  createdAt: string
  updatedAt: string
}

// ─── Smart Routing ──────────────────────────────────────────────────────────

export interface RoutingDecision {
  providerId: string
  reason: string
  score: number // 0-100, higher = better match
  capabilities: ProviderCapabilities
}

export interface RoutingContext {
  currency: string
  country?: string
  paymentMethod?: PaymentMethodType
  amount: number
  planId: string
  preferredProvider?: string
}

// ─── Subscription Record ────────────────────────────────────────────────────

export interface SubscriptionRecord {
  id: string
  userId: string
  planId: string
  providerId: string
  providerSubscriptionId?: string
  state: SubscriptionState
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'IDEMPOTENCY_CONFLICT'
      | 'NO_PROVIDER_AVAILABLE'
      | 'ROUTING_ERROR'
      | 'PROVIDER_ERROR'
      | 'WEBHOOK_VERIFICATION_FAILED'
      | 'REFUND_NOT_ALLOWED'
      | 'SUBSCRIPTION_ERROR'
      | 'LEDGER_ERROR'
      | 'UNKNOWN',
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'OrchestratorError'
  }
}
