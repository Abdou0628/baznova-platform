// =============================================================================
// BazNova AI Operating System — Policy Engine
// Permission checks, risk assessment, and agent policy management
// =============================================================================

'use server'

import { db } from '@/lib/db'
import type { AgentPolicy } from '@prisma/client'

// --- Types ---

/** Risk level classification for actions */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** Result of a policy permission check */
export type PolicyResult = 'allowed' | 'blocked' | 'approved' | 'escalated'

/** Input parameters for a policy check */
export interface PolicyCheckInput {
  agentId: string
  actionType: string // tool_call | decision | write | delete | financial
  toolName?: string
  riskLevel?: RiskLevel
  context?: any
}

/** Output of a policy check */
export interface PolicyCheckOutput {
  result: PolicyResult
  reason: string
  riskScore: number // 0-100
  requireHumanApproval: boolean
}

/** Agent policy definition used during seeding */
interface AgentPolicySeed {
  agentId: string
  agentName: string
  tier: string
  riskLevel: string
  maxRiskScore: number
  permissions: Record<string, string[]>
  requireApprovalFor: string[]
  monthlyBudgetCents: number
}

// --- Constants ---

/** Base risk scores for different action types */
const ACTION_RISK_SCORES: Record<string, number> = {
  tool_call: 20,
  decision: 15,
  write: 30,
  delete: 60,
  financial: 85,
}

/** Risk score modifiers for high-risk tool categories */
const TOOL_RISK_MODIFIERS: Record<string, number> = {
  llm_chat: 10,
  tts_generate: 5,
  cv_analyze: 5,
  email_send: 25,
  payment_process: 50,
  user_delete: 60,
  data_export: 20,
}

/**
 * Default policy seeds for all 20 agents (19 specialized + CTO Principal).
 * Grouped by tier with appropriate permissions and risk thresholds.
 */
const AGENT_POLICY_SEEDS: AgentPolicySeed[] = [
  // ─── PRINCIPAL ───────────────────────────────────────────────────────
  {
    agentId: 'cto-principal',
    agentName: 'CTO Principal',
    tier: 'principal',
    riskLevel: 'high',
    maxRiskScore: 80,
    permissions: {
      read: ['users', 'stats', 'agents', 'missions', 'policies', 'audit_logs', 'finances', 'system'],
      write: ['cv', 'cover_letter', 'mission', 'task', 'policy', 'agent_config', 'system_config'],
      execute: ['tts', 'llm', 'email', 'payment', 'analytics', 'webhook'],
      delete: ['memory', 'log', 'draft'],
    },
    requireApprovalFor: ['delete', 'financial'],
    monthlyBudgetCents: 500000, // $5,000
  },

  // ─── SPECIALIZED — Candidate Layer (risk=medium, maxRiskScore=50) ──────
  {
    agentId: 'cv',
    agentName: 'Agent CV',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'templates'],
      write: ['cv', 'cover_letter'],
      execute: ['tts', 'llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'ats',
    agentName: 'Agent ATS',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'job_descriptions'],
      write: ['cv', 'ats_report'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'interview',
    agentName: 'Agent Interview',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'interviews'],
      write: ['interview', 'feedback'],
      execute: ['tts', 'llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 150000,
  },
  {
    agentId: 'linkedin',
    agentName: 'Agent LinkedIn',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'linkedin_profiles'],
      write: ['linkedin_profile', 'post'],
      execute: ['llm'],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'career',
    agentName: 'Agent Career',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'market_data'],
      write: ['career_plan', 'suggestion'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'coach',
    agentName: 'Agent Coach',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 50,
    permissions: {
      read: ['users', 'cv', 'interviews', 'progress'],
      write: ['coaching_session', 'feedback'],
      execute: ['tts', 'llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 150000,
  },

  // ─── SPECIALIZED — Employment Layer (risk=medium, maxRiskScore=40) ─────
  {
    agentId: 'formation',
    agentName: 'Agent Formation',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'formations', 'courses'],
      write: ['formation', 'enrollment'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'mobility',
    agentName: 'Agent Mobility',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'jobs', 'countries', 'visas'],
      write: ['mobility_report', 'suggestion'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'jobs',
    agentName: 'Agent Jobs',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'jobs', 'companies'],
      write: ['job_alert', 'application'],
      execute: ['llm'],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'recruiter',
    agentName: 'Agent Recruiter',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'cv', 'jobs', 'companies', 'matches'],
      write: ['match', 'recruitment_pipeline'],
      execute: ['llm', 'email'],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 150000,
  },
  {
    agentId: 'freelance',
    agentName: 'Agent Freelance',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'freelance_projects', 'contracts'],
      write: ['proposal', 'contract'],
      execute: ['llm'],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'global',
    agentName: 'Agent Global',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'jobs', 'countries', 'market_data'],
      write: ['global_report', 'suggestion'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },
  {
    agentId: 'intelligence',
    agentName: 'Agent Intelligence',
    tier: 'specialized',
    riskLevel: 'medium',
    maxRiskScore: 40,
    permissions: {
      read: ['users', 'stats', 'market_data', 'trends'],
      write: ['intelligence_report', 'alert'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 100000,
  },

  // ─── SUPPORT — Platform Layer (risk=low, maxRiskScore=30) ──────────────
  {
    agentId: 'api',
    agentName: 'Agent API',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['api_keys', 'usage_stats'],
      write: ['api_key'],
      execute: [],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 50000,
  },
  {
    agentId: 'chatbot',
    agentName: 'Agent Chatbot',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'conversations'],
      write: ['conversation'],
      execute: ['tts', 'llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 200000,
  },
  {
    agentId: 'campus',
    agentName: 'Agent Campus',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'campus_resources', 'events'],
      write: ['event', 'resource'],
      execute: ['llm'],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 80000,
  },
  {
    agentId: 'marketplace',
    agentName: 'Agent Community',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'marketplace_listings'],
      write: ['listing', 'review'],
      execute: [],
    },
    requireApprovalFor: [],
    monthlyBudgetCents: 50000,
  },
  {
    agentId: 'whiteLabel',
    agentName: 'Agent White Label',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'white_label_configs'],
      write: ['white_label_config'],
      execute: [],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 50000,
  },
  {
    agentId: 'legal',
    agentName: 'Agent Legal',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'legal_documents', 'contracts'],
      write: ['legal_document', 'compliance_report'],
      execute: ['llm'],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 80000,
  },
  {
    agentId: 'payment',
    agentName: 'Agent Paiement',
    tier: 'support',
    riskLevel: 'low',
    maxRiskScore: 30,
    permissions: {
      read: ['users', 'transactions', 'invoices'],
      write: ['invoice', 'refund_request'],
      execute: [],
    },
    requireApprovalFor: ['write'],
    monthlyBudgetCents: 50000,
  },
]

