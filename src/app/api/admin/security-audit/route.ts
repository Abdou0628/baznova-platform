/**
 * HNSA — Security Audit Log API (Admin Only)
 *
 * GET /api/admin/security-audit — Paginated audit trail with filters
 * GET ?action=LOGIN_FAILURE&severity=high&startDate=...&endDate=...&page=1&limit=50
 *
 * HNSA Pillars: 1 (Identity), 8 (Monitoring & Incident Response)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuditTrail, withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    // --- Auth + Admin check ---
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    // --- Parse query params ---
    const { searchParams } = request.nextUrl
    const filters = {
      action: searchParams.get('action') || undefined,
      actorId: searchParams.get('actorId') || undefined,
      actorEmail: searchParams.get('actorEmail') || undefined,
      resource: searchParams.get('resource') || undefined,
      outcome: searchParams.get('outcome') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Math.min(Number(searchParams.get('limit')) || 50, 100),
    }

    const result = await getAuditTrail(filters)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[HNSA] Audit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
