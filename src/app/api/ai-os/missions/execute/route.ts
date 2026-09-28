import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createMission, executeMission, cancelMission } from '@/lib/ai-os/mission-executor'

/**
 * POST /api/ai-os/missions/execute
 * Create and immediately execute a mission.
 * Body: { title, description, objective, type, steps: [{ agentId, action, input? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, objective, type = 'custom', steps } = body as {
      title: string
      description: string
      objective: string
      type?: string
      steps: Array<{ agentId: string; action: string; input?: Record<string, unknown> }>
    }

    if (!title || !objective || !steps?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: title, objective, steps' },
        { status: 400 },
      )
    }

    // Create the mission
    const missionId = await createMission({
      title,
      description: description || objective,
      objective,
      type,
      steps,
      userId: session.user.id,
    })

    // Execute asynchronously (don't block the response)
    executeMission(missionId).catch((err) => {
      console.error('[mission-executor] Execution failed:', err)
    })

    return NextResponse.json({
      success: true,
      missionId,
      message: 'Mission created and execution started',
    }, { status: 201 })
  } catch (error) {
    console.error('[ai-os/missions/execute] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to execute mission' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/ai-os/missions/execute
 * Cancel a running mission.
 * Body: { missionId, action: 'cancel' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { missionId, action } = body as { missionId: string; action: string }

    if (!missionId) {
      return NextResponse.json({ error: 'Missing missionId' }, { status: 400 })
    }

    if (action === 'cancel') {
      const result = await cancelMission(missionId)
      return NextResponse.json({ success: true, mission: result })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[ai-os/missions/execute] PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 })
  }
}
