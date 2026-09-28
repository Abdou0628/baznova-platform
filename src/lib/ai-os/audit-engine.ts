// =============================================================================
// HireNova AI Operating System — Audit Engine
// Immutable audit trail for all agent actions, tool calls, and policy decisions
// =============================================================================

'use server'

import { db } from '@/lib/db'
import type { AgentAuditLog } from '@prisma/client'

// --- Types ---

/** Shape of data required to create an audit log entry */
export interface AuditEntry {
  agentId: string
  agentName?: string
  userId?: string
  actionType: string
  actionDetail: any
  riskLevel?: string
  policyResult?: string
  policyReason?: string
  toolName?: string
  toolInput?: any
  toolOutput?: any
  toolDurationMs?: number
  missionId?: string
  taskId?: string
  success?: boolean
  errorMessage?: string
}

/** Parameters for querying audit logs */
interface GetAuditLogsParams {
  agentId?: string
  actionType?: string
  policyResult?: string
  riskLevel?: string
  limit?: number
  offset?: number
}

/** Aggregated audit statistics */
interface AuditStats {
  totalActions: number
  blocked: number
  allowed: number
  escalated: number
  topAgents: Array<{ agentId: string; agentName: string; count: number }>
  recentErrors: number
}

// --- Core ---

/**
 * Log an agent action to the immutable audit trail.
 * All fields are serialized to strings (JSON) where appropriate.
 * This function is designed to never throw — audit failures are logged to console only.
 */
export async function logAudit(entry: AuditEntry): Promise<AgentAuditLog> {
  try {
    return await db.agentAuditLog.create({
      data: {
        agentId: entry.agentId,
        agentName: entry.agentName ?? entry.agentId,
        userId: entry.userId,
        actionType: entry.actionType,
        actionDetail: JSON.stringify(entry.actionDetail),
        riskLevel: entry.riskLevel ?? 'low',
        policyResult: entry.policyResult ?? 'allowed',
        policyReason: entry.policyReason ?? null,
        toolName: entry.toolName ?? null,
        toolInput: entry.toolInput !== undefined ? JSON.stringify(entry.toolInput) : null,
        toolOutput: entry.toolOutput !== undefined ? JSON.stringify(entry.toolOutput) : null,
        toolDurationMs: entry.toolDurationMs ?? null,
        missionId: entry.missionId ?? null,
        taskId: entry.taskId ?? null,
        success: entry.success ?? null,
        errorMessage: entry.errorMessage ?? null,
      },
    })
  } catch (error) {
    // Audit logging must never break the calling flow
    console.error(`[audit-engine] logAudit failed for agent=${entry.agentId}:`, error)
    // Return a minimal in-memory record so callers don't crash
    return {
      id: `err_${Date.now()}`,
      agentId: entry.agentId,
      agentName: entry.agentName ?? entry.agentId,
      userId: entry.userId ?? null,
      sessionId: null,
      actionType: entry.actionType,
      actionDetail: JSON.stringify(entry.actionDetail),
      riskLevel: entry.riskLevel ?? 'low',
      policyResult: entry.policyResult ?? 'allowed',
      policyReason: entry.policyReason ?? null,
      toolName: entry.toolName ?? null,
      toolInput: entry.toolInput !== undefined ? JSON.stringify(entry.toolInput) : null,
      toolOutput: entry.toolOutput !== undefined ? JSON.stringify(entry.toolOutput) : null,
      toolDurationMs: entry.toolDurationMs ?? null,
      missionId: entry.missionId ?? null,
      taskId: entry.taskId ?? null,
      success: entry.success ?? null,
      errorMessage: entry.errorMessage ?? null,
      createdAt: new Date(),
    }
  }
}

/**
 * Query audit logs with optional filters and pagination.
 * Returns both the paginated log entries and the total count.
 */
export async function getAuditLogs(
  params: GetAuditLogsParams,
): Promise<{ logs: AgentAuditLog[]; total: number }> {
  try {
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0

    const where: Record<string, any> = {}

    if (params.agentId) where.agentId = params.agentId
    if (params.actionType) where.actionType = params.actionType
    if (params.policyResult) where.policyResult = params.policyResult
    if (params.riskLevel) where.riskLevel = params.riskLevel

    const [logs, total] = await Promise.all([
      db.agentAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.agentAuditLog.count({ where }),
    ])

    return { logs, total }
  } catch (error) {
    console.error('[audit-engine] getAuditLogs failed:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * Get aggregated audit statistics for the entire system.
 * Includes totals by policy result, top agents by action count, and recent error count.
 */
export async function getAuditStats(): Promise<AuditStats> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const [totalActions, blocked, allowed, escalated, recentErrors] =
      await Promise.all([
        db.agentAuditLog.count(),
        db.agentAuditLog.count({ where: { policyResult: 'blocked' } }),
        db.agentAuditLog.count({ where: { policyResult: 'allowed' } }),
        db.agentAuditLog.count({ where: { policyResult: 'escalated' } }),
        db.agentAuditLog.count({
          where: {
            success: false,
            createdAt: { gte: oneHourAgo },
          },
        }),
      ])

    // Top 10 agents by action count
    const topAgentsRaw = await db.agentAuditLog.groupBy({
      by: ['agentId', 'agentName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const topAgents = topAgentsRaw.map((row) => ({
      agentId: row.agentId,
      agentName: row.agentName,
      count: row._count.id,
    }))

    return { totalActions, blocked, allowed, escalated, topAgents, recentErrors }
  } catch (error) {
    console.error('[audit-engine] getAuditStats failed:', error)
    return {
      totalActions: 0,
      blocked: 0,
      allowed: 0,
      escalated: 0,
      topAgents: [],
      recentErrors: 0,
    }
  }
}

/**
 * Get the most recent action history for a specific agent.
 * Returns entries ordered by most recent first.
 */
export async function getAgentActionHistory(
  agentId: string,
  limit: number = 20,
): Promise<AgentAuditLog[]> {
  try {
    return db.agentAuditLog.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  } catch (error) {
    console.error(
      `[audit-engine] getAgentActionHistory failed for agent=${agentId}:`,
      error,
    )
    return []
  }
}
