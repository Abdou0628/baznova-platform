import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AGENTS } from '@/lib/agent-registry'

// -----------------------------------------------------------------------------
// GET — SaaLabour Workforce Status
// Returns agent availability, mission stats, and utilisation metrics
// -----------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 1. Build workforce from agent registry (all available for now)
    const workforce = AGENTS.map((agent) => ({
      id: agent.id,
      name: agent.name,
      module: agent.module,
      tier: agent.tier,
      category: agent.category,
      icon: agent.icon,
      color: agent.color,
      capabilities: agent.capabilities.map((c) => c.key),
      status: 'available' as const,
      avgResponseTime: agent.avgResponseTime,
    }))

    // 2. Mission statistics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalMissions, activeMissions, completedMissions, failedMissions, monthlyMissions] =
      await Promise.all([
        db.agentMission.count({ where: { userId: session.user.id } }),
        db.agentMission.count({
          where: { userId: session.user.id, status: { in: ['queued', 'running', 'paused'] } },
        }),
        db.agentMission.count({
          where: { userId: session.user.id, status: 'completed' },
        }),
        db.agentMission.count({
          where: { userId: session.user.id, status: 'failed' },
        }),
        db.agentMission.findMany({
          where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
          select: { workUnits: true },
        }),
      ])

    const workUnitsThisMonth = monthlyMissions.reduce((sum, m) => sum + m.workUnits, 0)

    // 3. Agent utilisation — count missions per agent type (from steps)
    const agentUtilisation = await db.missionStep.groupBy({
      by: ['agentId'],
      where: {
        mission: { userId: session.user.id },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const utilisationMap = agentUtilisation.map((u) => ({
      agentId: u.agentId,
      agentName: getAgentName(u.agentId),
      missionCount: u._count.id,
    }))

    return NextResponse.json({
      workforce,
      stats: {
        totalMissions,
        activeMissions,
        completedMissions,
        failedMissions,
        workUnitsThisMonth,
      },
      agentUtilisation: utilisationMap,
    })
  } catch (error) {
    console.error('[SaaLabour] Erreur GET /workforce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération du statut de la force de travail' },
      { status: 500 },
    )
  }
}

// Helper: resolve agent name from registry
function getAgentName(agentId: string): string {
  const agent = AGENTS.find((a) => a.id === agentId)
  return agent ? agent.name : `Agent ${agentId}`
}
