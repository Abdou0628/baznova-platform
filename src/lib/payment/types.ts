/**
 * HireNova Payment Orchestrator — Type Definitions
 *
 * Central type definitions for the payment system including enums,
 * interfaces, and valid state transition maps.
 *
 * @module payment/types
 */

// ===== Enums =====

/**
 * Payment lifecycle statuses.
 * All amounts tracked in CENTS (smallest currency unit).
 */
export enum PaymentStatus {
  CREATED = 'created',
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

/**
 * Immutable event types emitted during payment processing.
 * Each event corresponds to a state transition or external notification.
 */
export enum PaymentEventType {
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_AUTHORIZED = 'payment_authorized',
  PAYMENT_CAPTURED = 'payment_captured',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  PAYMENT_EXPIRED = 'payment_expired',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_PARTIALLY_REFUNDED = 'payment_partially_refunded',
}

/**
 * Supported payment provider identifiers.
 */
export type PaymentProviderName =
  | 'stripe'
  | 'paymob'
  | 'lemonsqueezy'
  | 'payzone'
  | 'naps'
  | 'cmi';

/**
 * Supported currency codes.
 */
export type Currency =
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'MAD'
  | 'XOF'
  | 'XAF'
  | 'SAR'
  | 'AED'
  | 'CAD'
  | 'AUD';

/**
 * Country/region codes used for provider routing.
 */
export type CountryCode = 'MA' | 'FR' | 'DE' | 'ES' | 'US' | 'GB' | 'SA' | 'AE' | 'INTL';

/**
 * Payment method types.
 */
export type PaymentMethodType = 'card' | 'mobile' | 'bank_transfer' | 'wallet' | 'cash';

// ===== Interfaces =====

/**
 * Input for creating a new payment.
 * All monetary values MUST be in cents (smallest currency unit).
 */
export interface CreatePaymentInput {
  /** The user making the payment */
  userId: string;
  /** Payment provider name (optional — auto-selected via registry if omitted) */
  provider?: PaymentProviderName;
  /** Amount in cents */
  amount: number;
  /** ISO 4217 currency code */
  currency: Currency;
  /** Human-readable description shown to the user */
  description: string;
  /** Country code for provider routing */
  country?: CountryCode;
  /** Payment method type for provider routing */
  paymentMethod?: PaymentMethodType;
  /** Optional subscription ID for recurring payments */
  subscriptionId?: string;
  /** Optional saved payment method ID */
  methodId?: string;
  /** Optional idempotency key (auto-generated if omitted) */
  idempotencyKey?: string;
  /** ISO 8601 datetime after which the payment expires */
  expiresAt?: string;
  /** Arbitrary metadata (will be JSON-stringified) */
  metadata?: Record<string, unknown>;
}

/**
 * Result returned after creating a payment.
 */
export interface CreatePaymentResult {
  /** Unique payment ID (cuid) */
  id: string;
  /** User who initiated the payment */
  userId: string;
  /** Selected payment provider */
  provider: PaymentProviderName;
  /** Provider-specific payment/checkout ID */
  providerPaymentId?: string;
  /** Amount in cents */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Current payment status */
  status: PaymentStatus;
  /** Idempotency key for deduplication */
  idempotencyKey: string;
  /** Description */
  description: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * Input for refunding a payment.
 */
export interface RefundPaymentInput {
  /** Payment ID to refund */
  paymentId: string;
  /** Amount to refund in cents (partial refund). Omit for full refund. */
  amount?: number;
  /** Reason for the refund */
  reason?: string;
  /** Optional idempotency key */
  idempotencyKey?: string;
}

/**
 * Routing decision made by the provider registry.
 */
export interface ProviderRoutingDecision {
  /** Country/region code */
  country: CountryCode;
  /** Currency code */
  currency: Currency;
  /** Payment method type */
  paymentMethod: PaymentMethodType;
  /** Selected provider name */
  provider: PaymentProviderName;
  /** Priority (lower = higher priority) */
  priority: number;
}

/**
 * Provider configuration as stored in the PaymentProvider table.
 */
export interface PaymentProviderConfig {
  /** Unique provider identifier */
  id: string;
  /** Provider name (stripe, paymob, etc.) */
  name: PaymentProviderName;
  /** Human-readable display name */
  displayName: string;
  /** Supported country/region code */
  country: string;
  /** JSON array of supported currency codes */
  currencies: Currency[];
  /** JSON array of supported payment method types */
  paymentMethods: PaymentMethodType[];
  /** Whether the provider supports recurring billing */
  supportsRecurring: boolean;
  /** Whether the provider supports refunds */
  supportsRefund: boolean;
  /** Whether the provider supports card tokenization */
  supportsTokenization: boolean;
  /** Whether the provider supports webhook notifications */
  supportsWebhooks: boolean;
  /** Routing priority (lower = higher priority) */
  priority: number;
  /** Whether the provider is currently enabled */
  enabled: boolean;
  /** JSON provider-specific configuration (API keys in env, not here) */
  config: Record<string, unknown>;
  /** ISO 8601 creation timestamp */
  createdAt: Date;
  /** ISO 8601 last update timestamp */
  updatedAt: Date;
}

/**
 * Payment event record from the PaymentEvent table.
 */
export interface PaymentEventRecord {
  id: string;
  paymentId: string;
  eventType: PaymentEventType;
  statusFrom?: string;
  statusTo: string;
  providerEventId?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Payment record from the Payment table.
 */
export interface PaymentRecord {
  id: string;
  userId?: string;
  subscriptionId?: string;
  methodId?: string;
  provider: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  metadata?: string;
  idempotencyKey: string;
  expiresAt?: Date;
  capturedAt?: Date;
  refundedAt?: Date;
  refundedAmount: number;
  providerData?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination parameters for ledger queries.
 */
export interface PaginationParams {
  /** 1-based page number */
  page?: number;
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
}

/**
 * Filters for payment history queries.
 */
export interface PaymentHistoryFilters extends PaginationParams {
  /** Filter by payment status */
  status?: PaymentStatus;
  /** Filter by provider name */
  provider?: PaymentProviderName;
  /** Filter by currency code */
  currency?: Currency;
  /** Filter by start date (ISO 8601) */
  startDate?: string;
  /** Filter by end date (ISO 8601) */
  endDate?: string;
}

/**
 * Financial summary grouped by status, currency, and provider.
 */
export interface FinancialSummaryGroup {
  /** Payment status */
  status: string;
  /** Currency code */
  currency: string;
  /** Provider name */
  provider: string;
  /** Total amount in cents */
  totalAmount: number;
  /** Number of payments */
  count: number;
}

/**
 * Reconciliation result comparing local vs provider status.
 */
export interface ReconciliationResult {
  /** Payments that match between local and provider */
  matched: PaymentRecord[];
  /** Payments with status discrepancy */
  discrepancies: Array<{
    payment: PaymentRecord;
    localStatus: string;
    providerStatus: string;
  }>;
  /** Payments missing from the provider */
  missingFromProvider: PaymentRecord[];
  /** Total number of payments checked */
  totalChecked: number;
  /** ISO 8601 reconciliation timestamp */
  reconciledAt: string;
}

// ===== Valid State Transitions Map =====

/**
 * Defines all valid payment state transitions.
 * Key = current status, Value = array of allowed next statuses.
 *
 * Typical flow:
 *   CREATED → PENDING → AUTHORIZED → CAPTURED → SUCCEEDED
 *   Any active → FAILED / CANCELLED / EXPIRED
 *   SUCCEEDED / CAPTURED → REFUNDED / PARTIALLY_REFUNDED
 */
export const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PENDING,
    PaymentStatus.AUTHORIZED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.PENDING]: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.AUTHORIZED]: [
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.CAPTURED]: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
  ],
  [PaymentStatus.SUCCEEDED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.REFUNDED]: [
    PaymentStatus.PARTIALLY_REFUNDED,
  ],
  [PaymentStatus.PARTIALLY_REFUNDED]: [
    PaymentStatus.REFUNDED,
  ],
};

