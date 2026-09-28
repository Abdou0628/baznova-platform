import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { MemoryManager } from '@/lib/autonomous/agent-brain'

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { agentId, actionType, outcome, context, feedback } = body as {
      agentId?: string; actionType?: string; outcome?: string
      context?: Record<string, unknown>; feedback?: string
    }

    if (!agentId || !actionType || !outcome) {
      return NextResponse.json({ error: 'Missing agentId, actionType, or outcome' }, { status: 400 })
    }

    await MemoryManager.learnFromOutcome({
      agentId, userId: auth.userId,
      actionType,
      outcome: outcome as 'positive' | 'negative' | 'neutral',
      context: context || {},
      feedback,
    })

    return NextResponse.json({ success: true, message: 'Learning recorded' })
  } catch (error) {
    console.error('[Agent Learn]', error)
    return NextResponse.json({ success: false, error: 'Learning failed' }, { status: 500 })
  }
}