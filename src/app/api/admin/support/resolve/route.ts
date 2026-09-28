import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { ticketId } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID requis' }, { status: 400 })
    }

    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    await db.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'resolved' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resolve ticket error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
