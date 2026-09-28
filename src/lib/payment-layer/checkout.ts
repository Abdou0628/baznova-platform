/**
 * BazNova Payment Abstraction Layer — Checkout Orchestrator
 *
 * The MAIN entry point for all payment operations.
 * This is what API routes call — never import a specific provider directly.
 *
 * Flow:
 *   1. Route to provider via regionRouter.routeToProvider(request)
 *   2. Get provider instance via providerFactory.getProvider(decision.provider)
 *   3. Create checkout via provider.createCheckout(transformedParams)
 *   4. Save payment record to database via Prisma
 *   5. Return provider-agnostic CheckoutResponse (user never sees provider name)
 *   6. In dev mode, attach _debug with provider/region/routing info
 *
 * @module payment-layer/checkout
 */

import { db } from '@/lib/db';
import { routeToProvider } from './region-router';
import { getProvider } from './provider-factory';
import type {
  CheckoutRequest,
  CheckoutResponse,
  PaymentStatusResponse,
  WebhookResult,
  RefundResult,
  ProviderCheckoutParams,
  PaymentProviderId,
} from './types';

// ── Idempotency Key Generation ──────────────────────────────────────────────

/**
 * Generate a unique idempotency key for a checkout.
 * Prevents duplicate charges from retrying the same request.
 */
function generateIdempotencyKey(userId: string, planId: string, amount: number, currency: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `cko_${userId}_${planId}_${amount}_${currency}_${timestamp}_${random}`;
}

/**
 * Generate a public-facing checkout ID.
 */
function generateCheckoutId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `hn_${timestamp}_${random}`;
}

// ── Main Checkout Function ──────────────────────────────────────────────────

/**
 * Create a provider-agnostic checkout session.
 *
 * This is the SINGLE entry point for all payment checkouts.
 * The frontend calls this — it never knows which provider is used.
 *
 * @param request - The checkout request from the frontend
 * @returns Provider-agnostic checkout response
 *
 * @example
 * ```ts
 * // Frontend code:
 * const result = await baznovaCheckout({
 *   userId: 'user_123',
 *   planId: 'pro',
 *   amount: 1900, // 19.00 EUR in cents
 *   currency: 'EUR',
 *   country: 'FR',
 *   email: 'user@example.com',
 *   successUrl: '/dashboard?upgraded=true',
 *   cancelUrl: '/pricing',
 * });
 *
 * // Redirect user to result.redirectUrl
 * // The user sees ONLY "Payer 19,00 € / mois"
 * // They NEVER see "Stripe" or "PayMob"
 * ```
 */
export async function baznovaCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
  // ── 1. Route to provider ───────────────────────────────────────────────
  const routingDecision = routeToProvider(request);

  // ── 2. Get provider instance ───────────────────────────────────────────
  const provider = getProvider(routingDecision.provider);

  // ── 3. Transform request to provider params ────────────────────────────
  const providerParams: ProviderCheckoutParams = {
    amount: request.amount,
    currency: request.currency,
    email: request.email,
    successUrl: request.successUrl || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard?upgraded=true`,
    cancelUrl: request.cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/pricing`,
    metadata: {
      userId: request.userId,
      planId: request.planId,
      ...(request.metadata ?? {}),
    },
  };

  // ── 4. Create checkout with provider ───────────────────────────────────
  const checkoutId = generateCheckoutId();
  const idempotencyKey = generateIdempotencyKey(
    request.userId,
    request.planId,
    request.amount,
    request.currency,
  );

  let providerResult;
  try {
    providerResult = await provider.createCheckout(providerParams);
  } catch (error) {
    // If the primary provider fails, try fallback
    const fallbackProvider = getFallbackProvider(routingDecision.provider, routingDecision.region);
    if (fallbackProvider) {
      try {
        const fallback = getProvider(fallbackProvider);
        providerResult = await fallback.createCheckout(providerParams);
        // Update routing decision for debug info
        routingDecision.provider = fallbackProvider;
        routingDecision.reason += ` (fallback after primary failed: ${error instanceof Error ? error.message : 'unknown'})`;
      } catch (fallbackError) {
        // Both primary and fallback failed — try dev_simulator as last resort
        const devProvider = getProvider('dev_simulator');
        providerResult = await devProvider.createCheckout(providerParams);
        routingDecision.provider = 'dev_simulator';
        routingDecision.reason += ` (fallback to dev_simulator after both failed)`;
      }
    } else {
      // No fallback — try dev_simulator
      try {
        const devProvider = getProvider('dev_simulator');
        providerResult = await devProvider.createCheckout(providerParams);
        routingDecision.provider = 'dev_simulator';
        routingDecision.reason += ` (fallback to dev_simulator after primary failed)`;
      } catch (devError) {
        // Everything failed
        return {
          checkoutId,
          status: 'failed',
          _debug: isDevMode() ? {
            provider: routingDecision.provider,
            region: routingDecision.region,
            routingReason: `All providers failed. Primary: ${error instanceof Error ? error.message : 'unknown'}`,
          } : undefined,
        };
      }
    }
  }

  // ── 5. Save to database ────────────────────────────────────────────────
  try {
    await db.unifiedPayment.create({
      data: {
        checkoutId,
        userId: request.userId,
        planId: request.planId,
        amount: request.amount,
        currency: request.currency,
        country: request.country,
        paymentMethod: request.paymentMethod,
        email: request.email,
        status: mapProviderStatus(providerResult.status),
        provider: routingDecision.provider,
        providerTransactionId: providerResult.providerTransactionId,
        region: routingDecision.region,
        routingReason: routingDecision.reason,
        redirectUrl: providerResult.redirectUrl,
        clientSecret: providerResult.clientSecret,
        successUrl: providerParams.successUrl,
        cancelUrl: providerParams.cancelUrl,
        metadata: request.metadata ? JSON.stringify(request.metadata) : null,
        idempotencyKey,
      },
    });
  } catch (dbError) {
    // Database save failure should not block the checkout
    // The provider checkout was already created — log and continue
    console.error('[payment-layer] Failed to save UnifiedPayment:', dbError);
  }

  // ── 6. Return provider-agnostic response ───────────────────────────────
  return {
    checkoutId,
    status: providerResult.status,
    redirectUrl: providerResult.redirectUrl,
    clientSecret: providerResult.clientSecret,
    providerTransactionId: providerResult.providerTransactionId,
    _debug: isDevMode() ? {
      provider: routingDecision.provider,
      region: routingDecision.region,
      routingReason: routingDecision.reason,
    } : undefined,
  };
}

