import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── Dimension completeness scoring helpers ─────────────────────────────────

function scorePersonalInfo(
  user: { name: string | null; email: string },
  latestResume: { phone: string | null; location: string | null } | null
): number {
  let score = 0
  let total = 0

  if (user.name && user.name.trim().length > 0) { score += 25; }
  total += 25

  if (user.email && user.email.trim().length > 0) { score += 25; }
  total += 25

  if (latestResume?.phone && latestResume.phone.trim().length > 0) { score += 25; }
  total += 25

  if (latestResume?.location && latestResume.location.trim().length > 0) { score += 25; }
  total += 25

  return Math.round((score / total) * 100)
}

function scoreProfessionalSummary(resume: { summary: string | null } | null): number {
  if (!resume?.summary || resume.summary.trim().length === 0) return 0
  const len = resume.summary.trim().length
  if (len < 30) return 20
  if (len < 80) return 50
  if (len < 200) return 80
  return 100
}

function scoreExperience(resume: { experience: string | null } | null): number {
  if (!resume?.experience || resume.experience.trim().length === 0) return 0
  const len = resume.experience.trim().length
  if (len < 50) return 20
  if (len < 150) return 50
  if (len < 400) return 80
  return 100
}

function scoreEducation(resume: { education: string | null } | null): number {
  if (!resume?.education || resume.education.trim().length === 0) return 0
  const len = resume.education.trim().length
  if (len < 30) return 25
  if (len < 80) return 60
  if (len < 200) return 85
  return 100
}

function scoreSkills(resume: { skills: string | null } | null): number {
  if (!resume?.skills || resume.skills.trim().length === 0) return 0
  const len = resume.skills.trim().length
  if (len < 20) return 25
  if (len < 60) return 55
  if (len < 150) return 80
  return 100
}

function scoreLanguages(resume: { languages: string | null } | null): number {
  if (!resume?.languages || resume.languages.trim().length === 0) return 0
  const len = resume.languages.trim().length
  if (len < 10) return 30
  if (len < 40) return 65
  return 100
}

function scoreDocuments(
  resumeCount: number,
  coverLetterCount: number
): number {
  let score = 0
  // At least one CV → 50
  if (resumeCount > 0) score += 50
  // At least one cover letter → 50
  if (coverLetterCount > 0) score += 50
  return Math.min(score, 100)
}

function scoreApplications(
  localCount: number,
  globalCount: number
): number {
  const total = localCount + globalCount
  if (total === 0) return 0
  if (total === 1) return 20
  if (total <= 3) return 50
  if (total <= 7) return 75
  return 100
}

function scoreMobility(
  mobilityProfiles: { status: string; matchScore: number | null }[]
): number {
  if (mobilityProfiles.length === 0) return 0
  const completed = mobilityProfiles.filter(p => p.status === 'completed')
  if (completed.length === 0) return 30
  const hasFormattedCV = completed.some(p => p !== undefined) // completed status means full pipeline ran
  if (completed.length >= 2) return 100
  return 70
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Authentification requise' } },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // ── Fetch user ──────────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        role: true,
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

    // ── Fetch related data in parallel ─────────────────────────────────────
    const [resumes, coverLetters, localApplications, globalApplications, mobilityProfiles] =
      await Promise.all([
        db.resume.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            location: true,
            targetJob: true,
            industry: true,
            language: true,
            experience: true,
            education: true,
            skills: true,
            languages: true,
            summary: true,
            softSkills: true,
            templateStyle: true,
            linkedin: true,
            website: true,
            dateOfBirth: true,
            birthPlace: true,
            birthCountry: true,
            createdAt: true,
            updatedAt: true,
          },
        }),

        db.coverLetter.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            location: true,
            companyName: true,
            jobTitle: true,
            tone: true,
            language: true,
            generatedContent: true,
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
              select: { title: true, company: true, location: true, type: true },
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
              select: { title: true, company: true, location: true, country: true, region: true },
            },
          },
        }),

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
      ])

    // ── Pick the most recent resume as "primary" ────────────────────────────
    const primaryResume = resumes.length > 0 ? resumes[0] : null

    // ── Calculate 9-dimension scores ────────────────────────────────────────
    const dimensions = {
      personalInfo: scorePersonalInfo(user, primaryResume),
      professionalSummary: scoreProfessionalSummary(primaryResume),
      experience: scoreExperience(primaryResume),
      education: scoreEducation(primaryResume),
      skills: scoreSkills(primaryResume),
      languages: scoreLanguages(primaryResume),
      documents: scoreDocuments(resumes.length, coverLetters.length),
      applications: scoreApplications(localApplications.length, globalApplications.length),
      mobility: scoreMobility(mobilityProfiles),
    }

    // ── Overall profile completeness (weighted average) ─────────────────────
    const weights: Record<keyof typeof dimensions, number> = {
      personalInfo: 0.10,
      professionalSummary: 0.10,
      experience: 0.15,
      education: 0.10,
      skills: 0.15,
      languages: 0.05,
      documents: 0.15,
      applications: 0.10,
      mobility: 0.10,
    }

    const overallCompleteness = Math.round(
      Object.entries(dimensions).reduce(
        (sum, [key, value]) => sum + value * (weights[key as keyof typeof dimensions] ?? 0),
        0
      )
    )

    return NextResponse.json({
      success: true,
      data: {
        user,
        primaryResume,
        resumes,
        coverLetters,
        localApplications,
        globalApplications,
        mobilityProfiles,
        dimensions,
        overallCompleteness,
        totals: {
          resumes: resumes.length,
          coverLetters: coverLetters.length,
          localApplications: localApplications.length,
          globalApplications: globalApplications.length,
          mobilityProfiles: mobilityProfiles.length,
        },
      },
    })
  } catch (error) {
    console.error('[career-intel/profile] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 }
    )
  }
}
