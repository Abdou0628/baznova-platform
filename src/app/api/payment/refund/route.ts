import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/hnsa';
import { validateRefund, updatePaymentStatus, updatePaymentPartialRefund } from '@/lib/payment/orchestrator';
import { getAdapterOrNull } from '@/lib/payment/adapters';
import { PaymentStatus, type PaymentProviderName } from '@/lib/payment/types';

export const runtime = 'nodejs';

/**
 * POST /api/payment/refund
 *
 * Refunds a payment (full or partial). Validates refund eligibility
 * via orchestrator, then calls the provider adapter, and updates
 * the local payment status.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authentication (admin or API key) ──
    const auth = await withAuth(request, { requiredRole: 'admin' });
    const apiKey = request.headers.get('x-api-key');

    if (!auth.authorized && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: auth.reason },
        { status: auth.statusCode }
      );
    }

    // ── Parse body ──
    const body = await request.json();
    const { paymentId, amount, reason } = body as {
      paymentId: string;
      amount?: number; // in cents — omit for full refund
      reason?: string;
    };

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'paymentId is required' },
        { status: 400 }
      );
    }

    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be positive (in cents)' },
        { status: 400 }
      );
    }

    // ── Validate refund eligibility ──
    const payment = await validateRefund({ paymentId, amount, reason });

    // ── Get adapter ──
    if (!payment.providerPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment has no provider payment ID — cannot refund' },
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

    // ── Calculate refund amount ──
    const refundAmount = amount ?? (payment.amount - payment.refundedAmount);

    if (refundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'This payment has already been fully refunded' },
        { status: 400 }
      );
    }

    // ── Call adapter refund ──
    const adapterResult = await adapter.refundPayment(
      payment.providerPaymentId,
      refundAmount,
      reason
    );

    if (!adapterResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: adapterResult.error || 'Refund failed at provider',
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

    // ── Determine if partial or full refund ──
    const isFullRefund = (payment.refundedAmount + refundAmount) >= payment.amount;

    let updatedPayment;
    if (isFullRefund) {
      updatedPayment = await updatePaymentStatus(
        paymentId,
        PaymentStatus.REFUNDED,
        { refundResult: adapterResult.rawResponse, refundReason: reason },
        adapterResult.refundId
      );
    } else {
      updatedPayment = await updatePaymentPartialRefund(
        paymentId,
        refundAmount,
        { refundResult: adapterResult.rawResponse, refundReason: reason }
      );
    }

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
      refund: {
        refundId: adapterResult.refundId,
        amount: adapterResult.amount ?? refundAmount,
        currency: adapterResult.currency ?? payment.currency,
        status: adapterResult.status,
        timestamp: adapterResult.timestamp,
      },
    });
  } catch (error) {
    console.error('[payment/refund] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
