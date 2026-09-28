/**
 * HireNova PayMob Payment Adapter
 *
 * Implements the PaymentAdapter interface for PayMob (Egyptian/Moroccan PSP).
 * Handles authentication, order creation, payment key generation, iframe checkout,
 * transaction status retrieval, and refund operations.
 *
 * PayMob 3-step flow:
 *   1. Auth → obtain a token
 *   2. Create order → obtain order ID
 *   3. Create payment key → obtain token for iframe checkout
 *
 * All amounts are in CENTS.
 *
 * @module payment/adapters/paymob
 */

import { createHmac } from 'crypto';
import type { PaymentAdapter } from './base';
import type {
  CreatePaymentAdapterInput,
  AdapterPaymentResult,
  AdapterRefundResult,
} from './base';
import { PaymentStatus } from '../types';

// ===== Configuration =====

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || '';
const PAYMOB_INTEGRATION_ID = parseInt(process.env.PAYMOB_INTEGRATION_ID || '0', 10);
const PAYMOB_IFRAME_ID = parseInt(process.env.PAYMOB_IFRAME_ID || '0', 10);
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || '';
const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

// ===== Internal API Types =====

interface PaymobTokenResponse {
  token: string;
}

interface PaymobOrderResponse {
  id: number;
}

interface PaymobPaymentKeyResponse {
  token: string;
}

interface PaymobTransaction {
  id: number;
  pending: boolean;
  success: boolean;
  is_refunded: boolean;
  is_voided: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  error_occured: boolean;
  amount_cents: number;
  currency: string;
  created_at: string;
  order?: { id: number };
  owner?: number;
  source_data?: {
    pan?: string;
    sub_type?: string;
    type?: string;
  };
  transaction?: { id: number };
}

interface PaymobRefundResponse {
  success: boolean;
  txn_id?: number;
  message?: string;
}

// ===== Status Mapping =====

/**
 * Maps PayMob transaction state to HireNova PaymentStatus.
 *
 * PayMob uses boolean flags (success, pending, is_refunded, is_voided, error_occured)
 * rather than a single status field.
 */
function mapPaymobStatus(transaction: PaymobTransaction): string {
  if (transaction.is_refunded) return PaymentStatus.REFUNDED;
  if (transaction.is_voided) return PaymentStatus.CANCELLED;
  if (transaction.error_occured) return PaymentStatus.FAILED;
  if (transaction.success && transaction.is_capture) return PaymentStatus.CAPTURED;
  if (transaction.success) return PaymentStatus.SUCCEEDED;
  if (transaction.pending) return PaymentStatus.PENDING;
  if (transaction.is_auth && !transaction.is_capture) return PaymentStatus.AUTHORIZED;
  return PaymentStatus.CREATED;
}

// ===== PayMob HTTP Helpers =====

/**
 * Obtain an authentication token from PayMob.
 * Tokens are short-lived and should not be cached across requests.
 */
async function getAuthToken(): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE_URL}/auth/tokens/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new Error(`PayMob auth failed: HTTP ${res.status}`);
  const data: PaymobTokenResponse = await res.json();
  if (!data.token) throw new Error('PayMob auth returned no token');
  return data.token;
}

/**
 * Create an order on PayMob.
 *
 * @param token - Auth token
 * @param amountCents - Amount in cents
 * @param merchantOrderId - Merchant-provided order ID for idempotency
 * @returns PayMob order ID
 */
