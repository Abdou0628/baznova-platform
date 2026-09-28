import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/hnsa';
import { getPaymentStatus, updatePaymentStatus } from '@/lib/payment/orchestrator';
import { getAdapterOrNull } from '@/lib/payment/adapters';
import { PaymentStatus, type PaymentProviderName } from '@/lib/payment/types';

export const runtime = 'nodejs';

/** States that can be cancelled */
const CANCELLABLE_STATES = new Set<string>([
  PaymentStatus.CREATED,
  PaymentStatus.PENDING,
  PaymentStatus.AUTHORIZED,
]);

/**
 * POST /api/payment/cancel
 *
 * Cancels an active (not yet captured) payment.
 * Calls the provider adapter to cancel, then updates local status.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authentication ──
    const auth = await withAuth(request);
    const apiKey = request.headers.get('x-api-key');

    if (!auth.authorized && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: auth.reason },
        { status: auth.statusCode }
      );
    }

    // ── Parse body ──
    const body = await request.json();
    const { paymentId } = body as { paymentId: string };

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'paymentId is required' },
        { status: 400 }
      );
    }

    // ── Fetch payment ──
    const payment = await getPaymentStatus(paymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const currentStatus = payment.status as PaymentStatus;

    // ── Check cancel eligibility ──
    if (!CANCELLABLE_STATES.has(currentStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel payment in status "${currentStatus}". Only payments in created, pending, or authorized status can be cancelled.`,
        },
        { status: 400 }
      );
    }

    // ── Get adapter ──
    const adapter = await getAdapterOrNull(payment.provider as PaymentProviderName);
    if (!adapter) {
      return NextResponse.json(
        { success: false, error: `Payment provider "${payment.provider}" is not available` },
        { status: 400 }
      );
    }

    // ── Call adapter cancel ──
    // If payment has a provider payment ID, cancel at provider level.
    // Otherwise, just cancel locally.
    let adapterResult;
    if (payment.providerPaymentId) {
      adapterResult = await adapter.cancelPayment(payment.providerPaymentId);
    }

    if (adapterResult && !adapterResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: adapterResult.error || 'Cancellation failed at provider',
          errorCode: adapterResult.errorCode,
          payment: {
            ...payment,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
          },
        },
        { status: 502 }
      );
    }

    // ── Update payment status via orchestrator ──
    const updatedPayment = await updatePaymentStatus(
      paymentId,
      PaymentStatus.CANCELLED,
      adapterResult?.rawResponse
        ? { cancelResult: adapterResult.rawResponse }
        : { cancelledLocally: true },
      adapterResult?.providerPaymentId
    );

    return NextResponse.json({
      success: true,
      payment: {
        ...updatedPayment,
        createdAt: updatedPayment.createdAt.toISOString(),
        updatedAt: updatedPayment.updatedAt.toISOString(),
        capturedAt: updatedPayment.capturedAt?.toISOString(),
        refundedAt: updatedPayment.refundedAt?.toISOString(),
        expiresAt: updatedPayment.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[payment/cancel] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
