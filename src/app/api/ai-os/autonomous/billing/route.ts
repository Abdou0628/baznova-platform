// =============================================================================
// BazNova IA — Autonomous Billing Engine
// Auto-upgrades, dunning campaigns, subscription renewal management
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
    console.error('[autonomous/billing] audit log failed:', err)
  }
}

// ─── GET: Current autonomous billing status ─────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Count revenue today (succeeded payments)
    const paymentsToday = await db.payment.findMany({
      where: {
        status: 'succeeded',
        createdAt: { gte: todayStart },
      },
      select: { amount: true, currency: true },
    })

    const revenueToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0)

    // Check for recent dunning actions
    const recentDunningLogs = await db.agentAuditLog.findMany({
      where: {
        agentId: 'autonomous_billing',
        action: { contains: 'dunning' },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Check for recent upgrade suggestions
    const recentUpgradeLogs = await db.agentAuditLog.findMany({
      where: {
        agentId: 'autonomous_billing',
        action: { contains: 'upgrade' },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Count failed payments in dunning
    const failedPayments = await db.payment.count({
      where: { status: 'failed' },
    })

    // Get last auto-action
    const lastAction = await db.agentAuditLog.findFirst({
      where: { agentId: 'autonomous_billing' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      status: 'active',
      autoUpgradesEnabled: true,
      dunningCampaignsActive: failedPayments > 0,
      dunningQueueSize: failedPayments,
      lastAutoAction: lastAction
        ? { action: lastAction.action, timestamp: lastAction.createdAt }
        : null,
      revenueToday: {
        amount: revenueToday,
        currency: 'EUR',
        transactionCount: paymentsToday.length,
      },
      recentDunningActions: recentDunningLogs.length,
      recentUpgradeSuggestions: recentUpgradeLogs.length,
      subsystems: {
        autoUpgrade: { status: 'active', lastRun: lastAction?.createdAt ?? null },
        dunning: { status: 'active', queueSize: failedPayments },
        renewalReminders: { status: 'active', lastRun: null },
      },
    })
  } catch (error) {
    console.error('[autonomous/billing] GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 })
  }
}

// ─── POST: Trigger autonomous billing actions ───────────────────────────────
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
      // ── check_upgrades: scan users hitting plan limits ───────────────────
      case 'check_upgrades': {
        // Find users who are approaching or at plan limits
        const usersAtLimits = await db.user.findMany({
          where: {
            OR: [
              { cvCountThisMonth: { gte: 5 }, plan: 'starter' },
              { cvCountThisMonth: { gte: 15 }, plan: 'pro' },
              { clCountThisMonth: { gte: 5 }, plan: 'starter' },
              { clCountThisMonth: { gte: 15 }, plan: 'pro' },
            ],
          },
          select: {
            id: true,
            email: true,
            plan: true,
            cvCountThisMonth: true,
            clCountThisMonth: true,
          },
          take: 50,
        })

        const suggestions = usersAtLimits.map((u) => {
          const currentPlan = u.plan
          const suggestedPlan =
            currentPlan === 'starter' ? 'pro' :
            currentPlan === 'pro' ? 'career_plus' :
            'enterprise'
          return {
            userId: u.id,
            email: u.email,
            currentPlan,
            suggestedPlan,
            reason: `CV: ${u.cvCountThisMonth}/mo, CL: ${u.clCountThisMonth}/mo — exceeding ${currentPlan} limits`,
          }
        })

        await auditLog('autonomous_billing', 'check_upgrades', 'billing', {
          usersScanned: usersAtLimits.length,
          suggestionsGenerated: suggestions.length,
        }, 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'check_upgrades',
          usersScanned: usersAtLimits.length,
          upgradeSuggestions: suggestions,
          timestamp: new Date().toISOString(),
        })
      }

      // ── run_dunning: handle failed payments with smart retry ─────────────
      case 'run_dunning': {
        const failedPaymentsList = await db.payment.findMany({
          where: { status: 'failed' },
          select: {
            id: true,
            userId: true,
            amount: true,
            currency: true,
            provider: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        // Smart retry logic: categorize by age and provider
        const retryQueue = failedPaymentsList.map((p) => {
          const ageHours = (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60)
          let retryStrategy: 'immediate' | 'delayed_24h' | 'delayed_72h' | 'suspend'
          let priority: number

          if (ageHours < 1) {
            retryStrategy = 'immediate'
            priority = 1
          } else if (ageHours < 24) {
            retryStrategy = 'delayed_24h'
            priority = 2
          } else if (ageHours < 72) {
            retryStrategy = 'delayed_72h'
            priority = 3
          } else {
            retryStrategy = 'suspend'
            priority = 4
          }

          return {
            paymentId: p.id,
            userId: p.userId,
            amount: p.amount,
            currency: p.currency,
            provider: p.provider,
            ageHours: Math.round(ageHours * 10) / 10,
            retryStrategy,
            priority,
          }
        })

        // Sort by priority (lower = higher priority)
        retryQueue.sort((a, b) => a.priority - b.priority)

        const summary = {
          immediate: retryQueue.filter((r) => r.retryStrategy === 'immediate').length,
          delayed24h: retryQueue.filter((r) => r.retryStrategy === 'delayed_24h').length,
          delayed72h: retryQueue.filter((r) => r.retryStrategy === 'delayed_72h').length,
          suspended: retryQueue.filter((r) => r.retryStrategy === 'suspend').length,
        }

        await auditLog('autonomous_billing', 'run_dunning', 'billing', {
          failedPayments: failedPaymentsList.length,
          retrySummary: summary,
        }, failedPaymentsList.length > 10 ? 'high' : 'medium', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'run_dunning',
          totalFailed: failedPaymentsList.length,
          retrySummary: summary,
          retryQueue,
          timestamp: new Date().toISOString(),
        })
      }

      // ── process_renewals: check expiring subscriptions ───────────────────
      case 'process_renewals': {
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        // Find users whose plans expire within 7 days
        const expiringUsers = await db.user.findMany({
          where: {
            planExpiresAt: {
              lte: sevenDaysFromNow,
              gte: new Date(),
            },
          },
          select: {
            id: true,
            email: true,
            plan: true,
            planExpiresAt: true,
          },
          take: 100,
        })

        const reminders = expiringUsers.map((u) => {
          const daysUntilExpiry = u.planExpiresAt
            ? Math.ceil((u.planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0
          return {
            userId: u.id,
            email: u.email,
            plan: u.plan,
            expiresAt: u.planExpiresAt,
            daysUntilExpiry,
            reminderType: daysUntilExpiry <= 1 ? 'urgent' : daysUntilExpiry <= 3 ? 'warning' : 'info',
          }
        })

        // Also check for users in grace period
        const gracePeriodUsers = await db.user.findMany({
          where: {
            gracePeriodUntil: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            email: true,
            plan: true,
            gracePeriodUntil: true,
          },
        })

        await auditLog('autonomous_billing', 'process_renewals', 'billing', {
          expiringCount: expiringUsers.length,
          gracePeriodCount: gracePeriodUsers.length,
        }, 'low', session.user.id)

        return NextResponse.json({
          success: true,
          action: 'process_renewals',
          expiringSubscriptions: reminders,
          gracePeriodUsers: gracePeriodUsers.map((u) => ({
            userId: u.id,
            email: u.email,
            plan: u.plan,
            gracePeriodUntil: u.gracePeriodUntil,
          })),
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: check_upgrades, run_dunning, process_renewals` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[autonomous/billing] POST failed:', error)
    return NextResponse.json({ error: 'Failed to execute billing action' }, { status: 500 })
  }
}