async function createOrder(
  token: string,
  amountCents: number,
  merchantOrderId: string,
): Promise<number> {
  const res = await fetch(`${PAYMOB_BASE_URL}/ecommerce/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'MAD',
      merchant_order_id: merchantOrderId,
    }),
  });
  if (!res.ok) throw new Error(`PayMob order creation failed: HTTP ${res.status}`);
  const data: PaymobOrderResponse = await res.json();
  if (!data.id) throw new Error('PayMob order creation returned no ID');
  return data.id;
}

/**
 * Generate a payment key for iframe checkout.
 *
 * @param token - Auth token
 * @param orderId - PayMob order ID
 * @param amountCents - Amount in cents
 * @param customerEmail - Customer email
 * @param customerName - Customer full name
 * @returns Payment key token
 */
async function createPaymentKey(
  token: string,
  orderId: number,
  amountCents: number,
  customerEmail: string,
  customerName: string,
): Promise<string> {
  const firstName = customerName.split(' ')[0] || 'User';
  const lastName = customerName.split(' ').slice(1).join(' ') || '';

  const res = await fetch(`${PAYMOB_BASE_URL}/acceptance/payment_keys/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600, // 1 hour
      order_id: orderId,
      billing_data: {
        apartment: 'NA',
        email: customerEmail,
        floor: 'NA',
        first_name: firstName,
        street: 'NA',
        building: 'NA',
        phone_number: 'NA',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'NA',
        country: 'MA',
        last_name: lastName,
        state: 'NA',
      },
      currency: 'MAD',
      integration_id: PAYMOB_INTEGRATION_ID,
      lock_order_when_paid: true,
    }),
  });
  if (!res.ok) throw new Error(`PayMob payment key creation failed: HTTP ${res.status}`);
  const data: PaymobPaymentKeyResponse = await res.json();
  if (!data.token) throw new Error('PayMob payment key creation returned no token');
  return data.token;
}

// ===== PayMob Adapter =====

/**
 * PayMob payment adapter implementing the PaymentAdapter interface.
 *
 * Supports: one-time payments (iframe redirect), status retrieval,
 * refunds, and webhook HMAC verification.
 *
 * Note: PayMob uses a 3-step API flow (auth → order → payment_key).
 * Capture and cancel are handled via PayMob's void/refund mechanisms.
 */
export class PaymobAdapter implements PaymentAdapter {
  readonly name = 'paymob' as const;

  /**
   * Create a PayMob payment (auth → order → payment_key → iframe URL).
   * Returns a redirectUrl for the PayMob hosted checkout iframe.
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      const merchantOrderId = input.idempotencyKey || `hirenova-${Date.now()}`;
      const token = await getAuthToken();
      const orderId = await createOrder(token, input.amount, merchantOrderId);
      const paymentKey = await createPaymentKey(
        token,
        orderId,
        input.amount,
        input.customerEmail || '',
        input.customerName || '',
      );

      const redirectUrl = `${PAYMOB_BASE_URL}/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

      return {
        success: true,
        providerPaymentId: orderId.toString(),
        status: PaymentStatus.PENDING,
        redirectUrl,
        clientSecret: paymentKey,
        amount: input.amount,
        currency: input.currency,
        timestamp: new Date().toISOString(),
        rawResponse: {
          orderId,
          paymentKey,
          merchantOrderId,
          redirectUrl,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayMob error';
      return {
        success: false,
        error: message,
        errorCode: 'PAYMOB_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a payment on PayMob.
   * PayMob payments are typically auto-captured; this uses the capture API.
   *
   * @param providerPaymentId - PayMob transaction ID
   * @param amount - Optional capture amount in cents
   */
  async capturePayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<AdapterPaymentResult> {
    try {
      const token = await getAuthToken();
      const txnId = parseInt(providerPaymentId, 10);

      const body: Record<string, unknown> = {
        auth_token: token,
        txn_id: txnId,
      };
      if (amount !== undefined) {
        body.amount_cents = amount;
      }

      const res = await fetch(`${PAYMOB_BASE_URL}/acceptance/transactions/${txnId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`PayMob capture failed: HTTP ${res.status}`);
      }

      const data = await res.json();

      return {
        success: true,
        providerPaymentId,
        status: PaymentStatus.CAPTURED,
        amount: amount,
        currency: 'MAD',
        timestamp: new Date().toISOString(),
        rawResponse: data as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayMob capture error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYMOB_CAPTURE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refund a PayMob payment.
   *
   * @param providerPaymentId - PayMob transaction ID
   * @param amount - Refund amount in cents
   * @param reason - Optional reason
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const token = await getAuthToken();
      const txnId = parseInt(providerPaymentId, 10);

      const res = await fetch(`${PAYMOB_BASE_URL}/acceptance/transactions/${txnId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          txn_id: txnId,
          amount_cents: amount,
        }),
      });

