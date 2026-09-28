import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletionJSON } from '@/lib/llm'
import { withAuth } from '@/lib/hnsa'

interface RoadmapPhase {
  phase: 'short' | 'medium' | 'long'
  title: string
  description: string
  skills: string[]
  certifications: string[]
  milestones: string[]
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { assessmentId, language } = body

    if (!assessmentId) {
      return NextResponse.json({ error: 'Missing assessmentId' }, { status: 400 })
    }

    const assessment = await db.careerAssessment.findUnique({
      where: { id: assessmentId },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const lang = language || assessment.language || 'fr'
    const langInstruction: Record<string, string> = {
      fr: 'Réponds en français.',
      en: 'Respond in English.',
      ar: 'أجب بالعربية.',
      es: 'Responde en español.',
    }

    const roadmap = await chatCompletionJSON<{
      phases: RoadmapPhase[]
      targetRole: string
      currentLevel: string
      score: number
    }>({
      messages: [
        {
          role: 'system',
          content: `You are a career advisor AI. Generate a personalized career roadmap based on the user's assessment answers.
${langInstruction[lang] || ''}
Return valid JSON with this exact structure:
{
  "targetRole": "string - the target role",
  "currentLevel": "string - current level",
  "score": number 0-100,
  "phases": [
    {
      "phase": "short",
      "title": "string - phase title",
      "description": "string - brief description of this phase",
      "skills": ["string"],
      "certifications": ["string"],
      "milestones": ["string"]
    },
    {
      "phase": "medium",
      "title": "string",
      "description": "string",
      "skills": ["string"],
      "certifications": ["string"],
      "milestones": ["string"]
    },
    {
      "phase": "long",
      "title": "string",
      "description": "string",
      "skills": ["string"],
      "certifications": ["string"],
      "milestones": ["string"]
    }
  ]
}
Each phase should have 3-5 skills, 1-3 certifications, and 2-4 milestones.
Make the roadmap specific and actionable.`,
        },
        {
          role: 'user',
          content: `Generate a career roadmap for a user with the following assessment data:
- Domain: ${assessment.targetRole}
- Current Level: ${assessment.currentLevel}
- Assessment Score: ${assessment.score}
- Detailed Answers: ${assessment.answers}

Create a personalized 3-phase roadmap (short 0-6mo, medium 6-18mo, long 18-36mo) with specific skills, certifications, and milestones.`,
        },
      ],
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 3000,
    })

    // Save roadmap to assessment
    await db.careerAssessment.update({
      where: { id: assessmentId },
      data: {
        roadmap: JSON.stringify(roadmap),
        score: roadmap.score ?? assessment.score,
      },
    })

    return NextResponse.json({ roadmap })
  } catch (error) {
    console.error('[career/roadmap POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
