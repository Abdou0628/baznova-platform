/**
 * HireNova Growth Dashboard API (Admin Only)
 *
 * GET /api/admin/growth-dashboard
 *
 * Aggregates cross-strategy data from Payment, Security HNSA, and Pricing CTO
 * strategies into a single response for the admin growth dashboard tab.
 *
 * @module admin/growth-dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, logAudit } from '@/lib/hnsa'
import { getAIUsageSummary } from '@/lib/ai-usage-engine'

// ===== FX Rates (cents to EUR) =====

const FX_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  MAD: 10.85,
  XOF: 655.96,
  XAF: 655.96,
  SAR: 4.05,
  AED: 3.97,
  CAD: 1.46,
  AUD: 1.63,
}

function centsToEur(cents: number, currency: string): number {
  const rate = FX_RATES[currency] ?? 1
  return (cents / 100) / rate
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    // --- Auth + Admin check ---
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.reason, code: 'FORBIDDEN' },
        { status: auth.statusCode },
      )
    }

    // --- Time windows ---
    const now = new Date()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // ================================================================
    // PARALLEL DATA FETCHES
    // ================================================================

    const [
      // --- Revenue: succeeded payments ---
      succeededPayments,
      // --- Revenue: all payments grouped by currency ---
      paymentsByCurrency,
      // --- Revenue: all payments grouped by provider ---
      paymentsByProvider,
      // --- Revenue: payment funnel (all statuses) ---
      paymentFunnelRaw,
      // --- Revenue: this month succeeded ---
      thisMonthPayments,
      // --- Revenue: last month succeeded ---
      lastMonthPayments,
      // --- Revenue: refund stats ---
      refundedPayments,
      // --- Subscriptions: plan distribution ---
      planDistribution,
      // --- Subscriptions: counts ---
      paidCount,
      freeCount,
      mfaEnabledCount,
      activeWithExpiryCount,
      inGracePeriodCount,
      expiredThisMonthCount,
      // --- Security: audit counts (last 30 days) ---
      loginSuccessCount,
      loginFailureCount,
      bruteForceCount,
      accountLockedCount,
      idorAttemptCount,
      rateLimitCount,
      suspiciousRequestCount,
      paymentFailedCount,
      encryptionErrorCount,
      totalAuditLast30,
      // --- Security: currently locked accounts ---
      currentlyLockedCount,
      // --- Engagement: last 30 days ---
      cvsCreated,
      clsCreated,
      applicationsLast30,
      totalApplicationCount,
      // --- Engagement: module usage from audit ---
      moduleUsageRaw,
      interviewPrepCount,
      linkedInAnalyzedCount,
      careerRoadmapCount,
      // --- Pricing: referrals ---
      referralPending,
      referralCompleted,
      referralRewarded,
      // --- Pricing: enterprise ---
      enterpriseTotal,
      enterpriseThisMonth,
      // --- Pricing: satisfaction ---
      satisfactionStats,
      // --- Cross: users in grace period (for revenue-at-risk) ---
      gracePeriodPayments,
      // --- Cross: MFA by plan ---
      mfaByPlanRaw,
    ] = await Promise.all([
      // succeededPayments
      db.payment.findMany({
        where: { status: 'succeeded' },
        select: { id: true, amount: true, currency: true, provider: true, capturedAt: true, createdAt: true },
      }),

      // paymentsByCurrency (succeeded only, for revenue by currency)
      db.payment.groupBy({
        by: ['currency'],
        where: { status: 'succeeded' },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // paymentsByProvider (succeeded only)
      db.payment.groupBy({
        by: ['provider'],
        where: { status: 'succeeded' },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // paymentFunnel (all statuses)
      db.payment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // thisMonthPayments (succeeded, this calendar month)
      db.payment.findMany({
        where: {
          status: 'succeeded',
          capturedAt: { gte: thisMonthStart },
        },
        select: { amount: true, currency: true },
      }),

      // lastMonthPayments (succeeded, last calendar month)
      db.payment.findMany({
        where: {
          status: 'succeeded',
          capturedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        select: { amount: true, currency: true },
      }),

      // refundedPayments (for refund rate)
      db.payment.groupBy({
        by: ['status'],
        where: { status: { in: ['refunded', 'partially_refunded'] } },
        _count: { id: true },
      }),

      // planDistribution
      db.user.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),

      // paidCount
      db.user.count({ where: { plan: { not: 'free' } } }),

      // freeCount
      db.user.count({ where: { plan: 'free' } }),

      // mfaEnabledCount
      db.user.count({ where: { mfaEnabled: true } }),

      // activeWithExpiryCount (planExpiresAt > now AND plan != 'free')
      db.user.count({
        where: {
          plan: { not: 'free' },
          planExpiresAt: { gt: now },
        },
      }),

      // inGracePeriodCount
      db.user.count({ where: { gracePeriodUntil: { gt: now } } }),

      // expiredThisMonthCount (planExpiresAt < now AND planExpiresAt >= thisMonthStart)
      db.user.count({
        where: {
          planExpiresAt: { lt: now, gte: thisMonthStart },
        },
      }),

      // Security: loginSuccess (last 30 days)
      db.securityAudit.count({ where: { action: 'LOGIN_SUCCESS', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: loginFailure (last 30 days)
      db.securityAudit.count({ where: { action: 'LOGIN_FAILURE', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: bruteForceDetected (last 30 days)
      db.securityAudit.count({ where: { action: 'BRUTE_FORCE_DETECTED', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: accountLocked (last 30 days)
      db.securityAudit.count({ where: { action: 'ACCOUNT_LOCKED', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: idorAttempts (last 30 days)
      db.securityAudit.count({ where: { action: 'IDOR_ATTEMPT', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: rateLimitEvents (last 30 days)
      db.securityAudit.count({ where: { action: 'RATE_LIMIT_EXCEEDED', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: suspiciousRequests (last 30 days)
      db.securityAudit.count({ where: { action: 'SUSPICIOUS_REQUEST', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: paymentFailures (last 30 days)
      db.securityAudit.count({ where: { action: 'PAYMENT_FAILED', createdAt: { gte: thirtyDaysAgo } } }),

      // Security: encryptionErrors (all time)
      db.securityAudit.count({ where: { action: 'FIELD_ENCRYPTION_ERROR' } }),

      // Security: total audit events (last 30 days)
      db.securityAudit.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Security: currently locked accounts
      db.accountLockout.count({ where: { lockedUntil: { gt: now } } }),

      // Engagement: CVs created (last 30 days)
      db.resume.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Engagement: CLs created (last 30 days)
      db.coverLetter.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Engagement: applications submitted (last 30 days)
      db.application.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Note: we'll add globalApplications below

      // totalApplicationCount (all time)
      db.application.count(),

      // Engagement: module usage by type (CV/CL/ATS/INTERVIEW/LINKEDIN/CAREER actions from audit, last 30 days)
      db.securityAudit.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          action: {
            in: [
              'CV_CREATED', 'CL_CREATED', 'ATS_ANALYZED', 'INTERVIEW_SESSION_STARTED',
              'LINKEDIN_ANALYZED', 'CAREER_ROADMAP_GENERATED',
            ],
          },
        },
        _count: { id: true },
      }),

      // Interview prep sessions (proxy: SecurityAudit with INTERVIEW in action, last 30 days)
      db.securityAudit.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          action: { contains: 'INTERVIEW' },
        },
      }),

      // LinkedIn analyses (last 30 days)
      db.securityAudit.count({
        where: {
          action: 'LINKEDIN_ANALYZED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Career roadmaps (last 30 days)
      db.securityAudit.count({
        where: {
          action: 'CAREER_ROADMAP_GENERATED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Referrals: pending
      db.referral.count({ where: { status: 'PENDING' } }),

      // Referrals: completed
      db.referral.count({ where: { status: 'COMPLETED' } }),

      // Referrals: rewarded
      db.referral.count({ where: { status: 'REWARDED' } }),

      // Enterprise inquiries: total
      db.enterpriseInquiry.count(),

      // Enterprise inquiries: this month
      db.enterpriseInquiry.count({ where: { createdAt: { gte: thisMonthStart } } }),

      // Satisfaction stats
      db.satisfactionRating.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),

      // Cross: revenue at risk — succeeded payment amounts for users in grace period
      db.payment.findMany({
        where: {
          status: 'succeeded',
          user: { gracePeriodUntil: { gt: now } },
        },
        select: { amount: true, currency: true },
      }),

      // Cross: MFA by plan
      db.user.groupBy({
        by: ['plan'],
        _count: { id: true, mfaEnabled: true },
        where: { mfaEnabled: true },
      }),
    ])

    // --- Additional fetches that can't be easily parallelized above ---
    const globalApplicationsLast30 = await db.globalApplication.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    })
    const totalGlobalApplicationCount = await db.globalApplication.count()

    // For MFA by plan, we need total per plan + mfa enabled per plan
    const allPlans = planDistribution.map((p) => p.plan)
    const mfaByPlanData = await Promise.all(
      allPlans.map(async (plan) => {
        const total = planDistribution.find((p) => p.plan === plan)?._count.id ?? 0
        const mfaCount = mfaByPlanRaw.find((p) => p.plan === plan)?._count.id ?? 0
        return {
          plan,
          total,
          mfaEnabled: mfaCount,
          pct: total > 0 ? round2((mfaCount / total) * 100) : 0,
        }
      }),
    )

    // ================================================================
    // AI USAGE SUMMARY (wrapped in try/catch — JSON file may not exist)
    // ================================================================
    let aiCostEur = 0
    let aiCostByModule: { module: string; costEur: number; actions: number }[] = []

    try {
      const startDateStr = lastMonthStart.toISOString().slice(0, 10)
      const endDateStr = now.toISOString().slice(0, 10)
      const aiSummary = await getAIUsageSummary({ startDate: startDateStr, endDate: endDateStr })
      aiCostEur = aiSummary.totalCostEur
      aiCostByModule = Object.entries(aiSummary.byModule).map(([module, data]) => ({
        module,
        costEur: round2(data.cost),
        actions: data.actions,
      }))
    } catch {
      // AI usage JSON file may not exist yet — default to 0
    }

    // ================================================================
    // COMPUTE REVENUE METRICS
    // ================================================================

    // Total revenue in EUR from all succeeded payments
    let totalEur = 0
    for (const p of succeededPayments) {
      totalEur += centsToEur(p.amount, p.currency)
    }
    totalEur = round2(totalEur)

    // By currency
    const totalByCurrency = paymentsByCurrency.map((g) => ({
      currency: g.currency,
      amountEur: round2(centsToEur(g._sum.amount ?? 0, g.currency)),
      count: g._count.id,
    }))

    // By provider
    const totalByProvider = paymentsByProvider.map((g) => ({
      provider: g.provider,
      amountEur: round2(
        succeededPayments
          .filter((p) => p.provider === g.provider)
          .reduce((sum, p) => sum + centsToEur(p.amount, p.currency), 0),
      ),
      count: g._count.id,
    }))

    // Payment funnel
    const paymentFunnel = paymentFunnelRaw.map((g) => ({
      status: g.status,
      count: g._count.id,
    }))

    // Succeeded / failed counts
    const succeededCount = paymentFunnelRaw.find((g) => g.status === 'succeeded')?._count.id ?? 0
    const failedCount = paymentFunnelRaw.find((g) => g.status === 'failed')?._count.id ?? 0

    // Refund rate
    const refundedCount = refundedPayments.reduce((sum, g) => sum + g._count.id, 0)
    const refundRate = succeededCount > 0 ? round2((refundedCount / succeededCount) * 100) : 0

    // This month / last month EUR
    let thisMonthEur = 0
    for (const p of thisMonthPayments) {
      thisMonthEur += centsToEur(p.amount, p.currency)
    }
    thisMonthEur = round2(thisMonthEur)

    let lastMonthEur = 0
    for (const p of lastMonthPayments) {
      lastMonthEur += centsToEur(p.amount, p.currency)
    }
    lastMonthEur = round2(lastMonthEur)

    // MoM growth
    const momGrowthPct = lastMonthEur > 0
      ? round2(((thisMonthEur - lastMonthEur) / lastMonthEur) * 100)
      : 0

    // ================================================================
    // COMPUTE SUBSCRIPTION METRICS
    // ================================================================

    const byPlan = planDistribution.map((g) => ({
      plan: g.plan,
      count: g._count.id,
    }))

    const totalUsers = paidCount + freeCount
    const conversionRate = totalUsers > 0 ? round2((paidCount / totalUsers) * 100) : 0
    const mfaAdoption = totalUsers > 0 ? round2((mfaEnabledCount / totalUsers) * 100) : 0

    // ================================================================
    // COMPUTE SECURITY METRICS
    // ================================================================

    const loginTotal = loginSuccessCount + loginFailureCount
    const loginSuccessRate = loginTotal > 0
      ? round2((loginSuccessCount / loginTotal) * 100)
      : 100 // no failures = perfect rate

    // ================================================================
    // COMPUTE ENGAGEMENT METRICS
    // ================================================================

    const applicationsSubmitted = applicationsLast30 + globalApplicationsLast30
    const totalApplications = totalApplicationCount + totalGlobalApplicationCount

    // Module usage by type
    const moduleUsageByType = moduleUsageRaw.map((g) => ({
      module: g.action,
      count: g._count.id,
    }))

    // ================================================================
    // COMPUTE PRICING METRICS
    // ================================================================

    const avgRevenuePerPaidUser = paidCount > 0 ? round2(totalEur / paidCount) : 0
    const aiCostAsPctOfRevenue = totalEur > 0 ? round2((aiCostEur / totalEur) * 100) : 0

    const referralStats = {
      pending: referralPending,
      completed: referralCompleted,
      rewarded: referralRewarded,
    }

    const enterpriseInquiries = {
      total: enterpriseTotal,
      thisMonth: enterpriseThisMonth,
    }

    const satisfactionAvg = satisfactionStats._avg.rating
      ? round2(satisfactionStats._avg.rating)
      : 0
    const satisfactionCount = satisfactionStats._count.id

    // ================================================================
    // COMPUTE CROSS-STRATEGY METRICS
    // ================================================================

    // Revenue at risk: sum of succeeded payment amounts (EUR) for users in grace period
    let revenueAtRisk = 0
    for (const p of gracePeriodPayments) {
      revenueAtRisk += centsToEur(p.amount, p.currency)
    }
    revenueAtRisk = round2(revenueAtRisk)

    // Security health score
    const loginFailureRatio = loginTotal > 0
      ? loginFailureCount / loginTotal
      : 0
    const bruteForceRatio = totalAuditLast30 > 0
      ? bruteForceCount / totalAuditLast30
      : 0
    const encryptionPenalty = encryptionErrorCount > 0 ? 20 : 0
    const rawHealthScore = 100 - (loginFailureRatio * 50 + bruteForceRatio * 30 + encryptionPenalty)
    const securityHealthScore = Math.max(0, Math.min(100, round2(rawHealthScore)))

    // Growth efficiency
    const conversionPct = totalUsers > 0 ? (paidCount / totalUsers) * 100 : 0
    const growthEfficiency = round2(conversionPct * (securityHealthScore / 100))

    // AI gross margin
    const aiGrossMarginPct = totalEur > 0
      ? round2(((totalEur - aiCostEur) / totalEur) * 100)
      : 0

    // Top conversion module (highest engagement count from moduleUsageByType)
    let topConversionModule = 'N/A'
    if (moduleUsageByType.length > 0) {
      const sorted = [...moduleUsageByType].sort((a, b) => b.count - a.count)
      topConversionModule = sorted[0].module
    }

    // ================================================================
    // BUILD RESPONSE
    // ================================================================

    const data = {
      timestamp: now.toISOString(),
      revenue: {
        totalEur,
        totalByCurrency,
        totalByProvider,
        paymentFunnel,
        succeededCount,
        failedCount,
        refundRate,
        thisMonthEur,
        lastMonthEur,
        momGrowthPct,
      },
      subscriptions: {
        byPlan,
        paidCount,
        freeCount,
        conversionRate,
        mfaAdoption,
        activeWithExpiry: activeWithExpiryCount,
        inGracePeriod: inGracePeriodCount,
        expiredThisMonth: expiredThisMonthCount,
      },
      security: {
        loginSuccess: loginSuccessCount,
        loginFailure: loginFailureCount,
        loginSuccessRate,
        bruteForceDetected: bruteForceCount,
        accountLockouts: accountLockedCount,
        currentlyLocked: currentlyLockedCount,
        idorAttempts: idorAttemptCount,
        rateLimitEvents: rateLimitCount,
        suspiciousRequests: suspiciousRequestCount,
        paymentFailures: paymentFailedCount,
        encryptionErrors: encryptionErrorCount,
        totalAuditEvents: totalAuditLast30,
      },
      engagement: {
        cvsCreated,
        clsCreated,
        applicationsSubmitted,
        totalApplications,
        interviewPrepSessions: interviewPrepCount,
        linkedInAnalyses: linkedInAnalyzedCount,
        careerRoadmaps: careerRoadmapCount,
        moduleUsageByType,
      },
      pricing: {
        avgRevenuePerPaidUser,
        aiCostEur: round2(aiCostEur),
        aiCostAsPctOfRevenue,
        aiCostByModule,
        referralStats,
        enterpriseInquiries,
        satisfactionAvg,
        satisfactionCount,
      },
      crossStrategy: {
        revenueAtRisk,
        securityHealthScore,
        growthEfficiency,
        aiGrossMarginPct,
        topConversionModule,
        mfaByPlan: mfaByPlanData,
      },
    }

    // --- Audit log (non-blocking) ---
    logAudit({
      actorId: auth.userId,
      action: 'ADMIN_GROWTH_DASHBOARD_VIEWED',
      resource: 'GrowthDashboard',
      outcome: 'success',
      path: '/api/admin/growth-dashboard',
      method: 'GET',
    }).catch(() => {})

    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('[Growth-Dashboard] Aggregation error:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate growth dashboard data', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
