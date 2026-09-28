import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { chatCompletionJSON } from '@/lib/llm'

/**
 * Submit an answer for an interview question.
 * LLM evaluates the answer and provides score, feedback, tips.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { sessionId, questionIndex, answer } = body as {
      sessionId: string
      questionIndex: number
      answer: string
    }

    if (!sessionId || !questionIndex || !answer) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })
    }

    // Find the interview message
    const message = await db.interviewMessage.findFirst({
      where: { sessionId, questionIndex },
      include: { session: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Question non trouvee' }, { status: 404 })
    }

    if (message.session.userId !== auth.userId) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    // Evaluate answer using LLM
    const evaluation = await chatCompletionJSON<{
      score: number
      feedback: string
      tips: string[]
      followUp: string
    }>({
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en evaluation d'entretiens professionnels. Tu evalus la reponse d'un candidat a une question d'entretien.
Tu dois fournir:
- Un score de 0 a 100 (0 = terrible, 50 = moyen, 100 = excellent)
- Un feedback detaille en francais (2-3 phrases)
- 2-3 conseils d'amelioration concrets
- Une question de suivi pour approfondir

Reponds UNIQUEMENT en JSON: {"score": 75, "feedback": "...", "tips": ["...", "..."], "followUp": "..."}
Evalue objectivement en tenant compte de la clarte, la pertinence, la structure et le contenu de la reponse.`
        },
        {
          role: 'user',
          content: `Poste: ${message.session.jobTitle}\nSecteur: ${message.session.industry}\n\nQuestion: ${message.question}\n\nReponse du candidat: ${answer}\n\nEvalue cette reponse. Reponds en JSON.`
        }
      ],
      temperature: 0.3,
      maxTokens: 1000,
    })

    // Update message with evaluation
    await db.interviewMessage.update({
      where: { id: message.id },
      data: {
        userAnswer: answer,
        aiScore: evaluation.score,
        aiFeedback: evaluation.feedback,
        aiTips: JSON.stringify(evaluation.tips),
        followUp: evaluation.followUp,
      },
    })

    // Check if this is the last question
    const totalMessages = await db.interviewMessage.count({
      where: { sessionId },
    })
    const answeredMessages = await db.interviewMessage.count({
      where: { sessionId, userAnswer: { not: null } },
    })

    return NextResponse.json({
      score: evaluation.score,
      feedback: evaluation.feedback,
      tips: evaluation.tips,
      followUp: evaluation.followUp,
      isLast: answeredMessages >= totalMessages,
    })
  } catch (error) {
    console.error('[interview/answer] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