      if (!res.ok) {
        throw new Error(`PayMob refund failed: HTTP ${res.status}`);
      }

      const data: PaymobRefundResponse = await res.json();

      if (!data.success) {
        return {
          success: false,
          error: data.message || 'PayMob refund was not successful',
          errorCode: 'PAYMOB_REFUND_REJECTED',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        refundId: data.txn_id?.toString(),
        amount,
        currency: 'MAD',
        status: 'pending',
        timestamp: new Date().toISOString(),
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayMob refund error';
      return {
        success: false,
        error: message,
        errorCode: 'PAYMOB_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel (void) a PayMob payment.
   *
   * @param providerPaymentId - PayMob transaction ID
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const token = await getAuthToken();
      const txnId = parseInt(providerPaymentId, 10);

      const res = await fetch(`${PAYMOB_BASE_URL}/acceptance/transactions/${txnId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          txn_id: txnId,
        }),
      });

      if (!res.ok) {
        throw new Error(`PayMob void failed: HTTP ${res.status}`);
      }

      return {
        success: true,
        providerPaymentId,
        status: PaymentStatus.CANCELLED,
        timestamp: new Date().toISOString(),
        rawResponse: { voided: true, txnId },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayMob cancel error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYMOB_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve the current status of a PayMob transaction.
   *
   * @param providerPaymentId - PayMob transaction ID
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const token = await getAuthToken();
      const txnId = parseInt(providerPaymentId, 10);

      const res = await fetch(
        `${PAYMOB_BASE_URL}/acceptance/transactions/${txnId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        throw new Error(`PayMob status check failed: HTTP ${res.status}`);
      }

      const transaction: PaymobTransaction = await res.json();

      return {
        success: true,
        providerPaymentId: transaction.id.toString(),
        status: mapPaymobStatus(transaction),
        amount: transaction.amount_cents,
        currency: transaction.currency.toUpperCase(),
        timestamp: new Date().toISOString(),
        rawResponse: transaction as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayMob status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYMOB_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming PayMob webhook HMAC signature.
   * PayMob uses HMAC-SHA512 over a concatenated string of transaction fields.
   *
   * @param payload - Raw JSON string of the webhook body
   * @param signature - HMAC value from the payload (hmac field)
   * @param secret - PayMob HMAC secret
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      console.warn('[paymob-adapter] No HMAC_SECRET configured — skipping verification (dev mode)');
      return true;
    }

    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const obj = parsed.obj as Record<string, unknown> | undefined;
      if (!obj) return false;

      const concatenated = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        (obj.order as Record<string, unknown>)?.id,
        obj.owner,
        obj.pending,
        (obj.source_data as Record<string, unknown>)?.pan,
        (obj.source_data as Record<string, unknown>)?.sub_type,
        (obj.source_data as Record<string, unknown>)?.type,
        obj.success,
        (obj.transaction as Record<string, unknown>)?.id,
      ]
        .filter((v) => v !== undefined && v !== null)
        .join('');

      const hmac = createHmac('sha512', secret)
        .update(concatenated)
        .digest('hex');

      return hmac === signature;
    } catch {
      return false;
    }
  }
}

/**
 * Check if the PayMob adapter is properly configured.
 * Requires API key, integration ID, and iframe ID.
 */
export function isPaymobAdapterConfigured(): boolean {
  return !!(
    PAYMOB_API_KEY &&
    PAYMOB_INTEGRATION_ID &&
    PAYMOB_IFRAME_ID
  );
}