// ── Verify Payment ──────────────────────────────────────────────────────────

/**
 * Verify the status of a payment by our checkout ID.
 *
 * @param checkoutId - Our internal checkout ID
 * @returns Provider-agnostic payment status
 */
export async function baznovaVerifyPayment(checkoutId: string): Promise<PaymentStatusResponse> {
  // Look up the payment record
  const record = await db.unifiedPayment.findUnique({
    where: { checkoutId },
  });

  if (!record) {
    throw new Error(`Checkout not found: ${checkoutId}`);
  }

  // If the payment is still pending/processing, check with the provider
  if (record.status === 'pending' || record.status === 'requires_action' || record.status === 'processing') {
    if (record.providerTransactionId) {
      try {
        const provider = getProvider(record.provider as PaymentProviderId);
        const providerStatus = await provider.verifyPayment(record.providerTransactionId);

        // Update our record if the status changed
        if (providerStatus.status === 'succeeded' && record.status !== 'succeeded') {
          await db.unifiedPayment.update({
            where: { checkoutId },
            data: {
              status: 'succeeded',
              paidAt: new Date(),
            },
          });
        }

        return {
          checkoutId,
          status: providerStatus.status,
          amount: providerStatus.amount ?? record.amount,
          currency: providerStatus.currency ?? record.currency,
          paidAt: providerStatus.paidAt,
          providerTransactionId: record.providerTransactionId ?? undefined,
        };
      } catch {
        // Provider verification failed — return our stored status
      }
    }
  }

  // Return our stored status
  return {
    checkoutId,
    status: record.status as PaymentStatusResponse['status'],
    amount: record.amount,
    currency: record.currency,
    paidAt: record.paidAt?.toISOString(),
    providerTransactionId: record.providerTransactionId ?? undefined,
  };
}

// ── Process Webhook ─────────────────────────────────────────────────────────

/**
 * Process a webhook from a payment provider.
 *
 * @param providerId - Which provider sent the webhook
 * @param payload - Raw webhook payload
 * @param signature - Webhook signature for verification
 * @returns Webhook processing result
 */
export async function baznovaWebhook(
  providerId: string,
  payload: unknown,
  signature: string,
): Promise<WebhookResult> {
  const provider = getProvider(providerId as PaymentProviderId);
  const result = await provider.processWebhook(payload, signature);

  // If webhook verified and payment succeeded, update our records
  if (result.verified && result.eventType.includes('succeeded') && result.transactionId) {
    try {
      await db.unifiedPayment.updateMany({
        where: { providerTransactionId: result.transactionId },
        data: {
          status: 'succeeded',
          paidAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('[payment-layer] Failed to update payment on webhook:', dbError);
    }
  }

  return result;
}

// ── Refund ──────────────────────────────────────────────────────────────────

/**
 * Refund a payment by our checkout ID.
 *
 * @param checkoutId - Our internal checkout ID
 * @param amount - Optional amount for partial refund (in cents)
 * @returns Refund result
 */
export async function baznovaRefund(checkoutId: string, amount?: number): Promise<RefundResult> {
  const record = await db.unifiedPayment.findUnique({
    where: { checkoutId },
  });

  if (!record) {
    throw new Error(`Checkout not found: ${checkoutId}`);
  }

  if (!record.providerTransactionId) {
    throw new Error('No provider transaction ID — cannot refund');
  }

  const provider = getProvider(record.provider as PaymentProviderId);
  const result = await provider.refund(record.providerTransactionId, amount);

  // Update our record
  if (result.status === 'succeeded') {
    await db.unifiedPayment.update({
      where: { checkoutId },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundedAmount: (record.refundedAmount ?? 0) + (amount ?? record.amount),
      },
    });
  }

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if we're in development mode.
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Map provider checkout status to our unified status.
 */
function mapProviderStatus(
  status: 'requires_action' | 'processing' | 'succeeded',
): string {
  return status; // 1:1 mapping in our case
}

/**
 * Get the fallback provider for a given provider + region combination.
 */
function getFallbackProvider(
  _primaryProvider: PaymentProviderId,
  region: string,
): PaymentProviderId | null {
  const fallbacks: Record<string, PaymentProviderId> = {
    international: 'lemonsqueezy',
    morocco: 'payzone',
    africa: 'payzone',
  };
  return fallbacks[region] ?? null;
}
