/**
 * HireNova CMI Payment Adapter
 *
 * Implements the PaymentAdapter interface for CMI — Centre Monétique
 * Interbancaire, Morocco's central interbank card payment network.
 *
 * CMI handles debit and credit card processing for all Moroccan banks,
 * supporting both domestic (CMI) and international (Visa/Mastercard) cards
 * through the Moroccan banking network.
 *
 * API Endpoint:
 *   - Sandbox: https://test.cmi.ma/merchant/api/v1
 *   - Production: https://secure.cmi.ma/merchant/api/v1
 *
 * All amounts are in CENTS.
 *
 * @module payment/adapters/cmi
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

const CMI_API_KEY = process.env.CMI_API_KEY || '';
const CMI_MERCHANT_ID = process.env.CMI_MERCHANT_ID || '';
const CMI_HMAC_SECRET = process.env.CMI_HMAC_SECRET || '';
const CMI_CERTIFICATE_PATH = process.env.CMI_CERTIFICATE_PATH || '';
const CMI_BASE_URL = process.env.CMI_BASE_URL || 'https://test.cmi.ma/merchant/api/v1';

// ===== Internal API Types =====

/** CMI payment creation response */
interface CmiCreatePaymentResponse {
  transactionId: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
  sessionExpiry: string;
}

/** CMI status inquiry response */
interface CmiStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  maskedPan?: string;
  cardType?: string;
  authCode?: string;
  rrn?: string;
  threeDSStatus?: string;
  acquirerCode?: string;
  createdAt: string;
  updatedAt: string;
}

