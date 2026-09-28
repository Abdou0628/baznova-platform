import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'

/**
 * Get all interview sessions for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const sessions = await db.interviewSession.findMany({
      where: { userId: auth.userId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        jobTitle: s.jobTitle,
        industry: s.industry,
        language: s.language,
        difficulty: s.difficulty,
        interviewType: s.interviewType,
        status: s.status,
        totalScore: s.totalScore,
        totalQuestions: s._count.messages,
        report: s.report ? JSON.parse(s.report) : null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    })
  } catch (error) {
    console.error('[interview/sessions] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
