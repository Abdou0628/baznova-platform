import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

const zai = ZAI.create()

interface MatchAnalysis {
  overallScore: number
  skillMatch: { score: number; explanation: string }
  experienceMatch: { score: number; explanation: string }
  educationMatch: { score: number; explanation: string }
  strengths: string[]
  gaps: string[]
  recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: jobId } = await params
    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidateId') || session.user.id

    // Fetch job details
    const job = await db.jobListing.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Fetch candidate's latest resume
    const candidate = await db.user.findUnique({
      where: { id: candidateId },
      select: {
        name: true,
        email: true,
        resumes: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            skills: true,
            experience: true,
            education: true,
            summary: true,
            targetJob: true,
            softSkills: true,
            languages: true,
          },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const resume = candidate.resumes[0]
    if (!resume) {
      return NextResponse.json({ error: 'No resume found for this candidate' }, { status: 400 })
    }

    // Check if we already have a cached analysis
    const existingApplication = await db.application.findFirst({
      where: { jobId, candidateId },
      select: { matchAnalysis: true },
    })

    if (existingApplication?.matchAnalysis) {
      try {
        const cached = JSON.parse(existingApplication.matchAnalysis) as MatchAnalysis
        return NextResponse.json({ analysis: cached, cached: true })
      } catch {
        // If cached data is corrupt, regenerate
      }
    }

    // Build the AI prompt
    const prompt = `You are an expert AI recruitment analyst. Analyze the match between a candidate's profile and a job listing. Return a JSON object with the following structure and nothing else:

{
  "overallScore": <number 0-100>,
  "skillMatch": { "score": <number 0-100>, "explanation": "<detailed explanation>" },
  "experienceMatch": { "score": <number 0-100>, "explanation": "<detailed explanation>" },
  "educationMatch": { "score": <number 0-100>, "explanation": "<detailed explanation>" },
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "recommendation": "<strong_match | good_match | partial_match | weak_match>"
}

JOB LISTING:
- Title: ${job.title}
- Company: ${job.company}
- Type: ${job.type}
- Location: ${job.location || 'Not specified'}
- Country: ${job.country || 'Not specified'}
- Remote: ${job.isRemote ? 'Yes' : 'No'}
- Salary: ${job.salaryMin && job.salaryMax ? `${job.salaryMin}-${job.salaryMax} ${job.currency}` : 'Not specified'}
- Requirements: ${job.requirements || 'Not specified'}
- Skills needed: ${job.skills || 'Not specified'}
- Description: ${job.description}

CANDIDATE PROFILE:
- Name: ${candidate.name || 'Not provided'}
- Target job: ${resume.targetJob}
- Skills: ${resume.skills || 'Not specified'}
- Soft skills: ${resume.softSkills || 'Not specified'}
- Experience: ${resume.experience || 'Not specified'}
- Education: ${resume.education || 'Not specified'}
- Languages: ${resume.languages || 'Not specified'}
- Summary: ${resume.summary || 'Not specified'}

Scoring guidelines:
- 80-100: Strong match (strong_match) - candidate meets or exceeds most requirements
- 60-79: Good match (good_match) - candidate meets key requirements with minor gaps
- 40-59: Partial match (partial_match) - candidate has relevant background but significant gaps
- 0-39: Weak match (weak_match) - candidate's profile does not align well with the role

Be thorough and specific in your explanations. Consider both hard skills and soft skills alignment.`

    const matchResponse = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert AI recruitment analyst. Always respond with valid JSON only, no markdown, no code fences.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    })

    const rawContent = matchResponse.choices?.[0]?.message?.content?.trim() || ''

    // Try to parse the JSON response, handling potential markdown fences
    let analysis: MatchAnalysis
    try {
      let jsonStr = rawContent
      // Strip markdown code fences if present
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim()
      }
      // Also try to find a JSON object if there's surrounding text
      const objMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objMatch) {
        jsonStr = objMatch[0]
      }

      const parsed = JSON.parse(jsonStr)

      // Validate and sanitize the parsed data
      analysis = {
        overallScore: clampScore(parsed.overallScore),
        skillMatch: {
          score: clampScore(parsed.skillMatch?.score),
          explanation: String(parsed.skillMatch?.explanation || 'Skill analysis not available'),
        },
        experienceMatch: {
          score: clampScore(parsed.experienceMatch?.score),
          explanation: String(parsed.experienceMatch?.explanation || 'Experience analysis not available'),
        },
        educationMatch: {
          score: clampScore(parsed.educationMatch?.score),
          explanation: String(parsed.educationMatch?.explanation || 'Education analysis not available'),
        },
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
        recommendation: ['strong_match', 'good_match', 'partial_match', 'weak_match'].includes(parsed.recommendation)
          ? parsed.recommendation
          : 'partial_match',
      }
    } catch {
      // Fallback if AI response is not valid JSON
      analysis = {
        overallScore: 50,
        skillMatch: { score: 50, explanation: 'Unable to generate detailed skill analysis' },
        experienceMatch: { score: 50, explanation: 'Unable to generate detailed experience analysis' },
        educationMatch: { score: 50, explanation: 'Unable to generate detailed education analysis' },
        strengths: ['Analysis could not be generated in detail'],
        gaps: ['Consider regenerating the analysis later'],
        recommendation: 'partial_match',
      }
    }

    // Cache the result in the Application if one exists
    if (existingApplication) {
      await db.application.update({
        where: { id: existingApplication.id },
        data: {
          matchAnalysis: JSON.stringify(analysis),
          matchScore: analysis.overallScore,
        },
      })
    }

    return NextResponse.json({ analysis, cached: false })
  } catch (error) {
    console.error('Match analysis error:', error)
    return NextResponse.json({ error: 'Failed to generate match analysis' }, { status: 500 })
  }
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}
