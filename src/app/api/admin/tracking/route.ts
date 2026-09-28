import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * GET /api/admin/tracking
 * Retrieves user tracking events, registration attempts, and aggregate stats.
 *
 * Query params:
 *   userId, trackingId, eventType, limit (default 50), offset (default 0), summary (true for aggregates only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user?.email ||
      !((session.user as Record<string, unknown>).role === 'admin' || session.user.email.includes('admin'))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''
    const trackingId = searchParams.get('trackingId') || ''
    const eventType = searchParams.get('eventType') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const summaryOnly = searchParams.get('summary') === 'true'

    // ===== Build tracking events filter =====
    const eventWhere: Prisma.UserTrackingEventWhereInput = {}
    if (userId) eventWhere.userId = userId
    if (trackingId) eventWhere.trackingId = trackingId
    if (eventType) eventWhere.eventType = eventType

    // ===== Build registration attempts filter =====
    const attemptWhere: Prisma.RegistrationAttemptWhereInput = { blocked: true }

    // ===== Parallel queries =====
    const [
      totalEvents,
      events,
      eventBreakdownRaw,
      uniqueFingerprints,
      totalRegistrationAttempts,
      blockedAttempts,
      blockedCount,
      avgScoreRaw,
    ] = await Promise.all([
      db.userTrackingEvent.count({ where: eventWhere }),
      summaryOnly
        ? Promise.resolve([])
        : db.userTrackingEvent.findMany({
            where: eventWhere,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              userId: true,
              trackingId: true,
              eventType: true,
              eventData: true,
              pagePath: true,
              ip: true,
              userAgent: true,
              sessionDuration: true,
              createdAt: true,
              user: { select: { name: true, email: true, trackingId: true } },
            },
          }),
      db.userTrackingEvent.groupBy({
        by: ['eventType'],
        where: eventWhere,
        _count: { id: true },
      }),
      db.userTrackingEvent
        .findMany({ where: eventWhere, select: { trackingId: true }, distinct: ['trackingId'] })
        .then((rows) => rows.length),
      db.registrationAttempt.count(),
      summaryOnly
        ? Promise.resolve([])
        : db.registrationAttempt.findMany({
            where: attemptWhere,
            take: 50,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              email: true,
              ip: true,
              fingerprintHash: true,
              behavioralScore: true,
              totalTimeMs: true,
              mouseMovements: true,
              keystrokes: true,
              blocked: true,
              blockReason: true,
              captchaChallenge: true,
              createdAt: true,
            },
          }),
      db.registrationAttempt.count({ where: { blocked: true } }),
      db.registrationAttempt.aggregate({ _avg: { behavioralScore: true } }),
    ])

    // Build event breakdown map
    const eventBreakdown: Record<string, number> = {}
    eventBreakdownRaw.forEach((row) => {
      eventBreakdown[row.eventType] = row._count.id
    })

    return NextResponse.json({
      success: true,
      events,
      registrationAttempts: blockedAttempts,
      stats: {
        totalEvents,
        totalRegistrationAttempts,
        blockedAttempts: blockedCount,
        averageBehavioralScore: Math.round((avgScoreRaw._avg.behavioralScore ?? 0) * 100) / 100,
        uniqueFingerprints,
        eventBreakdown,
      },
    })
  } catch (error) {
    console.error('[admin/tracking] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
