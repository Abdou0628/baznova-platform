import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/hnsa';
import { getFinancialSummary } from '@/lib/payment/ledger';

export const runtime = 'nodejs';

/**
 * GET /api/payment/summary?startDate=<iso>&endDate=<iso>
 *
 * Returns a financial summary aggregated by status, currency, and provider.
 * Useful for admin dashboards and accounting.
 * Requires admin authentication (API key or admin user).
 */
export async function GET(request: NextRequest) {
  try {
    // ── Authentication (admin only via API key or session plan check) ──
    const auth = await withAuth(request);
    const apiKey = request.headers.get('x-api-key');

    if (!auth.authorized && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: auth.reason },
        { status: auth.statusCode }
      );
    }

    // ── Parse query params ──
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // ── Validate date format if provided ──
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate format. Use ISO 8601.' },
        { status: 400 }
      );
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate format. Use ISO 8601.' },
        { status: 400 }
      );
    }

    // ── Fetch financial summary ──
    const summary = await getFinancialSummary(startDate, endDate);

    // ── Compute top-level totals ──
    const totals = summary.reduce(
      (acc, group) => {
        acc.totalAmount += group.totalAmount;
        acc.totalCount += group.count;

        // Per-status totals
        acc.byStatus[group.status] = (acc.byStatus[group.status] || 0) + group.totalAmount;

        // Per-currency totals
        acc.byCurrency[group.currency] = (acc.byCurrency[group.currency] || 0) + group.totalAmount;

        return acc;
      },
      { totalAmount: 0, totalCount: 0, byStatus: {} as Record<string, number>, byCurrency: {} as Record<string, number> }
    );

    return NextResponse.json({
      success: true,
      summary,
      totals,
    });
  } catch (error) {
    console.error('[payment/summary] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
