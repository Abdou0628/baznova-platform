// =============================================================================
// BazNova IA — Master Autonomous Operation Coordinator
// The "brain stem" of the autonomous enterprise
// Orchestrates all autonomous subsystems: billing, support, marketing, self-heal, revenue
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AGENTS } from '@/lib/agent-registry'

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
    console.error('[autonomous/operate] audit log failed:', err)
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface CycleStepResult {
  step: string
  status: 'success' | 'partial' | 'failed' | 'skipped'
  durationMs: number
  summary: string
  data?: Record<string, unknown>
}

interface SubsystemStatus {
  name: string
  endpoint: string
  status: 'active' | 'paused' | 'error' | 'unknown'
  lastRun: string | null
  lastResult: 'success' | 'partial' | 'failed' | null
}

// ─── Subsystem definitions ───────────────────────────────────────────────────
const SUBSYSTEMS: SubsystemStatus[] = [
  { name: 'Self-Heal', endpoint: '/api/ai-os/autonomous/self-heal', status: 'active', lastRun: null, lastResult: null },
  { name: 'Auto-Billing', endpoint: '/api/ai-os/autonomous/billing', status: 'active', lastRun: null, lastResult: null },
  { name: 'Auto-Support', endpoint: '/api/ai-os/autonomous/support', status: 'active', lastRun: null, lastResult: null },
  { name: 'Auto-Marketing', endpoint: '/api/ai-os/autonomous/marketing', status: 'active', lastRun: null, lastResult: null },
  { name: 'Revenue Attribution', endpoint: '/api/ai-os/autonomous/revenue', status: 'active', lastRun: null, lastResult: null },
]

// ─── Execute a single autonomous step (calls internal logic) ────────────────
async function executeStep(stepName: string, stepFn: () => Promise<Record<string, unknown>>): Promise<CycleStepResult> {
  const start = Date.now()
  try {
    const data = await stepFn()
    return {
      step: stepName,
      status: 'success',
      durationMs: Date.now() - start,
      summary: `Completed successfully in ${Date.now() - start}ms`,
      data,
    }
  } catch (err) {
    return {
      step: stepName,
      status: 'failed',
      durationMs: Date.now() - start,
      summary: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    }
  }
}

// ─── GET: Overall autonomous enterprise status ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get recent operation cycle logs
    const recentCycles = await db.agentAuditLog.findMany({
      where: {
        agentId: 'autonomous_coordinator',
        action: 'full_cycle',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get last cycle result
    const lastCycle = recentCycles[0]
    let lastCycleSummary: Record<string, unknown> | null = null
    if (lastCycle) {
      try {
        lastCycleSummary = JSON.parse(lastCycle.payload)
      } catch {
        lastCycleSummary = { raw: lastCycle.payload }
      }
    }

    // Count today's autonomous actions across all subsystems
    const autonomousActionsToday = await db.agentAuditLog.count({
      where: {
        agentId: { startsWith: 'autonomous_' },
        createdAt: { gte: todayStart },
      },
    })

    // Count errors today
    const errorsToday = await db.agentAuditLog.count({
      where: {
        agentId: { startsWith: 'autonomous_' },
        riskLevel: { in: ['high', 'critical'] },
        createdAt: { gte: todayStart },
      },
    })

    // Efficiency metrics
    const totalAuditActions = await db.agentAuditLog.count({
      where: {
        agentId: { startsWith: 'autonomous_' },
        createdAt: { gte: todayStart },
      },
    })

    const successRate = totalAuditActions > 0
      ? Math.round(((totalAuditActions - errorsToday) / totalAuditActions) * 100)
      : 100

    // Get subsystem statuses from recent logs
    const subsystemStatuses = await Promise.all(
      SUBSYSTEMS.map(async (subsystem) => {
        const lastLog = await db.agentAuditLog.findFirst({
          where: { agentId: `autonomous_${subsystem.name.toLowerCase().replace(/[-\s]/g, '_')}` },
          orderBy: { createdAt: 'desc' },
        })
        return {
          ...subsystem,
          lastRun: lastLog?.createdAt ?? null,
          lastResult: lastLog?.riskLevel === 'high' || lastLog?.riskLevel === 'critical'
            ? 'failed'
            : lastLog ? 'success' : null,
        }
      })
    )

    return NextResponse.json({
      status: 'active',
      mode: 'autonomous',
      subsystems: subsystemStatuses,
      lastFullCycle: lastCycle
        ? { timestamp: lastCycle.createdAt, summary: lastCycleSummary }
        : null,
      metrics: {
        actionsToday: autonomousActionsToday,
        errorsToday,
        successRate: `${successRate}%`,
        cycleCount7d: recentCycles.length,
      },
      agents: {
        total: AGENTS.length,
        active: AGENTS.filter((a) => a.tier === 'principal' || a.tier === 'specialized').length,
        categories: {
          candidate: AGENTS.filter((a) => a.category === 'candidate').length,
          employment: AGENTS.filter((a) => a.category === 'employment').length,
          platform: AGENTS.filter((a) => a.category === 'platform').length,
        },
      },
      uptime: process.uptime(),
      lastCheck: now.toISOString(),
    })
  } catch (error) {
    console.error('[autonomous/operate] GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch operation status' }, { status: 500 })
  }
}

