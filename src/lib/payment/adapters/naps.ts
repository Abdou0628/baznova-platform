/**
 * HireNova NAPS Payment Adapter
 *
 * Implements the PaymentAdapter interface for NAPS — the Moroccan
 * interbank card payment service operated by Al Barid Bank.
 *
 * NAPS (Network for Advanced Payment Services) handles CMI/Interbank
 * card payments for Moroccan Dirham (MAD) transactions.
 *
 * API Endpoint:
 *   - Sandbox: https://test.naps.ma/merchants/api/v1
 *   - Production: https://secure.naps.ma/merchants/api/v1
 *
 * All amounts are in CENTS.
 *
 * @module payment/adapters/naps
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

const NAPS_API_KEY = process.env.NAPS_API_KEY || '';
const NAPS_MERCHANT_ID = process.env.NAPS_MERCHANT_ID || '';
const NAPS_TERMINAL_ID = process.env.NAPS_TERMINAL_ID || '';
const NAPS_HMAC_SECRET = process.env.NAPS_HMAC_SECRET || '';
const NAPS_BASE_URL = process.env.NAPS_BASE_URL || 'https://test.naps.ma/merchants/api/v1';

// ===== Internal API Types =====

/** NAPS payment creation response */
interface NapsCreatePaymentResponse {
  transactionId: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

/** NAPS status inquiry response */
interface NapsStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  maskedPan?: string;
  authCode?: string;
  rrn?: string;
  createdAt: string;
  updatedAt: string;
  acquirerResponse?: string;
}

