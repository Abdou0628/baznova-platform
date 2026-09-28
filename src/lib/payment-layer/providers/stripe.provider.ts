/**
 * BazNova Payment Abstraction Layer — Stripe Provider
 *
 * Implements IPaymentProvider for Stripe (international payments).
 * Handles EUR, USD, GBP, and other international currencies.
 *
 * Uses the existing Stripe SDK and configuration from @/lib/stripe.
 *
 * @module payment-layer/providers/stripe
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

import { getStripe, isStripeConfigured, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';

/**
 * Stripe payment provider implementation.
 * Creates Stripe Checkout Sessions for one-time and recurring payments.
 */
export class StripeProvider implements IPaymentProvider {
  readonly id = 'stripe' as const;
  readonly name = 'Stripe';
  readonly region = 'international' as const;

  readonly capabilities: ProviderCapabilities = {
    recurring: true,
    refund: true,
    webhook: true,
    tokenization: true,
    mobileMoney: false,
  };

  /**
   * Create a Stripe Checkout Session and return the redirect URL.
   *
   * @param params - Provider checkout parameters
   * @returns Checkout result with redirect URL
   * @throws Error if Stripe is not configured
   */
  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: params.metadata.subscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: (params.metadata.planName as string) || 'BazNova Subscription',
              description: (params.metadata.planDescription as string) || `Plan: ${params.metadata.planId}`,
            },
            unit_amount: params.amount,
            ...(params.metadata.subscription
              ? { recurring: { interval: 'month' } }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.email,
      metadata: {
        userId: String(params.metadata.userId),
        planId: String(params.metadata.planId),
        ...(params.metadata.referralCode
          ? { referralCode: String(params.metadata.referralCode) }
          : {}),
      },
    });

    return {
      providerTransactionId: session.id,
      redirectUrl: session.url ?? undefined,
      clientSecret: session.client_secret ?? undefined,
      status: 'requires_action',
    };
  }

  /**
   * Verify a payment by retrieving the Stripe Checkout Session status.
   *
   * @param transactionId - Stripe Checkout Session ID
   * @returns Payment status from Stripe
   */
  async verifyPayment(transactionId: string): Promise<ProviderPaymentStatus> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(transactionId);

    const statusMap: Record<string, ProviderPaymentStatus['status']> = {
      complete: 'succeeded',
      expired: 'cancelled',
      open: 'pending',
    };

    return {
      status: statusMap[session.status ?? 'open'] ?? 'pending',
      amount: session.amount_total ?? undefined,
      currency: session.currency?.toUpperCase() ?? undefined,
      paidAt: session.payment_status === 'paid' ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Process a Stripe webhook event.
   * Verifies the signature and extracts the event data.
   *
   * @param payload - Raw request body (buffer or string)
   * @param signature - Stripe-Signature header value
   * @returns Webhook result with verified event data
   */
  async processWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');
    }

    const stripe = getStripe();

    try {
      const event = stripe.webhooks.constructWebhookEvent(
        payload as string | Buffer,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );

      const eventType = event.type;
      let transactionId: string | undefined;

      // Extract transaction ID based on event type
      if (eventType === 'checkout.session.completed') {
        const session = event.data.object as { id?: string };
        transactionId = session.id;
      } else if (eventType === 'payment_intent.succeeded') {
        const pi = event.data.object as { id?: string };
        transactionId = pi.id;
      } else if (eventType.startsWith('customer.subscription.')) {
        const sub = event.data.object as { id?: string };
        transactionId = sub.id;
      }

      return {
        verified: true,
        eventType,
        transactionId,
        data: event.data.object as Record<string, unknown>,
      };
    } catch (err) {
      return {
        verified: false,
        eventType: 'verification_failed',
        data: { error: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Refund a Stripe payment (full or partial).
   *
   * @param transactionId - Stripe PaymentIntent ID
   * @param amount - Optional amount in cents for partial refund
   * @returns Refund result
   */
  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');
    }

    const stripe = getStripe();

    const refund = await stripe.refunds.create({
      payment_intent: transactionId,
      ...(amount ? { amount } : {}), // omit amount for full refund
    });

    const statusMap: Record<string, RefundResult['status']> = {
      succeeded: 'succeeded',
      pending: 'pending',
      failed: 'failed',
      canceled: 'failed',
    };

    return {
      refundId: refund.id,
      status: statusMap[refund.status ?? 'pending'] ?? 'pending',
      amount: refund.amount ?? 0,
    };
  }
}

/** Singleton instance */
export const stripeProvider = new StripeProvider();
