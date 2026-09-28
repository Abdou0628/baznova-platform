import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.email !== process.env.ADMIN_EMAIL) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const [totalSubscribers, activeSubscribers, totalLogs, totalSuccessLogs] = await Promise.all([
      db.apiSubscriber.count(),
      db.apiSubscriber.count({ where: { status: 'active' } }),
      db.apiUsageLog.count(),
      db.apiUsageLog.count({ where: { status: 'success' } }),
    ])

    const planBreakdown = await db.apiSubscriber.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })

    const industryBreakdown = await db.apiSubscriber.groupBy({
      by: ['industry'],
      where: { industry: { not: null } },
      _count: { industry: true },
    })

    const monthlyRevenue = {
      starter: (planBreakdown.find(p => p.plan === 'starter')?._count.plan || 0) * 49,
      business: (planBreakdown.find(p => p.plan === 'business')?._count.plan || 0) * 149,
      enterprise: (planBreakdown.find(p => p.plan === 'enterprise')?._count.plan || 0) * 399,
    }
    const totalRevenue = monthlyRevenue.starter + monthlyRevenue.business + monthlyRevenue.enterprise

    // Top subscribers by usage
    const topSubscribers = await db.apiSubscriber.findMany({
      orderBy: { creditsUsed: 'desc' },
      take: 10,
      select: { name: true, company: true, plan: true, creditsUsed: true, creditsLimit: true, createdAt: true },
    })

    return NextResponse.json({
      totalSubscribers,
      activeSubscribers,
      totalRequests: totalLogs,
      successRequests: totalSuccessLogs,
      errorRequests: totalLogs - totalSuccessLogs,
      successRate: totalLogs > 0 ? Math.round((totalSuccessLogs / totalLogs) * 100) : 0,
      planBreakdown: planBreakdown.map(p => ({ plan: p.plan, count: p._count.plan })),
      industryBreakdown: industryBreakdown.map(i => ({ industry: i.industry, count: i._count.industry })),
      monthlyRevenue,
      totalRevenue,
      topSubscribers,
    })
  } catch (error) {
    console.error('Admin API Stats Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
