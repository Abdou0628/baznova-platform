/**
 * Dev Payment Adapter — Sandbox / Development Simulator
 *
 * Simulates the full payment lifecycle without any real provider.
 * Wraps the dev-payment logic that was previously in the checkout route.
 * Always active — no API credentials required.
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
import { GatewayNotImplementedError } from '../types'
import { db } from '@/lib/db'

// ─── Plan Prices for Dev Mode (base units, not cents) ──

const DEV_PRICES: Record<string, number> = {
  starter: 9,
  pro: 19,
  career_plus: 39,
  employer: 49,
  annual: 179,
}

// ─── Adapter ───────────────────────────────────────────

class DevGateway implements IPaymentGateway {
  readonly id = 'dev' as const
  private _config: GatewayConfig = {
    id: 'dev',
    name: 'Dev Simulator',
    displayName: {
      fr: 'Simulateur Dev',
      en: 'Dev Simulator',
      ar: 'محاكي التطوير',
      es: 'Simulador Dev',
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'MAD'],
    isActive: true, // always active
    region: 'international',
  }

  get config(): GatewayConfig {
    return this._config
  }

  // ─── Lifecycle ───────────────────────────────────────

  async initialize(): Promise<void> {
    // Dev gateway is always ready — no config needed
    console.log('[DevGateway] Initialized (no credentials required)')
  }

  // ─── Checkout (Simulated) ────────────────────────────

  async createCheckout(request: PaymentRequest): Promise<PaymentResult> {
    const basePrice = DEV_PRICES[request.planId] ?? 19
    // Convert currency multiplier: the amount param is already in cents
    // but dev mode works in whole units, so we use basePrice directly
    const amount = basePrice
    const currencyLabel = request.currency
    const now = new Date()

    try {
      // 1. Upgrade user plan
      await db.user.update({
        where: { id: request.userId },
        data: { plan: request.planId as string },
      })

      // 2. Generate invoice + receipt (paperless loop)
      const user = await db.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      })
      const userEmail = request.email
      const userName = user?.name || request.metadata?.name || 'Client'

      const { generateInvoiceForPayment, generateReceiptForPayment } =
        await import('@/lib/documents')

      const invoice = await generateInvoiceForPayment({
        userEmail,
        userName,
        plan: request.planId,
        amount,
        currency: currencyLabel,
        userId: request.userId,
        paidAt: now,
      })

      const receipt = await generateReceiptForPayment({
        userEmail,
        userName,
        amount,
        currency: currencyLabel,
        description: `Abonnement ${request.planId} — HireNova (Simulation)`,
        userId: request.userId,
        paidAt: now,
      })

      // 3. Create accounting entry
      try {
        await db.accountingEntry.create({
          data: {
            type: 'income',
            category: 'subscription',
            description: `Abonnement ${request.planId} — Dev Simulation (${userEmail})`,
            amount,
            currency: currencyLabel,
            status: 'confirmed',
            userId: request.userId,
            metadata: JSON.stringify({
              provider: 'dev_simulation',
              plan: request.planId,
              userEmail,
              invoiceNumber: invoice.number,
              receiptNumber: receipt.number,
            }),
          },
        })
      } catch (acctErr) {
        console.error('[DevGateway] Accounting entry failed:', acctErr)
      }

      return {
        success: true,
        status: 'confirmed',
        gatewayId: this.id,
        transactionId: `dev_${request.userId}_${Date.now()}`,
        userId: request.userId,
        planId: request.planId,
        amount: amount * 100, // normalize to cents
        currency: request.currency,
        timestamp: now.toISOString(),
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
        error: err instanceof Error ? err.message : 'Dev payment simulation failed',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Webhook (no-op for dev) ─────────────────────────

  async processWebhook(_payload: WebhookPayload): Promise<WebhookResult> {
    // Dev payments complete synchronously — no webhook needed
    return {
      success: true,
      status: 'confirmed',
    }
  }

  // ─── Payment Status ──────────────────────────────────

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    // Dev transactions are always confirmed immediately
    return transactionId.startsWith('dev_') ? 'confirmed' : 'failed'
  }

  // ─── Refund (simulated) ──────────────────────────────

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    // In dev mode, simulate a successful refund by downgrading the user
    try {
      const user = await db.user.findUnique({
        where: { id: request.userId },
        select: { plan: true },
      })
      if (user && user.plan !== 'free' && user.plan !== 'lifetime') {
        await db.user.update({
          where: { id: request.userId },
          data: { plan: 'free' },
        })
      }
      return {
        success: true,
        refundId: `dev_refund_${Date.now()}`,
        status: 'refunded',
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Dev refund failed',
      }
    }
  }

  // ─── Subscription Management (simulated) ─────────────

  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      })
      if (user && user.plan !== 'free' && user.plan !== 'lifetime') {
        await db.user.update({
          where: { id: userId },
          data: { plan: 'free' },
        })
      }
      return true
    } catch {
      return false
    }
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })
    if (!user) return null

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    return {
      userId,
      planId: (user.plan || 'free') as SubscriptionStatus['planId'],
      gatewayId: 'dev',
      status: user.plan === 'free' ? 'cancelled' : 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    }
  }
}

export const devGateway = new DevGateway()
