import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { AgentComms } from '@/lib/autonomous/agent-brain'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }

  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (agentId && status === 'pending') {
      const tasks = await AgentComms.getPendingTasks(agentId)
      return NextResponse.json({ success: true, tasks })
    }

    const tasks = await AgentComms.getTaskHistory({
      agentId: agentId || undefined,
      status: status || undefined,
      limit,
    })

    return NextResponse.json({
      success: true,
      tasks: tasks.map(t => ({
        ...t, payload: JSON.parse(t.payload),
        result: t.result ? JSON.parse(t.result) : null,
      })),
    })
  } catch (error) {
    console.error('[Agent Communicate GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }

  try {
    const body = await request.json()
    const { fromAgent, toAgent, type, payload, priority, reasoning } = body as {
      fromAgent?: string; toAgent?: string; type?: string
      payload?: Record<string, unknown>; priority?: number; reasoning?: string
    }

    if (!fromAgent || !toAgent || !type) {
      return NextResponse.json({ error: 'Missing fromAgent, toAgent, or type' }, { status: 400 })
    }

    const task = await AgentComms.sendTask({
      fromAgent, toAgent,
      type: type as 'delegate' | 'inform' | 'request' | 'respond',
      payload: payload || {},
      priority: priority || 5,
      reasoning: reasoning || '',
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('[Agent Communicate POST]', error)
    return NextResponse.json({ success: false, error: 'Communication failed' }, { status: 500 })
  }
}