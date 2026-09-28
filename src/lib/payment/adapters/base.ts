/**
 * HireNova Payment Adapters — Base Interface & Types
 *
 * Defines the abstract PaymentAdapter interface that every payment provider
 * MUST implement. Also contains all shared input/output types used across
 * all adapters.
 *
 * All monetary amounts are in CENTS (smallest currency unit).
 *
 * @module payment/adapters/base
 */

import type { Currency, PaymentProviderName } from '../types';

// ===== Adapter Input Types =====

/**
 * Input for creating a payment through a provider adapter.
 * Amounts are always in cents.
 */
export interface CreatePaymentAdapterInput {
  /** Amount in cents (smallest currency unit) */
  amount: number;
  /** ISO 4217 currency code */
  currency: Currency;
  /** Human-readable payment description */
  description: string;
  /** Optional idempotency key for deduplication */
  idempotencyKey?: string;
  /** Email of the paying user */
  customerEmail?: string;
  /** Full name of the paying user */
  customerName?: string;
  /** ISO 8601 datetime after which the payment expires */
  expiresAt?: string;
  /** Arbitrary provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** URL to redirect to after payment completion */
  returnUrl?: string;
  /** URL to redirect to if payment is cancelled */
  cancelUrl?: string;
  /** Optional saved payment method ID */
  methodId?: string;
}

/**
 * Input for creating a subscription through a provider adapter.
 */
export interface CreateSubscriptionInput {
  /** Amount in cents per billing cycle */
  amount: number;
  /** ISO 4217 currency code */
  currency: Currency;
  /** Billing interval (e.g., 'month', 'year') */
  interval?: string;
  /** Number of interval units (e.g., 1 for every month) */
  intervalCount?: number;
  /** Human-readable description */
  description: string;
  /** Email of the subscribing user */
  customerEmail?: string;
  /** Full name of the subscribing user */
  customerName?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

// ===== Adapter Result Types =====

/**
 * Unified result returned by all adapter operations.
 * Adapters MUST NOT throw — they return error information in the result.
 */
export interface AdapterPaymentResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Provider-specific payment/transaction ID */
  providerPaymentId?: string;
  /** HireNova-mapped payment status */
  status?: string;
  /** Client-facing secret or token (e.g., Stripe client_secret, PayMob payment_url) */
  clientSecret?: string;
  /** Full redirect URL for hosted checkout pages */
  redirectUrl?: string;
  /** Amount in cents */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** ISO 8601 timestamp of the operation */
  timestamp?: string;
  /** Raw provider response for debugging/auditing */
  rawResponse?: Record<string, unknown>;
  /** Human-readable error message (present when success === false) */
  error?: string;
  /** Machine-readable error code for programmatic handling */
  errorCode?: string;
}

/**
 * Result returned by refund operations.
 */
export interface AdapterRefundResult {
  /** Whether the refund was initiated successfully */
  success: boolean;
  /** Provider-specific refund/transaction ID */
  refundId?: string;
  /** Refunded amount in cents */
  amount?: number;
  /** Currency of the refund */
  currency?: string;
  /** HireNova-mapped status of the refund (e.g., 'pending', 'succeeded') */
  status?: string;
  /** ISO 8601 timestamp of the refund */
  timestamp?: string;
  /** Raw provider response for debugging */
  rawResponse?: Record<string, unknown>;
  /** Human-readable error message (present when success === false) */
  error?: string;
  /** Machine-readable error code */
  errorCode?: string;
}

// ===== PaymentAdapter Interface =====

/**
 * Abstract interface that ALL payment provider adapters must implement.
 *
 * Required methods: createPayment, capturePayment, refundPayment,
 *   cancelPayment, getPaymentStatus
 *
 * Optional methods (marked with ?): createSubscription, cancelSubscription,
 *   verifyWebhookSignature
 *
 * @example
 * ```ts
 * class StripeAdapter implements PaymentAdapter {
 *   readonly name = 'stripe' as const;
 *   // ...implement all required methods
 * }
 * ```
 */
export interface PaymentAdapter {
  /** Unique provider identifier (must match a PaymentProviderName) */
  readonly name: PaymentProviderName;

  /**
   * Create a payment with the provider.
   * Returns a clientSecret or redirectUrl for the user to complete payment.
   */
  createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult>;

  /**
   * Capture a previously authorized payment.
   * Used for two-step payment flows (authorize → capture).
   *
   * @param providerPaymentId - The provider-specific payment ID
   * @param amount - Optional partial capture amount in cents (default: full amount)
   */
  capturePayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<AdapterPaymentResult>;

  /**
   * Refund a previously captured/succeeded payment.
   *
   * @param providerPaymentId - The provider-specific payment ID
   * @param amount - Refund amount in cents
   * @param reason - Optional reason for the refund
   */
  refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult>;

  /**
   * Cancel an active payment (not yet captured).
   *
   * @param providerPaymentId - The provider-specific payment ID
   */
  cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult>;

  /**
   * Retrieve the current status of a payment from the provider.
   *
   * @param providerPaymentId - The provider-specific payment ID
   */
  getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult>;

  /**
   * Create a recurring subscription (optional — providers that support it).
   */
  createSubscription?(
    input: CreateSubscriptionInput,
  ): Promise<AdapterPaymentResult>;

  /**
   * Cancel an active subscription (optional).
   *
   * @param subscriptionId - The provider-specific subscription ID
   */
  cancelSubscription?(subscriptionId: string): Promise<AdapterPaymentResult>;

  /**
   * Verify an incoming webhook signature (optional — providers with webhooks).
   *
   * @param payload - Raw request body string
   * @param signature - Signature header value
   * @param secret - Webhook secret for verification
   */
  verifyWebhookSignature?(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
}

/**
 * Check if a provider adapter is configured and ready to use.
 * Each adapter should export a function with this signature.
 */
export type AdapterConfigChecker = () => boolean;
