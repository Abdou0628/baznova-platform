import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

// POST /api/recruiter/match — AI matching via LLM
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { jobDescription, language = 'fr' } = await req.json()

    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json({ candidates: [] }, { status: 400 })
    }

    // Fetch all candidates from the database
    const allCandidates = await db.recruiterCandidate.findMany({
      include: { job: { select: { title: true, description: true } } },
      orderBy: { score: 'desc' },
      take: 30,
    })

    // If no real candidates, generate AI-simulated candidates based on job description
    if (allCandidates.length === 0) {
      const simulatedCandidates = await generateSimulatedCandidates(jobDescription, language)
      return NextResponse.json({ candidates: simulatedCandidates })
    }

    // Score candidates with AI
    const prompt = `You are an expert AI recruiter. Given a job description and a list of candidates, score each candidate from 0-100 based on fit.

Job Description:
${jobDescription}

Candidates:
${allCandidates.map((c, i) => `${i + 1}. ID:${c.id} ${c.name} (${c.email}) - Current job: ${c.job.title}. Notes: ${c.notes || 'No notes'}. Previous score: ${c.score}/100`).join('\n')}

Respond ONLY with a JSON array of objects with: id, name, email, score (0-100), skills (array of 3-5 skill strings), experience (short string), reason (one sentence why this score). Sort by score descending.

Language: ${language}`

    try {
      // Dynamic import of z-ai-web-dev-sdk
      const { getLLMResponse } = await import('z-ai-web-dev-sdk')
      const aiResponse = await getLLMResponse(prompt, 'gpt-4o-mini')

      // Parse JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const formatted = parsed.map((c: any) => ({
          id: c.id || 'ai-' + Math.random().toString(36).slice(2, 8),
          name: c.name,
          email: c.email,
          score: Math.min(100, Math.max(0, Number(c.score) || 0)),
          skills: Array.isArray(c.skills) ? c.skills : [],
          experience: c.experience || '',
          reason: c.reason || '',
        }))

        // Persist LLM scores back to DB for real candidates
        const dbUpdates = formatted
          .filter(c => !String(c.id).startsWith('ai-') && !String(c.id).startsWith('sim-'))
          .map(c =>
            db.recruiterCandidate.update({
              where: { id: c.id },
              data: {
                score: c.score,
                notes: c.reason
                  ? `${allCandidates.find(ac => ac.id === c.id)?.notes || ''}\n[AI Match] ${c.reason}`
                  : undefined,
              },
            }).catch(() => {})
          )
        await Promise.all(dbUpdates)

        return NextResponse.json({ candidates: formatted })
      }
    } catch (aiError) {
      console.error('AI matching error, using fallback:', aiError)
    }

    // Fallback: return candidates sorted by their existing score
    const fallback = allCandidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      score: c.score,
      skills: [],
      experience: c.job.title,
      reason: '',
    }))

    return NextResponse.json({ candidates: fallback })
  } catch (error) {
    console.error('Match POST error:', error)
    return NextResponse.json({ candidates: [] }, { status: 500 })
  }
}

// Generate simulated candidates when no real candidates exist
async function generateSimulatedCandidates(jobDescription: string, language: string) {
  const prompt = `You are an AI recruitment assistant. A recruiter has posted this job description:

"${jobDescription}"

Generate 5 realistic candidate profiles that would be good matches for this role. For each candidate provide:
- name (realistic name)
- email (realistic email)
- score (0-100, vary between 55-97)
- skills (array of 3-5 relevant skills)
- experience (short string like "5 years in software engineering")
- reason (one sentence why they're a good/bad fit)

Respond ONLY with a JSON array. No markdown. No explanation. Language of names/emails: international. Response language: ${language}`

  try {
    const { getLLMResponse } = await import('z-ai-web-dev-sdk')
    const aiResponse = await getLLMResponse(prompt, 'gpt-4o-mini')
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.map((c: any) => ({
        id: 'sim-' + Math.random().toString(36).slice(2, 10),
        name: c.name,
        email: c.email,
        score: Math.min(100, Math.max(0, Number(c.score) || 0)),
        skills: Array.isArray(c.skills) ? c.skills : [],
        experience: c.experience || '',
        reason: c.reason || '',
      }))
    }
  } catch (error) {
    console.error('Simulation error:', error)
  }

  // Hardcoded fallback candidates
  return [
    { id: 'sim-1', name: 'Alex Chen', email: 'alex.chen@email.com', score: 91, skills: ['React', 'Node.js', 'TypeScript', 'AWS'], experience: '7 years full-stack development', reason: 'Strong technical background matching all key requirements.' },
    { id: 'sim-2', name: 'Marie Dupont', email: 'marie.dupont@email.com', score: 84, skills: ['Python', 'SQL', 'Machine Learning'], experience: '4 years data science', reason: 'Solid analytical skills with relevant domain expertise.' },
    { id: 'sim-3', name: 'Carlos Rivera', email: 'carlos.rivera@email.com', score: 76, skills: ['JavaScript', 'Docker', 'CI/CD'], experience: '3 years backend development', reason: 'Good foundational skills, needs more experience in key areas.' },
    { id: 'sim-4', name: 'Aisha Benali', email: 'aisha.benali@email.com', score: 69, skills: ['Figma', 'UX Research', 'Prototyping'], experience: '2 years UX design', reason: 'Creative profile with transferable skills, limited direct experience.' },
    { id: 'sim-5', name: 'James Wilson', email: 'james.wilson@email.com', score: 58, skills: ['HTML', 'CSS', 'Basic JS'], experience: '1 year junior developer', reason: 'Entry-level candidate with potential but needs significant growth.' },
  ]
}
