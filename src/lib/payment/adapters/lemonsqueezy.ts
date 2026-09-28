/**
 * HireNova LemonSqueezy Payment Adapter
 *
 * Implements the PaymentAdapter interface for LemonSqueezy.
 * Handles checkout creation, order status retrieval, refunds,
 * subscription management, and webhook signature verification.
 *
 * LemonSqueezy is used as a global payment processor for EUR/USD/GBP.
 * All amounts are in CENTS.
 *
 * @module payment/adapters/lemonsqueezy
 */

import { createHmac } from 'crypto';
import {
  createCheckout,
  getOrder,
  getCheckout,
  issueOrderRefund,
  cancelSubscription,
} from '@lemonsqueezy/lemonsqueezy.js';
import type { PaymentAdapter } from './base';
import type {
  CreatePaymentAdapterInput,
  CreateSubscriptionInput,
  AdapterPaymentResult,
  AdapterRefundResult,
} from './base';
import { PaymentStatus } from '../types';

// ===== Configuration =====

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const LEMONSQUEEZY_STORE_ID = process.env.LS_STORE_ID || '';
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

// ===== Status Mapping =====

/**
 * Maps LemonSqueezy OrderStatus to HireNova PaymentStatus.
 *
 * LemonSqueezy statuses: 'pending', 'failed', 'paid', 'refunded'
 */
function mapLemonSqueezyStatus(lsStatus: string): string {
  switch (lsStatus) {
    case 'paid':
      return PaymentStatus.SUCCEEDED;
    case 'failed':
      return PaymentStatus.FAILED;
    case 'refunded':
      return PaymentStatus.REFUNDED;
    case 'pending':
    default:
      return PaymentStatus.PENDING;
  }
}

// ===== LemonSqueezy Adapter =====

/**
 * LemonSqueezy payment adapter implementing the PaymentAdapter interface.
 *
 * Supports: one-time checkouts, order status retrieval, refunds,
 * subscription cancellation, and webhook X-Signature verification.
 *
 * Note: LemonSqueezy uses a checkout-based flow — you create a checkout
 * that redirects to their hosted page, and the order is created upon payment.
 */
export class LemonSqueezyAdapter implements PaymentAdapter {
  readonly name = 'lemonsqueezy' as const;

  /**
   * Create a LemonSqueezy checkout and return the hosted URL.
   *
   * Requires a variantId to be passed via metadata.variantId
   * (or falls back to store-level default).
   *
   * @param input - Payment creation input
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      const storeId = LEMONSQUEEZY_STORE_ID;
      if (!storeId) {
        return {
          success: false,
          error: 'LemonSqueezy store ID not configured (LS_STORE_ID)',
          errorCode: 'LS_NOT_CONFIGURED',
          timestamp: new Date().toISOString(),
        };
      }

      // Variant ID must be provided via metadata
      const variantId = input.metadata?.variantId as string | undefined;
      if (!variantId) {
        return {
          success: false,
          error: 'LemonSqueezy requires a variantId in metadata',
          errorCode: 'LS_MISSING_VARIANT_ID',
          timestamp: new Date().toISOString(),
        };
      }

      const checkout = await createCheckout(storeId, variantId, {
        customPrice: input.amount,
        productOptions: {
          name: input.description,
          description: input.description,
          enabledVariants: [variantId],
          redirectUrl: input.returnUrl,
        },
        checkoutOptions: {
          embed: false,
          media: [],
          logo: undefined,
        },
        checkoutData: {
          email: input.customerEmail,
          name: input.customerName,
          custom: input.metadata,
        },
      });

      if (checkout.error) {
        return {
          success: false,
          error: checkout.error.message,
          errorCode: 'LS_CHECKOUT_CREATE_FAILED',
          timestamp: new Date().toISOString(),
        };
      }

      const checkoutUrl = checkout.data?.attributes?.url;
      const checkoutId = checkout.data?.id;

      return {
        success: true,
        providerPaymentId: checkoutId,
        status: PaymentStatus.PENDING,
        redirectUrl: checkoutUrl,
        clientSecret: checkoutId,
        amount: input.amount,
        currency: input.currency,
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: checkoutId,
          url: checkoutUrl,
          storeId,
          variantId,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LemonSqueezy error';
      return {
        success: false,
        error: message,
        errorCode: 'LS_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a payment on LemonSqueezy.
   * LemonSqueezy auto-captures on checkout completion, so this retrieves
   * the order status and returns it.
   *
   * @param providerPaymentId - Checkout or Order ID
   */
  async capturePayment(
    providerPaymentId: string,
    _amount?: number,
  ): Promise<AdapterPaymentResult> {
    // LemonSqueezy auto-captures; just retrieve the status
    return this.getPaymentStatus(providerPaymentId);
  }

