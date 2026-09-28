// =============================================================================
// BazNova AI-OS — Mission Executor
// Runtime that executes agent chains (DAG-based mission execution)
// SERVER-ONLY — do not import in client components
// =============================================================================

import { db } from '@/lib/db'
import { AGENTS } from '@/lib/agent-registry'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MissionStepDef {
  agentId: string
  action: string
  input?: Record<string, unknown>
  dependsOn?: string[]  // step IDs this depends on (for DAG execution)
}

export interface MissionDef {
  title: string
  description: string
  objective: string
  type: string
  steps: MissionStepDef[]
  userId: string
}

export interface StepResult {
  stepIndex: number
  agentId: string
  action: string
  status: 'completed' | 'failed' | 'skipped'
  output?: Record<string, unknown>
  error?: string
  durationMs: number
}

export interface MissionResult {
  missionId: string
  status: 'completed' | 'partial' | 'failed'
  steps: StepResult[]
  totalDurationMs: number
  totalWorkUnits: number
  totalCost: number
}

// ── Agent Action Handlers ────────────────────────────────────────────────────
// Each agent has a set of actions it can execute.
// This is the bridge between the agent registry and actual AI/API calls.

const agentActions: Record<string, Record<string, (input: Record<string, unknown>, userId: string) => Promise<Record<string, unknown>>>> = {
  cv: {
    generate: async (input, userId) => {
      // Delegate to CV generation API
      return { status: 'delegated', message: 'CV generation initiated', input }
    },
    optimize: async (input, userId) => {
      return { status: 'delegated', message: 'CV optimization initiated', input }
    },
  },
  ats: {
    analyze: async (input, userId) => {
      return { status: 'delegated', message: 'ATS analysis initiated', input }
    },
  },
  'cover-letter': {
    generate: async (input, userId) => {
      return { status: 'delegated', message: 'Cover letter generation initiated', input }
    },
  },
  linkedin: {
    optimize: async (input, userId) => {
      return { status: 'delegated', message: 'LinkedIn optimization initiated', input }
    },
  },
  interview: {
    prepare: async (input, userId) => {
      return { status: 'delegated', message: 'Interview preparation initiated', input }
    },
  },
  'career-coach': {
    assess: async (input, userId) => {
      return { status: 'delegated', message: 'Career assessment initiated', input }
    },
  },
  jobs: {
    search: async (input, userId) => {
      return { status: 'delegated', message: 'Job search initiated', input }
    },
  },
  recruiter: {
    source: async (input, userId) => {
      return { status: 'delegated', message: 'Candidate sourcing initiated', input }
    },
  },
  formation: {
    recommend: async (input, userId) => {
      return { status: 'delegated', message: 'Formation recommendation initiated', input }
    },
  },
  chatbot: {
    respond: async (input, userId) => {
      return { status: 'delegated', message: 'Chatbot response initiated', input }
    },
  },
  // CTO Principal — can delegate to any agent
  cto: {
    orchestrate: async (input, userId) => {
      return { status: 'delegated', message: 'CTO orchestration initiated', input }
    },
  },
}

// ── Mission Executor ─────────────────────────────────────────────────────────

/**
 * Create a mission in the database and return its ID.
 */
export async function createMission(def: MissionDef): Promise<string> {
  const agentChain = def.steps.map((s, i) => ({
    order: i,
    agentId: s.agentId,
    action: s.action,
    dependsOn: s.dependsOn,
  }))

  const mission = await db.agentMission.create({
    data: {
      userId: def.userId,
      title: def.title,
      description: def.description,
      objective: def.objective,
      type: def.type,
      status: 'queued',
      agentChain: JSON.stringify(agentChain),
      totalSteps: def.steps.length,
      parameters: JSON.stringify({ steps: def.steps }),
    },
  })

  // Create mission steps
  for (let i = 0; i < def.steps.length; i++) {
    const step = def.steps[i]
    const agentDef = AGENTS.find((a) => a.id === step.agentId)
    await db.missionStep.create({
      data: {
        missionId: mission.id,
        order: i,
        agentId: step.agentId,
        agentName: agentDef?.name || step.agentId,
        action: step.action,
        input: step.input ? JSON.stringify(step.input) : null,
        status: 'pending',
      },
    })
  }

  // Broadcast mission created event
  try {
    await fetch('http://localhost:3005/emit?type=mission_created&agentId=system', { method: 'GET' })
  } catch { /* Agent Bus may not be running */ }

  return mission.id
}

/**
 * Execute a mission: run each step in order, updating progress.
 * Returns the final mission result.
 */