/** NAPS refund response */
interface NapsRefundResponse {
  refundId: string;
  originalTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

// ===== Status Mapping =====

/**
 * Maps NAPS transaction statuses to HireNova PaymentStatus.
 *
 * NAPS statuses: NEW, PENDING_AUTH, AUTHORIZED, CAPTURED, COMPLETED,
 *   AUTH_FAILED, CANCELLED, EXPIRED, REFUNDED, PARTIALLY_REFUNDED
 */
function mapNapsStatus(napsStatus: string): string {
  const statusMap: Record<string, string> = {
    'new': PaymentStatus.CREATED,
    'pending_auth': PaymentStatus.PENDING,
    'authorized': PaymentStatus.AUTHORIZED,
    'captured': PaymentStatus.CAPTURED,
    'completed': PaymentStatus.SUCCEEDED,
    'auth_failed': PaymentStatus.FAILED,
    'failed': PaymentStatus.FAILED,
    'cancelled': PaymentStatus.CANCELLED,
    'expired': PaymentStatus.EXPIRED,
    'refunded': PaymentStatus.REFUNDED,
    'partially_refunded': PaymentStatus.PARTIALLY_REFUNDED,
  };
  return statusMap[napsStatus.toLowerCase()] || PaymentStatus.CREATED;
}

// ===== NAPS HTTP Helper =====

/**
 * Build HMAC-SHA256 signature for NAPS API requests.
 * NAPS signs requests using HMAC of the sorted JSON body + timestamp.
 */
function buildNapsSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
): string {
  const stringToSign = `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
  return createHmac('sha256', NAPS_HMAC_SECRET)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Make an authenticated request to the NAPS API.
 * Includes merchant ID, terminal ID, API key, and HMAC signature.
 */
async function napsRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; status: number }> {
  const url = `${NAPS_BASE_URL}${path}`;
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';

  const signature = buildNapsSignature(method, path, bodyStr, timestamp);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Merchant-Id': NAPS_MERCHANT_ID,
    'X-Terminal-Id': NAPS_TERMINAL_ID,
    'X-API-Key': NAPS_API_KEY,
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

  if (!res.ok) {
    let errorMessage = `NAPS API error: HTTP ${res.status}`;
    try {
      const errorData = await res.json() as Record<string, unknown>;
      const msg = errorData?.error as Record<string, unknown>;
      if (msg?.message) {
        errorMessage = msg.message as string;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const data = await res.json() as Record<string, unknown>;
  return { data, status: res.status };
}

// ===== NAPS Adapter =====

/**
 * NAPS payment adapter implementing the PaymentAdapter interface.
 *
 * NAPS (Al Barid Bank) handles CMI/Interbank card payments in Morocco.
 * Supports: payment creation (redirect flow), status retrieval,
 * refunds, and webhook signature verification.
 */
export class NapsAdapter implements PaymentAdapter {
  readonly name = 'naps' as const;

  /**
   * Create a payment on NAPS.
   * Returns a redirectUrl for the NAPS hosted payment page.
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      if (!NAPS_MERCHANT_ID || !NAPS_API_KEY || !NAPS_TERMINAL_ID) {
        return {
          success: false,
          error: 'NAPS not configured (NAPS_API_KEY, NAPS_MERCHANT_ID, NAPS_TERMINAL_ID required)',
          errorCode: 'NAPS_NOT_CONFIGURED',
          timestamp: new Date().toISOString(),
        };
      }

      const { data, status } = await napsRequest('POST', '/payments', {
        merchantId: NAPS_MERCHANT_ID,
        terminalId: NAPS_TERMINAL_ID,
        amount: input.amount,
        currency: input.currency || 'MAD',
        description: input.description,
        merchantTransactionId: input.idempotencyKey || `hirenova-${Date.now()}`,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        expiresAt: input.expiresAt,
        language: 'fr', // NAPS supports fr/ar/en
        metadata: input.metadata,
      });

      const responseData = data as unknown as NapsCreatePaymentResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId,
        status: mapNapsStatus(responseData?.status || 'new'),
        redirectUrl: responseData?.paymentUrl,
        amount: input.amount,
        currency: input.currency || 'MAD',
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown NAPS error';
      return {
        success: false,
        error: message,
        errorCode: 'NAPS_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a previously authorized payment on NAPS.
   *
   * @param providerPaymentId - NAPS transaction ID
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

      const { data, status } = await napsRequest(
        'POST',
        `/payments/${providerPaymentId}/capture`,
        body,
      );

      const responseData = data as unknown as NapsStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapNapsStatus(responseData?.status || 'captured'),
        amount: responseData?.amount || amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown NAPS capture error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'NAPS_CAPTURE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refund a NAPS payment.
   *
   * @param providerPaymentId - NAPS transaction ID
   * @param amount - Refund amount in cents
   * @param reason - Optional refund reason
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const { data, status } = await napsRequest(
        'POST',
        `/payments/${providerPaymentId}/refund`,
        {
          amount,
          reason: reason || 'Customer requested refund',
        },
      );

      const responseData = data as unknown as NapsRefundResponse;

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
      const message = error instanceof Error ? error.message : 'Unknown NAPS refund error';
      return {
        success: false,
        error: message,
        errorCode: 'NAPS_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel an active NAPS payment.
   *
   * @param providerPaymentId - NAPS transaction ID
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await napsRequest(
        'POST',
        `/payments/${providerPaymentId}/cancel`,
      );

      const responseData = data as unknown as NapsStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapNapsStatus(responseData?.status || 'cancelled'),
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown NAPS cancel error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'NAPS_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve the current status of a NAPS payment.
   *
   * @param providerPaymentId - NAPS transaction ID
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await napsRequest(
        'GET',
        `/payments/${providerPaymentId}`,
      );

      const responseData = data as unknown as NapsStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapNapsStatus(responseData?.status || 'pending'),
        amount: responseData?.amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown NAPS status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'NAPS_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming NAPS webhook signature.
   * NAPS uses HMAC-SHA256 signed payloads.
   *
   * @param payload - Raw request body string
   * @param signature - X-Signature header value from webhook
   * @param secret - NAPS HMAC secret
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      console.warn('[naps-adapter] No HMAC_SECRET configured — skipping verification');
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
 * Check if the NAPS adapter is properly configured.
 * Requires API key, merchant ID, terminal ID, and HMAC secret.
 */
export function isNapsAdapterConfigured(): boolean {
  return !!(
    NAPS_API_KEY &&
    NAPS_MERCHANT_ID &&
    NAPS_TERMINAL_ID &&
    NAPS_HMAC_SECRET
  );
}