// --- Core ---

/**
 * Check if an agent is allowed to perform a given action.
 * Combines risk assessment with the agent's policy to produce a decision.
 */
export async function checkPermission(
  input: PolicyCheckInput,
): Promise<PolicyCheckOutput> {
  try {
    const policy = await getAgentPolicy(input.agentId)

    // If no policy exists, block by default
    if (!policy || !policy.isActive) {
      return {
        result: 'blocked',
        reason: policy ? 'Agent policy is inactive' : 'No policy found for agent',
        riskScore: 100,
        requireHumanApproval: true,
      }
    }

    // Check budget
    const budgetExhausted = policy.currentSpendCents >= policy.monthlyBudgetCents
    if (budgetExhausted && input.actionType === 'tool_call') {
      return {
        result: 'blocked',
        reason: 'Monthly AI budget exhausted',
        riskScore: 0,
        requireHumanApproval: true,
      }
    }

    // Assess risk for this action
    const risk = await assessRisk(input.agentId, input.actionType, input.toolName)

    // Parse permissions and approval requirements from policy
    let permissions: Record<string, string[]> = {}
    let requireApprovalFor: string[] = []
    try {
      permissions = JSON.parse(policy.permissions)
    } catch { /* malformed JSON — treat as empty */ }
    try {
      requireApprovalFor = JSON.parse(policy.requireApprovalFor)
    } catch { /* malformed JSON — treat as empty */ }

    // Check if the action type needs human approval
    const needsApproval = requireApprovalFor.includes(input.actionType)

    // Determine if action exceeds agent's risk tolerance
    const exceedsRisk = risk.score > policy.maxRiskScore

    // Build result
    let result: PolicyResult = 'allowed'
    let reason = 'Action within policy limits'
    let requireHumanApproval = false

    if (exceedsRisk && needsApproval) {
      // Exceeds risk AND needs approval → escalate to human
      result = 'escalated'
      reason = `Risk score ${risk.score} exceeds max ${policy.maxRiskScore} and action '${input.actionType}' requires approval`
      requireHumanApproval = true
    } else if (exceedsRisk) {
      // Exceeds risk but not in approval list → block
      result = 'blocked'
      reason = `Risk score ${risk.score} exceeds agent max ${policy.maxRiskScore}`
    } else if (needsApproval) {
      // Within risk but needs approval → approved (pending human review)
      result = 'approved'
      reason = `Action '${input.actionType}' requires human approval per policy`
      requireHumanApproval = true
    } else if (risk.level === 'critical') {
      // Critical risk always escalates regardless of policy
      result = 'escalated'
      reason = 'Critical risk action — always requires human review'
      requireHumanApproval = true
    }

    return {
      result,
      reason,
      riskScore: risk.score,
      requireHumanApproval,
    }
  } catch (error) {
    console.error(`[policy-engine] checkPermission failed for agent=${input.agentId}:`, error)
    return {
      result: 'blocked',
      reason: 'Internal policy engine error',
      riskScore: 100,
      requireHumanApproval: true,
    }
  }
}

/**
 * Assess the risk level and score for an agent performing an action.
 * Combines base action risk, tool modifiers, and agent history.
 */
