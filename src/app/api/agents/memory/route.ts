import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { MemoryManager } from '@/lib/autonomous/agent-brain'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')

    const memories = await MemoryManager.recall({
      userId: auth.userId,
      agentId: agentId || undefined,
      category: category || undefined,
      type: type || undefined,
      limit,
    })

    return NextResponse.json({ success: true, memories })
  } catch (error) {
    console.error('[Agent Memory GET]', error)
    return NextResponse.json({ success: false, error: 'Memory read failed' }, { status: 500 })
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
    const { agentId, type, category, key, data, confidence } = body as {
      agentId?: string; type?: string; category?: string; key?: string
      data?: Record<string, unknown>; confidence?: number
    }

    if (!agentId || !type || !key || !data) {
      return NextResponse.json({ error: 'Missing agentId, type, key, or data' }, { status: 400 })
    }

    const memory = await MemoryManager.store({
      agentId, userId: auth.userId,
      type: type as 'decision' | 'outcome' | 'preference' | 'pattern' | 'insight' | 'error_learned',
      category: category || 'general', key, data, confidence,
    })

    return NextResponse.json({ success: true, memory })
  } catch (error) {
    console.error('[Agent Memory POST]', error)
    return NextResponse.json({ success: false, error: 'Memory write failed' }, { status: 500 })
  }
}
