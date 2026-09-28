/**
 * BazNova Payment Abstraction Layer — Dev Simulator Provider
 *
 * Implements IPaymentProvider for local development.
 * This is the FALLBACK that always works — no real charges.
 *
 * Usage:
 *   - Local development without Stripe/PayMob keys
 *   - CI/CD pipeline testing
 *   - Demo / sandbox mode
 *
 * All operations return simulated successful results immediately.
 *
 * @module payment-layer/providers/dev-simulator
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

/** In-memory store for simulated transactions */
const simulatedTransactions = new Map<string, {
  status: ProviderPaymentStatus['status'];
  amount: number;
  currency: string;
  createdAt: string;
}>();

/**
 * Dev Simulator payment provider.
 * Every operation succeeds immediately — no real API calls, no real charges.
 */
export class DevSimulatorProvider implements IPaymentProvider {
  readonly id = 'dev_simulator' as const;
  readonly name = 'Dev Simulator (No Real Charges)';
  readonly region = 'international' as const;

  readonly capabilities: ProviderCapabilities = {
    recurring: true,
    refund: true,
    webhook: true,
    tokenization: true,
    mobileMoney: true,
  };

  /**
   * Simulate a checkout. Returns a fake success URL.
   *
   * @param params - Provider checkout parameters
   * @returns Simulated checkout result
   */
  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutResult> {
    const simId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store in memory for later verification
    simulatedTransactions.set(simId, {
      status: 'succeeded',
      amount: params.amount,
      currency: params.currency,
      createdAt: new Date().toISOString(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[dev_simulator] Checkout created: ${simId} — ${params.amount / 100} ${params.currency}`);
    }

    // In dev mode, simulate instant success — no redirect needed.
    // Return status 'succeeded' so the frontend shows the success dialog directly.
    // This avoids navigating to a non-existent simulate-success route (404 bug).
    return {
      providerTransactionId: simId,
      // No redirectUrl — the frontend handles success inline
      clientSecret: `sim_secret_${simId}`,
      status: 'succeeded',
    };
  }

  /**
   * Verify a simulated payment. Always returns "succeeded" for existing transactions.
   *
   * @param transactionId - Simulated transaction ID
   * @returns Simulated payment status
   */
  async verifyPayment(transactionId: string): Promise<ProviderPaymentStatus> {
    const transaction = simulatedTransactions.get(transactionId);

    if (transaction) {
      // Simulate: after a short time, payments "succeed"
      const elapsed = Date.now() - new Date(transaction.createdAt).getTime();
      const hasSucceeded = elapsed > 2000; // 2 seconds after creation

      if (hasSucceeded) {
        // Update in-memory status
        transaction.status = 'succeeded';
      }

      return {
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paidAt: hasSucceeded ? new Date().toISOString() : undefined,
      };
    }

    // Unknown transaction — still succeed in dev mode
    return {
      status: 'succeeded',
      paidAt: new Date().toISOString(),
    };
  }

  /**
   * Simulate a webhook. Always returns verified.
   *
   * @param payload - Any payload (ignored)
   * @param _signature - Any signature (ignored)
   * @returns Simulated webhook result
   */
  async processWebhook(payload: unknown, _signature: string): Promise<WebhookResult> {
    const body = (typeof payload === 'string' ? JSON.parse(payload) : payload) as Record<string, unknown> | null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[dev_simulator] Webhook processed:', body?.eventType ?? 'unknown');
    }

    return {
      verified: true,
      eventType: (body?.eventType as string) ?? 'payment.succeeded',
      transactionId: (body?.transactionId as string) ?? `sim_wh_${Date.now()}`,
      data: body ?? {},
    };
  }

  /**
   * Simulate a refund. Always succeeds.
   *
   * @param transactionId - Simulated transaction ID
   * @param amount - Refund amount
   * @returns Simulated refund result
   */
  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    const refundId = `sim_refund_${Date.now()}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[dev_simulator] Refund processed: ${refundId} for transaction ${transactionId}`);
    }

    return {
      refundId,
      status: 'succeeded',
      amount: amount ?? 0,
    };
  }
}

/**
 * Mark a simulated transaction as succeeded (manual override for testing).
 */
export function markSimulatedSucceeded(transactionId: string): void {
  const transaction = simulatedTransactions.get(transactionId);
  if (transaction) {
    transaction.status = 'succeeded';
  }
}

/**
 * Get all simulated transactions (for debugging).
 */
export function getSimulatedTransactions(): Map<string, {
  status: ProviderPaymentStatus['status'];
  amount: number;
  currency: string;
  createdAt: string;
}> {
  return new Map(simulatedTransactions);
}

/** Singleton instance */
export const devSimulatorProvider = new DevSimulatorProvider();
