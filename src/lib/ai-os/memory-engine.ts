// =============================================================================
// BazNova AI Operating System — Memory Engine
// Manages AgentMemory CRUD, specialized memory stores, and learning loop
// =============================================================================

'use server'

import { db } from '@/lib/db'
import type { AgentMemory, AgentLearningLog } from '@prisma/client'

// --- Types ---

/** Valid memory types for classification */
export type MemoryType =
  | 'short_term'
  | 'long_term'
  | 'business'
  | 'user_profile'
  | 'agent_experience'
  | 'system_health'

/** Parameters for storing a new memory */
interface StoreMemoryParams {
  agentId: string
  userId?: string
  type: string
  category: string
  key: string
  data: any
  confidence?: number
  expiresAt?: Date
}

/** Parameters for recalling / querying memories */
interface RecallMemoriesParams {
  agentId?: string
  userId?: string
  type?: string
  category?: string
  key?: string
  minConfidence?: number
  limit?: number
}

/** Parameters for recording a learning outcome */
interface RecordOutcomeParams {
  agentId: string
  userId?: string
  actionType: string
  context: any
  outcome: string
  feedback?: string
  metricsBefore?: any
  metricsAfter?: any
}

/** Aggregated learning statistics for an agent */
interface AgentLearningStats {
  total: number
  positive: number
  negative: number
  accuracy: number
}

// --- Core CRUD ---

/**
 * Store a new memory record for an agent.
 * Handles JSON serialization of data, clamps confidence to [0, 1],
 * and increments usage count for matching existing keys.
 */
export async function storeMemory(params: StoreMemoryParams): Promise<AgentMemory> {
  try {
    const confidence = Math.max(0, Math.min(1, params.confidence ?? 0.5))

    // Check if a similar memory already exists (same agent + key) and bump its usage
    const existing = await db.agentMemory.findFirst({
      where: { agentId: params.agentId, key: params.key },
    })

    if (existing) {
      return db.agentMemory.update({
        where: { id: existing.id },
        data: {
          type: params.type,
          category: params.category,
          data: JSON.stringify(params.data),
          confidence,
          usageCount: existing.usageCount + 1,
          lastUsedAt: new Date(),
          expiresAt: params.expiresAt ?? existing.expiresAt,
        },
      })
    }

    return db.agentMemory.create({
      data: {
        agentId: params.agentId,
        userId: params.userId,
        type: params.type,
        category: params.category,
        key: params.key,
        data: JSON.stringify(params.data),
        confidence,
        usageCount: 1,
        lastUsedAt: new Date(),
        expiresAt: params.expiresAt,
      },
    })
  } catch (error) {
    console.error(`[memory-engine] storeMemory failed for agent=${params.agentId} key=${params.key}:`, error)
    throw error
  }
}

/**
 * Recall memories matching the given filters.
 * Returns non-expired memories ordered by confidence descending, then by lastUsedAt.
 */
export async function recallMemories(params: RecallMemoriesParams): Promise<AgentMemory[]> {
  try {
    const now = new Date()
    const limit = params.limit ?? 20

    const where: Record<string, any> = {
      AND: [
        // Only non-expired memories
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    }

    if (params.agentId) where.agentId = params.agentId
    if (params.userId) where.userId = params.userId
    if (params.type) where.type = params.type
    if (params.category) where.category = params.category
    if (params.key) where.key = { contains: params.key }
    if (params.minConfidence !== undefined) {
      where.confidence = { gte: params.minConfidence }
    }

    const memories = await db.agentMemory.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { lastUsedAt: 'desc' },
      ],
      take: limit,
    })

    // Bump usageCount and lastUsedAt for recalled memories (fire-and-forget)
    if (memories.length > 0) {
      db.agentMemory.updateMany({
        where: { id: { in: memories.map((m) => m.id) } },
        data: { usageCount: { increment: 1 }, lastUsedAt: now },
      }).catch(() => {/* non-critical */})
    }

    return memories
  } catch (error) {
    console.error('[memory-engine] recallMemories failed:', error)
    return []
  }
}

/**
 * Delete (forget) a single memory by ID.
 * @returns true if the memory was found and deleted, false otherwise.
 */
export async function forgetMemory(id: string): Promise<boolean> {
  try {
    const memory = await db.agentMemory.findUnique({ where: { id } })
    if (!memory) return false

    await db.agentMemory.delete({ where: { id } })
    return true
  } catch (error) {
    console.error(`[memory-engine] forgetMemory failed for id=${id}:`, error)
    return false
  }
}

/**
 * Reinforce a memory based on a positive or negative outcome.
 * - Positive outcome: confidence increases (capped at 1.0)
 * - Negative outcome: confidence decreases (floored at 0.05, never zeroed)
 * @returns the updated memory, or null if not found.
 */
