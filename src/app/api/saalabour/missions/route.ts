import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AGENTS } from '@/lib/agent-registry'

// Helper: build agent name lookup from registry
function getAgentName(agentId: string): string {
  const agent = AGENTS.find((a) => a.id === agentId)
  return agent ? agent.name : `Agent ${agentId}`
}

// -----------------------------------------------------------------------------
// GET — List missions for authenticated user
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    const where: Record<string, unknown> = { userId: session.user.id }
    if (status) {
      where.status = status
    }

    const [missions, total] = await Promise.all([
      db.agentMission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { steps: { orderBy: { order: 'asc' } } },
      }),
      db.agentMission.count({ where }),
    ])

    // Parse agentChain from JSON string for each mission
    const parsed = missions.map((m) => ({
      ...m,
      agentChain: JSON.parse(m.agentChain),
    }))

    return NextResponse.json({
      missions: parsed,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[SaaLabour] Erreur GET /missions:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des missions' },
      { status: 500 },
    )
  }
}

// -----------------------------------------------------------------------------
// POST — Create a new mission
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { type, title, description, objective, parameters, agentChain, priority } = body

    if (!type || !title || !objective || !agentChain || !Array.isArray(agentChain)) {
      return NextResponse.json(
        { error: 'Champs requis manquants: type, title, objective, agentChain' },
        { status: 400 },
      )
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent']
    const missionPriority = validPriorities.includes(priority) ? priority : 'normal'

    const totalSteps = agentChain.length

    // Build MissionStep records from the agent chain
    const stepData = agentChain.map((step: { agentId: string; action: string; input?: unknown }, idx: number) => ({
      order: idx + 1,
      agentId: step.agentId,
      agentName: getAgentName(step.agentId),
      action: step.action,
      input: step.input ? JSON.stringify(step.input) : null,
    }))

    const mission = await db.agentMission.create({
      data: {
        userId: session.user.id,
        type,
        title,
        description: description || '',
        objective,
        parameters: parameters ? JSON.stringify(parameters) : null,
        agentChain: JSON.stringify(agentChain),
        priority: missionPriority,
        status: 'queued',
        totalSteps,
        steps: { create: stepData },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(
      {
        message: 'Mission créée avec succès',
        mission: {
          ...mission,
          agentChain: JSON.parse(mission.agentChain),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[SaaLabour] Erreur POST /missions:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la mission' },
      { status: 500 },
    )
  }
}

// -----------------------------------------------------------------------------
// PATCH — Update mission progress
// -----------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { id, status, completedSteps, progressPct, currentStep, resultSummary, error } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de mission requis' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.agentMission.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (status) updateData.status = status
    if (completedSteps !== undefined) updateData.completedSteps = completedSteps
    if (progressPct !== undefined) updateData.progressPct = progressPct
    if (currentStep !== undefined) updateData.currentStep = currentStep
    if (resultSummary) updateData.resultSummary = typeof resultSummary === 'string' ? resultSummary : JSON.stringify(resultSummary)
    if (error) updateData.error = error

    // Auto-set timestamps based on status transitions
    if (status === 'running' && !existing.startedAt) {
      updateData.startedAt = new Date()
    }
    if (status === 'completed') {
      updateData.completedAt = new Date()
      updateData.progressPct = 100
      if (completedSteps === undefined) updateData.completedSteps = existing.totalSteps
    }
    if (status === 'failed' && error) {
      updateData.completedAt = new Date()
    }

    const updated = await db.agentMission.update({
      where: { id },
      data: updateData,
      include: { steps: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({
      message: 'Mission mise à jour',
      mission: {
        ...updated,
        agentChain: JSON.parse(updated.agentChain),
      },
    })
  } catch (error) {
    console.error('[SaaLabour] Erreur PATCH /missions:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de la mission' },
      { status: 500 },
    )
  }
}

// -----------------------------------------------------------------------------
// DELETE — Cancel a mission
// -----------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de mission requis' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.agentMission.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 })
    }

    if (existing.status === 'completed') {
      return NextResponse.json(
        { error: 'Impossible d\'annuler une mission terminée' },
        { status: 400 },
      )
    }

    const cancelled = await db.agentMission.update({
      where: { id },
      data: { status: 'cancelled', completedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Mission annulée',
      mission: {
        ...cancelled,
        agentChain: JSON.parse(cancelled.agentChain),
      },
    })
  } catch (error) {
    console.error('[SaaLabour] Erreur DELETE /missions:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation de la mission' },
      { status: 500 },
    )
  }
}
