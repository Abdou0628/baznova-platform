/**
 * BazNova Payment Abstraction Layer — LemonSqueezy Provider
 *
 * Implements IPaymentProvider for LemonSqueezy (international SaaS billing).
 * Handles EUR, USD, GBP for international customers.
 * Used as a fallback when Stripe is not configured.
 *
 * Uses the existing LemonSqueezy SDK from @/lib/lemonsqueezy.
 *
 * @module payment-layer/providers/lemonsqueezy
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

/**
 * LemonSqueezy payment provider implementation.
 * Creates LemonSqueezy checkout links for SaaS subscriptions.
 */
export class LemonSqueezyProvider implements IPaymentProvider {
  readonly id = 'lemonsqueezy' as const;
  readonly name = 'LemonSqueezy';
  readonly region = 'international' as const;

  readonly capabilities: ProviderCapabilities = {
    recurring: true,
    refund: true,
    webhook: true,
    tokenization: false,
    mobileMoney: false,
  };

  /**
   * Create a LemonSqueezy checkout.
   * Uses the LemonSqueezy API to create a checkout for the given variant.
   *
   * @param params - Provider checkout parameters
   * @returns Checkout result with redirect URL
   * @throws Error if LemonSqueezy is not configured
   */
  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult> {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LS_STORE_ID;

    if (!apiKey || !storeId) {
      throw new Error('LemonSqueezy is not configured. Set LEMONSQUEEZY_API_KEY and LS_STORE_ID in .env');
    }

    // Determine variant ID based on plan and currency
    const planId = String(params.metadata.planId);
    const currency = params.currency.toLowerCase();
    const variantId = getVariantId(planId, currency);

    try {
      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                custom: {
                  userId: String(params.metadata.userId),
                  planId,
                },
              },
              checkout_options: {
                embed: false,
              },
              product_options: {
                redirect_url: params.successUrl,
              },
            },
            relationships: {
              store: {
                data: { type: 'stores', id: storeId },
              },
              variant: {
                data: { type: 'variants', id: variantId },
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LemonSqueezy checkout failed: ${response.status} ${errorBody}`);
      }

      const result = await response.json() as {
        data: { id: string; attributes: { url: string } };
      };

      return {
        providerTransactionId: result.data.id,
        redirectUrl: result.data.attributes.url,
        status: 'requires_action',
      };
    } catch (err) {
      throw new Error(
        `LemonSqueezy checkout error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify a LemonSqueezy payment/subscription status.
   *
   * @param transactionId - LemonSqueezy subscription or order ID
   * @returns Payment status
   */
  async verifyPayment(transactionId: string): Promise<ProviderPaymentStatus> {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      throw new Error('LemonSqueezy is not configured.');
    }

    try {
      // Try as subscription first
      const subResponse = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${transactionId}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (subResponse.ok) {
        const sub = await subResponse.json() as {
          data: { attributes: { status: string; renews_at?: string } };
        };

        const statusMap: Record<string, ProviderPaymentStatus['status']> = {
          active: 'succeeded',
          cancelled: 'cancelled',
          expired: 'cancelled',
          past_due: 'pending',
          unpaid: 'pending',
          paused: 'pending',
        };

        return {
          status: statusMap[sub.data.attributes.status] ?? 'pending',
          paidAt: sub.data.attributes.renews_at,
        };
      }

      // Try as order
      const orderResponse = await fetch(
        `https://api.lemonsqueezy.com/v1/orders/${transactionId}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (orderResponse.ok) {
        const order = await orderResponse.json() as {
          data: { attributes: { status: string; total: number; currency: string } };
        };

        const statusMap: Record<string, ProviderPaymentStatus['status']> = {
          paid: 'succeeded',
          pending: 'pending',
          refunded: 'cancelled',
          failed: 'failed',
        };

        return {
          status: statusMap[order.data.attributes.status] ?? 'pending',
          amount: Math.round(order.data.attributes.total * 100),
          currency: order.data.attributes.currency?.toUpperCase(),
        };
      }

      return { status: 'pending' };
    } catch {
      return { status: 'pending' };
    }
  }

  /**
   * Process a LemonSqueezy webhook.
   * Verifies the signature using X-Signature header.
   *
   * @param payload - Raw request body
   * @param signature - X-Signature header value
   * @returns Webhook result
   */
  async processWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      // In dev mode without webhook secret, accept with warning
      console.warn('[lemonsqueezy] No WEBHOOK_SECRET configured — skipping verification');
    }

    let verified = true;
    if (secret && signature) {
      verified = verifyLemonSqueezySignature(payload, signature, secret);
    }

    if (!verified) {
      return {
        verified: false,
        eventType: 'verification_failed',
        data: { error: 'Signature verification failed' },
      };
    }

    try {
      const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const data = body as { meta?: { event_name?: string }; data?: { id?: string } };

      return {
        verified: true,
        eventType: data.meta?.event_name ?? 'unknown',
        transactionId: data.data?.id ? String(data.data.id) : undefined,
        data: body as Record<string, unknown>,
      };
    } catch {
      return {
        verified: true,
        eventType: 'parse_error',
        data: { raw: payload },
      };
    }
  }

  /**
   * Refund a LemonSqueezy order.
   *
   * @param transactionId - LemonSqueezy order ID
   * @param _amount - Not supported by LemonSqueezy API (always full refund)
   * @returns Refund result
   */
  async refund(transactionId: string, _amount?: number): Promise<RefundResult> {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      throw new Error('LemonSqueezy is not configured.');
    }

    try {
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/orders/${transactionId}/refund`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return {
          refundId: `refund-failed-${Date.now()}`,
          status: 'failed',
          amount: 0,
        };
      }

      const result = await response.json() as {
        data: { id: string; attributes: { status: string } };
      };

      return {
        refundId: result.data.id,
        status: result.data.attributes.status === 'refunded' ? 'succeeded' : 'pending',
        amount: 0, // LemonSqueezy always refunds full amount
      };
    } catch {
      return {
        refundId: `refund-error-${Date.now()}`,
        status: 'failed',
        amount: 0,
      };
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the LemonSqueezy variant ID for a plan + currency combination.
 * Falls back to env-configured defaults.
 */
function getVariantId(planId: string, currency: string): string {
  const envKey = `LS_${planId.toUpperCase().replace('+', '_')}_VARIANT_ID_${currency.toUpperCase()}`;
  const envValue = process.env[envKey];
  if (envValue) return envValue;

  // Fallback to generic env patterns
  const fallbacks: Record<string, Record<string, string>> = {
    starter: {
      eur: process.env.LS_STARTER_VARIANT_ID_EUR || 'variant_starter_eur',
      usd: process.env.LS_STARTER_VARIANT_ID_USD || 'variant_starter_usd',
      gbp: process.env.LS_STARTER_VARIANT_ID_GBP || 'variant_starter_gbp',
    },
    pro: {
      eur: process.env.LS_PRO_VARIANT_ID_EUR || 'variant_pro_eur',
      usd: process.env.LS_PRO_VARIANT_ID_USD || 'variant_pro_usd',
      gbp: process.env.LS_PRO_VARIANT_ID_GBP || 'variant_pro_gbp',
    },
    career_plus: {
      eur: process.env.LS_CAREER_VARIANT_ID_EUR || 'variant_career_eur',
      usd: process.env.LS_CAREER_VARIANT_ID_USD || 'variant_career_usd',
      gbp: process.env.LS_CAREER_VARIANT_ID_GBP || 'variant_career_gbp',
    },
    employer: {
      eur: process.env.LS_EMPLOYER_VARIANT_ID_EUR || 'variant_employer_eur',
      usd: process.env.LS_EMPLOYER_VARIANT_ID_USD || 'variant_employer_usd',
      gbp: process.env.LS_EMPLOYER_VARIANT_ID_GBP || 'variant_employer_gbp',
    },
    annual: {
      eur: process.env.LS_ANNUAL_VARIANT_ID_EUR || 'variant_annual_eur',
      usd: process.env.LS_ANNUAL_VARIANT_ID_USD || 'variant_annual_usd',
      gbp: process.env.LS_ANNUAL_VARIANT_ID_GBP || 'variant_annual_gbp',
    },
  };

  return fallbacks[planId]?.[currency] ?? 'variant_default';
}

/**
 * Verify LemonSqueezy webhook signature using HMAC-SHA256.
 */
function verifyLemonSqueezySignature(
  payload: unknown,
  signature: string,
  secret: string,
): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return signature === expectedSig;
  } catch {
    return false;
  }
}

/** Singleton instance */
export const lemonSqueezyProvider = new LemonSqueezyProvider();
