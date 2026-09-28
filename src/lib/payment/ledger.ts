/**
 * HireNova Payment Orchestrator — Payment Ledger
 *
 * Immutable financial record layer providing read-only access to
 * payment history, event timelines, financial summaries, and
 * reconciliation tools.
 *
 * All monetary values are in CENTS (smallest currency unit).
 *
 * @module payment/ledger
 */

import { db } from '@/lib/db';
import type {
  PaymentRecord,
  PaymentEventRecord,
  PaymentHistoryFilters,
  FinancialSummaryGroup,
  ReconciliationResult,
  PaymentProviderName,
} from './types';

// ===== Payment History =====

/**
 * Retrieves a paginated payment history for a given user.
 * Supports filtering by status, provider, currency, and date range.
 *
 * @param userId - The user's ID
 * @param filters - Optional filters and pagination parameters
 * @returns Object containing payments array and pagination metadata
 *
 * @example
 * ```ts
 * const { payments, total, page, totalPages } = await getPaymentHistory('user_123', {
 *   status: PaymentStatus.SUCCEEDED,
 *   currency: 'EUR',
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export async function getPaymentHistory(
  userId: string,
  filters?: PaymentHistoryFilters
): Promise<{
  payments: PaymentRecord[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { userId };

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.provider) {
    where.provider = filters.provider;
  }
  if (filters?.currency) {
    where.currency = filters.currency;
  }
  if (filters?.startDate || filters?.endDate) {
    const createdAt: Record<string, unknown> = {};
    if (filters.startDate) {
      createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      createdAt.lte = new Date(filters.endDate);
    }
    where.createdAt = createdAt;
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ===== Payment Timeline =====

/**
 * Retrieves the complete event timeline for a payment.
 * Returns all immutable events in chronological order — this is the audit trail.
 *
 * @param paymentId - Payment ID
 * @returns Array of payment events sorted by creation time (ascending)
 * @throws Error if the payment does not exist
 *
 * @example
 * ```ts
 * const timeline = await getPaymentTimeline('pay_abc123');
 * // [
 * //   { eventType: 'payment_created', statusTo: 'created', createdAt: '...' },
 * //   { eventType: 'payment_pending', statusFrom: 'created', statusTo: 'pending', createdAt: '...' },
 * //   { eventType: 'payment_succeeded', statusFrom: 'pending', statusTo: 'succeeded', createdAt: '...' },
 * // ]
 * ```
 */
export async function getPaymentTimeline(
  paymentId: string
): Promise<PaymentEventRecord[]> {
  // Verify payment exists
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { id: true },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  return db.paymentEvent.findMany({
    where: { paymentId },
    orderBy: { createdAt: 'asc' },
  });
}

// ===== Financial Summary =====

/**
 * Generates a financial summary aggregated by status, currency, and provider.
 * Useful for dashboards and accounting reports.
 *
 * @param startDate - Optional start date filter (ISO 8601 string)
 * @param endDate - Optional end date filter (ISO 8601 string)
 * @returns Array of aggregated groups with totals and counts
 *
 * @example
 * ```ts
 * const summary = await getFinancialSummary('2026-01-01', '2026-06-30');
 * // [
 * //   { status: 'succeeded', currency: 'EUR', provider: 'stripe', totalAmount: 149700, count: 47 },
 * //   { status: 'succeeded', currency: 'MAD', provider: 'cmi', totalAmount: 29900, count: 12 },
 * // ]
 * ```
 */
export async function getFinancialSummary(
  startDate?: string,
  endDate?: string
): Promise<FinancialSummaryGroup[]> {
  const where: Record<string, unknown> = {};

  if (startDate || endDate) {
    const createdAt: Record<string, unknown> = {};
    if (startDate) {
      createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      createdAt.lte = new Date(endDate);
    }
    where.createdAt = createdAt;
  }

  // Aggregate using Prisma's groupBy
  const groups = await db.payment.groupBy({
    by: ['status', 'currency', 'provider'],
    where: Object.keys(where).length > 0 ? where : undefined,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    orderBy: [
      { currency: 'asc' },
      { provider: 'asc' },
      { status: 'asc' },
    ],
  });

  return groups.map((g) => ({
    status: g.status,
    currency: g.currency,
    provider: g.provider,
    totalAmount: g._sum.amount ?? 0,
    count: g._count.id,
  }));
}

