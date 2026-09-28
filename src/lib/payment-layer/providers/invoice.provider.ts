/**
 * BazNova Payment Abstraction Layer — Invoice Provider (Enterprise)
 *
 * Implements IPaymentProvider for enterprise invoicing.
 * Generates invoice numbers and returns a link to download the invoice.
 * No real payment processing — marks as "pending" until bank transfer received.
 *
 * This is the provider for:
 *   - Enterprise plan subscriptions
 *   - Bank transfer / wire transfer payments
 *   - Custom invoicing arrangements
 *
 * @module payment-layer/providers/invoice
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
 * Invoice payment provider implementation.
 * No real payment processing — generates an invoice and marks as pending
 * until the bank transfer is manually confirmed.
 */
export class InvoiceProvider implements IPaymentProvider {
  readonly id = 'invoice' as const;
  readonly name = 'Invoice (Enterprise)';
  readonly region = 'enterprise' as const;

  readonly capabilities: ProviderCapabilities = {
    recurring: false,   // Enterprise invoicing is manual/periodic
    refund: true,       // Credits can be issued
    webhook: false,     // No automatic webhook — manual confirmation
    tokenization: false,
    mobileMoney: false,
  };

  /**
   * Generate an enterprise invoice.
   * Creates an invoice number and returns a link to the invoice page.
   *
   * The payment remains "pending" until a bank transfer is received
   * and manually confirmed by the finance team.
   *
   * @param params - Provider checkout parameters
   * @returns Checkout result with invoice URL
   */
  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult> {
    const invoiceNumber = generateInvoiceNumber();
    const userId = String(params.metadata.userId);
    const planId = String(params.metadata.planId);

    // In a real implementation, this would:
    // 1. Generate a PDF invoice using a template
    // 2. Email the invoice to the customer
    // 3. Store the invoice in the database
    // For now, we return a URL that points to the invoice page

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hirenova.com';
    const invoiceUrl = `${baseUrl}/invoice/${invoiceNumber}?userId=${userId}&plan=${planId}`;

    return {
      providerTransactionId: invoiceNumber,
      redirectUrl: invoiceUrl,
      status: 'processing', // Invoice is generated, awaiting payment
    };
  }

  /**
   * Verify an invoice payment status.
   * Since invoices are manually confirmed, this checks the database.
   *
   * @param transactionId - Invoice number
   * @returns Payment status (always pending until manually confirmed)
   */
  async verifyPayment(transactionId: string): Promise<ProviderPaymentStatus> {
    // In a real implementation, this would query the database
    // to check if the invoice has been marked as paid by the finance team.
    // For now, we return pending status.

    void transactionId; // acknowledge parameter
    return {
      status: 'pending',
    };
  }

  /**
   * Process an invoice webhook.
   * Enterprise invoices don't have automatic webhooks —
   * payment confirmation is manual.
   *
   * @param payload - Webhook payload (unused)
   * @param _signature - Webhook signature (unused)
   * @returns Webhook result (always unverified for invoices)
   */
  async processWebhook(_payload: unknown, _signature: string): Promise<WebhookResult> {
    // Enterprise invoices are manually confirmed — no automatic webhooks
    return {
      verified: false,
      eventType: 'not_supported',
      data: { message: 'Enterprise invoices do not support automatic webhooks. Confirm manually.' },
    };
  }

  /**
   * Issue a credit note (refund) for an enterprise invoice.
   * In practice, this generates a credit note and notifies the finance team.
   *
   * @param transactionId - Invoice number
   * @param amount - Credit note amount (optional for full credit)
   * @returns Refund result
   */
  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    const creditNoteNumber = `CN-${transactionId}-${Date.now()}`;

    // In a real implementation, this would:
    // 1. Generate a credit note PDF
    // 2. Email it to the customer
    // 3. Notify the finance team
    // 4. Update the invoice status in the database

    return {
      refundId: creditNoteNumber,
      status: 'pending', // Credit note issued, pending manual processing
      amount: amount ?? 0,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a unique invoice number.
 * Format: INV-YYYYMMDD-XXXXX (random 5-digit suffix)
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${datePart}-${randomPart}`;
}

/** Singleton instance */
export const invoiceProvider = new InvoiceProvider();
