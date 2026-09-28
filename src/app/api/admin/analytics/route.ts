import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = parseInt(searchParams.get('days') || '30')
    const days = Math.min(daysParam, 90)

    const now = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. Daily stats for each day in range
    const allUsers = await db.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true, plan: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const allCVs = await db.resume.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true, language: true, birthCountry: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const allCLs = await db.coverLetter.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true, language: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const allTickets = await db.supportTicket.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true, status: true, subject: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Build daily records
    const dailyStats: Array<{
      date: string
      visitors: number
      newSubscribers: number
      newProUsers: number
      newAnnualUsers: number
      planChosen: string
      cvsGenerated: number
      clsGenerated: number
      supportTickets: number
      revenuePro: number
      revenueAnnual: number
      conversionRate: number
      totalRevenue: number
    }> = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayStart = new Date(dateStr + 'T00:00:00.000Z')
      const dayEnd = new Date(dateStr + 'T23:59:59.999Z')

      const dayUsers = allUsers.filter((u) => {
        const c = new Date(u.createdAt)
        return c >= dayStart && c <= dayEnd
      })

      const dayPro = dayUsers.filter((u) => u.plan === 'pro').length
      const dayAnnual = dayUsers.filter((u) => u.plan === 'annual').length
      const newSubs = dayPro + dayAnnual

      const dayCVs = allCVs.filter((c) => {
        const ct = new Date(c.createdAt)
        return ct >= dayStart && ct <= dayEnd
      }).length

      const dayCLs = allCLs.filter((c) => {
        const ct = new Date(c.createdAt)
        return ct >= dayStart && ct <= dayEnd
      }).length

      const dayTickets = allTickets.filter((t) => {
        const ct = new Date(t.createdAt)
        return ct >= dayStart && ct <= dayEnd
      }).length

      const totalActive = await getTotalActiveUsersAt(dateStr)
      const conversionRate = totalActive > 0 ? Math.round((newSubs / totalActive) * 10000) / 100 : 0

      const plansChosen: string[] = []
      if (dayPro > 0) plansChosen.push(`Pro ×${dayPro}`)
      if (dayAnnual > 0) plansChosen.push(`Annuel ×${dayAnnual}`)
      if (dayUsers.some((u) => u.plan === 'free')) plansChosen.push('Free')

      const revenuePro = dayPro * 6.99
      const revenueAnnual = dayAnnual * (70 / 12)

      dailyStats.push({
        date: dateStr,
        visitors: dayUsers.length,
        newSubscribers: newSubs,
        newProUsers: dayPro,
        newAnnualUsers: dayAnnual,
        planChosen: plansChosen.join(', ') || '—',
        cvsGenerated: dayCVs,
        clsGenerated: dayCLs,
        supportTickets: dayTickets,
        revenuePro: Math.round(revenuePro * 100) / 100,
        revenueAnnual: Math.round(revenueAnnual * 100) / 100,
        conversionRate,
        totalRevenue: Math.round((revenuePro + revenueAnnual) * 100) / 100,
      })
    }

    // 2. Global aggregates
    const totalUsers = await db.user.count()
    const proUsers = await db.user.count({ where: { plan: 'pro' } })
    const annualUsers = await db.user.count({ where: { plan: 'annual' } })
    const totalCVs = await db.resume.count()
    const totalCLs = await db.coverLetter.count()
    const totalTickets = await db.supportTicket.count()
    const openTickets = await db.supportTicket.count({ where: { status: 'open' } })
    const resolvedTickets = await db.supportTicket.count({ where: { status: 'resolved' } })
    const conversionRate = totalUsers > 0 ? Math.round(((proUsers + annualUsers) / totalUsers) * 10000) / 100 : 0
    const monthlyRevenuePro = proUsers * 6.99
    const annualRevenueMonthly = annualUsers * (70 / 12)
    const totalRevenueAnnual = annualUsers * 70
    const estimatedMonthlyRevenue = monthlyRevenuePro + annualRevenueMonthly

    // 3. Languages distribution
    const cvLanguages = await db.resume.groupBy({
      by: ['language'],
      _count: { id: true },
    })

    const clLanguages = await db.coverLetter.groupBy({
      by: ['language'],
      _count: { id: true },
    })

    const languageMap: Record<string, { cvCount: number; clCount: number; total: number }> = {}
    for (const c of cvLanguages) {
      if (!languageMap[c.language]) languageMap[c.language] = { cvCount: 0, clCount: 0, total: 0 }
      languageMap[c.language].cvCount = c._count.id
      languageMap[c.language].total += c._count.id
    }
    for (const c of clLanguages) {
      if (!languageMap[c.language]) languageMap[c.language] = { cvCount: 0, clCount: 0, total: 0 }
      languageMap[c.language].clCount = c._count.id
      languageMap[c.language].total += c._count.id
    }

    const languages = Object.entries(languageMap)
      .map(([lang, counts]) => ({ language: lang, ...counts }))
      .sort((a, b) => b.total - a.total)

    // 4. Countries distribution (from Resume birthCountry + location)
    const countryField = 'birthCountry'
    const resumesWithCountry = await db.resume.findMany({
      where: { birthCountry: { not: null } },
      select: { birthCountry: true },
    })

    const countryMap: Record<string, number> = {}
    for (const r of resumesWithCountry) {
      const country = r.birthCountry || 'Inconnu'
      countryMap[country] = (countryMap[country] || 0) + 1
    }

    const countries = Object.entries(countryMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)

    // 5. Top target jobs
    const targetJobs = await db.resume.groupBy({
      by: ['targetJob'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    })

    // 6. Feature requests / demands (from support ticket subjects)
    const recentTickets = await db.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { subject: true, message: true, status: true, createdAt: true },
    })

    // Categorize tickets
    const ticketCategories: Record<string, number> = {}
    const featureRequests: string[] = []
    for (const t of recentTickets) {
      const subject = (t.subject || '').toLowerCase()
      if (subject.includes('bug') || subject.includes('erreur') || subject.includes('problème') || subject.includes('error')) {
        ticketCategories['Bug/Erreur'] = (ticketCategories['Bug/Erreur'] || 0) + 1
      } else if (subject.includes('fonctionnalité') || subject.includes('feature') || subject.includes('ajout') || subject.includes('demande')) {
        ticketCategories['Demande de fonctionnalité'] = (ticketCategories['Demande de fonctionnalité'] || 0) + 1
        featureRequests.push(`${t.subject} — ${(t.message || '').substring(0, 150)}`)
      } else if (subject.includes('paiement') || subject.includes('payment') || subject.includes('abonnement') || subject.includes('facture')) {
        ticketCategories['Paiement/Abonnement'] = (ticketCategories['Paiement/Abonnement'] || 0) + 1
      } else if (subject.includes('chatbot') || subject.includes('ia') || subject.includes('ai')) {
        ticketCategories['Support IA/Chatbot'] = (ticketCategories['Support IA/Chatbot'] || 0) + 1
      } else {
        ticketCategories['Autre'] = (ticketCategories['Autre'] || 0) + 1
      }
    }

    // 7. Templates used
    const templates = await db.resume.groupBy({
      by: ['templateStyle'],
      _count: { id: true },
    })

    // 8. Cover letter tones used
    const tones = await db.coverLetter.groupBy({
      by: ['tone'],
      _count: { id: true },
    })

    return NextResponse.json({
      dailyStats,
      global: {
        totalUsers,
        proUsers,
        annualUsers,
        totalCVs,
        totalCLs,
        totalDocuments: totalCVs + totalCLs,
        totalTickets,
        openTickets,
        resolvedTickets,
        conversionRate,
        monthlyRevenuePro: Math.round(monthlyRevenuePro * 100) / 100,
        annualRevenueMonthly: Math.round(annualRevenueMonthly * 100) / 100,
        totalRevenueAnnual: Math.round(totalRevenueAnnual * 100) / 100,
        estimatedMonthlyRevenue: Math.round(estimatedMonthlyRevenue * 100) / 100,
      },
      languages,
      countries,
      targetJobs: targetJobs.map((j) => ({ job: j.targetJob, count: j._count.id })),
      ticketCategories,
      featureRequests: featureRequests.slice(0, 20),
      templates: templates.map((t) => ({ style: t.templateStyle, count: t._count.id })),
      tones: tones.map((t) => ({ tone: t.tone, count: t._count.id })),
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Helper to count total users registered up to a specific date
async function getTotalActiveUsersAt(dateStr: string): Promise<number> {
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z')
  return db.user.count({
    where: { createdAt: { lte: dayEnd } },
  })
}
