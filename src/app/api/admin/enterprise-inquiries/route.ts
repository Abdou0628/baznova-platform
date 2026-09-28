import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

/**
 * GET /api/admin/enterprise-inquiries
 * Admin: list all Enterprise inquiries.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [inquiries, total] = await Promise.all([
      db.enterpriseInquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.enterpriseInquiry.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { inquiries, total, page, limit },
    })
  } catch (error) {
    console.error('[admin/enterprise-inquiries] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/enterprise-inquiries
 * Update inquiry status (new → contacted → qualified → won/lost).
 * Body: { id, status }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id et status requis' }, { status: 400 })
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'won', 'lost']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const updated = await db.enterpriseInquiry.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } })
  } catch (error) {
    console.error('[admin/enterprise-inquiries PATCH] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
