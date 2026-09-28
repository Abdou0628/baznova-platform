// ─── HireNova AI Usage Engine ────────────────────────────────────────────
// Tracks AI consumption per user: quota → consumption → cost → limit → alert.
// In-memory Map with JSON file persistence. Non-blocking writes.
//
// SERVER-ONLY — do not import in client components.
// ──────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getEntitlements, resolveCanonicalPlan } from './entitlement-engine'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIUsageRecord {
  id: string
  userId: string
  module: string      // 'cv', 'ats', 'interview', 'linkedin', 'career', 'coach', 'chatbot', 'cover_letter'
  action: string      // 'generate', 'analyze', 'simulate', 'optimize', 'chat', 'assess', 'session'
  model: string       // 'gpt-4o-mini', 'gpt-4o', 'claude-3-haiku', etc.
  inputTokens: number
  outputTokens: number
  estimatedCostEur: number
  timestamp: Date
}

export interface AIUsageQuota {
  module: string
  monthlyLimit: number   // max actions per month
  usedThisMonth: number
  costThisMonthEur: number
  costLimitEur: number   // hard cost cap
}

export interface UserAIUsage {
  quotas: AIUsageQuota[]
  totalCostEurThisMonth: number
  totalActionsThisMonth: number
  warnings: string[]
}

export interface AIUsageSummary {
  totalActions: number
  totalCostEur: number
  byModule: Record<string, { actions: number; cost: number }>
}

// ─── Cost Model (per 1M tokens, in EUR) ─────────────────────────────────────

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini':      { input: 0.15, output: 0.60 },
  'gpt-4o':           { input: 2.50, output: 10.00 },
  'gpt-4':            { input: 30.00, output: 60.00 },
  'claude-3-haiku':   { input: 0.25, output: 1.25 },
  'claude-3-sonnet':  { input: 3.00, output: 15.00 },
  'claude-3-opus':    { input: 15.00, output: 75.00 },
  'default':          { input: 1.00, output: 3.00 },
}

// ─── Module Quotas by AI Level (actions per month) ──────────────────────────
// Entitlement engine provides maxCvPerMonth, maxClPerMonth, maxInterviewsPerMonth,
// maxAtsAnalysesPerMonth.  LinkedIn, career, coach, chatbot are mapped by AI level.

const MODULE_QUOTAS_BY_AI_LEVEL: Record<string, Record<string, number>> = {
  none:    { linkedin: 0, career: 0, coach: 0, chatbot: 0 },
  basic:   { linkedin: 20, career: 10, coach: 5, chatbot: 20 },
  advanced:{ linkedin: 100, career: 50, coach: 30, chatbot: 100 },
  premium: { linkedin: 500, career: 200, coach: 100, chatbot: 999 },
}

// ─── Hard Cost Caps per Plan (EUR/month) ─────────────────────────────────────
// Prevent runaway costs even within quota. Premium plans get higher caps.

const COST_CAPS: Record<string, number> = {
  free:                  0.50,
  starter:                5.00,
  hirenova_start:         5.00,
  career_plus:           20.00,
  hirenova_career:       20.00,
  pro:                   50.00,
  hirenova_professional: 50.00,
  hirenova_ai_power:    200.00,
  employer:              50.00,
  annual:                50.00,
}

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const usageStore = new Map<string, AIUsageRecord[]>()  // userId → records[]

const PERSISTENCE_PATH = path.join(process.cwd(), 'db', 'ai-usage.json')
let flushScheduled = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL_MS = 5_000  // flush every 5 seconds when dirty

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID()
}

function getCurrentMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
}

function isCurrentMonth(date: Date): boolean {
  const start = getCurrentMonthStart()
  return date >= start
}

function getRecordsForUser(userId: string): AIUsageRecord[] {
  if (!usageStore.has(userId)) {
    usageStore.set(userId, [])
  }
  return usageStore.get(userId)!
}

/**
 * Estimate cost in EUR for a given model/token usage.
 */
export function estimateAICost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['default']
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadFromFile(): void {
  try {
    if (!fs.existsSync(PERSISTENCE_PATH)) return
    const raw = fs.readFileSync(PERSISTENCE_PATH, 'utf-8')
    const data = JSON.parse(raw) as Record<string, unknown[]>
    for (const [userId, records] of Object.entries(data)) {
      const parsed = (records as unknown[]).map((r: unknown) => {
        const rec = r as Record<string, unknown>
        return {
          ...rec,
          timestamp: new Date(rec.timestamp as string),
        } as AIUsageRecord
      })
      usageStore.set(userId, parsed)
    }
  } catch (err) {
    console.error('[AI-Usage] Failed to load from file:', err)
  }
}

