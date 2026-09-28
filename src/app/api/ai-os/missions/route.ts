import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ai-os/missions
 * List active missions with their assigned agents.
 * Query params: status (default: "active"), limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'active'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0

    const where: Record<string, any> = {}
    if (status && status !== 'all') {
           where.status = status
    }

    const [missions, total] = await Promise.all([
      db.agentMission.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.agentMission.count({ where }),
    ])

    // Parse JSON fields for each mission
    const formatted = missions.map((m) => {
      let goalData: Record<string, any> = {}
      let strategyData: Record<string, any> = {}
      let assignedAgents: string[] = []
      let resultsData: any = null
      let kpiSnapshotData: any = null

      try { goalData = JSON.parse(m.goal) } catch { /* ignore */ }
      try { strategyData = JSON.parse(m.strategy) } catch { /* ignore */ }
      try { assignedAgents = JSON.parse(m.assignedAgents) } catch { /* ignore */ }
      if (m.results) try { resultsData = JSON.parse(m.results) } catch { /* ignore */ }
      if (m.kpiSnapshot) try { kpiSnapshotData = JSON.parse(m.kpiSnapshot) } catch { /* ignore */ }

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        priority: m.priority,
        status: m.status,
        progressPct: m.progressPct,
        currentStep: m.currentStep,
        goal: goalData,
        strategy: strategyData,
        assignedAgents,
        results: resultsData,
        kpiSnapshot: kpiSnapshotData,
        finalOutcome: m.finalOutcome,
        lessonsLearned: m.lessonsLearned,
        createdBy: m.createdBy,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
        deadlineAt: m.deadlineAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    })

    return NextResponse.json({
      missions: formatted,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[ai-os/missions] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/ai-os/missions
 * Create a new mission.
 * Body: { title, description, goal, priority, status, strategy, createdBy, assignedAgents, deadlineAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      goal,
      priority = 5,
      status = 'active',
      strategy,
      createdBy,
      assignedAgents,
      deadlineAt,
    } = body as {
      title: string
      description: string
      goal: Record<string, any>
      priority?: number
      status?: string
      strategy?: Record<string, any>
      createdBy: string
      assignedAgents: string[]
      deadlineAt?: string
    }

    if (!title || !description || !goal || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, goal, createdBy' },
        { status: 400 },
      )
    }

    const mission = await db.agentMission.create({
      data: {
        title,
        description,
        goal: JSON.stringify(goal),
        priority,
        status,
        strategy: JSON.stringify(strategy ?? { steps: [], collaborationMode: 'sequential' }),
        createdBy,
        assignedAgents: JSON.stringify(assignedAgents ?? []),
        startedAt: status === 'active' ? new Date() : null,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
      },
    })

    return NextResponse.json({ success: true, mission }, { status: 201 })
  } catch (error) {
    console.error('[ai-os/missions] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to create mission' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/ai-os/missions
 * Update a mission's progress, status, or other fields.
 * Body: { id, progressPct?, status?, currentStep?, results?, finalOutcome?, lessonsLearned? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body as {
      id: string
      progressPct?: number
      status?: string
      currentStep?: number
      results?: any
      finalOutcome?: string
      lessonsLearned?: any
      deadlineAt?: string
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 },
      )
    }

    const existing = await db.agentMission.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 },
      )
    }

    const data: Record<string, any> = {}
    if (updates.progressPct !== undefined) data.progressPct = updates.progressPct
    if (updates.status !== undefined) {
      data.status = updates.status
      // Auto-set completion timestamps
      if (updates.status === 'completed') data.completedAt = new Date()
      if (updates.status === 'active' && !existing.startedAt) data.startedAt = new Date()
    }
    if (updates.currentStep !== undefined) data.currentStep = updates.currentStep
    if (updates.results !== undefined) data.results = JSON.stringify(updates.results)
    if (updates.finalOutcome !== undefined) data.finalOutcome = updates.finalOutcome
    if (updates.lessonsLearned !== undefined) data.lessonsLearned = JSON.stringify(updates.lessonsLearned)
    if (updates.deadlineAt !== undefined) data.deadlineAt = new Date(updates.deadlineAt)

    const mission = await db.agentMission.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, mission })
  } catch (error) {
    console.error('[ai-os/missions] PATCH failed:', error)
    return NextResponse.json(
      { error: 'Failed to update mission' },
      { status: 500 },
    )
  }
}
