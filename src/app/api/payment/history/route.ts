import { NextRequest, NextResponse } from 'next/server';
import { getPaymentHistory } from '@/lib/payment/ledger';
import type { PaymentStatus, PaymentProviderName } from '@/lib/payment/types';
import { withAuth } from '@/lib/hnsa';

export const runtime = 'nodejs';

/**
 * GET /api/payment/history?userId=<id>&status=<status>&provider=<provider>&page=<n>&limit=<n>&startDate=<iso>&endDate=<iso>
 *
 * Returns a paginated list of payments for a user with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    // ── Authentication via HNSA Zero Trust ──
    const auth = await withAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode });
    }
    const userId = auth.userId!;

    // ── Parse query params ──
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || userId;
    const status = searchParams.get('status') as PaymentStatus | null;
    const provider = searchParams.get('provider') as PaymentProviderName | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!requestedUserId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // ── Authorization check: user can only view their own history ──
    if (requestedUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only view your own payment history' },
        { status: 403 }
      );
    }

    // ── Validate pagination ──
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination: page >= 1, limit between 1 and 100' },
        { status: 400 }
      );
    }

    // ── Fetch history from ledger ──
    const result = await getPaymentHistory(requestedUserId, {
      status: status || undefined,
      provider: provider || undefined,
      page,
      limit,
      startDate,
      endDate,
    });

    // ── Format dates in response ──
    const formattedPayments = result.payments.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      capturedAt: p.capturedAt?.toISOString(),
      refundedAt: p.refundedAt?.toISOString(),
      expiresAt: p.expiresAt?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      total: result.total,
      page: result.page,
      limit,
    });
  } catch (error) {
    console.error('[payment/history] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
