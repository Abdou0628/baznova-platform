/**
 * PayMob Adapter — Morocco MAD payments
 *
 * Wraps the existing @/lib/paymob functions behind the unified IPaymentGateway interface.
 * Does NOT rewrite any PayMob logic — all actual API calls go through the existing module.
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
import { GatewayNotImplementedError as NotImplemented, GatewayNotConfiguredError } from '../types'
import {
  isPaymobConfigured,
  createPaymobCheckout,
  verifyPaymobWebhook,
  extractPlanFromMerchantOrderId,
  PAYMOB_PRICES,
  type PaymobPlan,
} from '@/lib/paymob'
import { db } from '@/lib/db'

// ─── PayMob PlanId → PaymobPlan mapping ────────────────

const PLAN_ID_TO_PAYMOB: Record<string, PaymobPlan> = {
  starter: 'starter',
  pro: 'pro',
  career_plus: 'career_plus',
  employer: 'employer',
  annual: 'annual',
}

// ─── Adapter ───────────────────────────────────────────

class PaymobGateway implements IPaymentGateway {
  readonly id = 'paymob' as const
  private _isActive = false
  private _config: GatewayConfig = {
    id: 'paymob',
    name: 'PayMob',
    displayName: {
      fr: 'PayMob',
      en: 'PayMob',
      ar: 'باي موب',
      es: 'PayMob',
    },
    supportedCurrencies: ['MAD'],
    isActive: false,
    region: 'morocco',
  }

  get config(): GatewayConfig {
    return this._config
  }

  // ─── Lifecycle ───────────────────────────────────────

  async initialize(): Promise<void> {
    if (!isPaymobConfigured()) {
      throw new GatewayNotConfiguredError('paymob', 'PayMob adapter requires PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID environment variables')
    }
    this._isActive = true
    this._config = { ...this._config, isActive: true }
  }

  // ─── Checkout ────────────────────────────────────────

  async createCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const pmPlan = PLAN_ID_TO_PAYMOB[request.planId]
    if (!pmPlan) {
      return {
        success: false,
        status: 'failed',
        gatewayId: this.id,
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
        error: `Unsupported plan for PayMob: ${request.planId}`,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const result = await createPaymobCheckout({
        userId: request.userId,
        userEmail: request.email,
        userName: request.metadata?.name || request.email.split('@')[0],
        planType: pmPlan,
        billingData: request.metadata ? {
          firstName: request.metadata.firstName,
          lastName: request.metadata.lastName,
          email: request.metadata.email,
          phoneNumber: request.metadata.phoneNumber,
          city: request.metadata.city,
          country: request.metadata.country,
          postalCode: request.metadata.postalCode,
          street: request.metadata.street,
          building: request.metadata.building,
          apartment: request.metadata.apartment,
          floor: request.metadata.floor,
          state: request.metadata.state,
        } : undefined,
      })

      // Store the PayMob order ID on the user for webhook correlation
      await db.user.update({
        where: { id: request.userId },
        data: { paymobOrderId: result.orderId },
      })

      return {
        success: true,
        status: 'pending',
        gatewayId: this.id,
        checkoutUrl: result.paymentUrl,
        orderId: result.orderId,
        userId: request.userId,
        planId: request.planId,
        amount: PAYMOB_PRICES[pmPlan] * 100, // convert to cents for consistency
        currency: 'MAD',
        timestamp: new Date().toISOString(),
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        gatewayId: this.id,
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
        error: err instanceof Error ? err.message : 'PayMob checkout failed',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Webhook ─────────────────────────────────────────

  async processWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const rawPayload = payload.rawBody as Record<string, unknown>

    // Verify HMAC signature
    if (!verifyPaymobWebhook(rawPayload)) {
      return {
        success: false,
        status: 'failed',
        error: 'HMAC verification failed',
      }
    }

    const obj = rawPayload.obj as Record<string, unknown> | undefined
    if (!obj) {
      return { success: false, status: 'failed', error: 'Missing obj in payload' }
    }

    const success = obj.success as boolean
    const orderId = (obj.order as Record<string, unknown>)?.id?.toString()
    const transactionId = obj.id?.toString()

    if (!success || !orderId) {
      return {
        success: true,
        status: 'failed',
        transactionId,
      }
    }

    // Find user by PayMob order ID
    const user = await db.user.findFirst({
      where: { paymobOrderId: orderId },
    })

    if (!user) {
      return {
        success: false,
        status: 'failed',
        error: `No user found for PayMob order ${orderId}`,
        transactionId,
      }
    }

    // Determine plan type from merchant_order_id
    let planId: string | undefined
    try {
      // Fetch order details from PayMob to get merchant_order_id
      // Note: getAuthToken is a private function in paymob.ts, accessed via dynamic import
      const paymobModule = await import('@/lib/paymob') as any
      const token = await paymobModule.getAuthToken()
      const orderRes = await fetch(
        `https://accept.paymob.com/api/ecommerce/orders/${orderId}/`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (orderRes.ok) {
        const orderData = (await orderRes.json()) as Record<string, unknown>
        const mid = (orderData.merchant_order_id as string) || ''
        const extracted = extractPlanFromMerchantOrderId(mid)
        if (extracted) planId = extracted
      }
    } catch {
      // Fall through — planId may remain undefined
    }

    // Fallback: amount-based detection
    if (!planId) {
      const { PAYMOB_AMOUNT_TO_PLAN } = await import('@/lib/paymob')
      const amountCents = Math.round((obj.amount_cents as number) / 100)
      planId = PAYMOB_AMOUNT_TO_PLAN[amountCents] || 'pro'
    }

    // Update user plan
    await db.user.update({
      where: { id: user.id },
      data: {
        plan: planId as PaymobPlan,
        paymobPaymentId: transactionId,
        paymobProvider: ((obj.source_data as Record<string, unknown>)?.type as string) || 'card',
      },
    })

    return {
      success: true,
      userId: user.id,
      planId: planId as PaymentResult['planId'],
      status: 'confirmed',
      transactionId,
    }
  }

  // ─── Payment Status ──────────────────────────────────

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      const paymobModule = await import('@/lib/paymob') as any
      const token = await paymobModule.getAuthToken()
      const res = await fetch(
        `https://accept.paymob.com/api/acceptance/transactions/${transactionId}/`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return 'failed'

      const data = (await res.json()) as Record<string, unknown>
      // PayMob transaction pending/success/failure
      if (data.success === true) return 'confirmed'
      if (data.is_refunded === true) return 'refunded'
      if (data.voided === true || data.is_voided === true) return 'cancelled'
      if (data.pending === true) return 'processing'
      return 'failed'
    } catch {
      return 'failed'
    }
  }

  // ─── Refund (not yet supported by existing PayMob module) ──

  async processRefund(_request: RefundRequest): Promise<RefundResult> {
    throw new NotImplemented('paymob', 'processRefund')
  }

  // ─── Subscription Management ─────────────────────────

  async cancelSubscription(_userId: string): Promise<boolean> {
    throw new NotImplemented('paymob', 'cancelSubscription')
  }

  async getSubscriptionStatus(_userId: string): Promise<SubscriptionStatus | null> {
    // PayMob one-time payments don't have subscription status
    // Return null to indicate no subscription management
    return null
  }
}

export const paymobGateway = new PaymobGateway()
