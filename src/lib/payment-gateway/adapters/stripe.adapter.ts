/**
 * Stripe Adapter — International EUR/USD/GBP payments
 *
 * Wraps the existing @/lib/stripe functions and the Stripe SDK behind the
 * unified IPaymentGateway interface. Does NOT rewrite Stripe logic.
 */

import Stripe from 'stripe'
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
  stripe,
  isStripeConfigured,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_IDS,
  PLAN_PRICES,
  type BazNovaPlan,
  type Currency as StripeCurrency,
} from '@/lib/stripe'
import { db } from '@/lib/db'

// ─── Mappings ──────────────────────────────────────────

const PLAN_ID_TO_STRIPE: Record<string, BazNovaPlan> = {
  starter: 'starter',
  pro: 'pro',
  career_plus: 'career_plus',
  employer: 'employer',
  annual: 'annual',
}

const CURRENCY_MAP: Record<string, StripeCurrency> = {
  EUR: 'eur',
  USD: 'usd',
  GBP: 'gbp',
}

// ─── Adapter ───────────────────────────────────────────

class StripeGateway implements IPaymentGateway {
  readonly id = 'stripe' as const
  private _isActive = false
  private _config: GatewayConfig = {
    id: 'stripe',
    name: 'Stripe',
    displayName: {
      fr: 'Stripe',
      en: 'Stripe',
      ar: 'سترايب',
      es: 'Stripe',
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
    if (!isStripeConfigured()) {
      throw new GatewayNotConfiguredError('stripe', 'Stripe adapter requires STRIPE_SECRET_KEY environment variable')
    }
    // Validate that the SDK is functional by listing a limit of products
    // (a lightweight call that confirms the API key works)
    try {
      await stripe.products.list({ limit: 1 })
    } catch (err) {
      throw new GatewayNotConfiguredError(
        'stripe',
        `Stripe API key validation failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    this._isActive = true
    this._config = { ...this._config, isActive: true }
  }

  // ─── Checkout ────────────────────────────────────────

  async createCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const stripePlan = PLAN_ID_TO_STRIPE[request.planId]
    const stripeCurrency = CURRENCY_MAP[request.currency]
    if (!stripePlan || !stripeCurrency) {
      return {
        success: false,
        status: 'failed',
        gatewayId: this.id,
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
        error: `Unsupported plan/currency for Stripe: ${request.planId}/${request.currency}`,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      // Ensure the user has a Stripe customer ID
      let customerId = await this._getOrCreateCustomerId(
        request.userId,
        request.email,
        request.metadata?.name,
      )

      const priceId = STRIPE_PRICE_IDS[stripeCurrency]?.[stripePlan]
      if (!priceId || !priceId.startsWith('price_')) {
        return {
          success: false,
          status: 'failed',
          gatewayId: this.id,
          userId: request.userId,
          planId: request.planId,
          amount: request.amount,
          currency: request.currency,
          error: `Stripe price ID not configured for ${stripePlan}/${stripeCurrency}`,
          timestamp: new Date().toISOString(),
        }
      }

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const isAnnual = stripePlan === 'annual'

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: isAnnual ? 'payment' : 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/?checkout=success&plan=${stripePlan}&provider=stripe`,
        cancel_url: `${baseUrl}/?checkout=canceled`,
        metadata: {
          userId: request.userId,
          planType: stripePlan,
          currency: stripeCurrency,
        },
        allow_promotion_codes: true,
        subscription_data: isAnnual
          ? undefined
          : {
              metadata: { userId: request.userId, planType: stripePlan, currency: stripeCurrency },
            },
      })

      return {
        success: true,
        status: 'pending',
        gatewayId: this.id,
        transactionId: session.id,
        checkoutUrl: session.url || undefined,
        orderId: session.id,
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
        error: err instanceof Error ? err.message : 'Stripe checkout failed',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Webhook ─────────────────────────────────────────

  async processWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    if (!payload.signature || !STRIPE_WEBHOOK_SECRET) {
      return {
        success: false,
        status: 'failed',
        error: 'Missing signature or STRIPE_WEBHOOK_SECRET',
      }
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload.rawBody as string,
        payload.signature,
        STRIPE_WEBHOOK_SECRET,
      )

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const userId = session.metadata?.userId
          const planType = session.metadata?.planType
          const status: PaymentStatus = session.payment_status === 'paid' ? 'confirmed' : 'pending'

          if (userId) {
            await db.user.update({
              where: { id: userId },
              data: {
                plan: (PLAN_ID_TO_STRIPE[planType || ''] || 'pro') as BazNovaPlan,
                stripeCustomerId: (session.customer as string) || undefined,
              },
            })
          }

          return {
            success: true,
            userId,
            planId: planType as WebhookResult['planId'],
            status,
            transactionId: session.payment_intent as string || session.id,
          }
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice
          const customerId = invoice.customer as string
          const user = customerId
            ? await db.user.findFirst({ where: { stripeCustomerId: customerId } })
            : null
          return {
            success: true,
            userId: user?.id,
            status: 'confirmed',
            transactionId: (invoice as any).payment_intent as string || invoice.id,
          }
        }

        case 'invoice.payment_failed': {
          return {
            success: true,
            status: 'failed',
          }
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
          const user = customerId
            ? await db.user.findFirst({ where: { stripeCustomerId: customerId } })
            : null
          if (user && user.plan !== 'lifetime') {
            await db.user.update({ where: { id: user.id }, data: { plan: 'free' } })
          }
          return {
            success: true,
            userId: user?.id,
            status: 'cancelled',
            transactionId: sub.id,
          }
        }

        default:
          return {
            success: true,
            status: 'processing',
          }
      }
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
      const session = await stripe.checkout.sessions.retrieve(transactionId)
      switch (session.payment_status) {
        case 'paid':
          return 'confirmed'
        case 'unpaid':
          return 'pending'
        default:
          return 'processing'
      }
    } catch {
      return 'failed'
    }
  }

  // ─── Refund ──────────────────────────────────────────

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: request.transactionId,
        reason: 'requested_by_customer',
        metadata: { userId: request.userId, reason: request.reason || '' },
      })

      return {
        success: refund.status !== 'failed',
        refundId: refund.id,
        status: refund.status === 'succeeded' ? 'refunded' : 'processing',
        error: refund.failure_reason || undefined,
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Stripe refund failed',
      }
    }
  }

  // ─── Subscription Management ─────────────────────────

  async cancelSubscription(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })
    if (!user?.stripeCustomerId) return false

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
      })
      if (subscriptions.data.length === 0) return false

      await stripe.subscriptions.cancel(subscriptions.data[0].id)
      return true
    } catch {
      return false
    }
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, plan: true },
    })
    if (!user?.stripeCustomerId) return null

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
      })
      const sub = subscriptions.data[0]
      if (!sub) return null

      return {
        userId,
        planId: (user.plan || 'free') as SubscriptionStatus['planId'],
        gatewayId: 'stripe',
        status: sub.status === 'active' ? 'active'
          : sub.status === 'canceled' ? 'cancelled'
          : sub.status === 'past_due' ? 'past_due'
          : 'expired',
        currentPeriodStart: new Date((sub as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: (sub as any).cancel_at_period_end ?? false,
      }
    } catch {
      return null
    }
  }

  // ─── Private Helpers ─────────────────────────────────

  private async _getOrCreateCustomerId(
    userId: string,
    email: string,
    name?: string,
  ): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (user?.stripeCustomerId) return user.stripeCustomerId

    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    })

    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    })

    return customer.id
  }
}

export const stripeGateway = new StripeGateway()
