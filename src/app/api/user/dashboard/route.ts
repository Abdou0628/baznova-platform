import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const userId = auth.userId

    // Fetch user basic info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        role: true,
        companyName: true,
        industry: true,
        companyWebsite: true,
        cvCountThisMonth: true,
        clCountThisMonth: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur non trouvé' } },
        { status: 404 }
      )
    }

    // Fetch all related data in parallel
    const [
      resumes,
      coverLetters,
      localApplications,
      globalApplications,
      localJobsPosted,
      globalJobsPosted,
      documents,
      referralStats,
      mobilityProfiles,
      satisfactionRatings,
      emailLogs,
    ] = await Promise.all([
      db.resume.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          fullName: true,
          targetJob: true,
          industry: true,
          language: true,
          templateStyle: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      db.coverLetter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          fullName: true,
          companyName: true,
          jobTitle: true,
          language: true,
          tone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      db.application.findMany({
        where: { candidateId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          jobId: true,
          candidateName: true,
          status: true,
          matchScore: true,
          createdAt: true,
          job: {
            select: { title: true, company: true, location: true },
          },
        },
      }),

      db.globalApplication.findMany({
        where: { candidateId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          jobId: true,
          candidateName: true,
          status: true,
          matchScore: true,
          createdAt: true,
          job: {
            select: { title: true, company: true, location: true, country: true },
          },
        },
      }),

      user.role === 'employer'
        ? db.jobListing.findMany({
            where: { employerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              title: true,
              location: true,
              country: true,
              type: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
              status: true,
              viewsCount: true,
              applicationsCount: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      user.role === 'employer'
        ? db.globalJobListing.findMany({
            where: { employerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              title: true,
              location: true,
              country: true,
              region: true,
              type: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
              visaSponsorship: true,
              status: true,
              viewsCount: true,
              applicationsCount: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      db.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          number: true,
          subject: true,
          currency: true,
          total: true,
          status: true,
          issueDate: true,
          paidAt: true,
          createdAt: true,
        },
      }),

      user.referralCode
        ? db.referral.findMany({
            where: { referrerId: userId },
            select: {
              id: true,
              referralCode: true,
              referredEmail: true,
              status: true,
              rewardType: true,
              createdAt: true,
              completedAt: true,
            },
          })
        : Promise.resolve([]),

      db.mobilityProfile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          originCountry: true,
          targetCountry: true,
          targetRole: true,
          matchScore: true,
          status: true,
          createdAt: true,
        },
      }),

      db.satisfactionRating.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),

      db.emailLog.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: 20,
        select: {
          id: true,
          email: true,
          template: true,
          step: true,
          subject: true,
          status: true,
          sentAt: true,
        },
      }),
    ])

    // Compute summary stats
    const totalApplications = localApplications.length + globalApplications.length
    const pendingApplications = [
      ...localApplications.filter(a => a.status === 'pending'),
      ...globalApplications.filter(a => a.status === 'pending'),
    ].length
    const matchScores = [...localApplications, ...globalApplications].filter(a => a.matchScore != null)
    const averageMatch = matchScores.length > 0
      ? Math.round(matchScores.reduce((sum, a) => sum + (a.matchScore ?? 0), 0) / matchScores.length)
      : null

    const totalJobsPosted = localJobsPosted.length + globalJobsPosted.length
    const totalApplicationsReceived = [
      ...localJobsPosted.map(j => j.applicationsCount),
      ...globalJobsPosted.map(j => j.applicationsCount),
    ].reduce((sum, n) => sum + n, 0)

    const completedReferrals = referralStats.filter(r => r.status === 'COMPLETED' || r.status === 'REWARDED').length
    const totalSpent = documents
      .filter(d => d.type === 'invoice' && (d.status === 'paid' || d.status === 'sent'))
      .reduce((sum, d) => sum + d.total, 0)

    return NextResponse.json({
      success: true,
      data: {
        user,
        stats: {
          totalResumes: resumes.length,
          totalCoverLetters: coverLetters.length,
          totalApplications,
          pendingApplications,
          averageMatch,
          totalJobsPosted,
          totalApplicationsReceived,
          totalDocuments: documents.length,
          totalSpent,
          completedReferrals,
          totalMobilityProfiles: mobilityProfiles.length,
          joinDays: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        },
        resumes,
        coverLetters,
        localApplications,
        globalApplications,
        localJobsPosted,
        globalJobsPosted,
        documents,
        referralStats,
        mobilityProfiles,
        satisfactionRatings,
        emailLogs,
      },
    })
  } catch (error) {
    console.error('[user/dashboard] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 }
    )
  }
}
