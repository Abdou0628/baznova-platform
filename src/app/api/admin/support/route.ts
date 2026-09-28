import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const [tickets, openCount, resolvedCount] = await Promise.all([
      db.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.supportTicket.count({ where: { status: 'open' } }),
      db.supportTicket.count({ where: { status: 'resolved' } }),
    ])

    return NextResponse.json({ tickets, openCount, resolvedCount })
  } catch (error) {
    console.error('Admin support error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { ticketId, status } = await request.json()
    if (!ticketId || !['open', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    await db.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin support patch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
