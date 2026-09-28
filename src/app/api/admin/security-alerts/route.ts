/**
 * HNSA — Security Alerts Dashboard API (Admin Only)
 *
 * GET /api/admin/security-alerts — Recent security events summary
 * Returns: critical alerts, attack statistics, anomaly indicators
 *
 * HNSA Pillars: 8 (Monitoring & Incident Response), 1 (Identity)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    // --- Auth + Admin check ---
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = request.nextUrl
    const hours = Number(searchParams.get('hours')) || 24
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    // --- Security Events (SecurityLog) ---
    const [securityEvents, eventByType, eventBySeverity, topIps] =
      await Promise.all([
        // Recent security events
        db.securityLog.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            type: true,
            severity: true,
            ip: true,
            path: true,
            method: true,
            email: true,
            createdAt: true,
          },
        }),
        // Count by type
        db.securityLog.groupBy({
          by: ['type'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
          _orderBy: { _count: { id: 'desc' } },
        }),
        // Count by severity
        db.securityLog.groupBy({
          by: ['severity'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        // Top attacker IPs
        db.securityLog.groupBy({
          by: ['ip'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
          _orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ])

    // --- Audit Events (SecurityAudit) ---
    const auditSummary = await db.securityAudit.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _orderBy: { _count: { id: 'desc' } },
      take: 20,
    })

    // --- Account Lockouts ---
    const activeLockouts = await db.accountLockout.findMany({
      where: {
        OR: [
          { lockLevel: { gt: 0 } },
          { lockedUntil: { gt: new Date() } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        userId: true,
        email: true,
        failedAttempts: true,
        lockLevel: true,
        lockedUntil: true,
        lastAttemptAt: true,
      },
    })

    // --- AI Security Events ---
    const aiEvents = await db.aISecurityEvent.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ blocked: true }, { severity: 'critical' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        userId: true,
        action: true,
        severity: true,
        blocked: true,
        blockReason: true,
        model: true,
        createdAt: true,
      },
    })

    const totalSecurityEvents = securityEvents.length
    const criticalEvents = securityEvents.filter(
      (e) => e.severity === 'critical'
    ).length
    const highEvents = securityEvents.filter(
      (e) => e.severity === 'high'
    ).length

    return NextResponse.json({
      success: true,
      period: { hours },
      summary: {
        totalSecurityEvents,
        criticalEvents,
        highEvents,
        activeLockouts: activeLockouts.length,
        blockedAIRequests: aiEvents.length,
      },
      securityEvents,
      eventByType,
      eventBySeverity,
      topIps,
      auditSummary,
      activeLockouts,
      aiBlockedEvents: aiEvents,
    })
  } catch (error) {
    console.error('[HNSA] Security Alerts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
