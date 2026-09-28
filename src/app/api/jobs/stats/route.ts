import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ success: false, error: { code: 401, message: 'Auth requis' } }, { status: auth.statusCode })

    const [activeJobs, applications, avgScore] = await Promise.all([
      db.jobListing.count({ where: { status: 'active' } }),
      db.application.count(),
      db.application.aggregate({ _avg: { matchScore: true }, where: { matchScore: { not: null } } })
    ])

    const companies = await db.jobListing.findMany({ where: { status: 'active' }, select: { company: true }, distinct: ['company'] })

    return NextResponse.json({
      success: true,
      data: {
        activeJobs, totalApplications: applications,
        avgMatchScore: avgScore._avg.matchScore ? Math.round(avgScore._avg.matchScore) : 0,
        companies: companies.length
      }
    })
  } catch {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur' } }, { status: 500 })
  }
}