export async function reinforceMemory(
  id: string,
  positiveOutcome: boolean,
): Promise<AgentMemory | null> {
  try {
    const memory = await db.agentMemory.findUnique({ where: { id } })
    if (!memory) return null

    const delta = positiveOutcome ? 0.1 : -0.15
    const newConfidence = Math.max(0.05, Math.min(1.0, memory.confidence + delta))

    return db.agentMemory.update({
      where: { id },
      data: {
        confidence: newConfidence,
        usageCount: memory.usageCount + 1,
        lastUsedAt: new Date(),
      },
    })
  } catch (error) {
    console.error(`[memory-engine] reinforceMemory failed for id=${id}:`, error)
    return null
  }
}

// --- Specialized Memory Functions ---

/**
 * Store a business-level memory (system-wide, not tied to a specific agent or user).
 * Useful for market trends, pricing rules, company policies, etc.
 */
export async function storeBusinessMemory(
  key: string,
  data: any,
): Promise<AgentMemory> {
  return storeMemory({
    agentId: 'system',
    type: 'business',
    category: 'business',
    key,
    data,
    confidence: 0.9,
  })
}

/**
 * Store a user preference or profile memory.
 * Tied to a specific user for personalization across agents.
 */
export async function storeUserPreference(
  userId: string,
  key: string,
  data: any,
): Promise<AgentMemory> {
  return storeMemory({
    agentId: 'system',
    userId,
    type: 'user_profile',
    category: 'general',
    key,
    data,
    confidence: 0.8,
  })
}

/**
 * Store an agent's experience (learned outcome from a task or decision).
 * Helps agents improve future decisions by recalling past experiences.
 */
export async function storeAgentExperience(
  agentId: string,
  key: string,
  outcome: string,
  data: any,
): Promise<AgentMemory> {
  return storeMemory({
    agentId,
    type: 'agent_experience',
    category: 'general',
    key: `${key}:${outcome}`,
    data,
    confidence: outcome === 'positive' ? 0.7 : 0.4,
  })
}

/**
 * Store a system health metric (latency, error rates, uptime, etc.).
 * These are system-level memories for monitoring and self-healing.
 */
export async function storeHealthMetric(
  key: string,
  data: any,
): Promise<AgentMemory> {
  return storeMemory({
    agentId: 'system',
    type: 'system_health',
    category: 'system',
    key,
    data,
    confidence: 1.0,
    // Health metrics expire after 7 days to avoid stale data
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
}

// --- Learning Loop ---

/**
 * Record an action outcome for the agent learning loop.
 * Creates an AgentLearningLog entry and optionally reinforces related memories.
 */
export async function recordOutcome(
  params: RecordOutcomeParams,
): Promise<AgentLearningLog> {
  try {
    const isPositive = params.outcome === 'positive'
    const isNegative = params.outcome === 'negative'

    const log = await db.agentLearningLog.create({
      data: {
        agentId: params.agentId,
        userId: params.userId,
        actionType: params.actionType,
        context: JSON.stringify(params.context),
        outcome: params.outcome,
        feedback: params.feedback,
        metricsBefore: params.metricsBefore
          ? JSON.stringify(params.metricsBefore)
          : null,
        metricsAfter: params.metricsAfter
          ? JSON.stringify(params.metricsAfter)
          : null,
      },
    })

    // Auto-reinforce the most recent memory for this agent (fire-and-forget)
    if (isPositive || isNegative) {
      db.agentMemory
        .findFirst({
          where: { agentId: params.agentId },
          orderBy: { createdAt: 'desc' },
        })
        .then((latestMemory) => {
          if (latestMemory) {
            reinforceMemory(latestMemory.id, isPositive).catch(() => {/* non-critical */})
          }
        })
        .catch(() => {/* non-critical */})
    }

    return log
  } catch (error) {
    console.error(`[memory-engine] recordOutcome failed for agent=${params.agentId}:`, error)
    throw error
  }
}

/**
 * Get aggregated learning statistics for a specific agent.
 * Returns total outcomes, positive/negative counts, and accuracy percentage.
 */
export async function getAgentLearningStats(
  agentId: string,
): Promise<AgentLearningStats> {
  try {
    const [total, positive, negative] = await Promise.all([
      db.agentLearningLog.count({ where: { agentId } }),
      db.agentLearningLog.count({ where: { agentId, outcome: 'positive' } }),
      db.agentLearningLog.count({ where: { agentId, outcome: 'negative' } }),
    ])

    const accuracy = total > 0 ? Math.round((positive / total) * 100) / 100 : 0

    return { total, positive, negative, accuracy }
  } catch (error) {
    console.error(`[memory-engine] getAgentLearningStats failed for agent=${agentId}:`, error)
    return { total: 0, positive: 0, negative: 0, accuracy: 0 }
  }
}
