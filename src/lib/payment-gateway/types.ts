/**
 * HireNova Payment Gateway Abstraction Layer — Core Types
 *
 * Unified type definitions for all payment gateways.
 * Every gateway adapter must implement the IPaymentGateway interface.
 * New providers (Payzone, NAPS, etc.) plug in by implementing this interface.
 */

// ─── Primitive Types ───────────────────────────────────

export type GatewayId = 'stripe' | 'paymob' | 'lemonsqueezy' | 'payzone' | 'naps' | 'dev'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'cancelled'

export type Currency = 'EUR' | 'USD' | 'GBP' | 'MAD'

export type PlanId =
  | 'free'
  | 'starter'
  | 'pro'
  | 'career_plus'
  | 'employer'
  | 'enterprise'
  | 'annual'
  | 'api'

// ─── Gateway Configuration ─────────────────────────────

export interface GatewayConfig {
  id: GatewayId
  name: string
  displayName: Record<string, string> // { fr, en, ar, es }
  supportedCurrencies: Currency[]
  isActive: boolean
  region: 'international' | 'morocco' | 'africa'
}

// ─── Request / Result Types ────────────────────────────

export interface PaymentRequest {
  userId: string
  email: string
  planId: PlanId
  currency: Currency
  amount: number // in cents
  gatewayId: GatewayId
  metadata?: Record<string, string>
}

export interface PaymentResult {
  success: boolean
  status: PaymentStatus
  gatewayId: GatewayId
  transactionId?: string
  checkoutUrl?: string
  orderId?: string
  userId: string
  planId: PlanId
  amount: number
  currency: Currency
  error?: string
  timestamp: string
}

export interface WebhookPayload {
  gatewayId: GatewayId
  eventType: string
  rawBody: unknown
  signature?: string
}

export interface WebhookResult {
  success: boolean
  userId?: string
  planId?: PlanId
  status: PaymentStatus
  transactionId?: string
  error?: string
}

export interface RefundRequest {
  userId: string
  transactionId: string
  gatewayId: GatewayId
  reason?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  status: PaymentStatus
  error?: string
}

export interface SubscriptionStatus {
  userId: string
  planId: PlanId
  gatewayId: GatewayId
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

// ─── Core Interface ────────────────────────────────────

/**
 * Every payment gateway MUST implement this interface.
 * This is the contract that allows any gateway to be plugged in
 * without modifying consumer code.
 */
export interface IPaymentGateway {
  readonly id: GatewayId
  readonly config: GatewayConfig

  /** Initialize the gateway (load keys, validate config) */
  initialize(): Promise<void>

  /** Create a checkout session and return a redirect URL or result */
  createCheckout(request: PaymentRequest): Promise<PaymentResult>

  /** Verify and process an incoming webhook */
  processWebhook(payload: WebhookPayload): Promise<WebhookResult>

  /** Get the current status of a payment by transaction ID */
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>

  /** Process a refund for a given transaction */
  processRefund(request: RefundRequest): Promise<RefundResult>

  /** Cancel an active subscription for a user */
  cancelSubscription(userId: string): Promise<boolean>

  /** Get the current subscription status for a user */
  getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null>
}

// ─── Error Classes ─────────────────────────────────────

export class GatewayNotImplementedError extends Error {
  constructor(public readonly gatewayId: GatewayId, public readonly method: string) {
    super(`NOT_IMPLEMENTED: ${method} is not implemented for gateway '${gatewayId}'`)
    this.name = 'GatewayNotImplementedError'
  }
}

export class GatewayNotConfiguredError extends Error {
  constructor(public readonly gatewayId: GatewayId, message?: string) {
    super(message || `NOT_CONFIGURED: ${gatewayId} adapter requires API credentials`)
    this.name = 'GatewayNotConfiguredError'
  }
}

export class GatewayError extends Error {
  constructor(
    public readonly gatewayId: GatewayId,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${gatewayId}] ${message}`)
    this.name = 'GatewayError'
  }
}
