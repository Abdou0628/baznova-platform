import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

/**
 * GET /api/admin/comprehensive-stats
 * Returns comprehensive platform-wide statistics for the admin dashboard.
 * Covers ALL HireNova modules + financial movements.
 *
 * Requires admin session.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ===== 1. CORE METRICS (Users, CVs, CLs) =====
    const [
      totalUsers,
      proUsers,
      annualUsers,
      freeUsers,
      employerUsers,
      totalResumes,
      totalCoverLetters,
      totalAtsAnalyses,
      newUsers30d,
      newResumes30d,
      newCoverLetters30d,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: 'pro' } }),
      db.user.count({ where: { plan: 'annual' } }),
      db.user.count({ where: { plan: 'free' } }),
      db.user.count({ where: { role: 'employer' } }),
      db.resume.count(),
      db.coverLetter.count(),
      db.resume.count({ where: { generatedContent: { not: null } } }),
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.resume.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.coverLetter.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    // ===== 2. JOBS MARKETPLACE =====
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      totalEmployers,
    ] = await Promise.all([
      db.jobListing.count(),
      db.jobListing.count({ where: { status: 'active' } }),
      db.application.count(),
      db.user.count({ where: { role: 'employer' } }),
    ])

    // ===== 3. HIRENOVA GLOBAL (International) =====
    const [
      totalGlobalJobs,
      activeGlobalJobs,
      totalGlobalApplications,
      visaSponsorshipJobs,
    ] = await Promise.all([
      db.globalJobListing.count(),
      db.globalJobListing.count({ where: { status: 'active' } }),
      db.globalApplication.count(),
      db.globalJobListing.count({ where: { visaSponsorship: true } }),
    ])

    // Countries with active global jobs
    const globalCountries = await db.globalJobListing.findMany({
      where: { status: 'active' },
      select: { country: true },
      distinct: ['country'],
    })

    // ===== 4. MOBILITY =====
    const [
      totalMobilityProfiles,
      completedMobility,
      mobilityThisMonth,
    ] = await Promise.all([
      db.mobilityProfile.count(),
      db.mobilityProfile.count({ where: { status: 'completed' } }),
      db.mobilityProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    // ===== 5. API SUBSCRIBERS =====
    const [
      totalApiSubscribers,
      activeApiSubscribers,
      totalApiCalls,
      apiCallsThisMonth,
    ] = await Promise.all([
      db.apiSubscriber.count(),
      db.apiSubscriber.count({ where: { status: 'active' } }),
      db.apiUsageLog.count(),
      db.apiUsageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    // API plans distribution
    const apiPlansRaw = await db.apiSubscriber.groupBy({
      by: ['plan'],
      _count: { id: true },
    })
    const apiPlans: Record<string, number> = {}
    apiPlansRaw.forEach((p) => {
      apiPlans[p.plan] = p._count.id
    })

    // ===== 6. REFERRAL PROGRAM =====
    const [
      totalReferrals,
      completedReferrals,
      rewardedReferrals,
      pendingReferrals,
    ] = await Promise.all([
      db.referral.count(),
      db.referral.count({ where: { status: 'COMPLETED' } }),
      db.referral.count({ where: { status: 'REWARDED' } }),
      db.referral.count({ where: { status: 'PENDING' } }),
    ])

    // ===== 7. CAMPUS (University Partnerships) =====
    const campusTickets = await db.supportTicket.count({
      where: { subject: { contains: 'Campus' } },
    })
    const campusTicketsOpen = await db.supportTicket.count({
      where: {
        subject: { contains: 'Campus' },
        status: 'open',
      },
    })

    // ===== 8. SUPPORT TICKETS =====
    const [
      openTickets,
      resolvedTickets,
      totalTickets,
    ] = await Promise.all([
      db.supportTicket.count({ where: { status: 'open' } }),
      db.supportTicket.count({ where: { status: 'resolved' } }),
      db.supportTicket.count(),
    ])

    // ===== 9. SATISFACTION =====
    const satisfactionRatings = await db.satisfactionRating.findMany({
      select: { rating: true },
    })
    const avgRating =
      satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, r) => sum + r.rating, 0) /
          satisfactionRatings.length
        : 0

    // ===== 10. SECURITY =====
    const [
      securityAlertsCritical,
      securityAlertsHigh,
      securityAlertsTotal,
    ] = await Promise.all([
      db.securityLog.count({ where: { severity: 'critical' } }),
      db.securityLog.count({ where: { severity: 'high' } }),
      db.securityLog.count(),
    ])

    // Recent security alerts (last 7 days) — count + array
    const recentSecurityAlertsCount = await db.securityLog.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    })
    const recentSecurityAlertsList = await db.securityLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        severity: true,
        ip: true,
        path: true,
        method: true,
        email: true,
        details: true,
        createdAt: true,
      },
    })

    // ===== 11. FINANCIAL MOVEMENTS =====
    // Revenue from Pro subscriptions (monthly recurring)
    const proMonthlyRevenue = proUsers * 6.99
    // Revenue from Annual subscriptions
    const annualRevenue = annualUsers * 70 // 70€/year
    // Revenue from Lifetime (one-time) — estimated from plan
    const lifetimeRevenue = 0 // no lifetime users currently
    // API revenue (estimated from usage)
    const apiRevenue = activeApiSubscribers * 49 // 49€/month per API subscriber

    const totalMonthlyRevenue = proMonthlyRevenue + apiRevenue
    const totalAnnualRevenue = annualRevenue + proMonthlyRevenue * 12 + apiRevenue * 12

    // Plan distribution
    const planDistribution = {
      free: freeUsers,
      pro: proUsers,
      annual: annualUsers,
    }

    // ===== 12. RECENT ACTIVITY (for dashboard feed) =====
    const [recentUsers, recentResumes, recentApplications] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          role: true,
          createdAt: true,
        },
      }),
      db.resume.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          targetJob: true,
          language: true,
          createdAt: true,
        },
      }),
      db.application.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          candidateName: true,
          candidateEmail: true,
          status: true,
          createdAt: true,
          job: { select: { title: true, company: true } },
        },
      }),
    ])

    // ===== 13. DAILY SIGNUPS (last 14 days) =====
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const dailySignupsRaw = await db.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: { id: true },
    })
    const dailySignups: Record<string, number> = {}
    dailySignupsRaw.forEach((d) => {
      const dateStr = d.createdAt.toISOString().split('T')[0]
      dailySignups[dateStr] = (dailySignups[dateStr] || 0) + d._count.id
    })

    return NextResponse.json({
      // Core
      overview: {
        totalUsers,
        proUsers,
        annualUsers,
        freeUsers,
        employerUsers,
        totalResumes,
        totalCoverLetters,
        totalAtsAnalyses,
        totalDocuments: totalResumes + totalCoverLetters,
        avgRating: Math.round(avgRating * 100) / 100,
      },
      last30days: {
        newUsers: newUsers30d,
        newResumes: newResumes30d,
        newCoverLetters: newCoverLetters30d,
      },
      planDistribution,
      // Jobs
      jobs: {
        totalJobs,
        activeJobs,
        totalApplications,
        totalEmployers,
      },
      // Global
      global: {
        totalGlobalJobs,
        activeGlobalJobs,
        totalGlobalApplications,
        visaSponsorshipJobs,
        supportedCountries: globalCountries.length,
        countries: globalCountries.map((c) => c.country),
      },
      // Mobility
      mobility: {
        totalMobilityProfiles,
        completedMobility,
        mobilityThisMonth,
      },
      // API
      api: {
        totalApiSubscribers,
        activeApiSubscribers,
        totalApiCalls,
        apiCallsThisMonth,
        apiPlans,
      },
      // Referral
      referral: {
        totalReferrals,
        completedReferrals,
        rewardedReferrals,
        pendingReferrals,
      },
      // Campus
      campus: {
        totalTickets: campusTickets,
        openTickets: campusTicketsOpen,
      },
      // Support
      support: {
        openTickets,
        resolvedTickets,
        totalTickets,
      },
      // Security
      security: {
        critical: securityAlertsCritical,
        high: securityAlertsHigh,
        total: securityAlertsTotal,
        recent: recentSecurityAlertsCount,
        recentAlerts: recentSecurityAlertsList,
      },
      // Financial
      financial: {
        proMonthlyRevenue: Math.round(proMonthlyRevenue * 100) / 100,
        annualRevenue,
        lifetimeRevenue,
        apiRevenue,
        totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
        totalAnnualRevenue: Math.round(totalAnnualRevenue * 100) / 100,
        estimatedLifetimeValue:
          Math.round((proUsers * 6.99 * 12 + annualUsers * 70) * 100) / 100,
        currency: 'EUR',
        // Transaction types breakdown
        revenueBreakdown: [
          { source: 'Abonnements Pro', amount: Math.round(proMonthlyRevenue * 100) / 100, type: 'recurring' },
          { source: 'Abonnements Annuels', amount: annualRevenue, type: 'annual' },
          { source: 'API Subscribers', amount: apiRevenue, type: 'recurring' },
          { source: 'Lifetime', amount: lifetimeRevenue, type: 'one-time' },
        ],
      },
      // Recent activity
      recent: {
        users: recentUsers,
        resumes: recentResumes,
        applications: recentApplications,
      },
      // Chart data
      dailySignups,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error(
      '[admin/comprehensive-stats] error:',
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