  /**
   * Refund a LemonSqueezy order.
   *
   * @param providerPaymentId - LemonSqueezy Order ID
   * @param amount - Refund amount in cents
   * @param _reason - Optional reason (LS doesn't support reason in API)
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    _reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const result = await issueOrderRefund(providerPaymentId, amount);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          errorCode: 'LS_REFUND_FAILED',
          timestamp: new Date().toISOString(),
        };
      }

      const order = result.data;

      return {
        success: true,
        refundId: order?.id,
        amount,
        currency: order?.attributes?.currency?.toUpperCase(),
        status: mapLemonSqueezyStatus(order?.attributes?.status || 'refunded'),
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: order?.id,
          status: order?.attributes?.status,
          refunded_amount: order?.attributes?.refunded_amount,
        } as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LemonSqueezy refund error';
      return {
        success: false,
        error: message,
        errorCode: 'LS_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel a LemonSqueezy payment.
   * LemonSqueezy doesn't support cancelling pending checkouts directly;
   * this returns the current status (usually already resolved).
   *
   * @param providerPaymentId - Checkout or Order ID
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    // LemonSqueezy doesn't support direct cancellation of pending orders
    return {
      success: false,
      providerPaymentId,
      error: 'LemonSqueezy does not support cancelling pending payments directly',
      errorCode: 'LS_CANCEL_NOT_SUPPORTED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieve the status of a LemonSqueezy order.
   *
   * Tries to fetch as an order first; falls back to checkout lookup.
   *
   * @param providerPaymentId - Order ID or Checkout ID
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      // Try as order first
      const orderResult = await getOrder(providerPaymentId);

      if (!orderResult.error && orderResult.data) {
        const order = orderResult.data;
        return {
          success: true,
          providerPaymentId: order.id,
          status: mapLemonSqueezyStatus(order.attributes.status),
          amount: order.attributes.total,
          currency: order.attributes.currency.toUpperCase(),
          timestamp: new Date().toISOString(),
          rawResponse: {
            id: order.id,
            status: order.attributes.status,
            total: order.attributes.total,
            currency: order.attributes.currency,
            refunded: order.attributes.refunded,
            refunded_amount: order.attributes.refunded_amount,
            created_at: order.attributes.created_at,
          } as Record<string, unknown>,
        };
      }

      // Fall back to checkout lookup
      const checkoutResult = await getCheckout(providerPaymentId);
      if (!checkoutResult.error && checkoutResult.data) {
        const checkout = checkoutResult.data;
        return {
          success: true,
          providerPaymentId: checkout.id,
          status: PaymentStatus.PENDING,
          timestamp: new Date().toISOString(),
          rawResponse: {
            id: checkout.id,
            url: checkout.attributes.url,
            status: checkout.attributes.status,
          } as Record<string, unknown>,
        };
      }

      return {
        success: false,
        providerPaymentId,
        error: orderResult.error?.message || 'Order/checkout not found',
        errorCode: 'LS_STATUS_NOT_FOUND',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LemonSqueezy status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'LS_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel a LemonSqueezy subscription.
   *
   * @param subscriptionId - LemonSqueezy Subscription ID
   */
  async cancelSubscription(subscriptionId: string): Promise<AdapterPaymentResult> {
    try {
      const result = await cancelSubscription(subscriptionId);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          errorCode: 'LS_SUBSCRIPTION_CANCEL_FAILED',
          timestamp: new Date().toISOString(),
        };
      }

      const subscription = result.data;

      return {
        success: true,
        providerPaymentId: subscription?.id,
        status: subscription?.attributes?.status === 'cancelled'
          ? PaymentStatus.CANCELLED
          : PaymentStatus.PENDING,
        timestamp: new Date().toISOString(),
        rawResponse: {
          id: subscription?.id,
          status: subscription?.attributes?.status,
          cancelled_at: subscription?.attributes?.cancelled_at,
        } as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LemonSqueezy subscription cancel error';
      return {
        success: false,
        error: message,
        errorCode: 'LS_SUBSCRIPTION_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming LemonSqueezy webhook X-Signature.
   * LemonSqueezy signs webhooks using HMAC-SHA256.
   *
   * The X-Signature header contains the hex-encoded HMAC of the raw body
   * using the webhook secret as the key.
   *
   * @param payload - Raw request body string
   * @param signature - X-Signature header value
   * @param secret - Webhook signing secret
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      console.warn('[lemonsqueezy-adapter] No webhook secret configured — skipping verification');
      return true;
    }

    try {
      const hmac = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // LemonSqueezy sends signature in format: "t=timestamp,v1=hmac"
      const parts = signature.split(',');
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 'v1' && value === hmac) {
          return true;
        }
      }

      // Also check if it's a direct hex signature (some versions)
      if (hmac === signature) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Check if the LemonSqueezy adapter is properly configured.
 * Requires API key and store ID.
 */
export function isLemonSqueezyAdapterConfigured(): boolean {
  return !!(
    LEMONSQUEEZY_API_KEY &&
    LEMONSQUEEZY_STORE_ID &&
    !LEMONSQUEEZY_STORE_ID.startsWith('variant_')
  );
}