// ─── POST: Trigger autonomous operation actions ─────────────────────────────
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
      // ── full_cycle: run all autonomous operations in sequence ─────────────
      case 'full_cycle': {
        const cycleStart = Date.now()
        const results: CycleStepResult[] = []

        // Step 1: Health Check
        results.push(await executeStep('health_check', async () => {
          // Run database health check
          await db.$queryRaw`SELECT 1`
          const agentCount = AGENTS.length
          return { database: 'healthy', agents: agentCount, status: 'all_systems_nominal' }
        }))

        // Step 2: Billing
        results.push(await executeStep('billing_check', async () => {
          const failedPayments = await db.payment.count({ where: { status: 'failed' } })
          const expiringUsers = await db.user.count({
            where: {
              planExpiresAt: {
                lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                gte: new Date(),
              },
            },
          })
          return { failedPayments, expiringSubscriptions: expiringUsers, action: 'billing_scan_complete' }
        }))

        // Step 3: Support
        results.push(await executeStep('support_check', async () => {
          const openTickets = await db.supportTicket.count({ where: { status: 'open' } })
          const twentyFourHoursAgo = new Date()
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
          const stuckTickets = await db.supportTicket.count({
            where: {
              status: 'open',
              createdAt: { lte: twentyFourHoursAgo },
            },
          })
          return { openTickets, stuckTicketsNeedingEscalation: stuckTickets, action: 'support_scan_complete' }
        }))

        // Step 4: Marketing
        results.push(await executeStep('marketing_check', async () => {
          const activeUsers = await db.user.count({
            where: {
              plan: { in: ['starter', 'free'] },
              OR: [
                { cvCountThisMonth: { gt: 0 } },
                { clCountThisMonth: { gt: 0 } },
              ],
            },
          })
          return { freeActiveUsers: activeUsers, action: 'marketing_opportunities_identified' }
        }))

        // Step 5: Revenue Attribution
        results.push(await executeStep('revenue_attribution', async () => {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const recentRevenue = await db.payment.findMany({
            where: { status: 'succeeded', createdAt: { gte: thirtyDaysAgo } },
            select: { amount: true },
          })
          const totalRevenue = recentRevenue.reduce((sum, p) => sum + p.amount, 0)
          return { revenue30d: totalRevenue, transactions: recentRevenue.length, action: 'attribution_complete' }
        }))

        // Step 6: Self-Heal (clean expired memories, check system)
        results.push(await executeStep('self_heal', async () => {
          const deletedMemories = await db.agentMemory.deleteMany({
            where: { expiresAt: { lte: new Date() } },
          })
          return { expiredMemoriesCleaned: deletedMemories.count, action: 'cleanup_complete' }
        }))

        // Step 7: Report
        results.push(await executeStep('report', async () => {
          const totalAuditLogs = await db.agentAuditLog.count()
          const totalMemories = await db.agentMemory.count()
          return { auditLogs: totalAuditLogs, memories: totalMemories, action: 'report_generated' }
        }))

        const cycleDuration = Date.now() - cycleStart
        const successfulSteps = results.filter((r) => r.status === 'success').length
        const failedSteps = results.filter((r) => r.status === 'failed').length

        // Store cycle results
        await db.agentMemory.create({
          data: {
            agentId: 'autonomous_coordinator',
            category: 'health',
            key: `cycle_${Date.now()}`,
            value: JSON.stringify({
              cycleStart: new Date(cycleStart).toISOString(),
              cycleDuration,
              steps: results.length,
              successful: successfulSteps,
              failed: failedSteps,
            }),
            importance: 10,
          },
        }).catch(() => { /* ignore storage errors */ })

        await auditLog('autonomous_coordinator', 'full_cycle', 'system', {
          cycleDurationMs: cycleDuration,
          steps: results.length,
          successful: successfulSteps,
          failed: failedSteps,
          stepDetails: results.map((r) => ({ step: r.step, status: r.status, durationMs: r.durationMs })),
        }, failedSteps > 0 ? 'high' : 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'full_cycle',
          cycleDuration: {
            ms: cycleDuration,
            human: `${(cycleDuration / 1000).toFixed(2)}s`,
          },
          steps: results,
          summary: {
            total: results.length,
            successful: successfulSteps,
            partial: results.filter((r) => r.status === 'partial').length,
            failed: failedSteps,
            skipped: results.filter((r) => r.status === 'skipped').length,
          },
          timestamp: new Date().toISOString(),
        })
      }

      // ── status_report: comprehensive enterprise status report ─────────────
      case 'status_report': {
        const now = new Date()

        // Gather all subsystem data
        const totalUsers = await db.user.count()
        const paidUsers = await db.user.count({
          where: { plan: { notIn: ['starter', 'free'] } },
        })

        const totalPayments = await db.payment.count()
        const succeededPayments = await db.payment.count({ where: { status: 'succeeded' } })
        const failedPayments = await db.payment.count({ where: { status: 'failed' } })

        const openTickets = await db.supportTicket.count({ where: { status: 'open' } })
        const resolvedTickets = await db.supportTicket.count({ where: { status: 'resolved' } })

        const totalMemories = await db.agentMemory.count()
        const totalAuditLogs = await db.agentAuditLog.count()

        // Check database health
        let dbStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
        try {
          const dbStart = Date.now()
          await db.$queryRaw`SELECT 1`
          if (Date.now() - dbStart > 500) dbStatus = 'degraded'
        } catch {
          dbStatus = 'unhealthy'
        }

        // Recent autonomous activity
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const recentActions = await db.agentAuditLog.count({
          where: {
            agentId: { startsWith: 'autonomous_' },
            createdAt: { gte: last24h },
          },
        })

        const report = {
          enterprise: {
            name: 'BazNova',
            mode: 'autonomous',
            status: dbStatus === 'unhealthy' ? 'critical' : 'operational',
            uptime: process.uptime(),
          },
          agents: {
            total: AGENTS.length,
            principal: AGENTS.filter((a) => a.tier === 'principal').length,
            specialized: AGENTS.filter((a) => a.tier === 'specialized').length,
            support: AGENTS.filter((a) => a.tier === 'support').length,
          },
          users: {
            total: totalUsers,
            paid: paidUsers,
            free: totalUsers - paidUsers,
            conversionRate: totalUsers > 0 ? `${((paidUsers / totalUsers) * 100).toFixed(1)}%` : '0%',
          },
          revenue: {
            totalPayments,
            succeeded: succeededPayments,
            failed: failedPayments,
            successRate: totalPayments > 0 ? `${((succeededPayments / totalPayments) * 100).toFixed(1)}%` : '0%',
          },
          support: {
            open: openTickets,
            resolved: resolvedTickets,
            total: openTickets + resolvedTickets,
            resolutionRate: (openTickets + resolvedTickets) > 0
              ? `${((resolvedTickets / (openTickets + resolvedTickets)) * 100).toFixed(1)}%`
              : '0%',
          },
          system: {
            database: dbStatus,
            memories: totalMemories,
            auditLogs: totalAuditLogs,
            autonomousActions24h: recentActions,
          },
          subsystems: SUBSYSTEMS.map((s) => s.name),
          generatedAt: now.toISOString(),
        }

        await auditLog('autonomous_coordinator', 'status_report', 'system', {
          enterpriseStatus: report.enterprise.status,
          users: report.users.total,
          revenue: report.revenue.totalPayments,
          database: report.system.database,
        }, 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'status_report',
          report,
          timestamp: now.toISOString(),
        })
      }

      // ── emergency_shutdown: gracefully stop all autonomous operations ─────
      case 'emergency_shutdown': {
        // Log the emergency shutdown
        await auditLog('autonomous_coordinator', 'emergency_shutdown', 'system', {
          triggeredBy: session.user.id,
          triggeredAt: new Date().toISOString(),
          reason: (body as { reason?: string }).reason ?? 'Manual emergency shutdown',
        }, 'critical', session.user.id)

        // Mark all subsystems as paused in memory
        for (const subsystem of SUBSYSTEMS) {
          await db.agentMemory.create({
            data: {
              agentId: 'autonomous_coordinator',
              category: 'health',
              key: `subsystem_status_${subsystem.name.toLowerCase().replace(/[-\s]/g, '_')}`,
              value: JSON.stringify({
                subsystem: subsystem.name,
                status: 'paused',
                pausedAt: new Date().toISOString(),
                pausedBy: 'emergency_shutdown',
              }),
              importance: 10,
            },
          }).catch(() => { /* ignore storage errors */ })
        }

        // Create critical audit entry
        await db.agentAuditLog.create({
          data: {
            agentId: 'autonomous_coordinator',
            action: 'emergency_shutdown_complete',
            target: 'system',
            payload: JSON.stringify({
              subsystemsPaused: SUBSYSTEMS.map((s) => s.name),
              timestamp: new Date().toISOString(),
            }),
            riskLevel: 'critical',
            userId: session.user.id,
          },
        }).catch(() => { /* ignore audit errors */ })

        return NextResponse.json({
          success: true,
          action: 'emergency_shutdown',
          subsystemsPaused: SUBSYSTEMS.map((s) => s.name),
          status: 'paused',
          message: 'All autonomous operations have been gracefully shut down. Use full_cycle to restart.',
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: full_cycle, status_report, emergency_shutdown` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[autonomous/operate] POST failed:', error)
    return NextResponse.json({ error: 'Failed to execute operation action' }, { status: 500 })
  }
}
