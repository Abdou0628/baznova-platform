import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/hnsa';
import { rateLimit } from '@/lib/rate-limit';
import { createPayment as orchestratorCreate, updatePaymentStatus, getPaymentStatus } from '@/lib/payment/orchestrator';
import { selectProvider } from '@/lib/payment/registry';
import { getAdapterOrNull } from '@/lib/payment/adapters';
import type { Currency, CountryCode, PaymentMethodType, PaymentProviderName, PaymentStatus } from '@/lib/payment/types';

export const runtime = 'nodejs';

/**
 * POST /api/payment/create
 *
 * Creates a new payment via the Payment Orchestrator.
 * If no provider is specified, the registry auto-selects the best provider.
 * Rate limited: 10 requests per minute per user/IP.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authentication (session or API key) ──
    const auth = await withAuth(request);
    const apiKey = request.headers.get('x-api-key');

    if (!auth.authorized && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: auth.reason },
        { status: auth.statusCode }
      );
    }

    const userId = auth.userId ?? 'api-key-user';

    // ── Rate limiting ──
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimit(`payment:create:${userId}`, {
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // ── Parse body ──
    const body = await request.json();
    const {
      amount,
      currency,
      provider: providerParam,
      description,
      metadata,
      paymentMethod,
      country,
    } = body as {
      amount: number;
      currency: Currency;
      provider?: PaymentProviderName;
      description?: string;
      metadata?: Record<string, unknown>;
      paymentMethod?: PaymentMethodType;
      country?: string;
    };

    // ── Validate required fields ──
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be positive (in cents)' },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { success: false, error: 'Currency is required' },
        { status: 400 }
      );
    }

    // ── Select provider (explicit or auto via registry) ──
    let provider = providerParam;
    if (!provider) {
      const decision = await selectProvider({
        country: (country ?? 'INTL') as CountryCode,
        currency,
        paymentMethod: paymentMethod ?? 'card',
        amount,
      });
      provider = decision?.provider;
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'No payment provider available for the given currency/method' },
        { status: 400 }
      );
    }

    // ── Get adapter instance ──
    const adapter = await getAdapterOrNull(provider);
    if (!adapter) {
      return NextResponse.json(
        { success: false, error: `Payment provider "${provider}" is not available or not configured` },
        { status: 400 }
      );
    }

    // ── Create payment via orchestrator (persists to DB) ──
    const paymentResult = await orchestratorCreate({
      userId,
      amount,
      currency,
      provider,
      description: description ?? `Payment of ${(amount / 100).toFixed(2)} ${currency}`,
      country: country as CountryCode | undefined,
      paymentMethod,
      metadata,
    });

    // ── Call provider adapter's createPayment ──
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const adapterResult = await adapter.createPayment({
      amount,
      currency,
      description: description ?? paymentResult.description,
      idempotencyKey: paymentResult.idempotencyKey,
      returnUrl: `${baseUrl}/?payment=${paymentResult.id}&status=success`,
      cancelUrl: `${baseUrl}/?payment=${paymentResult.id}&status=cancelled`,
      metadata: metadata ? { ...metadata, paymentId: paymentResult.id, userId } : { paymentId: paymentResult.id, userId },
    });

    if (!adapterResult.success) {
      // Provider failed — update payment status to failed
      try {
        await updatePaymentStatus(
          paymentResult.id,
          'failed' as PaymentStatus,
          { adapterError: adapterResult.error, errorCode: adapterResult.errorCode },
          adapterResult.providerPaymentId
        );
      } catch {
        // Best effort status update
      }

      return NextResponse.json(
        {
          success: false,
          error: adapterResult.error || 'Payment creation failed at provider',
          errorCode: adapterResult.errorCode,
          payment: paymentResult,
        },
        { status: 502 }
      );
    }

    // ── Update payment with provider-specific data ──
    if (adapterResult.status && adapterResult.status !== paymentResult.status) {
      try {
        await updatePaymentStatus(
          paymentResult.id,
          adapterResult.status as PaymentStatus,
          { adapterResult: adapterResult.rawResponse },
          adapterResult.providerPaymentId
        );
      } catch {
        // If transition is invalid (e.g. created → pending), ignore
      }
    } else if (adapterResult.providerPaymentId) {
      // Just update the provider payment ID without status change
      try {
        const { db } = await import('@/lib/db');
        await db.payment.update({
          where: { id: paymentResult.id },
          data: {
            providerPaymentId: adapterResult.providerPaymentId,
            providerData: JSON.stringify(adapterResult.rawResponse),
          },
        });
      } catch {
        // Best effort
      }
    }

    // ── Fetch final payment state ──
    const finalPayment = await getPaymentStatus(paymentResult.id);

    return NextResponse.json({
      success: true,
      payment: finalPayment
        ? {
            ...finalPayment,
            createdAt: finalPayment.createdAt.toISOString(),
            updatedAt: finalPayment.updatedAt.toISOString(),
            capturedAt: finalPayment.capturedAt?.toISOString(),
            refundedAt: finalPayment.refundedAt?.toISOString(),
            expiresAt: finalPayment.expiresAt?.toISOString(),
          }
        : paymentResult,
      clientSecret: adapterResult.clientSecret,
      paymentUrl: adapterResult.redirectUrl,
      providerPaymentId: adapterResult.providerPaymentId,
    });
  } catch (error) {
    console.error('[payment/create] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
