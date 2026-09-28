/**
 * HireNova Stripe Payment Adapter
 *
 * Implements the PaymentAdapter interface for Stripe.
 * Handles PaymentIntent creation, capture, refund, cancel, and status retrieval.
 * Uses the existing Stripe instance from @/lib/stripe.
 *
 * All amounts are in CENTS.
 *
 * @module payment/adapters/stripe
 */

import Stripe from 'stripe';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import type { PaymentAdapter } from './base';
import type {
  CreatePaymentAdapterInput,
  CreateSubscriptionInput,
  AdapterPaymentResult,
  AdapterRefundResult,
} from './base';
import { PaymentStatus } from '../types';

// ===== Stripe Status → HireNova Status Mapping =====

/**
 * Maps Stripe PaymentIntent statuses to HireNova PaymentStatus values.
 *
 * Stripe statuses: requires_payment_method, requires_confirmation, requires_action,
 *   processing, requires_capture, canceled, succeeded, requires_payment_method
 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return PaymentStatus.PENDING;
    case 'processing':
      return PaymentStatus.PENDING;
    case 'requires_capture':
      return PaymentStatus.AUTHORIZED;
    case 'canceled':
      return PaymentStatus.CANCELLED;
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    default:
      return PaymentStatus.CREATED;
  }
}

// ===== Stripe Adapter =====

/**
 * Stripe payment adapter implementing the PaymentAdapter interface.
 *
 * Supports: one-time payments, captures, refunds, cancellations,
 * subscriptions, and webhook signature verification.
 */
export class StripeAdapter implements PaymentAdapter {
  readonly name = 'stripe' as const;

