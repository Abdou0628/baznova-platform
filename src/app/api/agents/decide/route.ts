import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { buildUserContext, DecisionEngine, LLMDecisionEngine, MemoryManager, handleAutonomousEventEnhanced, broadcastEvent } from '@/lib/autonomous/agent-brain'
import type { AgentEvent } from '@/lib/autonomous/agent-brain'

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
    const { event, useLLM = true } = body as { event?: string; useLLM?: boolean }

    // Broadcast that analysis is starting
    await broadcastEvent('agent:decision', {
      agentId: 'cto',
      action: 'act',
      reasoning: 'Lancement de l\'analyse autonome multi-agents...',
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    }, auth.userId)

    if (event) {
      const result = await handleAutonomousEventEnhanced(event as AgentEvent, auth.userId)
      return NextResponse.json({ success: true, ...result })
    }

    const context = await buildUserContext(auth.userId)

    let decisions: any[]
    if (useLLM) {
      // Run both in parallel for maximum intelligence
      const [ruleDec, llmDec] = await Promise.all([
        DecisionEngine.analyze(context),
        LLMDecisionEngine.deepAnalyze(context),
      ])
      // Merge: LLM first, deduplicate
      const seen = new Set<string>()
      decisions = []
      for (const d of [...llmDec, ...ruleDec]) {
        const key = `${d.agentId}:${d.payload?.suggestionType || d.action}`
        if (!seen.has(key)) {
          seen.add(key)
          decisions.push(d)
        }
      }
    } else {
      decisions = await DecisionEngine.analyze(context)
    }

    // Broadcast each decision in real-time
    for (const decision of decisions.slice(0, 5)) {
      await broadcastEvent('agent:decision', {
        agentId: decision.agentId,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        timestamp: new Date().toISOString(),
      }, auth.userId)
    }

    await MemoryManager.store({
      agentId: 'cto', userId: auth.userId,
      type: 'decision', category: 'system',
      key: `analysis:${Date.now()}`,
      data: { decisionsCount: decisions.length, topDecision: decisions[0]?.reasoning, llmPowered: useLLM },
      confidence: 0.8,
    })

    return NextResponse.json({
      success: true,
      llmPowered: useLLM,
      context: {
        hasResume: context.hasResume, resumeCount: context.resumeCount,
        plan: context.plan, interviewSessions: context.interviewSessions,
        coverLetters: context.coverLetters, careerAssessments: context.careerAssessments,
        linkedinAnalyses: context.linkedinAnalyses, applicationCount: context.applicationCount,
      },
      decisions: decisions.slice(0, 5),
    })
  } catch (error) {
    console.error('[Agent Decide]', error)
    return NextResponse.json({ success: false, error: 'Decision engine failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const context = await buildUserContext(auth.userId)
    const decisions = await DecisionEngine.analyze(context)
    return NextResponse.json({ success: true, context, decisions })
  } catch (error) {
    console.error('[Agent Decide]', error)
    return NextResponse.json({ success: false, error: 'Decision engine failed' }, { status: 500 })
  }
}
