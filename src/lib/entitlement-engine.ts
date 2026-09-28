// ─── HireNova Entitlement Engine ──────────────────────────────────────────
// Single source of truth for what each plan/subscription grants.
// Maps: User Plan → Entitlements → Modules → Features
//
// SERVER-ONLY — do not import in client components.
// ──────────────────────────────────────────────────────────────────────────────

import { getCheapestBundleForModules } from './pricing-engine'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AILevel = 'none' | 'basic' | 'advanced' | 'premium'

export interface PlanEntitlements {
  modules: string[]
  features: string[]
  aiLevel: AILevel
  maxCvPerMonth: number
  maxClPerMonth: number
  maxInterviewsPerMonth: number
  maxAtsAnalysesPerMonth: number
}

export interface MonthlyLimits {
  maxCv: number
  maxCl: number
  maxInterviews: number
  maxAts: number
}

export interface UpgradePath {
  targetPlan: string
  targetBundle: string
  additionalCost: number
}

// ─── Feature Sets (shared constants) ────────────────────────────────────────

const FREE_FEATURES: string[] = [
  'browse_pricing',
  'view_public_jobs',
]

const STARTER_FEATURES: string[] = [
  'cv_generate',
  'ats_analyze',
  'export_pdf',
  'export_word',
  'templates_basic',
]

const CAREER_PLUS_FEATURES: string[] = [
  ...STARTER_FEATURES,
  'jobs_apply',
  'global_jobs',
  'interview_sim',
  'linkedin_optimize',
  'career_roadmap',
  'cover_letter_generate',
]

const PRO_FEATURES: string[] = [
  ...CAREER_PLUS_FEATURES,
  'mobility_analyze',
  'coach_sessions',
  'formation_courses',
  'freelance_missions',
  'ai_intelligence',
]

const AI_POWER_FEATURES: string[] = [
  ...PRO_FEATURES,
  'ai_advanced',
  'ai_chatbot_advanced',
  'ai_priority',
  'job_copilot',
]

// ─── Module Sets (shared constants) ─────────────────────────────────────────

const STARTER_MODULES: string[] = ['mod_cv', 'mod_ats']

const CAREER_PLUS_MODULES: string[] = [
  'mod_cv', 'mod_ats', 'mod_jobs', 'mod_global', 'mod_interview', 'mod_linkedin', 'mod_career',
]

const PRO_MODULES: string[] = [
  'mod_cv', 'mod_ats', 'mod_jobs', 'mod_global', 'mod_mobility',
  'mod_interview', 'mod_linkedin', 'mod_career', 'mod_coach',
  'mod_formation', 'mod_freelance',
]

const AI_POWER_MODULES: string[] = [
  ...PRO_MODULES, 'mod_intelligence',
]

// ─── Plan → Entitlements Matrix ─────────────────────────────────────────────

