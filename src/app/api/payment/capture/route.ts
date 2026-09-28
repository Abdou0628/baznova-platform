import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/hnsa';
import { getPaymentStatus, updatePaymentStatus } from '@/lib/payment/orchestrator';
import { getAdapterOrNull } from '@/lib/payment/adapters';
import type { PaymentStatus } from '@/lib/payment/types';

export const runtime = 'nodejs';

/**
 * POST /api/payment/capture
 *
 * Captures a previously authorized payment. Supports partial capture.
 * Requires authentication.
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
    const { paymentId, amount } = body as {
      paymentId: string;
      amount?: number; // optional partial capture amount in cents
    };

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
    if (currentStatus !== 'authorized') {
      return NextResponse.json(
        { success: false, error: `Cannot capture payment in status "${currentStatus}". Only "authorized" payments can be captured.` },
        { status: 400 }
      );
    }

    // ── Validate partial capture amount ──
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Capture amount must be positive' },
          { status: 400 }
        );
      }
      if (amount > payment.amount) {
        return NextResponse.json(
          { success: false, error: `Capture amount ${amount} exceeds payment amount ${payment.amount}` },
          { status: 400 }
        );
      }
    }

    // ── Get adapter ──
    if (!payment.providerPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment has no provider payment ID — cannot capture' },
        { status: 400 }
      );
    }

    const adapter = await getAdapterOrNull(payment.provider as PaymentProviderName);
    if (!adapter) {
      return NextResponse.json(
        { success: false, error: `Payment provider "${payment.provider}" is not available` },
        { status: 400 }
      );
    }

    // ── Call adapter capture ──
    const adapterResult = await adapter.capturePayment(payment.providerPaymentId, amount);

    if (!adapterResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: adapterResult.error || 'Capture failed at provider',
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
    const newStatus = (adapterResult.status as PaymentStatus) || PaymentStatus.CAPTURED;
    const updatedPayment = await updatePaymentStatus(
      paymentId,
      newStatus,
      { captureResult: adapterResult.rawResponse, capturedAmount: amount ?? payment.amount },
      adapterResult.providerPaymentId
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
    console.error('[payment/capture] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
