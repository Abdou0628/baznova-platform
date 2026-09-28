/**
 * HireNova PayZone Payment Adapter
 *
 * Implements the PaymentAdapter interface for PayZone — a Moroccan
 * Payment Service Provider for CMI (Centre Monétique Interbancaire) cards.
 *
 * PayZone processes Moroccan debit/credit card payments through the CMI network.
 * Used primarily for MAD (Moroccan Dirham) transactions.
 *
 * API Endpoints:
 *   - Sandbox: https://test.payzone.ma/api/v1/payments
 *   - Production: https://secure.payzone.ma/api/v1/payments
 *
 * All amounts are in CENTS.
 *
 * @module payment/adapters/payzone
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

const PAYZONE_API_KEY = process.env.PAYZONE_API_KEY || '';
const PAYZONE_MERCHANT_ID = process.env.PAYZONE_MERCHANT_ID || '';
const PAYZONE_HMAC_SECRET = process.env.PAYZONE_HMAC_SECRET || '';
const PAYZONE_BASE_URL = process.env.PAYZONE_BASE_URL || 'https://test.payzone.ma/api/v1';

// ===== Internal API Types =====

/** PayZone API response for payment creation */
interface PayZoneCreatePaymentResponse {
  paymentId: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
}

/** PayZone API response for status inquiry */
interface PayZoneStatusResponse {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  maskedPan?: string;
  authCode?: string;
  createdAt: string;
  updatedAt: string;
}

/** PayZone API response for refund */
interface PayZoneRefundResponse {
  refundId: string;
  originalPaymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

/** PayZone API error response */
interface PayZoneErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

// ===== Status Mapping =====

/**
 * Maps PayZone payment statuses to HireNova PaymentStatus.
 *
 * PayZone statuses: INITIATED, PENDING, PROCESSING, AUTHORIZED,
 *   CAPTURED, COMPLETED, FAILED, CANCELLED, EXPIRED, REFUNDED
 */
function mapPayZoneStatus(payzoneStatus: string): string {
  const statusMap: Record<string, string> = {
    'initiated': PaymentStatus.CREATED,
    'pending': PaymentStatus.PENDING,
    'processing': PaymentStatus.PENDING,
    'authorized': PaymentStatus.AUTHORIZED,
    'captured': PaymentStatus.CAPTURED,
    'completed': PaymentStatus.SUCCEEDED,
    'failed': PaymentStatus.FAILED,
    'cancelled': PaymentStatus.CANCELLED,
    'expired': PaymentStatus.EXPIRED,
    'refunded': PaymentStatus.REFUNDED,
    'partially_refunded': PaymentStatus.PARTIALLY_REFUNDED,
  };
  return statusMap[payzoneStatus.toLowerCase()] || PaymentStatus.CREATED;
}

// ===== PayZone HTTP Helper =====

/**
 * Build HMAC-SHA256 signature for PayZone API requests.
 * PayZone requires signed requests for security.
 */
function buildPayZoneSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
): string {
  const stringToSign = `${method.toUpperCase()}\n${path}\n${body}\n${timestamp}`;
  return createHmac('sha256', PAYZONE_HMAC_SECRET)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Make an authenticated request to the PayZone API.
 * Handles HMAC signing and common error handling.
 */
async function payZoneRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; status: number }> {
  const url = `${PAYZONE_BASE_URL}${path}`;
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';

  const signature = buildPayZoneSignature(method, path, bodyStr, timestamp);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Merchant-Id': PAYZONE_MERCHANT_ID,
    'X-API-Key': PAYZONE_API_KEY,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body && method.toUpperCase() !== 'GET') {
    fetchOptions.body = bodyStr;
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const errorData = data as unknown as PayZoneErrorResponse;
    throw new Error(
      errorData?.error?.message || `PayZone API error: HTTP ${res.status}`,
    );
  }

  return { data, status: res.status };
}

// ===== PayZone Adapter =====

/**
 * PayZone payment adapter implementing the PaymentAdapter interface.
 *
 * PayZone is a Moroccan PSP for CMI card processing.
 * Supports: payment creation (redirect flow), status retrieval,
 * refunds, cancellation, and webhook HMAC verification.
 */
export class PayZoneAdapter implements PaymentAdapter {
  readonly name = 'payzone' as const;

