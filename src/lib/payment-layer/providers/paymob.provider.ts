/**
 * BazNova Payment Abstraction Layer — PayMob Provider
 *
 * Implements IPaymentProvider for PayMob (Morocco & Africa payments).
 * Handles MAD, XOF, XAF currencies.
 *
 * Uses the existing PayMob integration from @/lib/paymob.
 *
 * @module payment-layer/providers/paymob
 */

import type {
  IPaymentProvider,
  ProviderCheckoutParams,
  ProviderCheckoutResult,
  ProviderPaymentStatus,
  WebhookResult,
  RefundResult,
  ProviderCapabilities,
} from '../types';

import {
  createPaymobCheckout,
  verifyPaymobWebhook,
  isPaymobConfigured,
  extractPlanFromMerchantOrderId,
} from '@/lib/paymob';

/**
 * PayMob payment provider implementation.
 * Creates PayMob orders + payment keys for iframe-based checkout.
 */
export class PayMobProvider implements IPaymentProvider {
  readonly id = 'paymob' as const;
  readonly name = 'PayMob';
  readonly region = 'morocco' as const;

  readonly capabilities: ProviderCapabilities = {
    recurring: false,
    refund: true,
    webhook: true,
    tokenization: true,
    mobileMoney: true,
  };

  /**
   * Create a PayMob checkout session and return the iframe URL.
   *
   * @param params - Provider checkout parameters
   * @returns Checkout result with redirect URL
   * @throws Error if PayMob is not configured
   */
  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult> {
    if (!isPaymobConfigured()) {
      throw new Error('PayMob is not configured. Set PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID in .env');
    }

    const planType = (params.metadata.planId as string) || 'pro';
    const userId = String(params.metadata.userId);
    const email = params.email || 'user@baznova.com';
    const userName = (params.metadata.userName as string) || 'User';

    const result = await createPaymobCheckout({
      userId,
      userEmail: email,
      userName,
      planType: planType as 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual',
    });

    return {
      providerTransactionId: result.orderId,
      redirectUrl: result.paymentUrl,
      status: 'requires_action',
    };
  }

  /**
   * Verify a PayMob payment status.
   * Note: PayMob doesn't have a simple "get status" API,
   * so we check the transaction via the order ID.
   *
   * @param transactionId - PayMob order ID
   * @returns Payment status
   */
  async verifyPayment(transactionId: string): Promise<ProviderPaymentStatus> {
    if (!isPaymobConfigured()) {
      throw new Error('PayMob is not configured.');
    }

    try {
      // PayMob transaction inquiry
      const token = await getPaymobAuthToken();
      const response = await fetch(
        `https://accept.paymob.com/api/ecommerce/orders/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        return { status: 'pending' };
      }

      const order = await response.json() as { success?: boolean; is_paid?: boolean; amount_cents?: number; currency?: string };

      if (order.success || order.is_paid) {
        return {
          status: 'succeeded',
          amount: order.amount_cents ? Math.round(order.amount_cents / 100) : undefined,
          currency: order.currency?.toUpperCase(),
          paidAt: new Date().toISOString(),
        };
      }

      return { status: 'pending' };
    } catch {
      return { status: 'pending' };
    }
  }

  /**
   * Process a PayMob webhook.
   * Verifies HMAC signature and extracts event data.
   *
   * @param payload - Webhook payload (parsed JSON)
   * @param signature - HMAC signature (from query or header)
   * @returns Webhook result
   */
  async processWebhook(payload: unknown, _signature: string): Promise<WebhookResult> {
    const payloadObj = payload as Record<string, unknown>;

    const verified = verifyPaymobWebhook(payloadObj);
    if (!verified) {
      return {
        verified: false,
        eventType: 'verification_failed',
        data: { error: 'HMAC verification failed' },
      };
    }

    const obj = payloadObj.obj as Record<string, unknown> | undefined;
    const isSuccess = obj?.success === true;
    const eventType = isSuccess ? 'payment.succeeded' : 'payment.failed';

    let transactionId: string | undefined;
    if (obj) {
      const order = obj.order as Record<string, unknown> | undefined;
      if (order?.id) {
        transactionId = String(order.id);
      }
    }

    // Try to extract plan from merchant_order_id
    const merchantOrderId = (obj as Record<string, unknown>)?.merchant_order_id as string | undefined;
    const planId = merchantOrderId ? extractPlanFromMerchantOrderId(merchantOrderId) : null;

    return {
      verified: true,
      eventType,
      transactionId,
      data: {
        ...(obj as Record<string, unknown>),
        ...(planId ? { planId } : {}),
      },
    };
  }

  /**
   * Refund a PayMob payment.
   * PayMob supports refunds via their API.
   *
   * @param transactionId - PayMob transaction ID
   * @param amount - Optional amount for partial refund (in cents)
   * @returns Refund result
   */
  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    if (!isPaymobConfigured()) {
      throw new Error('PayMob is not configured.');
    }

    try {
      const token = await getPaymobAuthToken();
      const response = await fetch('https://accept.paymob.com/api/acceptance/void_refund/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: parseInt(transactionId, 10),
          ...(amount ? { amount_cents: amount } : {}),
        }),
      });

      if (!response.ok) {
        return {
          refundId: `refund-failed-${Date.now()}`,
          status: 'failed',
          amount: amount ?? 0,
        };
      }

      const data = await response.json() as { id?: number; success?: boolean };

      return {
        refundId: String(data.id ?? `refund-${Date.now()}`),
        status: data.success ? 'succeeded' : 'pending',
        amount: amount ?? 0,
      };
    } catch {
      return {
        refundId: `refund-error-${Date.now()}`,
        status: 'failed',
        amount: amount ?? 0,
      };
    }
  }
}

/**
 * Get PayMob auth token.
 * Extracted as a standalone function for reuse in verify/refund.
 */
async function getPaymobAuthToken(): Promise<string> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) throw new Error('PAYMOB_API_KEY not configured');

  const res = await fetch('https://accept.paymob.com/api/auth/tokens/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });

  const data = await res.json() as { token?: string };
  if (!data.token) throw new Error('PayMob auth failed');
  return data.token;
}

/** Singleton instance */
export const paymobProvider = new PayMobProvider();