function flushToFile(): void {
  try {
    // Only persist current-month records to keep file small
    const serializable: Record<string, unknown[]> = {}
    for (const [userId, records] of usageStore.entries()) {
      const current = records.filter(r => isCurrentMonth(r.timestamp))
      if (current.length > 0) {
        serializable[userId] = current
      }
    }
    fs.writeFileSync(PERSISTENCE_PATH, JSON.stringify(serializable, null, 2), 'utf-8')
  } catch (err) {
    console.error('[AI-Usage] Failed to flush to file:', err)
  }
}

function scheduleFlush(): void {
  if (flushScheduled) return
  flushScheduled = true
  flushTimer = setTimeout(() => {
    flushScheduled = false
    flushTimer = null
    flushToFile()
  }, FLUSH_INTERVAL_MS)
}

// ─── Module → Entitlement Limit Mapping ──────────────────────────────────────

function getMonthlyLimitForModule(plan: string, module: string): number {
  const entitlements = getEntitlements(plan)

  switch (module) {
    case 'cv':
      return entitlements.maxCvPerMonth
    case 'ats':
      return entitlements.maxAtsAnalysesPerMonth
    case 'interview':
      return entitlements.maxInterviewsPerMonth
    case 'cover_letter':
      return entitlements.maxClPerMonth
    case 'linkedin':
    case 'career':
    case 'coach':
    case 'chatbot': {
      const levelQuotas = MODULE_QUOTAS_BY_AI_LEVEL[entitlements.aiLevel] || MODULE_QUOTAS_BY_AI_LEVEL['none']
      return levelQuotas[module] || 0
    }
    default:
      return 0
  }
}

