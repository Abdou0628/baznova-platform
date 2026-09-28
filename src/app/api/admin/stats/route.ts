import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const [totalUsers, proUsers, lifetimeUsers, totalCVs, totalCLs] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: 'pro' } }),
      db.user.count({ where: { plan: 'lifetime' } }),
      db.resume.count(),
      db.coverLetter.count(),
    ])

    // Revenue estimates (based on current active plans)
    const monthlyRevenuePro = proUsers * 6.99
    const totalRevenueLifetime = lifetimeUsers * 29.99

    // Last 30 days stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [newUsers30d, newCVs30d, newCLs30d] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.resume.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.coverLetter.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    // Daily signups last 14 days
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const dailySignupsRaw = await db.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: { id: true },
    })

    // Group by date
    const dailySignups: Record<string, number> = {}
    for (const d of dailySignupsRaw) {
      const dateStr = d.createdAt.toISOString().split('T')[0]
      dailySignups[dateStr] = (dailySignups[dateStr] || 0) + 1
    }

    // Plan distribution
    const planDistribution = {
      free: totalUsers - proUsers - lifetimeUsers,
      pro: proUsers,
      lifetime: lifetimeUsers,
    }

    // Recent users (last 10)
    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, email: true, plan: true, createdAt: true, cvCountThisMonth: true, clCountThisMonth: true },
    })

    // Recent CVs (last 10)
    const recentCVs = await db.resume.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { fullName: true, targetJob: true, language: true, createdAt: true, templateStyle: true },
    })

    // Recent CLs (last 10)
    const recentCLs = await db.coverLetter.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { fullName: true, jobTitle: true, companyName: true, language: true, createdAt: true },
    })

    return NextResponse.json({
      overview: {
        totalUsers,
        proUsers,
        lifetimeUsers,
        totalCVs,
        totalCLs,
        totalDocuments: totalCVs + totalCLs,
        monthlyRevenuePro: Math.round(monthlyRevenuePro * 100) / 100,
        totalRevenueLifetime: Math.round(totalRevenueLifetime * 100) / 100,
        estimatedMonthlyRevenue: Math.round(monthlyRevenuePro * 100) / 100,
      },
      last30days: {
        newUsers: newUsers30d,
        newCVs: newCVs30d,
        newCLs: newCLs30d,
      },
      dailySignups,
      planDistribution,
      recentUsers,
      recentCVs,
      recentCLs,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
