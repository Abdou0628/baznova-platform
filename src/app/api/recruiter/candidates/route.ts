import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { chatCompletionJSON } from '@/lib/llm'

// ---------- helpers ----------

/** Fallback scoring based on keyword overlap between candidate notes and job description. */
function fallbackScore(candidateSkills: string, jobDescription: string): number {
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must', 'that', 'this', 'it', 'its', 'un', 'une', 'le', 'la', 'les', 'de', 'du', 'des', 'et', 'en', 'dans', 'pour', 'avec', 'sur', 'par', 'est', 'son', 'sa', 'ses', 'au', 'aux'])
  const tokenize = (text: string) =>
    text.toLowerCase().split(/[^\w+#+./-]+/).filter(w => w.length > 1 && !stopWords.has(w))

  const candidateTokens = new Set(tokenize(candidateSkills))
  const jobTokens = tokenize(jobDescription)
  if (candidateTokens.size === 0 || jobTokens.length === 0) return 0

  const overlap = jobTokens.filter(t => candidateTokens.has(t)).length
  return Math.min(100, Math.round((overlap / Math.max(jobTokens.length, 1)) * 100))
}

/** Ask the LLM to score a candidate against a job. Returns { score, reason } or null. */
async function llmScore(candidate: { name: string; skills: string; experience: string }, job: { title: string; description: string }): Promise<{ score: number; reason: string } | null> {
  try {
    const result = await chatCompletionJSON<{ score: number; reason: string }>({
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en recrutement IA. Évalue la compatibilité d'un candidat pour une offre d'emploi.
Réponds UNIQUEMENT en JSON : { "score": <nombre 0-100>, "reason": "<une phrase expliquant le score>" }.
Sois objectif et précis.`,
        },
        {
          role: 'user',
          content: `Offre d'emploi :
Titre : ${job.title}
Description : ${job.description}

Profil du candidat :
Nom : ${candidate.name}
Compétences : ${candidate.skills || 'Non précisé'}
Expérience : ${candidate.experience || 'Non précisé'}`,
        },
      ],
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 300,
    })

    const score = Math.min(100, Math.max(0, Math.round(Number(result.score) || 0)))
    const reason = String(result.reason || '').slice(0, 500)
    return { score, reason }
  } catch (err) {
    console.error('[candidates] LLM scoring failed, using fallback:', err)
    return null
  }
}

// ---------- GET ----------

// GET /api/recruiter/candidates — list all candidates with optional filters
export async function GET(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const minScore = parseInt(searchParams.get('minScore') || '0', 10)

    const where: any = {}
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
      ]
    }
    if (minScore > 0) {
      where.score = { gte: minScore }
    }

    const candidates = await db.recruiterCandidate.findMany({
      where,
      include: { job: { select: { title: true, id: true } } },
      orderBy: { score: 'desc' },
      take: 50,
    })

    const formatted = candidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      score: c.score,
      stage: c.stage,
      jobTitle: c.job.title,
      jobId: c.job.id,
      skills: c.notes || '',
      appliedAt: c.appliedAt.toISOString(),
    }))

    return NextResponse.json({ candidates: formatted })
  } catch (error) {
    console.error('Candidates GET error:', error)
    return NextResponse.json({ candidates: [] }, { status: 500 })
  }
}

// ---------- POST ----------

// POST /api/recruiter/candidates — add a candidate with automatic LLM scoring
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { jobId, name, email, skills = '', experience = '' } = await req.json()

    if (!jobId || !name || !email) {
      return NextResponse.json({ error: 'Missing jobId, name, or email' }, { status: 400 })
    }

    // Fetch the job to get its description for scoring
    const job = await db.recruiterJob.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // 1. Create candidate with score 0 first
    const candidate = await db.recruiterCandidate.create({
      data: {
        jobId,
        name,
        email,
        score: 0,
        stage: 'new',
        notes: skills ? `Skills: ${skills}${experience ? ` | Exp: ${experience}` : ''}` : (experience || ''),
      },
    })

    // 2. Auto-score via LLM
    const llmResult = await llmScore({ name, skills, experience }, { title: job.title, description: job.description })

    let finalScore: number
    let reason = ''

    if (llmResult) {
      finalScore = llmResult.score
      reason = llmResult.reason
    } else {
      // Fallback: score based on keyword overlap
      finalScore = fallbackScore(skills || '', job.description || '')
      reason = `Score basé sur ${finalScore}% de mots-clés en commun avec l'offre.`
    }

    // 3. Persist score and reason in DB
    const updated = await db.recruiterCandidate.update({
      where: { id: candidate.id },
      data: {
        score: finalScore,
        notes: reason ? `${candidate.notes}${candidate.notes ? '\n' : ''}[AI] ${reason}` : candidate.notes,
      },
    })

    return NextResponse.json({
      candidate: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        score: updated.score,
        stage: updated.stage,
        notes: updated.notes,
        appliedAt: updated.appliedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Candidates POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
