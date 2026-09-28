import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || 'upcoming'
    const language = searchParams.get('language') || 'fr'

    const where: Record<string, unknown> = {}
    if (type && type !== 'all') {
      where.type = type
    }
    if (status && status !== 'all') {
      where.status = status
    }
    if (language) {
      where.language = language
    }

    const events = await db.communityEvent.findMany({
      where,
      orderBy: { date: status === 'past' ? 'desc' : 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('GET /api/marketplace/events error:', error)
    return NextResponse.json({ events: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { eventId, action } = body

    if (action === 'rsvp') {
      const event = await db.communityEvent.findUnique({ where: { id: eventId } })
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (event.attendeeCount >= event.capacity) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 })
      }

      const updated = await db.communityEvent.update({
        where: { id: eventId },
        data: { attendeeCount: { increment: 1 } },
      })
      return NextResponse.json({ attendeeCount: updated.attendeeCount })
    }

    if (action === 'create') {
      const { title, description, type, date, duration, location, capacity, language } = body
      if (!title || !date) {
        return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
      }
      const event = await db.communityEvent.create({
        data: {
          title,
          description: description || '',
          type: type || 'webinar',
          date: new Date(date),
          duration: duration || 60,
          location: location || '',
          capacity: capacity || 500,
          language: language || 'fr',
          status: 'upcoming',
        },
      })
      return NextResponse.json({ event }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/marketplace/events error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