/**
 * Maps a PaymentEventType to the corresponding PaymentStatus it produces.
 */
export const EVENT_STATUS_MAP: Record<PaymentEventType, PaymentStatus> = {
  [PaymentEventType.PAYMENT_CREATED]: PaymentStatus.CREATED,
  [PaymentEventType.PAYMENT_PENDING]: PaymentStatus.PENDING,
  [PaymentEventType.PAYMENT_AUTHORIZED]: PaymentStatus.AUTHORIZED,
  [PaymentEventType.PAYMENT_CAPTURED]: PaymentStatus.CAPTURED,
  [PaymentEventType.PAYMENT_SUCCEEDED]: PaymentStatus.SUCCEEDED,
  [PaymentEventType.PAYMENT_FAILED]: PaymentStatus.FAILED,
  [PaymentEventType.PAYMENT_CANCELLED]: PaymentStatus.CANCELLED,
  [PaymentEventType.PAYMENT_EXPIRED]: PaymentStatus.EXPIRED,
  [PaymentEventType.PAYMENT_REFUNDED]: PaymentStatus.REFUNDED,
  [PaymentEventType.PAYMENT_PARTIALLY_REFUNDED]: PaymentStatus.PARTIALLY_REFUNDED,
};

/**
 * Reverse mapping: PaymentStatus → PaymentEventType.
 */
export const STATUS_EVENT_MAP: Record<PaymentStatus, PaymentEventType> = {
  [PaymentStatus.CREATED]: PaymentEventType.PAYMENT_CREATED,
  [PaymentStatus.PENDING]: PaymentEventType.PAYMENT_PENDING,
  [PaymentStatus.AUTHORIZED]: PaymentEventType.PAYMENT_AUTHORIZED,
  [PaymentStatus.CAPTURED]: PaymentEventType.PAYMENT_CAPTURED,
  [PaymentStatus.SUCCEEDED]: PaymentEventType.PAYMENT_SUCCEEDED,
  [PaymentStatus.FAILED]: PaymentEventType.PAYMENT_FAILED,
  [PaymentStatus.CANCELLED]: PaymentEventType.PAYMENT_CANCELLED,
  [PaymentStatus.EXPIRED]: PaymentEventType.PAYMENT_EXPIRED,
  [PaymentStatus.REFUNDED]: PaymentEventType.PAYMENT_REFUNDED,
  [PaymentStatus.PARTIALLY_REFUNDED]: PaymentEventType.PAYMENT_PARTIALLY_REFUNDED,
};
