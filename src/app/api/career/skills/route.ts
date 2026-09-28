import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletionJSON } from '@/lib/llm'
import { withAuth } from '@/lib/hnsa'

interface SkillItem {
  name: string
  current: number
  required: number
}

interface CourseItem {
  name: string
  platform: string
  level: string
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

    const skillsAnalysis = await chatCompletionJSON<{
      skills: SkillItem[]
      courses: CourseItem[]
      overallScore: number
      targetRole: string
    }>({
      messages: [
        {
          role: 'system',
          content: `You are a skills analyst AI. Perform a skills gap analysis based on the user's assessment.
${langInstruction[lang] || ''}
Return valid JSON with this exact structure:
{
  "skills": [
    { "name": "Skill Name", "current": 60, "required": 90 }
  ],
  "courses": [
    { "name": "Course Name", "platform": "Platform Name", "level": "Beginner|Intermediate|Advanced" }
  ],
  "overallScore": 65,
  "targetRole": "Target Role Name"
}

Provide 6-8 skills with current (0-100) and required (0-100) levels.
Provide 4-6 recommended courses with real platforms (Coursera, Udemy, edX, LinkedIn Learning, etc.).
Be specific and realistic with skill names and course titles.`,
        },
        {
          role: 'user',
          content: `Perform a skills gap analysis for:
- Domain: ${assessment.targetRole}
- Current Level: ${assessment.currentLevel}
- Assessment Score: ${assessment.score}
- Detailed Answers: ${assessment.answers}

Identify 6-8 key skills, rate current vs required levels, and recommend 4-6 specific courses.`,
        },
      ],
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2500,
    })

    // Save skills analysis to assessment
    await db.careerAssessment.update({
      where: { id: assessmentId },
      data: {
        skillsGap: JSON.stringify(skillsAnalysis),
      },
    })

    return NextResponse.json({ skillsAnalysis })
  } catch (error) {
    console.error('[career/skills POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
