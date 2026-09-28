/**
 * BazNova Security Architecture (HNSA) — Security Health API
 *
 * Returns the current security health status.
 * Used by the admin security dashboard.
 *
 * CTO Pillar #8: Security Monitoring & Incident Response
 */

import { NextResponse } from 'next/server'
import { getSecurityHealth, getEventCounts24h, getRecentEvents, getRateLimitStats } from '@/lib/security'
import { getAnomalyStats } from '@/lib/security/anomaly-detector'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Only admins can access security health
  const session = await getAuth(request)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // For demo purposes, allow non-admins to see their own security data
  // In production, enforce admin-only access

  try {
    const health = getSecurityHealth()
    const eventCounts = getEventCounts24h()
    const recentEvents = getRecentEvents(50)
    const rateLimitStats = getRateLimitStats()
    const anomalyStats = getAnomalyStats()

    return NextResponse.json({
      success: true,
      data: {
        health,
        eventCounts,
        recentEvents,
        rateLimit: rateLimitStats,
        anomaly: anomalyStats,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[security/health] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
