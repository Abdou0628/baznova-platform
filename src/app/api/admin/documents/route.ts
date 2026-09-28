import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

/**
 * GET /api/admin/documents
 * Admin: list all documents with filtering and pagination.
 * Query: ?type=invoice&status=sent&page=1&limit=20&search=
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { recipientName: { contains: search } },
        { recipientEmail: { contains: search } },
        { recipientCompany: { contains: search } },
        { subject: { contains: search } },
      ]
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          number: true,
          recipientName: true,
          recipientEmail: true,
          recipientCompany: true,
          subject: true,
          currency: true,
          total: true,
          status: true,
          issueDate: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          inquiryId: true,
          // Signature fields
          signatureHash: true,
          signatureSerial: true,
          signatureDate: true,
          signedBy: true,
          // Bilan fields
          periodStart: true,
          periodEnd: true,
          invoiceCount: true,
          netProfit: true,
          totalCollected: true,
          platformFees: true,
          royaltyFees: true,
        },
      }),
      db.document.count({ where }),
    ])

    // Stats per type
    const stats = await db.document.groupBy({
      by: ['type'],
      _count: true,
      _sum: { total: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        documents,
        total,
        page,
        limit,
        stats: stats.reduce((acc, s) => {
          acc[s.type] = { count: s._count, total: s._sum.total || 0 }
          return acc
        }, {} as Record<string, { count: number; total: number }>),
      },
    })
  } catch (error) {
    console.error('[admin/documents] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/documents
 * Admin: update document status (mark as paid, accepted, cancelled, etc.)
 * Body: { id, status, paidAt? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { id, status, paidAt } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id et status requis' }, { status: 400 })
    }

    const validStatuses = ['draft', 'sent', 'paid', 'accepted', 'rejected', 'cancelled', 'expired', 'finalized']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const updated = await db.document.update({
      where: { id },
      data: {
        status,
        paidAt: paidAt ? new Date(paidAt) : (status === 'paid' ? new Date() : null),
      },
    })

    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } })
  } catch (error) {
    console.error('[admin/documents PATCH] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
