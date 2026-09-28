/**
 * BazNova Payment Orchestrator — Public API
 *
 * Independent orchestration layer for payment processing.
 * Wraps the existing Payment Gateway Abstraction without modifying it.
 *
 * Architecture (per CTO specification):
 *
 *   BazNova AI Command Center
 *         │
 *   ┌─────▼──────┐
 *   │  Checkout   │
 *   │  API Layer  │
 *   └─────┬──────┘
 *         │
 *   ┌─────▼──────────┐
 *   │  Payment        │
 *   │  Orchestrator   │  ← This module
 *   │  (routing,      │
 *   │   retry,        │
 *   │   idempotency,  │
 *   │   state machine)│
 *   └─────┬──────────┘
 *         │
 *   ┌─────┼──────────┐
 *   │     │          │
 *  ▼     ▼          ▼
 * Payzone NAPS   Stripe/PayMob/...
 *
 *         │
 *   ┌─────▼──────────┐
 *   │  Payment Ledger │  ← Event-sourced, immutable
 *   │  + Audit Log    │
 *   └────────────────┘
 *
 * Usage:
 *   import { bootstrapOrchestrator, createCheckout, processWebhook } from '@/lib/payment-orchestrator'
 *   await bootstrapOrchestrator()
 *   const result = await createCheckout(request)
 */

// ─── Bootstrap ─────────────────────────────────────────────────────────────
export { bootstrapOrchestrator, isOrchestratorReady } from './orchestrator'

// ─── Core Operations ──────────────────────────────────────────────────────
export { createCheckout, processWebhook, getPaymentStatus, processRefund } from './orchestrator'

// ─── Types ─────────────────────────────────────────────────────────────────
export type {
  PaymentState,
  PaymentEventType,
  SubscriptionState,
  SubscriptionEventType,
  ProviderCapabilities,
  PaymentMethodType,
  OrchestratorCheckoutRequest,
  OrchestratorCheckoutResult,
  OrchestratorWebhookResult,
  OrchestratorRefundRequest,
  OrchestratorRefundResult,
  OrchestratorStatusResult,
  RoutingDecision,
  RoutingContext,
  PaymentEventRecord,
  PaymentRecord,
  SubscriptionRecord,
} from './types'

// ─── State Machine ─────────────────────────────────────────────────────────
export { PaymentStateMachine, SubscriptionStateMachine, PAYMENT_TRANSITIONS, SUBSCRIPTION_TRANSITIONS, TERMINAL_PAYMENT_STATES, SUCCESS_PAYMENT_STATES } from './state-machine'

// ─── Provider Registry ─────────────────────────────────────────────────────
export { providerRegistry } from './provider-registry'

// ─── Ledger ────────────────────────────────────────────────────────────────
export { createPaymentRecord, getPaymentRecord, getPaymentByIdempotencyKey, getPaymentEvents, getPaymentsForUser, getLatestPaymentForUser, recordEvent, logAuditEvent } from './ledger'

// ─── Errors ────────────────────────────────────────────────────────────────
export { OrchestratorError } from './types'