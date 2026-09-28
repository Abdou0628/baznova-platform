/**
 * BazNova Payment Abstraction Layer — Public API
 *
 * ONLY exports what calling code needs — never leaks provider internals.
 *
 * Usage:
 * ```ts
 * import { hirenovaCheckout, type CheckoutRequest, type CheckoutResponse } from '@/lib/payment-layer';
 *
 * const result = await hirenovaCheckout({
 *   userId: 'user_123',
 *   planId: 'pro',
 *   amount: 1900,
 *   currency: 'EUR',
 *   country: 'FR',
 * });
 *
 * // Redirect user to result.redirectUrl
 * // The user NEVER sees which provider was used
 * ```
 *
 * @module payment-layer
 */

// ── Core Functions ──────────────────────────────────────────────────────────
export { hirenovaCheckout, hirenovaVerifyPayment, hirenovaWebhook, hirenovaRefund } from './checkout';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  CheckoutRequest,
  CheckoutResponse,
  PaymentStatusResponse,
  PaymentRegion,
  PaymentProviderId,
  ClientType,
  PlanPricing,
  RoutingDecision,
  // Provider interface — for extending with new providers
  IPaymentProvider,
  ProviderCheckoutParams,
  ProviderCheckoutResult,
  ProviderPaymentStatus,
  WebhookResult,
  RefundResult,
  ProviderCapabilities,
} from './types';

// ── Router Utilities (for admin/debug) ──────────────────────────────────────
export { getRegionConfigs, getAvailableProviders, resolveRegion } from './region-router';

// ── Factory Utilities (for admin/debug) ─────────────────────────────────────
export { getProvider, getAllProviders, isProviderRegistered } from './provider-factory';
