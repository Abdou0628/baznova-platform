import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, logAudit, AUDIT_ACTIONS } from '@/lib/hnsa'

/**
 * GET /api/campus/stats
 * Authenticated endpoint — returns real-time platform counters for the Campus page.
 * Used to populate the "Cas d'usage type" section with live data instead of
 * hardcoded figures.
 *
 * Returns:
 *  - totalResumes:        number of CV generated across the platform
 *  - totalCoverLetters:   number of cover letters generated
 *  - totalAtsAnalyses:    (approximated from resumes that have generatedContent)
 *  - totalJobApplications: number of applications sent via Jobs + Global
 *  - totalGlobalJobs:     number of international job listings
 *  - totalUsers:          number of registered users
 *  - totalCampusTickets:  number of university partnership requests
 *  - supportedCountries:  number of distinct countries in Global jobs
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ success: false, error: { code: auth.statusCode, message: auth.reason } }, { status: auth.statusCode })

    const [
      totalResumes,
      totalCoverLetters,
      totalJobApplications,
      totalGlobalApplications,
      totalLocalJobs,
      totalGlobalJobs,
      totalUsers,
      totalCampusTickets,
      globalCountries,
    ] = await Promise.all([
      db.resume.count(),
      db.coverLetter.count(),
      db.application.count(),
      db.globalApplication.count(),
      db.jobListing.count({ where: { status: 'active' } }),
      db.globalJobListing.count({ where: { status: 'active' } }),
      db.user.count(),
      db.supportTicket.count({
        where: { subject: { contains: 'Campus' } },
      }),
      db.globalJobListing.findMany({
        where: { status: 'active' },
        select: { country: true },
        distinct: ['country'],
      }),
    ])

    // ATS analyses approximated: count resumes with generated content
    // (each generated CV can be analyzed via ATS)
    const resumesWithContent = await db.resume.count({
      where: { generatedContent: { not: null } },
    })

    await logAudit({
      actorId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: 'CAMPUS_STATS_VIEWED',
      resource: 'campus_stats',
      resourceId: 'all',
      outcome: 'success',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/campus/stats',
      method: 'GET',
      statusCode: 200,
      details: `User ${auth.email} viewed campus stats`,
    })

    return NextResponse.json({
      success: true,
      data: {
        totalResumes,
        totalCoverLetters,
        totalAtsAnalyses: resumesWithContent,
        totalJobApplications: totalJobApplications + totalGlobalApplications,
        totalLocalJobs,
        totalGlobalJobs,
        totalUsers,
        totalCampusTickets,
        supportedCountries: globalCountries.length,
        // Combined "documents" counter for display
        totalDocuments: totalResumes + totalCoverLetters,
      },
    })
  } catch (error) {
    console.error(
      '[campus/stats] error:',
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json(
      {
        success: false,
        error: { code: 500, message: 'Erreur récupération statistiques' },
      },
      { status: 500 }
    )
  }
}
