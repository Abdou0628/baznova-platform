/**
 * Payzone Adapter — Placeholder for Payzone Payment Gateway
 *
 * Payzone is a payment provider targeting African markets.
 * This adapter is a structural placeholder — all methods throw NOT_CONFIGURED
 * until Payzone API credentials and integration are provided.
 *
 * TODO: Implement Payzone-specific integration:
 *   1. Set environment variables: PAYZONE_API_KEY, PAYZONE_MERCHANT_ID, PAYZONE_SECRET
 *   2. Implement createCheckout() — call Payzone's payment session API
 *   3. Implement processWebhook() — verify Payzone signature, extract payment data
 *   4. Implement getPaymentStatus() — query Payzone transaction status API
 *   5. Implement processRefund() — call Payzone refund endpoint
 *   6. Implement cancelSubscription() / getSubscriptionStatus() if Payzone supports subs
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

// TODO: Replace with actual Payzone SDK/API client imports when available
// import { PayzoneClient } from 'payzone-sdk'

const PAYZONE_API_KEY = process.env.PAYZONE_API_KEY || ''
const PAYZONE_MERCHANT_ID = process.env.PAYZONE_MERCHANT_ID || ''
const PAYZONE_SECRET = process.env.PAYZONE_SECRET || ''

// ─── Adapter ───────────────────────────────────────────

class PayzoneGateway implements IPaymentGateway {
  readonly id = 'payzone' as const
  private _config: GatewayConfig = {
    id: 'payzone',
    name: 'Payzone',
    displayName: {
      fr: 'Payzone',
      en: 'Payzone',
      ar: 'بايزون',
      es: 'Payzone',
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'MAD'], // TODO: verify Payzone supported currencies
    isActive: false,
    region: 'africa',
  }

  get config(): GatewayConfig {
    return this._config
  }

  // ─── Lifecycle ───────────────────────────────────────

  async initialize(): Promise<void> {
    // TODO: Validate Payzone credentials by making a test API call
    // Example:
    //   const client = new PayzoneClient({ apiKey: PAYZONE_API_KEY, merchantId: PAYZONE_MERCHANT_ID })
    //   await client.validateCredentials()

    if (!PAYZONE_API_KEY || !PAYZONE_MERCHANT_ID || !PAYZONE_SECRET) {
      throw new GatewayNotConfiguredError(
        'payzone',
        'Payzone adapter requires PAYZONE_API_KEY, PAYZONE_MERCHANT_ID, and PAYZONE_SECRET environment variables',
      )
    }

    // TODO: Uncomment when real validation is implemented:
    // this._isActive = true
    // this._config = { ...this._config, isActive: true }

    throw new GatewayNotConfiguredError('payzone')
  }

  // ─── Checkout ────────────────────────────────────────

  async createCheckout(_request: PaymentRequest): Promise<PaymentResult> {
    throw new GatewayNotConfiguredError('payzone')

    // TODO: Implement Payzone checkout flow
    // Example:
    //   const client = new PayzoneClient({ apiKey: PAYZONE_API_KEY, merchantId: PAYZONE_MERCHANT_ID })
    //   const session = await client.createPaymentSession({
    //     amount: request.amount,
    //     currency: request.currency,
    //     merchantReference: `hirenova-${request.planId}-${request.userId}`,
    //     returnUrl: `${baseUrl}/?checkout=success&plan=${request.planId}&provider=payzone`,
    //     cancelUrl: `${baseUrl}/?checkout=canceled`,
    //     customer: { email: request.email, name: request.metadata?.name },
    //   })
    //   return {
    //     success: true,
    //     status: 'pending',
    //     gatewayId: this.id,
    //     checkoutUrl: session.paymentUrl,
    //     orderId: session.reference,
    //     userId: request.userId,
    //     planId: request.planId,
    //     amount: request.amount,
    //     currency: request.currency,
    //     timestamp: new Date().toISOString(),
    //   }
  }

  // ─── Webhook ─────────────────────────────────────────

  async processWebhook(_payload: WebhookPayload): Promise<WebhookResult> {
    throw new GatewayNotConfiguredError('payzone')

    // TODO: Implement Payzone webhook verification
    // Example:
    //   const isValid = verifyPayzoneSignature(payload.rawBody, PAYZONE_SECRET)
    //   if (!isValid) return { success: false, status: 'failed', error: 'Invalid signature' }
    //   const body = payload.rawBody as PayzoneWebhookBody
    //   return {
    //     success: body.status === 'successful',
    //     userId: body.merchantReference.split('-')[2],
    //     planId: body.merchantReference.split('-')[1],
    //     status: body.status === 'successful' ? 'confirmed' : 'failed',
    //     transactionId: body.transactionId,
    //   }
  }

  // ─── Payment Status ──────────────────────────────────

  async getPaymentStatus(_transactionId: string): Promise<PaymentStatus> {
    throw new GatewayNotConfiguredError('payzone')

    // TODO: Query Payzone transaction status
    // Example:
    //   const client = new PayzoneClient({ apiKey: PAYZONE_API_KEY, merchantId: PAYZONE_MERCHANT_ID })
    //   const tx = await client.getTransaction(_transactionId)
    //   return mapPayzoneStatus(tx.status)
  }

  // ─── Refund ──────────────────────────────────────────

  async processRefund(_request: RefundRequest): Promise<RefundResult> {
    throw new GatewayNotConfiguredError('payzone')

    // TODO: Implement Payzone refund
    // Example:
    //   const client = new PayzoneClient({ apiKey: PAYZONE_API_KEY, merchantId: PAYZONE_MERCHANT_ID })
    //   const refund = await client.createRefund({ transactionId: request.transactionId, reason: request.reason })
    //   return { success: true, refundId: refund.id, status: 'refunded' }
  }

  // ─── Subscription Management ─────────────────────────

  async cancelSubscription(_userId: string): Promise<boolean> {
    throw new GatewayNotConfiguredError('payzone')
    // TODO: Implement if Payzone supports subscriptions
  }

  async getSubscriptionStatus(_userId: string): Promise<SubscriptionStatus | null> {
    throw new GatewayNotConfiguredError('payzone')
    // TODO: Implement if Payzone supports subscriptions
  }
}

export const payzoneGateway = new PayzoneGateway()