export async function assessRisk(
  agentId: string,
  actionType: string,
  toolName?: string,
): Promise<{ level: RiskLevel; score: number }> {
  // Base score from action type
  let score = ACTION_RISK_SCORES[actionType] ?? 30

  // Add tool-specific modifier
  if (toolName) {
    score += TOOL_RISK_MODIFIERS[toolName] ?? 0
  }

  // Check agent's recent error rate to bump risk
  try {
    const recentErrors = await db.agentAuditLog.count({
      where: {
        agentId,
        success: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
      },
    })
    // Each recent error adds 5 points (max +20)
    score += Math.min(20, recentErrors * 5)
  } catch { /* non-critical — proceed with base score */ }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  // Determine risk level from score
  let level: RiskLevel = 'low'
  if (score >= 75) level = 'critical'
  else if (score >= 50) level = 'high'
  else if (score >= 25) level = 'medium'

  return { level, score }
}

// --- Agent Policy Management ---

/**
 * Seed AgentPolicy records for all 20 agents (19 specialized + CTO Principal).
 * Uses upsert so it is safe to call multiple times.
 * @returns The number of policies created or updated.
 */
export async function initializeAgentPolicies(): Promise<number> {
  try {
    let count = 0

    for (const seed of AGENT_POLICY_SEEDS) {
      await db.agentPolicy.upsert({
        where: { agentId: seed.agentId },
        update: {
          agentName: seed.agentName,
          tier: seed.tier,
          riskLevel: seed.riskLevel,
          maxRiskScore: seed.maxRiskScore,
          permissions: JSON.stringify(seed.permissions),
          requireApprovalFor: JSON.stringify(seed.requireApprovalFor),
          supervisedBy: seed.tier === 'support' ? 'cto-principal' : null,
        },
        create: {
          agentId: seed.agentId,
          agentName: seed.agentName,
          tier: seed.tier,
          riskLevel: seed.riskLevel,
          maxRiskScore: seed.maxRiskScore,
          permissions: JSON.stringify(seed.permissions),
          requireApprovalFor: JSON.stringify(seed.requireApprovalFor),
          monthlyBudgetCents: seed.monthlyBudgetCents,
          currentSpendCents: 0,
          isActive: true,
          supervisedBy: seed.tier === 'support' ? 'cto-principal' : null,
        },
      })
      count++
    }

    return count
  } catch (error) {
    console.error('[policy-engine] initializeAgentPolicies failed:', error)
    return 0
  }
}

/**
 * Get the policy record for a specific agent.
 * @returns The AgentPolicy record, or null if not found.
 */
export async function getAgentPolicy(
  agentId: string,
): Promise<AgentPolicy | null> {
  try {
    return db.agentPolicy.findUnique({ where: { agentId } })
  } catch (error) {
    console.error(`[policy-engine] getAgentPolicy failed for agent=${agentId}:`, error)
    return null
  }
}

/**
 * Add to an agent's monthly budget (positive to increase, negative to decrease).
 * Returns the updated policy, or null if the agent has no policy.
 */
export async function updateAgentBudget(
  agentId: string,
  additionalCents: number,
): Promise<AgentPolicy | null> {
  try {
    const policy = await db.agentPolicy.findUnique({ where: { agentId } })
    if (!policy) return null

    const newBudget = Math.max(0, policy.monthlyBudgetCents + additionalCents)

    return db.agentPolicy.update({
      where: { agentId },
      data: { monthlyBudgetCents: newBudget },
    })
  } catch (error) {
    console.error(`[policy-engine] updateAgentBudget failed for agent=${agentId}:`, error)
    return null
  }
}

// --- Tool Gateway Integration ---

/**
 * Check if a specific agent has access to use a specific tool.
 * Combines tool definition's allowed agents with the agent's policy permissions.
 */
export async function checkToolAccess(
  agentId: string,
  toolName: string,
): Promise<{ allowed: boolean; reason: string }> {
  try {
    // Look up the tool definition
    const tool = await db.toolDefinition.findUnique({ where: { name: toolName } })

    if (!tool || !tool.isActive) {
      return { allowed: false, reason: `Tool '${toolName}' not found or inactive` }
    }

    // Check if tool has an allowlist
    let allowedAgents: string[] = []
    try {
      allowedAgents = JSON.parse(tool.allowedAgents)
    } catch { /* empty = all agents allowed */ }

    if (allowedAgents.length > 0 && !allowedAgents.includes(agentId)) {
      return {
        allowed: false,
        reason: `Agent '${agentId}' is not in the allowed list for tool '${toolName}'`,
      }
    }

    // Run full policy check for tool_call action
    const policyCheck = await checkPermission({
      agentId,
      actionType: 'tool_call',
      toolName,
    })

    if (policyCheck.result === 'blocked') {
      return { allowed: false, reason: policyCheck.reason }
    }

    if (policyCheck.requireHumanApproval) {
      return {
        allowed: false,
        reason: `Tool access requires human approval: ${policyCheck.reason}`,
      }
    }

    return { allowed: true, reason: 'Tool access granted' }
  } catch (error) {
    console.error(`[policy-engine] checkToolAccess failed for agent=${agentId} tool=${toolName}:`, error)
    return { allowed: false, reason: 'Internal policy engine error' }
  }
}