  /**
   * Create a payment on PayZone.
   * Returns a redirectUrl for the PayZone hosted payment page.
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      if (!PAYZONE_MERCHANT_ID || !PAYZONE_API_KEY) {
        return {
          success: false,
          error: 'PayZone not configured (PAYZONE_API_KEY, PAYZONE_MERCHANT_ID required)',
          errorCode: 'PAYZONE_NOT_CONFIGURED',
          timestamp: new Date().toISOString(),
        };
      }

      const { data, status } = await payZoneRequest('POST', '/payments', {
        merchantId: PAYZONE_MERCHANT_ID,
        amount: input.amount,
        currency: input.currency || 'MAD',
        description: input.description,
        merchantOrderId: input.idempotencyKey || `hirenova-${Date.now()}`,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        expiresAt: input.expiresAt,
        metadata: input.metadata,
      });

      const responseData = data as unknown as PayZoneCreatePaymentResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.paymentId,
        status: mapPayZoneStatus(responseData?.status || 'initiated'),
        redirectUrl: responseData?.paymentUrl,
        amount: input.amount,
        currency: input.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayZone error';
      return {
        success: false,
        error: message,
        errorCode: 'PAYZONE_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a previously authorized payment on PayZone.
   *
   * @param providerPaymentId - PayZone payment ID
   * @param amount - Optional capture amount in cents
   */
  async capturePayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<AdapterPaymentResult> {
    try {
      const body: Record<string, unknown> = {};
      if (amount !== undefined) {
        body.amount = amount;
      }

      const { data, status } = await payZoneRequest(
        'POST',
        `/payments/${providerPaymentId}/capture`,
        body,
      );

      const responseData = data as unknown as PayZoneStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.paymentId || providerPaymentId,
        status: mapPayZoneStatus(responseData?.status || 'captured'),
        amount: responseData?.amount || amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayZone capture error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYZONE_CAPTURE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refund a PayZone payment.
   *
   * @param providerPaymentId - PayZone payment ID
   * @param amount - Refund amount in cents
   * @param reason - Optional refund reason
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const { data, status } = await payZoneRequest(
        'POST',
        `/payments/${providerPaymentId}/refund`,
        {
          amount,
          reason: reason || 'Customer requested refund',
        },
      );

      const responseData = data as unknown as PayZoneRefundResponse;

      return {
        success: status >= 200 && status < 300,
        refundId: responseData?.refundId,
        amount: responseData?.amount || amount,
        currency: responseData?.currency || 'MAD',
        status: responseData?.status || 'pending',
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayZone refund error';
      return {
        success: false,
        error: message,
        errorCode: 'PAYZONE_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel an active PayZone payment.
   *
   * @param providerPaymentId - PayZone payment ID
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await payZoneRequest(
        'POST',
        `/payments/${providerPaymentId}/cancel`,
      );

      const responseData = data as unknown as PayZoneStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.paymentId || providerPaymentId,
        status: mapPayZoneStatus(responseData?.status || 'cancelled'),
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayZone cancel error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYZONE_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve the current status of a PayZone payment.
   *
   * @param providerPaymentId - PayZone payment ID
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await payZoneRequest(
        'GET',
        `/payments/${providerPaymentId}`,
      );

      const responseData = data as unknown as PayZoneStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.paymentId || providerPaymentId,
        status: mapPayZoneStatus(responseData?.status || 'pending'),
        amount: responseData?.amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PayZone status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'PAYZONE_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming PayZone webhook signature.
   * PayZone uses HMAC-SHA256 signed payloads.
   *
   * @param payload - Raw request body string
   * @param signature - X-Signature header value from webhook
   * @param secret - PayZone HMAC secret
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      console.warn('[payzone-adapter] No HMAC_SECRET configured — skipping verification');
      return true;
    }

    try {
      const hmac = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return hmac === signature;
    } catch {
      return false;
    }
  }
}

/**
 * Check if the PayZone adapter is properly configured.
 * Requires API key, merchant ID, and HMAC secret.
 */
export function isPayZoneAdapterConfigured(): boolean {
  return !!(
    PAYZONE_API_KEY &&
    PAYZONE_MERCHANT_ID &&
    PAYZONE_HMAC_SECRET
  );
}