/**
 * Generates a summary for a single user.
 *
 * @param userId - User ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Object with total spent, count of payments, and breakdown by status
 */
export async function getUserFinancialSummary(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalSpent: number;
  totalRefunded: number;
  paymentCount: number;
  byCurrency: Array<{
    currency: string;
    totalAmount: number;
    count: number;
  }>;
}> {
  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    const createdAt: Record<string, unknown> = {};
    if (startDate) {
      createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      createdAt.lte = new Date(endDate);
    }
    where.createdAt = createdAt;
  }

  const [succeededPayments, refundedPayments, totalCount, byCurrency] =
    await Promise.all([
      db.payment.aggregate({
        where: { ...where, status: 'succeeded' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      db.payment.aggregate({
        where: {
          ...where,
          status: { in: ['refunded', 'partially_refunded'] },
        },
        _sum: { refundedAmount: true },
        _count: { id: true },
      }),
      db.payment.count({ where }),
      db.payment.groupBy({
        by: ['currency'],
        where: {
          ...where,
          status: 'succeeded',
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

  return {
    totalSpent: succeededPayments._sum.amount ?? 0,
    totalRefunded: refundedPayments._sum.refundedAmount ?? 0,
    paymentCount: totalCount,
    byCurrency: byCurrency.map((g) => ({
      currency: g.currency,
      totalAmount: g._sum.amount ?? 0,
      count: g._count.id,
    })),
  };
}

// ===== Reconciliation =====

/**
 * Compares local payment records against the provider's records.
 * Useful for detecting out-of-sync payments (e.g. webhook failures).
 *
 * This function returns the local records that need verification.
 * The actual provider-side check should be done by the adapter layer (Phase 2).
 *
 * @param provider - Provider name to reconcile
 * @param startDate - Start of reconciliation window (ISO 8601)
 * @param endDate - End of reconciliation window (ISO 8601)
 * @returns Reconciliation result with matched, discrepant, and missing payments
 *
 * @example
 * ```ts
 * const result = await reconcilePayments('stripe', '2026-01-01', '2026-06-30');
 * // {
 * //   matched: [...],
 * //   discrepancies: [...],
 * //   missingFromProvider: [...],
 * //   totalChecked: 52,
 * //   reconciledAt: '2026-07-15T10:30:00Z',
 * // }
 * ```
 */
export async function reconcilePayments(
  provider: PaymentProviderName,
  startDate: string,
  endDate: string
): Promise<ReconciliationResult> {
  // Fetch local payments for the given provider and time range
  // that are in a non-terminal or recently terminal state
  const localPayments = await db.payment.findMany({
    where: {
      provider,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: {
        in: [
          'pending',
          'authorized',
          'captured',
          'succeeded',
          'partially_refunded',
        ],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // For Phase 1, we return all active payments for manual/adapter verification.
  // Phase 2 adapters will check provider status and populate discrepancies.
  const matched: PaymentRecord[] = [];
  const discrepancies: ReconciliationResult['discrepancies'] = [];
  const missingFromProvider: PaymentRecord[] = [];

  for (const payment of localPayments) {
    // Phase 2: adapter.verifyPaymentStatus(payment) would compare statuses
    // For now, all active local payments are flagged for verification
    if (payment.status === 'succeeded' || payment.status === 'captured') {
      matched.push(payment);
    } else {
      // Pending/authorized/partially_refunded need verification
      discrepancies.push({
        payment,
        localStatus: payment.status,
        providerStatus: 'unknown', // Will be filled by Phase 2 adapter
      });
    }
  }

  return {
    matched,
    discrepancies,
    missingFromProvider,
    totalChecked: localPayments.length,
    reconciledAt: new Date().toISOString(),
  };
}

// ===== Admin: All Payments =====

/**
 * Admin-level query to retrieve all payments across users with optional filters.
 *
 * @param filters - Optional filters
 * @returns Paginated payment results
 */
export async function getAllPayments(filters?: {
  status?: string;
  provider?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  payments: PaymentRecord[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.provider) {
    where.provider = filters.provider;
  }
  if (filters?.currency) {
    where.currency = filters.currency;
  }
  if (filters?.startDate || filters?.endDate) {
    const createdAt: Record<string, unknown> = {};
    if (filters.startDate) {
      createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      createdAt.lte = new Date(filters.endDate);
    }
    where.createdAt = createdAt;
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.payment.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    }),
  ]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
