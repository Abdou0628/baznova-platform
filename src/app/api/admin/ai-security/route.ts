/**
 * HNSA — AI Security Events API (Admin Only)
 *
 * GET /api/admin/ai-security — AI security event log with filters
 *
 * HNSA Pillars: 6 (Data Security), 8 (Monitoring)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    // --- Auth + Admin check ---
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = request.nextUrl
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const skip = (page - 1) * limit
    const blockedOnly = searchParams.get('blocked') === 'true'
    const hours = Number(searchParams.get('hours')) || 168 // default 7 days
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const where: Record<string, unknown> = { createdAt: { gte: since } }
    if (blockedOnly) {
      where.blocked = true
    }
    if (searchParams.get('userId')) {
      where.userId = searchParams.get('userId')
    }
    if (searchParams.get('severity')) {
      where.severity = searchParams.get('severity')
    }

    const [events, total, summary] = await Promise.all([
      db.aISecurityEvent.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.aISecurityEvent.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
      db.aISecurityEvent.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        _orderBy: { _count: { id: 'desc' } },
      }),
    ])

    return NextResponse.json({
      success: true,
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary,
    })
  } catch (error) {
    console.error('[HNSA] AI Security API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
