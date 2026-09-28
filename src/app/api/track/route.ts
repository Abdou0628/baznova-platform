import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// --------------- In-memory rate limiter (100 events / min / user) ---------------

const RATE_LIMIT_MAX = 100
const RATE_WINDOW_MS = 60_000
const rateWindow = new Map<string, number[]>()

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  let timestamps = rateWindow.get(userId)
  if (!timestamps) {
    timestamps = []
    rateWindow.set(userId, timestamps)
  }
  // Prune entries older than the window
  const cutoff = now - RATE_WINDOW_MS
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] < cutoff) timestamps.splice(0, i + 1)
    else break
  }
  if (timestamps.length >= RATE_LIMIT_MAX) return true
  timestamps.push(now)
  return false
}

// Cleanup stale entries every 5 min
if (typeof setInterval === 'function') {
  setInterval(() => {
    const cutoff = Date.now() - RATE_WINDOW_MS * 2
    for (const [key, ts] of rateWindow.entries()) {
      if (ts.length === 0 || ts[ts.length - 1] < cutoff) rateWindow.delete(key)
    }
  }, 300_000).unref()
}

// --------------- Helpers ---------------

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

function generateTrackingId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'HNV-'
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// --------------- POST handler ---------------

export async function POST(request: NextRequest) {
 try {
    // 1. Auth check — user must be logged in
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const userId = session.user.id

    // 2. Parse body
    let body: { events?: Array<{
      eventType: string
      eventData?: Record<string, unknown>
      pagePath?: string
      sessionDuration?: number
    }> }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const events = body.events
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: 'events array is required and must not be empty' },
        { status: 400 },
      )
    }

    if (events.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 events per request' },
        { status: 400 },
      )
    }

    // 3. Rate limit
    if (isRateLimited(userId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 },
      )
    }

    // 4. Get user's trackingId (generate one if missing)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { trackingId: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    let trackingId = user.trackingId
    if (!trackingId) {
      trackingId = generateTrackingId()
      await db.user.update({
        where: { id: userId },
        data: { trackingId },
      })
    }

    // 5. Insert tracking events
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') ?? undefined

    const records = events.map((event) => ({
      userId,
      trackingId,
      eventType: event.eventType,
      eventData: event.eventData ? JSON.stringify(event.eventData) : undefined,
      pagePath: event.pagePath ?? undefined,
      userAgent,
      ip,
      sessionDuration: event.sessionDuration ?? undefined,
    }))

    await db.userTrackingEvent.createMany({ data: records })

    return NextResponse.json({ success: true, recorded: records.length })
  } catch (error) {
    console.error('[/api/track] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
