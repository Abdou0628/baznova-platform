import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const { searchParams } = new URL(request.url)
    const employerId = searchParams.get('employerId')

    if (!employerId) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'employerId est requis' } },
        { status: 400 }
      )
    }

    // Get total stats
    const [totalJobs, totalApplications, totalViews] = await Promise.all([
      db.globalJobListing.count({
        where: { employerId },
      }),
      db.globalApplication.count({
        where: { job: { employerId } },
      }),
      db.globalJobListing.aggregate({
        where: { employerId },
        _sum: { viewsCount: true },
      }),
    ])

    // Get average match score
    const avgMatchResult = await db.globalApplication.aggregate({
      where: { job: { employerId } },
      _avg: { matchScore: true },
    })

    const avgMatchScore = avgMatchResult._avg.matchScore
      ? Math.round(avgMatchResult._avg.matchScore)
      : 0

    // Get employer's jobs with application counts
    const jobs = await db.globalJobListing.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    })

    const jobsWithStats = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      country: job.country,
      region: job.region,
      type: job.type,
      status: job.status,
      viewsCount: job.viewsCount,
      applicationsCount: job._count.applications,
      createdAt: job.createdAt,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalJobs,
        totalApplications,
        totalViews: totalViews._sum.viewsCount || 0,
        avgMatchScore,
      },
      jobs: jobsWithStats,
    })
  } catch (error) {
    console.error('Error fetching employer dashboard:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la récupération du tableau de bord' } },
      { status: 500 }
    )
  }
}
