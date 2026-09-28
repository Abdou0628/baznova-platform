import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { chatCompletionJSON } from '@/lib/llm'

/**
 * Start a new AI Interview session.
 * Generates 6 interview questions based on job title, industry, and difficulty.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { jobTitle, industry, language, difficulty, interviewType } = body as {
      jobTitle: string
      industry: string
      language?: string
      difficulty?: string
      interviewType?: string
    }

    if (!jobTitle || !industry) {
      return NextResponse.json({ error: 'Titre du poste et secteur requis' }, { status: 400 })
    }

    const lang = language || 'fr'
    const diff = difficulty || 'intermediate'
    const type = interviewType || 'behavioral'

    const difficultyLabels: Record<string, string> = {
      beginner: 'debutant',
      intermediate: 'intermediaire',
      advanced: 'avance',
    }
    const typeLabels: Record<string, string> = {
      behavioral: 'comportemental',
      technical: 'technique',
      mixed: 'mixte',
    }

    // Generate interview questions using LLM
    const questions = await chatCompletionJSON<{
      questions: Array<{ index: number; question: string }>
    }>({
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en recrutement et coach d'entretien professionnel. Tu generes des questions d'entretien en francais pour le poste de ${jobTitle} dans le secteur ${industry}. 
Niveau de difficulte: ${difficultyLabels[diff]}.
Type d'entretien: ${typeLabels[type]}.
Genere exactement 6 questions pertinentes et realistes. Les questions doivent etre diversifiees et couvrir differents aspects du poste.
Reponds UNIQUEMENT en JSON: {"questions": [{"index": 1, "question": "..."}, ...]}`
        },
        {
          role: 'user',
          content: `Genere 6 questions d'entretien pour un poste de ${jobTitle} dans le secteur ${industry}. Niveau ${diff}, type ${type}. Reponds en JSON.`
        }
      ],
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Create interview session
    const interviewSession = await db.interviewSession.create({
      data: {
        userId: auth.userId!,
        jobTitle,
        industry,
        language: lang,
        difficulty: diff,
        interviewType: type,
        status: 'in_progress',
        messages: {
          create: questions.questions.map((q) => ({
            questionIndex: q.index,
            question: q.question,
          })),
        },
      },
    })

    return NextResponse.json({
      sessionId: interviewSession.id,
      questions: questions.questions,
      totalQuestions: questions.questions.length,
    })
  } catch (error) {
    console.error('[interview/start] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