  /**
   * Create a PaymentIntent on Stripe.
   * Returns the client_secret for the frontend to complete payment.
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        description: input.description,
        metadata: {
          idempotencyKey: input.idempotencyKey || '',
          description: input.description,
          ...input.metadata,
        },
        // Automatic payment methods — Stripe determines the best method
        automatic_payment_methods: { enabled: true },
      };

      // Set capture method to 'manual' for two-step (authorize → capture)
      // if the caller indicates it (e.g., via metadata)
      if (input.metadata?.captureMethod === 'manual') {
        params.capture_method = 'manual';
      }

      // Set expiration if provided
      if (input.expiresAt) {
        const expiresAt = new Date(input.expiresAt);
        const now = new Date();
        const secondsUntilExpiry = Math.max(
          0,
          Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
        );
        // Stripe minimum is 30 minutes, max is 24 hours for PaymentIntent
        params.payment_method_options = {
          card: {
            mandate_options: {
              interval: 'one_time' as const,
            },
          },
        };
      }

      // Add return/cancel URLs if present
      const hasRedirect = input.returnUrl || input.cancelUrl;
      if (hasRedirect) {
        params.return_url = input.returnUrl;
        params.cancel_url = input.cancelUrl;
      }

      const paymentIntent = await stripe.paymentIntents.create(params, {
        idempotencyKey: input.idempotencyKey,
      });

      return {
        success: true,
        providerPaymentId: paymentIntent.id,
        status: mapStripeStatus(paymentIntent.status),
        clientSecret: paymentIntent.client_secret ?? undefined,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          client_secret: paymentIntent.client_secret,
          created: paymentIntent.created,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe error';
      return {
        success: false,
        error: message,
        errorCode: 'STRIPE_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a previously authorized PaymentIntent.
   *
   * @param providerPaymentId - Stripe PaymentIntent ID (pi_xxx)
   * @param amount - Optional partial capture amount in cents
   */
  async capturePayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<AdapterPaymentResult> {
    try {
      const params: Stripe.PaymentIntentCaptureParams = {};
      if (amount !== undefined) {
        params.amount_to_capture = amount;
      }

      const paymentIntent = await stripe.paymentIntents.capture(
        providerPaymentId,
        params,
      );

      return {
        success: true,
        providerPaymentId: paymentIntent.id,
        status: mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount_received,
        currency: paymentIntent.currency.toUpperCase(),
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount_received: paymentIntent.amount_received,
          amount_capturable: paymentIntent.amount_capturable,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe capture error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'STRIPE_CAPTURE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refund a payment via Stripe.
   *
   * @param providerPaymentId - Stripe PaymentIntent ID (pi_xxx)
   * @param amount - Refund amount in cents
   * @param reason - Optional reason for the refund
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: providerPaymentId,
        amount,
        reason: reason === 'requested_by_customer'
          ? 'requested_by_customer'
          : 'fraudulent', // Stripe requires a specific enum
        metadata: reason ? { reason } : undefined,
      };

      const refund = await stripe.refunds.create(params);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency.toUpperCase(),
        status: refund.status === 'succeeded' ? 'succeeded' : refund.status,
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
          payment_intent: refund.payment_intent,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe refund error';
      return {
        success: false,
        error: message,
        errorCode: 'STRIPE_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel an active PaymentIntent.
   *
   * @param providerPaymentId - Stripe PaymentIntent ID (pi_xxx)
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(providerPaymentId);

      return {
        success: true,
        providerPaymentId: paymentIntent.id,
        status: mapStripeStatus(paymentIntent.status),
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          cancellation_reason: paymentIntent.cancellation_reason,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe cancel error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'STRIPE_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve the current status of a PaymentIntent from Stripe.
   *
   * @param providerPaymentId - Stripe PaymentIntent ID (pi_xxx)
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(providerPaymentId);

      return {
        success: true,
        providerPaymentId: paymentIntent.id,
        status: mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          amount_received: paymentIntent.amount_received,
          amount_capturable: paymentIntent.amount_capturable,
          currency: paymentIntent.currency,
          created: paymentIntent.created,
          metadata: paymentIntent.metadata,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'STRIPE_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Create a checkout session for subscription billing.
   * Not all Stripe accounts use this — it requires Stripe Billing to be configured.
   */
  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<AdapterPaymentResult> {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              recurring: {
                interval: (input.interval || 'month') as Stripe.Checkout.SessionCreateParams.Mode,
                interval_count: input.intervalCount || 1,
              },
              product_data: {
                name: input.description,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: input.customerEmail,
        success_url: input.metadata?.returnUrl as string || `${process.env.NEXTAUTH_URL}/billing?success=true`,
        cancel_url: input.metadata?.cancelUrl as string || `${process.env.NEXTAUTH_URL}/billing?cancelled=true`,
        metadata: input.metadata,
      });

      return {
        success: true,
        providerPaymentId: session.id,
        status: PaymentStatus.PENDING,
        redirectUrl: session.url ?? undefined,
        clientSecret: session.id,
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: session.id,
          url: session.url,
          mode: session.mode,
          status: session.status,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe subscription error';
      return {
        success: false,
        error: message,
        errorCode: 'STRIPE_SUBSCRIPTION_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel an active Stripe subscription.
   *
   * @param subscriptionId - Stripe Subscription ID (sub_xxx)
   */
  async cancelSubscription(subscriptionId: string): Promise<AdapterPaymentResult> {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      return {
        success: true,
        providerPaymentId: subscription.id,
        status: subscription.status === 'canceled'
          ? PaymentStatus.CANCELLED
          : PaymentStatus.PENDING,
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: subscription.id,
          status: subscription.status,
          canceled_at: subscription.canceled_at,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Stripe subscription cancel error';
      return {
        success: false,
        error: message,
        errorCode: 'STRIPE_SUBSCRIPTION_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming Stripe webhook signature.
   * Uses Stripe's built-in signature verification.
   *
   * @param payload - Raw request body string
   * @param signature - Stripe-Signature header value
   * @param secret - Stripe webhook signing secret (whsec_xxx)
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, secret);
      return !!event;
    } catch {
      return false;
    }
  }
}

/**
 * Check if the Stripe adapter is properly configured.
 * Requires a valid STRIPE_SECRET_KEY environment variable.
 */
export function isStripeAdapterConfigured(): boolean {
  return isStripeConfigured();
}