const PLAN_ENTITLEMENTS: Record<string, PlanEntitlements> = {
  // ── Free ──
  free: {
    modules: [],
    features: FREE_FEATURES,
    aiLevel: 'none',
    maxCvPerMonth: 1,
    maxClPerMonth: 0,
    maxInterviewsPerMonth: 0,
    maxAtsAnalysesPerMonth: 1,
  },

  // ── Starter (legacy name) ──
  starter: {
    modules: STARTER_MODULES,
    features: STARTER_FEATURES,
    aiLevel: 'basic',
    maxCvPerMonth: 10,
    maxClPerMonth: 3,
    maxInterviewsPerMonth: 3,
    maxAtsAnalysesPerMonth: 10,
  },

  // ── HireNova Start (new name for starter) ──
  hirenova_start: {
    modules: STARTER_MODULES,
    features: STARTER_FEATURES,
    aiLevel: 'basic',
    maxCvPerMonth: 10,
    maxClPerMonth: 3,
    maxInterviewsPerMonth: 3,
    maxAtsAnalysesPerMonth: 10,
  },

  // ── Career Plus (legacy name) ──
  career_plus: {
    modules: CAREER_PLUS_MODULES,
    features: CAREER_PLUS_FEATURES,
    aiLevel: 'basic',
    maxCvPerMonth: 50,
    maxClPerMonth: 20,
    maxInterviewsPerMonth: 20,
    maxAtsAnalysesPerMonth: 50,
  },

  // ── HireNova Career (new name for career_plus) ──
  hirenova_career: {
    modules: CAREER_PLUS_MODULES,
    features: CAREER_PLUS_FEATURES,
    aiLevel: 'basic',
    maxCvPerMonth: 50,
    maxClPerMonth: 20,
    maxInterviewsPerMonth: 20,
    maxAtsAnalysesPerMonth: 50,
  },

  // ── Pro (legacy name) ──
  pro: {
    modules: PRO_MODULES,
    features: PRO_FEATURES,
    aiLevel: 'advanced',
    maxCvPerMonth: 200,
    maxClPerMonth: 100,
    maxInterviewsPerMonth: 100,
    maxAtsAnalysesPerMonth: 200,
  },

  // ── HireNova Professional (new name for pro) ──
  hirenova_professional: {
    modules: PRO_MODULES,
    features: PRO_FEATURES,
    aiLevel: 'advanced',
    maxCvPerMonth: 200,
    maxClPerMonth: 100,
    maxInterviewsPerMonth: 100,
    maxAtsAnalysesPerMonth: 200,
  },

  // ── HireNova AI Power (top tier) ──
  hirenova_ai_power: {
    modules: AI_POWER_MODULES,
    features: AI_POWER_FEATURES,
    aiLevel: 'premium',
    maxCvPerMonth: 999,
    maxClPerMonth: 500,
    maxInterviewsPerMonth: 500,
    maxAtsAnalysesPerMonth: 999,
  },
}

// ─── Plan Aliases ────────────────────────────────────────────────────────────
// Maps legacy plan names to their canonical (new) equivalents.

const PLAN_ALIASES: Record<string, string> = {
  starter: 'hirenova_start',
  career_plus: 'hirenova_career',
  pro: 'hirenova_professional',
}

// ─── Action → Feature Mapping ───────────────────────────────────────────────
// Maps high-level actions to the features they require.

const ACTION_FEATURE_MAP: Record<string, string[]> = {
  cv_generate: ['cv_generate'],
  cv_export_pdf: ['export_pdf'],
  cv_export_word: ['export_word'],
  cv_use_template: ['templates_basic'],
  ats_analyze: ['ats_analyze'],
  cover_letter_generate: ['cover_letter_generate'],
  interview_start: ['interview_sim'],
  linkedin_analyze: ['linkedin_optimize'],
  career_roadmap: ['career_roadmap'],
  jobs_apply: ['jobs_apply'],
  global_jobs: ['global_jobs'],
  mobility_analyze: ['mobility_analyze'],
  coach_session: ['coach_sessions'],
  formation_access: ['formation_courses'],
  freelance_browse: ['freelance_missions'],
  ai_intelligence: ['ai_intelligence'],
  ai_advanced: ['ai_advanced'],
  ai_chatbot: ['ai_chatbot_advanced'],
  job_copilot: ['job_copilot'],
}

// ─── All Valid Plan Keys ─────────────────────────────────────────────────────

export const VALID_PLANS = Object.keys(PLAN_ENTITLEMENTS)

// ─── Default Entitlements (for unknown plans) ───────────────────────────────

