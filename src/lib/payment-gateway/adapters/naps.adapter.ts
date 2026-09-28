/**
 * NAPS Adapter — Placeholder for NAPS Payment Gateway
 *
 * NAPS (National Payment Services) targets Moroccan and North African markets.
 * This adapter is a structural placeholder — all methods throw NOT_CONFIGURED
 * until NAPS API credentials and integration are provided.
 *
 * TODO: Implement NAPS-specific integration:
 *   1. Set environment variables: NAPS_API_KEY, NAPS_MERCHANT_ID, NAPS_TERMINAL_ID, NAPS_HMAC_SECRET
 *   2. Implement createCheckout() — call NAPS payment initialization API
 *   3. Implement processWebhook() — verify NAPS HMAC signature, extract payment data
 *   4. Implement getPaymentStatus() — query NAPS transaction status API
 *   5. Implement processRefund() — call NAPS refund endpoint
 *   6. Implement cancelSubscription() / getSubscriptionStatus() if NAPS supports subs
 *   7. Set isActive = true in initialize() once credentials are validated
 */

import type {
  IPaymentGateway,
  GatewayConfig,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  WebhookPayload,
  WebhookResult,
  RefundRequest,
  RefundResult,
  SubscriptionStatus,
} from '../types'
import { GatewayNotConfiguredError } from '../types'

// TODO: Replace with actual NAPS SDK/API client imports when available
// import { NapsClient } from 'naps-sdk'

const NAPS_API_KEY = process.env.NAPS_API_KEY || ''
const NAPS_MERCHANT_ID = process.env.NAPS_MERCHANT_ID || ''
const NAPS_TERMINAL_ID = process.env.NAPS_TERMINAL_ID || ''
const NAPS_HMAC_SECRET = process.env.NAPS_HMAC_SECRET || ''

// ─── Adapter ───────────────────────────────────────────

class NapsGateway implements IPaymentGateway {
  readonly id = 'naps' as const
  private _config: GatewayConfig = {
    id: 'naps',
    name: 'NAPS',
    displayName: {
      fr: 'NAPS',
      en: 'NAPS',
      ar: 'نابس',
      es: 'NAPS',
    },
    supportedCurrencies: ['MAD'], // NAPS primarily supports Moroccan Dirham
    isActive: false,
    region: 'morocco',
  }

  get config(): GatewayConfig {
    return this._config
  }

  // ─── Lifecycle ───────────────────────────────────────

  async initialize(): Promise<void> {
    // TODO: Validate NAPS credentials by making a test API call
    // Example:
    //   const client = new NapsClient({ apiKey: NAPS_API_KEY, merchantId: NAPS_MERCHANT_ID })
    //   await client.validateCredentials()

    if (!NAPS_API_KEY || !NAPS_MERCHANT_ID || !NAPS_TERMINAL_ID || !NAPS_HMAC_SECRET) {
      throw new GatewayNotConfiguredError(
        'naps',
        'NAPS adapter requires NAPS_API_KEY, NAPS_MERCHANT_ID, NAPS_TERMINAL_ID, and NAPS_HMAC_SECRET environment variables',
      )
    }

    // TODO: Uncomment when real validation is implemented:
    // this._isActive = true
    // this._config = { ...this._config, isActive: true }

    throw new GatewayNotConfiguredError('naps')
  }

  // ─── Checkout ────────────────────────────────────────

  async createCheckout(_request: PaymentRequest): Promise<PaymentResult> {
    throw new GatewayNotConfiguredError('naps')

    // TODO: Implement NAPS checkout flow
    // Example:
    //   const client = new NapsClient({ apiKey: NAPS_API_KEY, merchantId: NAPS_MERCHANT_ID, terminalId: NAPS_TERMINAL_ID })
    //   const payment = await client.initiatePayment({
    //     amount: request.amount,  // NAPS may expect dirhams, not cents — verify docs
    //     currency: 'MAD',
    //     orderId: `baznova-${request.planId}-${request.userId}-${Date.now()}`,
    //     customerEmail: request.email,
    //     returnUrl: `${baseUrl}/?checkout=success&plan=${request.planId}&provider=naps`,
    //     cancelUrl: `${baseUrl}/?checkout=canceled`,
    //   })
    //   return {
    //     success: true,
    //     status: 'pending',
    //     gatewayId: this.id,
    //     checkoutUrl: payment.redirectUrl,
    //     orderId: payment.orderId,
    //     userId: request.userId,
    //     planId: request.planId,
    //     amount: request.amount,
    //     currency: 'MAD',
    //     timestamp: new Date().toISOString(),
    //   }
  }

  // ─── Webhook ─────────────────────────────────────────

  async processWebhook(_payload: WebhookPayload): Promise<WebhookResult> {
    throw new GatewayNotConfiguredError('naps')

    // TODO: Implement NAPS webhook verification
    // Example:
    //   const isValid = verifyNapsSignature(payload.rawBody, NAPS_HMAC_SECRET)
    //   if (!isValid) return { success: false, status: 'failed', error: 'Invalid signature' }
    //   const body = payload.rawBody as NapsWebhookBody
    //   // Extract orderId to get userId and planId (encoded in merchant reference)
    //   return {
    //     success: body.paymentStatus === 'SUCCESS',
    //     status: body.paymentStatus === 'SUCCESS' ? 'confirmed' : 'failed',
    //     transactionId: body.transactionId,
    //   }
  }

  // ─── Payment Status ──────────────────────────────────

  async getPaymentStatus(_transactionId: string): Promise<PaymentStatus> {
    throw new GatewayNotConfiguredError('naps')

    // TODO: Query NAPS transaction status
    // Example:
    //   const client = new NapsClient({ apiKey: NAPS_API_KEY, merchantId: NAPS_MERCHANT_ID, terminalId: NAPS_TERMINAL_ID })
    //   const tx = await client.queryTransaction(_transactionId)
    //   return mapNapsStatus(tx.statusCode)
  }

  // ─── Refund ──────────────────────────────────────────

  async processRefund(_request: RefundRequest): Promise<RefundResult> {
    throw new GatewayNotConfiguredError('naps')

    // TODO: Implement NAPS refund
    // Example:
    //   const client = new NapsClient({ apiKey: NAPS_API_KEY, merchantId: NAPS_MERCHANT_ID, terminalId: NAPS_TERMINAL_ID })
    //   const refund = await client.initiateRefund({ transactionId: request.transactionId, reason: request.reason })
    //   return { success: true, refundId: refund.refundId, status: 'refunded' }
  }

  // ─── Subscription Management ─────────────────────────

  async cancelSubscription(_userId: string): Promise<boolean> {
    throw new GatewayNotConfiguredError('naps')
    // TODO: Implement if NAPS supports subscriptions
  }

  async getSubscriptionStatus(_userId: string): Promise<SubscriptionStatus | null> {
    throw new GatewayNotConfiguredError('naps')
    // TODO: Implement if NAPS supports subscriptions
  }
}

export const napsGateway = new NapsGateway()