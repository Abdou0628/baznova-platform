import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await request.json()
    const { type, itemId, rating, comment } = body

    if (!type || !rating) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!['cv', 'cover_letter'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'La note doit être entre 1 et 5' }, { status: 400 })
    }

    await db.satisfactionRating.create({
      data: {
        userId: auth.userId,
        type,
        itemId: itemId || undefined,
        rating,
        comment: comment?.trim() || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Satisfaction error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
