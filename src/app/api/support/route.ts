import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { encryptBeforeWrite } from '@/lib/hnsa/encryption-middleware'

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await request.json()
    const { name, email, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    if (message.length < 10) {
      return NextResponse.json({ error: 'Le message doit contenir au moins 10 caractères' }, { status: 400 })
    }

    // Encrypt sensitive fields before writing (future-proof: no fields in sensitiveFields currently match,
    // but this ensures encryption activates automatically if fields are added to the registry)
    const ticketData = encryptBeforeWrite({
        userId: auth.userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
      })

    const ticket = await db.supportTicket.create({ data: ticketData })

    return NextResponse.json({ success: true, ticketId: ticket.id })
  } catch (error) {
    console.error('Support ticket error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
