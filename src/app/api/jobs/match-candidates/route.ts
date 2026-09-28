import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

interface MatchResult {
  userId: string
  name: string
  email: string
  matchScore: number
  matchReasons: string // JSON stringified array of strings
}

// POST — Core matching engine: find candidates that match a job
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const body = await request.json()
    const { jobId, globalJobId } = body

    if (!jobId && !globalJobId) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'jobId ou globalJobId requis' } },
        { status: 400 }
      )
    }

    // --- 1. Fetch the job listing ---
    let job: {
      id: string
      title: string
      company: string
      location: string
      country: string
      type: string
      salaryMin: number | null
      salaryMax: number | null
      currency: string
      requirements: string
      skills: string | null
      language: string
      industry?: string
    } | null = null

    if (jobId) {
      const found = await db.jobListing.findUnique({ where: { id: jobId } })
      if (!found) {
        return NextResponse.json(
          { success: false, error: { code: 404, message: 'Offre non trouvée' } },
          { status: 404 }
        )
      }
      job = found
    } else if (globalJobId) {
      const found = await db.globalJobListing.findUnique({ where: { id: globalJobId } })
      if (!found) {
        return NextResponse.json(
          { success: false, error: { code: 404, message: 'Offre globale non trouvée' } },
          { status: 404 }
        )
      }
      job = found
    }

    // --- 2. Fetch ALL candidate users (role='candidate', plan != 'free') ---
    const candidates = await db.user.findMany({
      where: {
        role: 'candidate',
        plan: { not: 'free' },
      },
      select: { id: true, name: true, email: true },
    })

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: { matched: 0, notifications: 0, candidates: [] },
      })
    }

    // --- 3. Fetch all resumes linked to those users ---
    const userIds = candidates.map(c => c.id)
    const resumes = await db.resume.findMany({
      where: { userId: { in: userIds } },
    })

    // Build a map: userId -> most recent resume (or the first one)
    const resumeByUser = new Map<string, typeof resumes[0]>()
    for (const r of resumes) {
      if (!resumeByUser.has(r.userId || '')) {
        resumeByUser.set(r.userId || '', r)
      }
    }

    // --- 4. Extract job skills from requirements + skills fields ---
    const jobRequirements = (job?.requirements || '').toLowerCase()
    const jobSkillsRaw = (job?.skills || '').toLowerCase()
    // Combine and deduplicate job skills
    const jobSkillText = `${jobRequirements} ${jobSkillsRaw}`
    // Extract individual words that look like skills (2+ chars, alphabetic)
    const jobSkillSet = new Set(
      jobSkillText
        .split(/[,;\n\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length >= 2 && /^[a-zàâäéèêëïîôùûüÿç\-]+$/i.test(s))
    )
    // Extract title keywords (2+ chars)
    const titleKeywords = (job?.title || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length >= 3)

    // --- 5. Score each candidate ---
    const matchedCandidates: MatchResult[] = []

    for (const candidate of candidates) {
      const resume = resumeByUser.get(candidate.id)
      if (!resume) continue

      let score = 0
      const reasons: string[] = []

      // -- Skills match (max 40 points, 10 per matching skill up to 4) --
      const resumeSkillsRaw = (resume.skills || '').toLowerCase()
      const resumeSkillList = resumeSkillsRaw
        .split(/[,;\n]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

      let skillMatchCount = 0
      for (const rSkill of resumeSkillList) {
        // Check if this resume skill appears in job requirements/skills
        for (const jSkill of jobSkillSet) {
          if (rSkill.includes(jSkill) || jSkill.includes(rSkill)) {
            skillMatchCount++
            break // count each resume skill only once
          }
        }
      }
      const skillPoints = Math.min(skillMatchCount * 10, 40)
      if (skillPoints > 0) {
        score += skillPoints
        reasons.push(`Skills: ${skillMatchCount} matching`)
      }

      // -- Location match (+15 points) --
      const resumeLocation = (resume.location || '').toLowerCase()
      const jobLocation = (job?.location || '').toLowerCase()
      const jobCountry = (job?.country || '').toLowerCase()
      if (resumeLocation && (resumeLocation.includes(jobLocation) || jobLocation.includes(resumeLocation) || resumeLocation.includes(jobCountry) || jobCountry.includes(resumeLocation))) {
        score += 15
        reasons.push('Location match')
      }

      // -- Industry match (+15 points) --
      const resumeIndustry = (resume.industry || '').toLowerCase().trim()
      const jobIndustry = (job?.industry || '').toLowerCase().trim()
      if (resumeIndustry && jobIndustry && resumeIndustry === jobIndustry) {
        score += 15
        reasons.push('Industry match')
      }

      // -- Target job match (+15 points) --
      const resumeTargetJob = (resume.targetJob || '').toLowerCase()
      let titleKeywordMatch = 0
      for (const kw of titleKeywords) {
        if (resumeTargetJob.includes(kw)) titleKeywordMatch++
      }
      if (titleKeywordMatch >= 1) {
        score += 15
        reasons.push('Target job match')
      }

      // -- Language match (+10 points) --
      if (resume.language === job?.language) {
        score += 10
        reasons.push('Language match')
      }

      // -- Experience bonus (+5 points) --
      if (resume.experience && resume.experience.trim().length > 0) {
        score += 5
        reasons.push('Has experience')
      }

      // --- 6. Filter by minimum score ---
      if (score >= 30) {
        matchedCandidates.push({
          userId: candidate.id,
          name: candidate.name || 'Candidate',
          email: candidate.email,
          matchScore: Math.min(score, 100),
          matchReasons: JSON.stringify(reasons),
        })
      }
    }

    // Sort by matchScore descending
    matchedCandidates.sort((a, b) => b.matchScore - a.matchScore)

    // --- 7. Create JobNotification records for matching candidates ---
    let notificationsCreated = 0
    for (const mc of matchedCandidates) {
      // Check if user has newsletterJobs=true or no consent record (core feature)
      const consent = await db.userConsent.findUnique({
        where: { userId: mc.userId },
      })

      // If consent exists and newsletterJobs is explicitly false, skip
      if (consent && !consent.newsletterJobs) continue

      // Create notification
      await db.jobNotification.create({
        data: {
          userId: mc.userId,
          jobId: job?.id || null,
          jobTitle: job?.title || '',
          jobCompany: job?.company || '',
          jobLocation: job?.location || null,
          jobType: job?.type || null,
          salaryMin: job?.salaryMin || null,
          salaryMax: job?.salaryMax || null,
          currency: job?.currency || 'MAD',
          matchScore: mc.matchScore,
          matchReasons: mc.matchReasons,
        },
      })
      notificationsCreated++
    }

    return NextResponse.json({
      success: true,
      data: {
        matched: matchedCandidates.length,
        notifications: notificationsCreated,
        candidates: matchedCandidates,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}