const DEFAULT_ENTITLEMENTS: PlanEntitlements = {
  modules: [],
  features: FREE_FEATURES,
  aiLevel: 'none',
  maxCvPerMonth: 1,
  maxClPerMonth: 0,
  maxInterviewsPerMonth: 0,
  maxAtsAnalysesPerMonth: 1,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exported Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the full entitlement object for a plan.
 * Falls back to free-tier defaults for unknown/individual-module plans.
 */
export function getEntitlements(plan: string): PlanEntitlements {
  // Direct lookup
  if (PLAN_ENTITLEMENTS[plan]) {
    return { ...PLAN_ENTITLEMENTS[plan] }
  }

  // If the plan is an individual module ID (e.g. 'mod_cv'), grant that module
  if (plan.startsWith('mod_')) {
    return {
      modules: [plan],
      features: ['cv_generate', 'ats_analyze', 'export_pdf', 'export_word', 'templates_basic'],
      aiLevel: 'basic',
      maxCvPerMonth: 10,
      maxClPerMonth: 3,
      maxInterviewsPerMonth: 3,
      maxAtsAnalysesPerMonth: 10,
    }
  }

  // Employer / annual / other non-B2C plans get starter-level access
  if (plan === 'employer' || plan === 'annual') {
    return { ...PLAN_ENTITLEMENTS.hirenova_professional }
  }

  // Fallback: free tier
  return { ...DEFAULT_ENTITLEMENTS }
}

/**
 * Check if a plan grants access to a specific module.
 */
export function hasModuleAccess(plan: string, moduleId: string): boolean {
  const entitlements = getEntitlements(plan)
  return entitlements.modules.includes(moduleId)
}

/**
 * Check if a plan grants access to a specific feature.
 */
export function hasFeatureAccess(plan: string, feature: string): boolean {
  const entitlements = getEntitlements(plan)
  return entitlements.features.includes(feature)
}

/**
 * Returns the list of all module IDs accessible to a plan.
 */
export function getAccessibleModules(plan: string): string[] {
  return getEntitlements(plan).modules
}

/**
 * Returns the module IDs from `requiredModules` that the user's plan does NOT grant.
 */
export function getMissingModules(plan: string, requiredModules: string[]): string[] {
  const accessible = getAccessibleModules(plan)
  return requiredModules.filter(m => !accessible.includes(m))
}

/**
 * Finds the cheapest B2C bundle that grants access to all `requiredModules`.
 * Returns null if the user already has full access or no bundle covers everything.
 */
export function getUpgradePath(
  currentPlan: string,
  requiredModules: string[],
): UpgradePath | null {
  // If nothing is missing, no upgrade needed
  const missing = getMissingModules(currentPlan, requiredModules)
  if (missing.length === 0) return null

  // Find the cheapest bundle covering ALL required modules
  const bundle = getCheapestBundleForModules(requiredModules)
  if (!bundle) return null

  // Determine the canonical plan name for the target bundle
  const canonicalPlan = PLAN_ALIASES[bundle.id] || bundle.id
  const currentCanonical = PLAN_ALIASES[currentPlan] || currentPlan

  // If the target is the same or lower than current, no upgrade
  const planOrder = ['free', 'hirenova_start', 'hirenova_career', 'hirenova_professional', 'hirenova_ai_power']
  const currentIdx = planOrder.indexOf(currentCanonical)
  const targetIdx = planOrder.indexOf(canonicalPlan)
  if (targetIdx >= 0 && currentIdx >= 0 && targetIdx <= currentIdx) return null

  return {
    targetPlan: canonicalPlan,
    targetBundle: bundle.id,
    additionalCost: bundle.monthlyEur,
  }
}

/**
 * Returns the AI level for a plan.
 */
export function getAILevel(plan: string): AILevel {
  return getEntitlements(plan).aiLevel
}

/**
 * Returns the monthly usage limits for a plan.
 */
export function getMonthlyLimits(plan: string): MonthlyLimits {
  const e = getEntitlements(plan)
  return {
    maxCv: e.maxCvPerMonth,
    maxCl: e.maxClPerMonth,
    maxInterviews: e.maxInterviewsPerMonth,
    maxAts: e.maxAtsAnalysesPerMonth,
  }
}

/**
 * Check if a user can perform a specific action based on their plan.
 * Actions are mapped to required features.
 */
export function canPerformAction(plan: string, action: string): boolean {
  const requiredFeatures = ACTION_FEATURE_MAP[action]
  if (!requiredFeatures) return false
  const entitlements = getEntitlements(plan)
  return requiredFeatures.every(f => entitlements.features.includes(f))
}

/**
 * Returns the canonical (new) plan name for a legacy plan, or the plan itself if already canonical.
 */
export function resolveCanonicalPlan(plan: string): string {
  return PLAN_ALIASES[plan] || plan
}

/**
 * Returns all valid plan keys (both legacy and new).
 */
export function getAllPlans(): string[] {
  return [...VALID_PLANS]
}
