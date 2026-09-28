/**
 * LemonSqueezy Adapter — International EUR/USD/GBP payments
 *
 * Wraps the existing @/lib/lemonsqueezy module and the LemonSqueezy JS SDK
 * behind the unified IPaymentGateway interface.
 */

import { createHmac } from 'crypto'
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
import { GatewayNotImplementedError, GatewayNotConfiguredError } from '../types'
import {
  STORE_ID,
  VARIANTS,
  getPlans,
  type PlanType as LSPlanType,
} from '@/lib/lemonsqueezy'
import { db } from '@/lib/db'

// ─── Mappings ──────────────────────────────────────────

const PLAN_ID_TO_LS: Record<string, LSPlanType> = {
  starter: 'starter',
  pro: 'pro',
  career_plus: 'career_plus',
  employer: 'employer',
  annual: 'annual',
}

const CURRENCY_MAP: Record<string, 'eur' | 'usd' | 'gbp'> = {
  EUR: 'eur',
  USD: 'usd',
  GBP: 'gbp',
}

// ─── Adapter ───────────────────────────────────────────

class LemonSqueezyGateway implements IPaymentGateway {
  readonly id = 'lemonsqueezy' as const
  private _isActive = false
  private _config: GatewayConfig = {
    id: 'lemonsqueezy',
    name: 'LemonSqueezy',
    displayName: {
      fr: 'LemonSqueezy',
      en: 'LemonSqueezy',
      ar: 'ليمون سكويزي',
      es: 'LemonSqueezy',
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    isActive: false,
    region: 'international',
  }

  get config(): GatewayConfig {
    return this._config
  }

  // ─── Lifecycle ───────────────────────────────────────

  async initialize(): Promise<void> {
    if (!STORE_ID || STORE_ID.startsWith('variant_')) {
      throw new GatewayNotConfiguredError(
        'lemonsqueezy',
        'LemonSqueezy adapter requires LS_STORE_ID environment variable',
      )
    }
    this._isActive = true
    this._config = { ...this._config, isActive: true }
  }

  // ─── Checkout ────────────────────────────────────────

  async createCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const lsPlan = PLAN_ID_TO_LS[request.planId]
    const lsCurrency = CURRENCY_MAP[request.currency]
    if (!lsPlan || !lsCurrency) {
      return {
        success: false,
        status: 'failed',
        gatewayId: this.id,
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
        error: `Unsupported plan/currency for LemonSqueezy: ${request.planId}/${request.currency}`,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const { createCheckout } = await import('@lemonsqueezy/lemonsqueezy.js')
      const plans = getPlans(lsCurrency)
      const plan = plans[lsPlan]

      if (!plan || plan.variantId.startsWith('variant_')) {
        return {
          success: false,
          status: 'failed',
          gatewayId: this.id,
          userId: request.userId,
          planId: request.planId,
          amount: request.amount,
          currency: request.currency,
          error: `LemonSqueezy variant not configured for ${lsPlan}/${lsCurrency}`,
          timestamp: new Date().toISOString(),
        }
      }

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      const { data, error } = await createCheckout(
        STORE_ID,
        plan.variantId,
        {
          checkoutData: {
            email: request.email,
            name: request.metadata?.name || undefined,
            custom: {
              userId: request.userId,
              planType: lsPlan,
              currency: lsCurrency,
            },
          },
          checkoutOptions: {
            redirectUrl: `${baseUrl}/?checkout=success&plan=${lsPlan}&provider=lemonsqueezy`,
            cancelUrl: `${baseUrl}/?checkout=canceled`,
            embed: false,
          },
          productOptions: {
            enabledVariants: [plan.variantId],
            isSubscription: lsPlan !== 'annual',
          },
        } as any,
      )

      if (error || !data?.data?.attributes?.url) {
        return {
          success: false,
          status: 'failed',
          gatewayId: this.id,
          userId: request.userId,
          planId: request.planId,
          amount: request.amount,
          currency: request.currency,
          error: error?.message || 'LemonSqueezy checkout creation failed',
          timestamp: new Date().toISOString(),
        }
      }

      // Store LS customer ID on the user
      const attrs = data.data.attributes as Record<string, unknown>
      const customerId = attrs?.customer_id?.toString()
      if (customerId) {
        await db.user.update({
          where: { id: request.userId },
          data: { lsCustomerId: customerId },
        })
      }

      return {
        success: true,
        status: 'pending',
        gatewayId: this.id,
        checkoutUrl: attrs?.url as string | undefined,
        orderId: attrs?.order_id?.toString(),
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
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
        error: err instanceof Error ? err.message : 'LemonSqueezy checkout failed',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Webhook ─────────────────────────────────────────

  async processWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    if (!secret) {
      return {
        success: false,
        status: 'failed',
        error: 'LEMONSQUEEZY_WEBHOOK_SECRET not configured',
      }
    }

    // Verify HMAC signature
    if (payload.signature) {
      const bodyStr = typeof payload.rawBody === 'string'
        ? payload.rawBody
        : JSON.stringify(payload.rawBody)
      const hmac = createHmac('sha256', secret).update(bodyStr).digest('hex')
      if (hmac !== payload.signature) {
        return { success: false, status: 'failed', error: 'Signature verification failed' }
      }
    }

    try {
      const body = (typeof payload.rawBody === 'string'
        ? JSON.parse(payload.rawBody)
        : payload.rawBody) as Record<string, unknown>

      const meta = body.meta as Record<string, unknown> | undefined
      const eventName = (meta?.event_name as string) || ''
      const customData = meta?.custom_data as Record<string, unknown> | undefined
      const data = body.data as Record<string, unknown> | undefined
      const attrs = data?.attributes as Record<string, unknown> | undefined

      const userId = customData?.userId as string | undefined
      const planType = customData?.planType as string | undefined
      const customerId = attrs?.customer_id?.toString()

      switch (eventName) {
        case 'order_created':
        case 'subscription_created': {
          if (!userId) {
            return { success: false, status: 'failed', error: 'Missing userId in custom_data' }
          }

          const validPlans = ['starter', 'pro', 'career_plus', 'employer', 'annual', 'lifetime', 'api', 'enterprise']
          const plan = validPlans.includes(planType || '') ? planType : 'pro'

          await db.user.update({
            where: { id: userId },
            data: {
              plan: plan as string,
              lsCustomerId: customerId || undefined,
              lsVariantId: attrs?.first_order_item?.toString?.() || undefined,
            },
          })

          return {
            success: true,
            userId,
            planId: plan as WebhookResult['planId'],
            status: 'confirmed',
            transactionId: data?.id?.toString(),
          }
        }

        case 'subscription_updated': {
          if (!customerId) break
          const user = await db.user.findFirst({ where: { lsCustomerId: customerId } })
          if (!user) break

          const status = attrs?.status as string
          const isActive = status === 'active'

          return {
            success: true,
            userId: user.id,
            status: isActive ? 'confirmed' : 'cancelled',
          }
        }

        case 'subscription_cancelled':
        case 'subscription_expired': {
          if (!customerId) break
          const user = await db.user.findFirst({ where: { lsCustomerId: customerId } })
          if (!user || user.plan === 'lifetime') break

          await db.user.update({
            where: { id: user.id },
            data: { plan: 'free', lsSubId: null },
          })

          return {
            success: true,
            userId: user.id,
            status: 'cancelled',
          }
        }

        default:
          return { success: true, status: 'processing' }
      }

      return { success: true, status: 'processing' }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  // ─── Payment Status ──────────────────────────────────

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      const { getOrder } = await import('@lemonsqueezy/lemonsqueezy.js')
      const { data, error } = await getOrder(transactionId as any)
      if (error || !data) return 'failed'

      const status = data.data.attributes.status
      if (status === 'paid') return 'confirmed'
      if (status === 'refunded') return 'refunded'
      if (status === 'failed') return 'failed'
      return 'processing'
    } catch {
      return 'failed'
    }
  }

  // ─── Refund ──────────────────────────────────────────

  async processRefund(_request: RefundRequest): Promise<RefundResult> {
    throw new GatewayNotImplementedError('lemonsqueezy', 'processRefund')
  }

  // ─── Subscription Management ─────────────────────────

  async cancelSubscription(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { lsSubId: true },
    })
    if (!user?.lsSubId) return false

    try {
      const { cancelSubscription } = await import('@lemonsqueezy/lemonsqueezy.js')
      const { error } = await cancelSubscription(user.lsSubId as any)
      return !error
    } catch {
      return false
    }
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { lsSubId: true, plan: true },
    })
    if (!user?.lsSubId) return null

    try {
      const { getSubscription } = await import('@lemonsqueezy/lemonsqueezy.js')
      const { data, error } = await getSubscription(user.lsSubId as any)
      if (error || !data) return null

      const attrs = data.data.attributes
      const status = attrs.status as string

      return {
        userId,
        planId: (user.plan || 'free') as SubscriptionStatus['planId'],
        gatewayId: 'lemonsqueezy',
        status: status === 'active' ? 'active'
          : status === 'cancelled' ? 'cancelled'
          : status === 'expired' ? 'expired'
          : status === 'past_due' ? 'past_due'
          : 'active',
        currentPeriodStart: attrs.created_at,
        currentPeriodEnd: attrs.ends_at || attrs.renews_at || '',
        cancelAtPeriodEnd: attrs.cancelled === true,
      }
    } catch {
      return null
    }
  }
}

export const lemonsqueezyGateway = new LemonSqueezyGateway()
