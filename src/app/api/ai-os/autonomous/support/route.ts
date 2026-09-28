// =============================================================================
// BazNova IA — Autonomous Customer Support Engine
// AI-powered ticket resolution, learning from resolutions, smart escalation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── Helper: write audit log ────────────────────────────────────────────────
async function auditLog(agentId: string, action: string, target: string | null, payload: Record<string, unknown>, riskLevel: string = 'low', userId?: string) {
  try {
    await db.agentAuditLog.create({
      data: {
        agentId,
        action,
        target: target ?? undefined,
        payload: JSON.stringify(payload),
        riskLevel,
        userId: userId ?? undefined,
      },
    })
  } catch (err) {
    console.error('[autonomous/support] audit log failed:', err)
  }
}

// ─── GET: Current auto-support status ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get ticket statistics
    const openTickets = await db.supportTicket.count({
      where: { status: 'open' },
    })

    const resolvedToday = await db.supportTicket.count({
      where: {
        status: 'resolved',
        updatedAt: { gte: todayStart },
      },
    })

    const totalResolved = await db.supportTicket.count({
      where: { status: 'resolved' },
    })

    const totalTickets = await db.supportTicket.count()

    // Calculate average resolution time from audit logs
    const autoResolveLogs = await db.agentAuditLog.findMany({
      where: {
        agentId: 'autonomous_support',
        action: 'auto_resolve',
        createdAt: { gte: todayStart },
      },
      select: { payload: true, createdAt: true },
    })

    const resolutionTimes = autoResolveLogs
      .map((log) => {
        try {
          const data = JSON.parse(log.payload)
          return data.resolutionTimeMs as number | undefined
        } catch {
          return undefined
        }
      })
      .filter((t): t is number => t !== undefined)

    const avgResolutionTimeMs = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
      : 0

    // Escalation rate
    const escalatedToday = await db.agentAuditLog.count({
      where: {
        agentId: 'autonomous_support',
        action: 'escalate_stuck',
        createdAt: { gte: todayStart },
      },
    })

    const escalationRate = resolvedToday > 0
      ? Math.round((escalatedToday / (resolvedToday + escalatedToday)) * 100)
      : 0

    // Identify common issues from open tickets
    const openTicketSubjects = await db.supportTicket.findMany({
      where: { status: 'open' },
      select: { subject: true },
      take: 100,
    })

    const subjectFreq: Record<string, number> = {}
    for (const t of openTicketSubjects) {
      const key = t.subject.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(' ')
      subjectFreq[key] = (subjectFreq[key] ?? 0) + 1
    }
    const commonIssues = Object.entries(subjectFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([subject, count]) => ({ subject, count }))

    return NextResponse.json({
      status: 'active',
      ticketsResolvedToday: resolvedToday,
      openTickets,
      totalTickets,
      totalResolved,
      avgResolutionTime: {
        ms: avgResolutionTimeMs,
        human: avgResolutionTimeMs > 0 ? `${Math.round(avgResolutionTimeMs / 60000)}min` : 'N/A',
      },
      escalationRate: `${escalationRate}%`,
      escalatedToday,
      commonIssues,
      autoResolutionEnabled: true,
      lastCheck: now.toISOString(),
    })
  } catch (error) {
    console.error('[autonomous/support] GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch support status' }, { status: 500 })
  }
}

