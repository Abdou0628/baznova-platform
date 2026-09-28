import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ------------------------------------------------------------------ */
/*  GET  — List accounting entries with optional filters               */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (category) where.category = category
    if (status) where.status = status
    if (from || to) {
      const dateFilter: Record<string, unknown> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.createdAt = dateFilter
    }

    const [entries, summary] = await Promise.all([
      db.accountingEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
      }),
      db.accountingEntry.groupBy({
        by: ['type'],
        where: from || to ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : undefined,
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalIncome = summary.find(s => s.type === 'income')?._sum.amount ?? 0
    const totalExpense = summary.find(s => s.type === 'expense')?._sum.amount ?? 0
    const totalRefund = summary.find(s => s.type === 'refund')?._sum.amount ?? 0

    return NextResponse.json({
      entries,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        totalRefund: Math.round(totalRefund * 100) / 100,
        netProfit: Math.round((totalIncome - totalExpense - totalRefund) * 100) / 100,
        byType: summary.map(s => ({ type: s.type, total: Math.round((s._sum.amount ?? 0) * 100) / 100, count: s._count })),
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: `Accounting error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  POST — Create a new accounting entry                               */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, category, description, amount, currency, reference, metadata, userId } = body

    if (!type || !category || !description || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Champs requis: type, category, description, amount (> 0)' }, { status: 400 })
    }

    const validTypes = ['income', 'expense', 'refund', 'platform_fee', 'royalty']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Type invalide. Valeurs: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const entry = await db.accountingEntry.create({
      data: {
        type,
        category,
        description,
        amount: Math.round(amount * 100) / 100,
        currency: currency || 'MAD',
        reference: reference || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: userId || null,
        status: 'confirmed',
      },
    })

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: `Create error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE — Remove an accounting entry                                */
/* ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await db.accountingEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: `Delete error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