function getCostCapForPlan(plan: string): number {
  const canonical = resolveCanonicalPlan(plan)
  return COST_CAPS[canonical] || COST_CAPS[plan] || 1.00
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Track an AI usage event. Non-blocking — fire and forget.
 * Writes to in-memory Map and schedules a file flush.
 */
export async function trackAIUsage(params: {
  userId: string
  module: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostEur?: number
}): Promise<void> {
  const {
    userId, module, action, model,
    inputTokens, outputTokens,
    estimatedCostEur: providedCost,
  } = params

  const estimatedCostEur = providedCost ?? estimateAICost(model, inputTokens, outputTokens)

  const record: AIUsageRecord = {
    id: generateId(),
    userId,
    module,
    action,
    model,
    inputTokens,
    outputTokens,
    estimatedCostEur,
    timestamp: new Date(),
  }

  const records = getRecordsForUser(userId)
  records.push(record)

  // Schedule non-blocking flush
  scheduleFlush()
}

/**
 * Get a user's AI usage breakdown for the current billing month.
 */
export async function getUserAIUsage(userId: string): Promise<UserAIUsage> {
  const records = getRecordsForUser(userId)
  const currentMonthRecords = records.filter(r => isCurrentMonth(r.timestamp))

  // Group by module
  const moduleActionCounts = new Map<string, number>()
  const moduleCosts = new Map<string, number>()

  for (const r of currentMonthRecords) {
    moduleActionCounts.set(r.module, (moduleActionCounts.get(r.module) || 0) + 1)
    moduleCosts.set(r.module, (moduleCosts.get(r.module) || 0) + r.estimatedCostEur)
  }

  const warnings: string[] = []

  // We don't have the plan here — quotas will be populated by callers who have it
  // Return raw usage per module
  const quotas: AIUsageQuota[] = []
  for (const [mod, count] of moduleActionCounts.entries()) {
    quotas.push({
      module: mod,
      monthlyLimit: 0,   // caller should enrich with plan-based limits
      usedThisMonth: count,
      costThisMonthEur: moduleCosts.get(mod) || 0,
      costLimitEur: 0,   // caller should enrich with plan-based cap
    })
  }

  const totalCostEurThisMonth = currentMonthRecords.reduce((sum, r) => sum + r.estimatedCostEur, 0)
  const totalActionsThisMonth = currentMonthRecords.length

  if (totalActionsThisMonth === 0) {
    warnings.push('No AI usage recorded this month')
  }

  return {
    quotas,
    totalCostEurThisMonth,
    totalActionsThisMonth,
    warnings,
  }
}

/**
 * Get a user's AI usage with plan-enriched quotas.
 */
export async function getUserAIUsageWithPlan(
  userId: string,
  plan: string,
): Promise<UserAIUsage> {
  const baseUsage = await getUserAIUsage(userId)
  const warnings: string[] = [...baseUsage.warnings]
  const costCap = getCostCapForPlan(plan)

  const ALL_MODULES = ['cv', 'ats', 'interview', 'cover_letter', 'linkedin', 'career', 'coach', 'chatbot']

  // Build quota map from actual usage
  const usageMap = new Map<string, AIUsageQuota>()
  for (const q of baseUsage.quotas) {
    usageMap.set(q.module, q)
  }

  // Enrich with plan limits for all modules
  const quotas: AIUsageQuota[] = ALL_MODULES.map(mod => {
    const usage = usageMap.get(mod)
    const monthlyLimit = getMonthlyLimitForModule(plan, mod)
    const usedThisMonth = usage?.usedThisMonth || 0
    const costThisMonthEur = usage?.costThisMonthEur || 0

    // Warnings
    if (monthlyLimit > 0 && usedThisMonth >= monthlyLimit) {
      warnings.push(`Module '${mod}' has reached its monthly limit (${usedThisMonth}/${monthlyLimit})`)
    } else if (monthlyLimit > 0 && usedThisMonth >= monthlyLimit * 0.8) {
      warnings.push(`Module '${mod}' is at ${Math.round((usedThisMonth / monthlyLimit) * 100)}% of monthly limit (${usedThisMonth}/${monthlyLimit})`)
    }

    return {
      module: mod,
      monthlyLimit,
      usedThisMonth,
      costThisMonthEur,
      costLimitEur: costCap,
    }
  })

  // Global cost warning
  if (baseUsage.totalCostEurThisMonth >= costCap * 0.8 && costCap > 0) {
    warnings.push(`Total AI cost this month (€${baseUsage.totalCostEurThisMonth.toFixed(2)}) is approaching the €${costCap.toFixed(2)} cost cap`)
  }
  if (baseUsage.totalCostEurThisMonth >= costCap && costCap > 0) {
    warnings.push(`Total AI cost this month (€${baseUsage.totalCostEurThisMonth.toFixed(2)}) has EXCEEDED the €${costCap.toFixed(2)} cost cap`)
  }

  return {
    quotas,
    totalCostEurThisMonth: baseUsage.totalCostEurThisMonth,
    totalActionsThisMonth: baseUsage.totalActionsThisMonth,
    warnings,
  }
}

/**
 * Check if a user is allowed to perform an AI action based on plan and current usage.
 */
export async function checkAIAccess(
  userId: string,
  module: string,
  plan: string,
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const records = getRecordsForUser(userId)
  const currentMonthRecords = records.filter(r => isCurrentMonth(r.timestamp) && r.module === module)

  const monthlyLimit = getMonthlyLimitForModule(plan, module)
  const usedThisMonth = currentMonthRecords.length
  const remaining = Math.max(0, monthlyLimit - usedThisMonth)

  // Check module-level action quota
  if (usedThisMonth >= monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly ${module} limit reached (${usedThisMonth}/${monthlyLimit}). Upgrade your plan for more.`,
      remaining: 0,
    }
  }

  // Check global cost cap
  const costCap = getCostCapForPlan(plan)
  const totalCostThisMonth = records
    .filter(r => isCurrentMonth(r.timestamp))
    .reduce((sum, r) => sum + r.estimatedCostEur, 0)

  if (totalCostThisMonth >= costCap) {
    return {
      allowed: false,
      reason: `Monthly AI cost cap reached (€${totalCostThisMonth.toFixed(2)}/€${costCap.toFixed(2)}).`,
      remaining,
    }
  }

  return { allowed: true, remaining }
}

/**
 * Get admin analytics summary for AI usage across all users.
 */
export async function getAIUsageSummary(params: {
  startDate: string
  endDate: string
  module?: string
}): Promise<AIUsageSummary> {
  const startDate = new Date(params.startDate)
  const endDate = new Date(params.endDate)
  // Set end date to end of day
  endDate.setHours(23, 59, 59, 999)

  let totalActions = 0
  let totalCostEur = 0
  const byModule: Record<string, { actions: number; cost: number }> = {}

  for (const records of usageStore.values()) {
    for (const r of records) {
      const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp as string)
      if (ts < startDate || ts > endDate) continue
      if (params.module && r.module !== params.module) continue

      totalActions++
      totalCostEur += r.estimatedCostEur

      if (!byModule[r.module]) {
        byModule[r.module] = { actions: 0, cost: 0 }
      }
      byModule[r.module].actions++
      byModule[r.module].cost += r.estimatedCostEur
    }
  }

  return { totalActions, totalCostEur, byModule }
}

/**
 * Get a specific user's detailed records for admin view.
 */
export async function getUserAIUsageDetail(
  userId: string,
  params?: { startDate?: string; endDate?: string; module?: string },
): Promise<AIUsageRecord[]> {
  const records = getRecordsForUser(userId)

  if (!params) return records

  return records.filter(r => {
    const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp as string)
    if (params.startDate && ts < new Date(params.startDate)) return false
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      if (ts > end) return false
    }
    if (params.module && r.module !== params.module) return false
    return true
  })
}

// ─── Initialization ──────────────────────────────────────────────────────────

// Load persisted data on first import
loadFromFile()