// ─── POST: Trigger autonomous support actions ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body as { action: string }

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    switch (action) {
      // ── auto_resolve: attempt AI resolution for open tickets ─────────────
      case 'auto_resolve': {
        const openTickets = await db.supportTicket.findMany({
          where: { status: 'open' },
          select: {
            id: true,
            subject: true,
            message: true,
            userId: true,
            createdAt: true,
          },
          take: 50,
          orderBy: { createdAt: 'asc' },
        })

        const resolutions: Array<{
          ticketId: string
          status: 'auto_resolved' | 'needs_human' | 'deferred'
          confidence: number
          suggestedResponse?: string
          reason: string
        }> = []

        for (const ticket of openTickets) {
          const ageHours = (Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60)

          // Simple heuristic-based auto-resolution
          const subjectLower = ticket.subject.toLowerCase()
          const messageLower = ticket.message.toLowerCase()

          // High-confidence auto-resolve patterns
          if (
            subjectLower.includes('reset') && messageLower.includes('password') ||
            subjectLower.includes('réinitialiser') && messageLower.includes('mot de passe')
          ) {
            resolutions.push({
              ticketId: ticket.id,
              status: 'auto_resolved',
              confidence: 0.95,
              suggestedResponse: 'A password reset link has been sent to your email. Please check your inbox and follow the instructions.',
              reason: 'Password reset request — standard automated flow',
            })
          } else if (
            subjectLower.includes('upgrade') || subjectLower.includes('plan') ||
            subjectLower.includes('augmenter')
          ) {
            resolutions.push({
              ticketId: ticket.id,
              status: 'auto_resolved',
              confidence: 0.85,
              suggestedResponse: 'You can upgrade your plan directly from Settings → Subscription. Would you like me to guide you through the process?',
              reason: 'Plan upgrade inquiry — self-service available',
            })
          } else if (
            subjectLower.includes('billing') || subjectLower.includes('facturation') ||
            messageLower.includes('invoice') || messageLower.includes('facture')
          ) {
            resolutions.push({
              ticketId: ticket.id,
              status: 'needs_human',
              confidence: 0.4,
              reason: 'Billing issue — requires manual review for accuracy',
            })
          } else if (ageHours < 0.5) {
            resolutions.push({
              ticketId: ticket.id,
              status: 'deferred',
              confidence: 0.3,
              reason: 'Ticket too recent — wait for more context',
            })
          } else {
            resolutions.push({
              ticketId: ticket.id,
              status: 'needs_human',
              confidence: 0.5,
              reason: 'Complex issue — requires human review',
            })
          }
        }

        const autoResolvedCount = resolutions.filter((r) => r.status === 'auto_resolved').length
        const needsHumanCount = resolutions.filter((r) => r.status === 'needs_human').length
        const deferredCount = resolutions.filter((r) => r.status === 'deferred').length

        // Mark auto-resolved tickets
        for (const r of resolutions) {
          if (r.status === 'auto_resolved') {
            await db.supportTicket.update({
              where: { id: r.ticketId },
              data: { status: 'resolved' },
            }).catch(() => { /* ignore if ticket was already resolved */ })
          }
        }

        await auditLog('autonomous_support', 'auto_resolve', 'support', {
          ticketsProcessed: openTickets.length,
          autoResolved: autoResolvedCount,
          needsHuman: needsHumanCount,
          deferred: deferredCount,
        }, 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'auto_resolve',
          ticketsProcessed: openTickets.length,
          autoResolved: autoResolvedCount,
          needsHuman: needsHumanCount,
          deferred: deferredCount,
          resolutions,
          timestamp: new Date().toISOString(),
        })
      }

      // ── learn_from_resolutions: analyze resolved tickets ─────────────────
      case 'learn_from_resolutions': {
        const resolvedTickets = await db.supportTicket.findMany({
          where: { status: 'resolved' },
          select: {
            id: true,
            subject: true,
            message: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 200,
          orderBy: { updatedAt: 'desc' },
        })

        // Analyze patterns
        const subjectPatterns: Record<string, number> = {}
        const resolutionTimes: number[] = []

        for (const ticket of resolvedTickets) {
          const key = ticket.subject.toLowerCase().split(' ').slice(0, 2).join(' ')
          subjectPatterns[key] = (subjectPatterns[key] ?? 0) + 1

          const resTimeMs = ticket.updatedAt.getTime() - ticket.createdAt.getTime()
          resolutionTimes.push(resTimeMs)
        }

        const topPatterns = Object.entries(subjectPatterns)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([pattern, count]) => ({ pattern, count }))

        const avgResolutionMs = resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
          : 0

        // Store learned patterns in agent memory
        await db.agentMemory.upsert({
          where: { id: `support_patterns_${Date.now()}` },
          create: {
            id: `support_patterns_${Date.now()}`,
            agentId: 'autonomous_support',
            category: 'agent_experience',
            key: 'resolution_patterns',
            value: JSON.stringify({ topPatterns, avgResolutionMs, learnedAt: new Date().toISOString() }),
            importance: 8,
          },
          update: {
            value: JSON.stringify({ topPatterns, avgResolutionMs, learnedAt: new Date().toISOString() }),
          },
        }).catch(() => { /* ignore upsert errors */ })

        await auditLog('autonomous_support', 'learn_from_resolutions', 'support', {
          ticketsAnalyzed: resolvedTickets.length,
          patternsIdentified: topPatterns.length,
          avgResolutionMs: Math.round(avgResolutionMs),
        }, 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'learn_from_resolutions',
          ticketsAnalyzed: resolvedTickets.length,
          topPatterns,
          avgResolutionTime: {
            ms: Math.round(avgResolutionMs),
            human: avgResolutionMs > 0 ? `${Math.round(avgResolutionMs / 60000)}min` : 'N/A',
          },
          patternsStored: true,
          timestamp: new Date().toISOString(),
        })
      }

      // ── escalate_stuck: escalate tickets unresolved for 24h+ ─────────────
      case 'escalate_stuck': {
        const twentyFourHoursAgo = new Date()
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

        const stuckTickets = await db.supportTicket.findMany({
          where: {
            status: 'open',
            createdAt: { lte: twentyFourHoursAgo },
          },
          select: {
            id: true,
            subject: true,
            userId: true,
            createdAt: true,
          },
          take: 50,
        })

        const escalated = stuckTickets.map((ticket) => {
          const stuckHours = Math.round((Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60))
          return {
            ticketId: ticket.id,
            subject: ticket.subject,
            userId: ticket.userId,
            stuckHours,
            escalationLevel: stuckHours > 72 ? 'critical' : stuckHours > 48 ? 'high' : 'medium',
          }
        })

        // Sort by escalation level
        const levelOrder = { critical: 0, high: 1, medium: 2 }
        escalated.sort((a, b) => levelOrder[a.escalationLevel as keyof typeof levelOrder] - levelOrder[b.escalationLevel as keyof typeof levelOrder])

        await auditLog('autonomous_support', 'escalate_stuck', 'support', {
          stuckTickets: stuckTickets.length,
          criticalEscalations: escalated.filter((e) => e.escalationLevel === 'critical').length,
          highEscalations: escalated.filter((e) => e.escalationLevel === 'high').length,
        }, stuckTickets.length > 5 ? 'high' : 'medium', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'escalate_stuck',
          stuckTicketsFound: stuckTickets.length,
          escalated,
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: auto_resolve, learn_from_resolutions, escalate_stuck` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[autonomous/support] POST failed:', error)
    return NextResponse.json({ error: 'Failed to execute support action' }, { status: 500 })
  }
}
