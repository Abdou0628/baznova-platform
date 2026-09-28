import { NextRequest, NextResponse } from 'next/server'
import { recallMemories, storeMemory, forgetMemory } from '@/lib/ai-os/memory-engine'

/**
 * GET /api/ai-os/memory
 * List memories with optional filters: agentId, userId, type, category, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const agentId = searchParams.get('agentId') ?? undefined
    const userId = searchParams.get('userId') ?? undefined
    const type = searchParams.get('type') ?? undefined
    const category = searchParams.get('category') ?? undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined

    // Use recallMemories from the engine (it handles expiration, confidence ordering, etc.)
    const memories = await recallMemories({
      agentId,
      userId,
      type,
      category,
      limit: limit ?? 50,
    })

    // Apply offset in-memory (engine doesn't support offset natively)
    const sliced = offset ? memories.slice(offset) : memories

    return NextResponse.json({
      memories: sliced,
      total: memories.length,
      limit: limit ?? 50,
      offset: offset ?? 0,
    })
  } catch (error) {
    console.error('[ai-os/memory] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/ai-os/memory
 * Store a new memory. Body: { agentId, type, category, key, data, userId?, confidence? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, type, category, key, data, userId, confidence } = body as {
      agentId: string
      type: string
      category: string
      key: string
      data: any
      userId?: string
      confidence?: number
    }

    if (!agentId || !type || !category || !key || data === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, type, category, key, data' },
        { status: 400 },
      )
    }

    const memory = await storeMemory({
      agentId,
      type,
      category,
      key,
      data,
      userId,
      confidence,
    })

    return NextResponse.json({ success: true, memory }, { status: 201 })
  } catch (error) {
    console.error('[ai-os/memory] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to store memory' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/ai-os/memory
 * Forget (delete) a memory by ID. Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 },
      )
    }

    const deleted = await forgetMemory(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, forgotten: id })
  } catch (error) {
    console.error('[ai-os/memory] DELETE failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 },
    )
  }
}
