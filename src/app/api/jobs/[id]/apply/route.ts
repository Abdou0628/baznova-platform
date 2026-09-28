import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import ZAI from 'z-ai-web-dev-sdk'

const zai = ZAI.create()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ success: false, error: { code: 401, message: 'Auth requis' } }, { status: auth.statusCode })

    const job = await db.jobListing.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ success: false, error: { code: 404, message: 'Offre non trouvée' } }, { status: 404 })

    const body = await request.json()
    const { candidateName, candidateEmail, coverNote } = body

    if (!candidateName || !candidateEmail) return NextResponse.json({ success: false, error: { code: 400, message: 'Nom et email requis' } }, { status: 400 })

    // Check duplicate
    const existing = await db.application.findFirst({ where: { jobId: id, candidateEmail } })
    if (existing) return NextResponse.json({ success: false, error: { code: 409, message: 'Déjà candidaté' } }, { status: 409 })

    // AI Match Score
    let matchScore = 70
    try {
      const matchRes = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a recruitment AI. Given a job posting and candidate info, return ONLY a number 0-100 representing match score.' },
          { role: 'user', content: `Job: ${job.title} at ${job.company}. Requirements: ${job.requirements}. Skills: ${job.skills || 'none'}. Candidate: ${candidateName}, Cover: ${coverNote || 'none'}. Score 0-100:` }
        ],
        max_tokens: 5,
        temperature: 0
      })
      const score = parseInt(matchRes.choices?.[0]?.message?.content || '70')
      if (!isNaN(score)) matchScore = Math.min(100, Math.max(0, score))
    } catch { /* use default 70 */ }

    const application = await db.application.create({
      data: { jobId: id, candidateName, candidateEmail, coverNote: coverNote || '', matchScore }
    })

    await db.jobListing.update({ where: { id }, data: { applicationsCount: { increment: 1 } } })

    return NextResponse.json({ success: true, data: { ...application, matchScore } })
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur serveur' } }, { status: 500 })
  }
}
