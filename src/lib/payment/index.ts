/**
 * HireNova Payment Orchestrator — Public API
 *
 * Re-exports everything from the payment module for convenient imports.
 *
 * @example
 * ```ts
 * import { createPayment, PaymentStatus, PaymentEventType } from '@/lib/payment';
 * ```
 *
 * @module payment
 */

// ===== Types & Enums =====
export {
  PaymentStatus,
  PaymentEventType,
  VALID_TRANSITIONS,
  EVENT_STATUS_MAP,
  STATUS_EVENT_MAP,
  type Currency,
  type CountryCode,
  type PaymentMethodType,
  type PaymentProviderName,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type RefundPaymentInput,
  type ProviderRoutingDecision,
  type PaymentProviderConfig,
  type PaymentEventRecord,
  type PaymentRecord,
  type PaginationParams,
  type PaymentHistoryFilters,
  type FinancialSummaryGroup,
  type ReconciliationResult,
} from './types';

// ===== State Machine =====
export {
  transitionPayment,
  getAllowedTransitions,
  isTerminalStatus,
  isRefundableStatus,
  isPartiallyRefundableStatus,
} from './state-machine';

// ===== Registry =====
export {
  seedProviders,
  getProvidersForContext,
  selectProvider,
  isProviderEnabled,
} from './registry';

// ===== Orchestrator =====
export {
  createPayment,
  getPaymentStatus,
  getPaymentWithEvents,
  recordPaymentEvent,
  updatePaymentStatus,
  updatePaymentPartialRefund,
  isEventProcessed,
  validateRefund,
} from './orchestrator';

// ===== Ledger =====
export {
  getPaymentHistory,
  getPaymentTimeline,
  getFinancialSummary,
  getUserFinancialSummary,
  reconcilePayments,
  getAllPayments,
} from './ledger';
