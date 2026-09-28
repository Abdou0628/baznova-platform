import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { ProactiveEngine, buildUserContext, MemoryManager } from '@/lib/autonomous/agent-brain'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const suggestions = await ProactiveEngine.getActiveSuggestions(auth.userId)
    return NextResponse.json({ success: true, suggestions })
  } catch (error) {
    console.error('[Agent Suggestions GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}

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
    const { trigger } = body as { trigger?: string }

    const context = await buildUserContext(auth.userId)
    const insights = await ProactiveEngine.generateForUser(auth.userId, context)

    const persisted: any[] = []
    for (const insight of insights.slice(0, 5)) {
      const s = await ProactiveEngine.persistSuggestion(auth.userId, insight)
      persisted.push(s)
    }

    await MemoryManager.store({
      agentId: 'system', userId: auth.userId,
      type: 'decision', category: 'system',
      key: `suggestion_trigger:${trigger || 'manual'}`,
      data: { trigger, insightsCount: insights.length, persistedCount: persisted.length },
      confidence: 0.7,
    })

    const mapped = persisted.map(s => {
      let titles = { fr: s.title, en: s.title, ar: s.title, es: s.title }
      let descriptions = { fr: s.description, en: s.description, ar: s.description, es: s.description }
      if (s.actionData) {
        try {
          const p = JSON.parse(s.actionData)
          if (p.titles) titles = p.titles
          if (p.descriptions) descriptions = p.descriptions
        } catch { /* */ }
      }
      return { ...s, titles, descriptions }
    })

    return NextResponse.json({
      success: true,
      insightsCount: insights.length,
      suggestionsCreated: persisted.length,
      suggestions: mapped,
    })
  } catch (error) {
    console.error('[Agent Suggestions POST]', error)
    return NextResponse.json({ success: false, error: 'Failed to process suggestions' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { suggestionId, action } = body as { suggestionId?: string; action?: 'dismiss' | 'act' }

    if (!suggestionId || !action) {
      return NextResponse.json({ error: 'Missing suggestionId or action' }, { status: 400 })
    }

    if (action === 'dismiss') {
      await ProactiveEngine.dismissSuggestion(suggestionId, auth.userId)
      await MemoryManager.learnFromOutcome({
        agentId: 'system', userId: auth.userId,
        actionType: 'suggestion_dismissed', outcome: 'negative',
        context: { suggestionId, action },
      })
    } else if (action === 'act') {
      await ProactiveEngine.actOnSuggestion(suggestionId, auth.userId)
      await MemoryManager.learnFromOutcome({
        agentId: 'system', userId: auth.userId,
        actionType: 'suggestion_accepted', outcome: 'positive',
        context: { suggestionId, action },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Agent Suggestions PATCH]', error)
    return NextResponse.json({ success: false, error: 'Failed to update suggestion' }, { status: 500 })
  }
}