export async function executeMission(missionId: string): Promise<MissionResult> {
  const startTime = Date.now()

  // Fetch mission with steps
  const mission = await db.agentMission.findUnique({
    where: { id: missionId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!mission) throw new Error(`Mission ${missionId} not found`)
  if (mission.status === 'completed') throw new Error(`Mission ${missionId} already completed`)

  // Mark as running
  await db.agentMission.update({
    where: { id: missionId },
    data: { status: 'running', startedAt: new Date() },
  })

  const results: StepResult[] = []
  let totalWorkUnits = 0
  let totalCost = 0

  // Execute steps sequentially (DAG support can be added later)
  for (let i = 0; i < mission.steps.length; i++) {
    const step = mission.steps[i]
    const stepStart = Date.now()

    // Skip if already completed
    if (step.status === 'completed') {
      results.push({
        stepIndex: i,
        agentId: step.agentId,
        action: step.action,
        status: 'skipped',
        durationMs: 0,
      })
      continue
    }

    // Mark step as running
    await db.missionStep.update({
      where: { id: step.id },
      data: { status: 'running', startedAt: new Date() },
    })

    await db.agentMission.update({
      where: { id: missionId },
      data: { currentStep: i },
    })

    try {
      // Find the agent's action handler
      const agentHandler = agentActions[step.agentId]?.[step.action]
      let output: Record<string, unknown>

      if (agentHandler) {
        const input = step.input ? JSON.parse(step.input) : {}
        output = await agentHandler(input, mission.userId)
      } else {
        // No handler — mark as delegated (agent will pick up via task queue)
        output = { status: 'delegated', message: `No handler for ${step.agentId}.${step.action}` }
      }

      const durationMs = Date.now() - stepStart

      // Mark step as completed
      await db.missionStep.update({
        where: { id: step.id },
        data: {
          status: 'completed',
          output: JSON.stringify(output),
          completedAt: new Date(),
          durationMs,
        },
      })

      results.push({
        stepIndex: i,
        agentId: step.agentId,
        action: step.action,
        status: 'completed',
        output,
        durationMs,
      })

      totalWorkUnits += 1
      totalCost += 100 // Base cost: 100 cents per WU (configurable)

      // Broadcast step completion
      try {
        await fetch(`http://localhost:3005/emit?type=step_completed&agentId=${step.agentId}`, { method: 'GET' })
      } catch { /* Agent Bus may not be running */ }
    } catch (err) {
      const durationMs = Date.now() - stepStart
      const errorMsg = err instanceof Error ? err.message : String(err)

      // Mark step as failed
      await db.missionStep.update({
        where: { id: step.id },
        data: {
          status: 'failed',
          error: errorMsg,
          completedAt: new Date(),
          durationMs,
        },
      })

      results.push({
        stepIndex: i,
        agentId: step.agentId,
        action: step.action,
        status: 'failed',
        error: errorMsg,
        durationMs,
      })

      // Continue with next steps (don't abort the entire mission)
    }

    // Update progress
    const completedSteps = results.filter((r) => r.status === 'completed').length
    const progressPct = Math.round((completedSteps / mission.steps.length) * 100)
    await db.agentMission.update({
      where: { id: missionId },
      data: {
        completedSteps,
        progressPct,
      },
    })
  }

  // Determine final status
  const completedCount = results.filter((r) => r.status === 'completed').length
  const failedCount = results.filter((r) => r.status === 'failed').length
  const finalStatus = failedCount === 0 ? 'completed' : completedCount > 0 ? 'partial' : 'failed'

  // Update mission
  await db.agentMission.update({
    where: { id: missionId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      resultSummary: JSON.stringify(results),
      workUnits: totalWorkUnits,
      totalCost,
      completedSteps: completedCount,
      progressPct: finalStatus === 'completed' ? 100 : Math.round((completedCount / mission.steps.length) * 100),
    },
  })

  // Broadcast mission completion
  try {
    await fetch(`http://localhost:3005/emit?type=mission_${finalStatus}&agentId=system`, { method: 'GET' })
  } catch { /* Agent Bus may not be running */ }

  return {
    missionId,
    status: finalStatus,
    steps: results,
    totalDurationMs: Date.now() - startTime,
    totalWorkUnits,
    totalCost,
  }
}

/**
 * Get mission status with step details.
 */
export async function getMissionStatus(missionId: string) {
  return db.agentMission.findUnique({
    where: { id: missionId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
}

/**
 * Cancel a running mission.
 */
export async function cancelMission(missionId: string) {
  // Mark pending/running steps as skipped
  const mission = await db.agentMission.findUnique({
    where: { id: missionId },
    include: { steps: true },
  })

  if (!mission) throw new Error(`Mission ${missionId} not found`)

  for (const step of mission.steps) {
    if (step.status === 'pending' || step.status === 'running') {
      await db.missionStep.update({
        where: { id: step.id },
        data: { status: 'skipped', completedAt: new Date() },
      })
    }
  }

  return db.agentMission.update({
    where: { id: missionId },
    data: { status: 'cancelled', completedAt: new Date() },
  })
}
