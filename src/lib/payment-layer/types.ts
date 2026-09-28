/**
 * BazNova Payment Abstraction Layer — Unified Type Definitions
 *
 * This is the SINGLE source of truth for all types in the payment layer.
 * Every provider implements IPaymentProvider — no provider-specific types
 * leak to calling code.
 *
 * Design principles:
 *   - Strategy Pattern: IPaymentProvider interface
 *   - Factory Pattern: getProvider(id) → instance
 *   - Router Pattern: routeToProvider(request) → routing decision
 *   - Zero coupling: calling code never imports a specific provider
 *
 * @module payment-layer/types
 */

// ── Region Definitions ──────────────────────────────────────────────────────

/**
 * Geographic / market region for provider routing.
 * Each region maps to a primary + optional fallback provider.
 */
export type PaymentRegion = 'international' | 'morocco' | 'africa' | 'enterprise' | 'future';

/**
 * Region → Provider mapping configuration.
 * Not hardcoded — can be loaded from DB, env, or config file.
 */
export interface RegionProviderConfig {
  region: PaymentRegion;
  primaryProvider: PaymentProviderId;
  fallbackProvider?: PaymentProviderId;
  currencies: string[];
  countries: string[];  // ISO 3166-1 alpha-2
}

// ── Provider Identifiers ────────────────────────────────────────────────────

/**
 * All supported payment provider identifiers.
 * Adding a new provider = adding a member here + implementing IPaymentProvider.
 */
export type PaymentProviderId =
  | 'stripe'
  | 'paymob'
  | 'lemonsqueezy'
  | 'payzone'
  | 'invoice'
  | 'dev_simulator';

// ── Checkout Request (what the frontend sends) ──────────────────────────────

/**
 * Provider-agnostic checkout request.
 * The frontend NEVER specifies which provider to use — the region router decides.
 */
/**
 * Client type — determines payment routing behavior.
 * - b2c: Individual candidate/seeker (default)
 * - b2b: Employer/recruiter buying subscriptions
 * - enterprise: Large organization with custom billing
 */
export type ClientType = 'b2c' | 'b2b' | 'enterprise';

export interface CheckoutRequest {
  userId: string;
  planId: string;           // 'starter' | 'pro' | 'career_plus' etc.
  amount: number;           // in cents (smallest currency unit)
  currency: string;         // 'EUR' | 'MAD' | 'USD' etc.
  country?: string;         // ISO 3166-1 alpha-2, detected or provided
  paymentMethod?: string;   // 'card' | 'mobile' | 'bank_transfer' | 'wallet'
  clientType?: ClientType;  // b2c (default), b2b, enterprise
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

// ── Checkout Response (what the frontend receives — PROVIDER-AGNOSTIC) ──────

/**
 * Provider-agnostic checkout response.
 * The user NEVER sees which provider was used.
 * In development mode, `_debug` is attached with routing details.
 */
export interface CheckoutResponse {
  checkoutId: string;           // Our internal ID
  status: 'requires_action' | 'processing' | 'succeeded' | 'failed';
  redirectUrl?: string;         // URL to redirect user (Stripe Checkout, PayMob, etc.)
  clientSecret?: string;        // For client-side confirmation (Stripe)
  providerTransactionId?: string;
  /** Only populated in dev mode — NEVER exposed in production */
  _debug?: {
    provider: PaymentProviderId;
    region: PaymentRegion;
    routingReason: string;
  };
}

// ── Payment Status Response ─────────────────────────────────────────────────

/**
 * Provider-agnostic payment status response.
 */
export interface PaymentStatusResponse {
  checkoutId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  paidAt?: string;
  providerTransactionId?: string;
}

// ── Provider Interface (Strategy Pattern) ───────────────────────────────────

/**
 * Every payment provider MUST implement this interface.
 * This is the contract that allows any provider to be plugged in
 * without modifying consumer code.
 */
export interface IPaymentProvider {
  readonly id: PaymentProviderId;
  readonly name: string;
  readonly region: PaymentRegion;

  /** Create a checkout session with the provider */
  createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult>;

  /** Verify/retrieve the status of a payment from the provider */
  verifyPayment(transactionId: string): Promise<ProviderPaymentStatus>;

  /** Process and verify an incoming webhook from the provider */
  processWebhook(payload: unknown, signature: string): Promise<WebhookResult>;

  /** Refund a payment (full or partial) */
  refund(transactionId: string, amount?: number): Promise<RefundResult>;

  /** Capability flags — used by the router for smart provider selection */
  readonly capabilities: ProviderCapabilities;
}

// ── Provider-Level Types ────────────────────────────────────────────────────

/**
 * Parameters passed to a provider's createCheckout method.
 * Translated from CheckoutRequest by the checkout orchestrator.
 */
export interface ProviderCheckoutParams {
  amount: number;
  currency: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, unknown>;
}

/**
 * Result returned by a provider's createCheckout method.
 */
export interface ProviderCheckoutResult {
  providerTransactionId: string;
  redirectUrl?: string;
  clientSecret?: string;
  status: 'requires_action' | 'processing' | 'succeeded';
}

/**
 * Payment status returned by a provider's verifyPayment method.
 */
export interface ProviderPaymentStatus {
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  amount?: number;
  currency?: string;
  paidAt?: string;
}

/**
 * Webhook processing result returned by a provider.
 */
export interface WebhookResult {
  verified: boolean;
  eventType: string;
  transactionId?: string;
  data?: Record<string, unknown>;
}

/**
 * Refund result returned by a provider.
 */
export interface RefundResult {
  refundId: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
}

/**
 * Provider capability flags.
 * Used by the region router to select the best provider for a given request.
 */
export interface ProviderCapabilities {
  recurring: boolean;
  refund: boolean;
  webhook: boolean;
  tokenization: boolean;
  mobileMoney: boolean;
}

// ── Routing Decision ────────────────────────────────────────────────────────

/**
 * Routing decision made by the region router.
 * Contains the selected provider, region, and a human-readable reason.
 */
export interface RoutingDecision {
  provider: PaymentProviderId;
  region: PaymentRegion;
  reason: string;
}

// ── Plan Pricing (provider-agnostic) ────────────────────────────────────────

/**
 * Plan pricing information returned by the GET endpoint.
 * No provider details — just what the user sees.
 */
export interface PlanPricing {
  planId: string;
  name: string;
  amount: number;       // in cents
  currency: string;
  displayPrice: string; // formatted for display, e.g. "9,90 € / mois"
  interval: 'month' | 'year';
  features: string[];
}
