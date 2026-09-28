import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { chatCompletionJSON } from '@/lib/llm'

/**
 * Complete an interview session and generate final report.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { sessionId } = body as { sessionId: string }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })
    }

    // Find session with all messages
    const interviewSession = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          where: { userAnswer: { not: null }, aiScore: { not: null } },
          orderBy: { questionIndex: 'asc' },
        },
      },
    })

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session non trouvee' }, { status: 404 })
    }

    if (interviewSession.userId !== auth.userId) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    // Calculate average score
    const messages = interviewSession.messages
    const totalScore = messages.reduce((sum, m) => sum + (m.aiScore || 0), 0)
    const averageScore = messages.length > 0 ? Math.round(totalScore / messages.length) : 0

    // Generate final report using LLM
    const reportData = await chatCompletionJSON<{
      strengths: string[]
      weaknesses: string[]
      improvementPlan: string[]
      recommendation: string
    }>({
      messages: [
        {
          role: 'system',
          content: `Tu es un coach de carriere expert. A partir des resultats d'un entretien simule, tu generes un rapport d'evaluation final en francais.
Le score moyen est de ${averageScore}/100 pour le poste de ${interviewSession.jobTitle}.

Fournis:
- 3-4 points forts identifies
- 2-3 points faibles a ameliorer
- 3-4 actions concretes d'amelioration
- Une recommandation globale (1-2 phrases)

Reponds UNIQUEMENT en JSON: {"strengths": ["..."], "weaknesses": ["..."], "improvementPlan": ["..."], "recommendation": "..."}`
        },
        {
          role: 'user',
          content: `Voici le detail des reponses:
${messages.map((m, i) => `Q${i + 1}: ${m.question}\nReponse: ${m.userAnswer}\nScore: ${m.aiScore}/100\nFeedback: ${m.aiFeedback}`).join('\n\n')}

Genere le rapport final d'evaluation. Reponds en JSON.`
        }
      ],
      temperature: 0.4,
      maxTokens: 1500,
    })

    // Update session
    await db.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        totalScore: averageScore,
        report: JSON.stringify(reportData),
      },
    })

    return NextResponse.json({
      report: {
        averageScore,
        ...reportData,
        totalQuestions: messages.length,
        jobTitle: interviewSession.jobTitle,
        industry: interviewSession.industry,
        difficulty: interviewSession.difficulty,
      },
    })
  } catch (error) {
    console.error('[interview/complete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