/** CMI refund response */
interface CmiRefundResponse {
  refundId: string;
  originalTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

// ===== Status Mapping =====

/**
 * Maps CMI transaction statuses to HireNova PaymentStatus.
 *
 * CMI statuses: INITIATED, WAITING_3DS, PENDING_AUTH, AUTHORIZED,
 *   CAPTURED, PAID, AUTH_REJECTED, REJECTED, CANCELLED,
 *   EXPIRED, REFUNDED, PARTIALLY_REFUNDED
 */
function mapCmiStatus(cmiStatus: string): string {
  const statusMap: Record<string, string> = {
    'initiated': PaymentStatus.CREATED,
    'waiting_3ds': PaymentStatus.PENDING,
    'pending_auth': PaymentStatus.PENDING,
    'authorized': PaymentStatus.AUTHORIZED,
    'captured': PaymentStatus.CAPTURED,
    'paid': PaymentStatus.SUCCEEDED,
    'completed': PaymentStatus.SUCCEEDED,
    'auth_rejected': PaymentStatus.FAILED,
    'rejected': PaymentStatus.FAILED,
    'cancelled': PaymentStatus.CANCELLED,
    'expired': PaymentStatus.EXPIRED,
    'refunded': PaymentStatus.REFUNDED,
    'partially_refunded': PaymentStatus.PARTIALLY_REFUNDED,
  };
  return statusMap[cmiStatus.toLowerCase()] || PaymentStatus.CREATED;
}

// ===== CMI HTTP Helper =====

/**
 * Build HMAC-SHA256 signature for CMI API requests.
 * CMI signs requests using HMAC-SHA256 over the method + path + body + timestamp.
 */
function buildCmiSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
): string {
  const stringToSign = `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
  return createHmac('sha256', CMI_HMAC_SECRET)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Make an authenticated request to the CMI API.
 * Includes merchant ID, API key, and HMAC signature.
 */
async function cmiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; status: number }> {
  const url = `${CMI_BASE_URL}${path}`;
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';

  const signature = buildCmiSignature(method, path, bodyStr, timestamp);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Merchant-Id': CMI_MERCHANT_ID,
    'X-API-Key': CMI_API_KEY,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };

  // If a client certificate path is configured, note it for TLS
  // (Node.js fetch doesn't natively support client certs;
  //  in production, this would require undici or node:http)
  if (CMI_CERTIFICATE_PATH) {
    headers['X-Cert-Info'] = 'client-cert-configured';
  }

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body && method.toUpperCase() !== 'GET') {
    fetchOptions.body = bodyStr;
  }

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    let errorMessage = `CMI API error: HTTP ${res.status}`;
    try {
      const errorData = await res.json() as Record<string, unknown>;
      const err = errorData?.error as Record<string, unknown> | undefined;
      if (err?.message) {
        errorMessage = err.message as string;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const data = await res.json() as Record<string, unknown>;
  return { data, status: res.status };
}

// ===== CMI Adapter =====

/**
 * CMI payment adapter implementing the PaymentAdapter interface.
 *
 * CMI (Centre Monétique Interbancaire) is Morocco's central interbank
 * payment network handling debit/credit card processing.
 *
 * Supports: payment creation (3DS redirect flow), status retrieval,
 * refunds, cancellation, and webhook HMAC verification.
 */
export class CmiAdapter implements PaymentAdapter {
  readonly name = 'cmi' as const;

  /**
   * Create a payment on CMI.
   * Returns a redirectUrl for the CMI hosted payment page (with 3DS support).
   */
  async createPayment(input: CreatePaymentAdapterInput): Promise<AdapterPaymentResult> {
    try {
      if (!CMI_MERCHANT_ID || !CMI_API_KEY) {
        return {
          success: false,
          error: 'CMI not configured (CMI_API_KEY, CMI_MERCHANT_ID required)',
          errorCode: 'CMI_NOT_CONFIGURED',
          timestamp: new Date().toISOString(),
        };
      }

      const { data, status } = await cmiRequest('POST', '/payments', {
        merchantId: CMI_MERCHANT_ID,
        amount: input.amount,
        currency: input.currency || 'MAD',
        description: input.description,
        merchantTransactionId: input.idempotencyKey || `hirenova-${Date.now()}`,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        expiresAt: input.expiresAt,
        language: 'fr', // CMI supports fr/ar/en
        threeDS: true, // Always enable 3DS for CMI cards
        metadata: input.metadata,
      });

      const responseData = data as unknown as CmiCreatePaymentResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId,
        status: mapCmiStatus(responseData?.status || 'initiated'),
        redirectUrl: responseData?.paymentUrl,
        amount: input.amount,
        currency: input.currency || 'MAD',
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CMI error';
      return {
        success: false,
        error: message,
        errorCode: 'CMI_CREATE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Capture a previously authorized payment on CMI.
   *
   * @param providerPaymentId - CMI transaction ID
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

      const { data, status } = await cmiRequest(
        'POST',
        `/payments/${providerPaymentId}/capture`,
        body,
      );

      const responseData = data as unknown as CmiStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapCmiStatus(responseData?.status || 'captured'),
        amount: responseData?.amount || amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CMI capture error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'CMI_CAPTURE_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refund a CMI payment.
   *
   * @param providerPaymentId - CMI transaction ID
   * @param amount - Refund amount in cents
   * @param reason - Optional refund reason
   */
  async refundPayment(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<AdapterRefundResult> {
    try {
      const { data, status } = await cmiRequest(
        'POST',
        `/payments/${providerPaymentId}/refund`,
        {
          amount,
          reason: reason || 'Customer requested refund',
        },
      );

      const responseData = data as unknown as CmiRefundResponse;

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
      const message = error instanceof Error ? error.message : 'Unknown CMI refund error';
      return {
        success: false,
        error: message,
        errorCode: 'CMI_REFUND_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cancel an active CMI payment.
   *
   * @param providerPaymentId - CMI transaction ID
   */
  async cancelPayment(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await cmiRequest(
        'POST',
        `/payments/${providerPaymentId}/cancel`,
      );

      const responseData = data as unknown as CmiStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapCmiStatus(responseData?.status || 'cancelled'),
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CMI cancel error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'CMI_CANCEL_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve the current status of a CMI payment.
   *
   * @param providerPaymentId - CMI transaction ID
   */
  async getPaymentStatus(providerPaymentId: string): Promise<AdapterPaymentResult> {
    try {
      const { data, status } = await cmiRequest(
        'GET',
        `/payments/${providerPaymentId}`,
      );

      const responseData = data as unknown as CmiStatusResponse;

      return {
        success: status >= 200 && status < 300,
        providerPaymentId: responseData?.transactionId || providerPaymentId,
        status: mapCmiStatus(responseData?.status || 'pending'),
        amount: responseData?.amount,
        currency: responseData?.currency,
        timestamp: new Date().toISOString(),
        rawResponse: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CMI status error';
      return {
        success: false,
        providerPaymentId,
        error: message,
        errorCode: 'CMI_STATUS_FAILED',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify an incoming CMI webhook signature.
   * CMI uses HMAC-SHA256 signed payloads.
   *
   * @param payload - Raw request body string
   * @param signature - X-Signature header value from webhook
   * @param secret - CMI HMAC secret
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      console.warn('[cmi-adapter] No HMAC_SECRET configured — skipping verification');
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
 * Check if the CMI adapter is properly configured.
 * Requires API key, merchant ID, and HMAC secret.
 */
export function isCmiAdapterConfigured(): boolean {
  return !!(
    CMI_API_KEY &&
    CMI_MERCHANT_ID &&
    CMI_HMAC_SECRET
  );
}
