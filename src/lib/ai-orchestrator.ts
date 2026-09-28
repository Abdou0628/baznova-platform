// ─── HireNova AI Orchestrator — Job Copilot Engine ──────────────────────────
// Central orchestration engine for the Job Copilot pipeline.
// Maps user plan entitlements to pipeline steps, computes match scores,
// and determines upgrade paths for blocked features.
//
// SERVER-ONLY — do not import in client components.
// ──────────────────────────────────────────────────────────────────────────────

import { hasModuleAccess, hasFeatureAccess, getUpgradePath, canPerformAction, getEntitlements } from './entitlement-engine'
import { getCheapestBundleForModules } from './pricing-engine'

// ─── Types ──────────────────────────────────────────────────────────────────

export type CopilotStep =
  | 'analyze_offer'
  | 'match_score'
  | 'optimize_cv'
  | 'generate_cover_letter'
  | 'identify_skill_gaps'
  | 'prepare_interview'
  | 'optimize_linkedin'
  | 'career_roadmap'
  | 'track_application'

export interface CopilotStepResult {
  step: CopilotStep
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'blocked'
  module: string
  result?: Record<string, unknown>
  error?: string
}

export interface CopilotPipeline {
  jobId?: string
  jobDescription: string
  jobTitle: string
  company: string
  userId: string
  userPlan: string
  steps: CopilotStepResult[]
  overallScore?: number
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  blockedReason?: string
}

export interface UpgradePathResult {
  neededSteps: CopilotStep[]
  upgradePath: {
    targetPlan: string
    targetBundle: string
    additionalCost: number
  } | null
  cheapestBundleName: string | null
  cheapestBundlePrice: number | null
}

export interface MatchScoreInput {
  atsScore?: number
  skillsMatch?: number
  experienceMatch?: number
  keywordsMatch?: number
  linkedinScore?: number
  interviewPrep?: number
  coverLetter?: number
}

export interface MatchScoreOutput {
  score: number
  breakdown: Record<string, number>
  grade: string
}

// ─── Step → Entitlement Mapping ─────────────────────────────────────────────
// Each copilot step requires specific modules and/or features.

const STEP_REQUIREMENTS: Record<CopilotStep, { modules: string[]; features: string[]; action?: string; label: string; description: string }> = {
  analyze_offer: {
    modules: [],
    features: ['browse_pricing'],
    label: 'Analyse de l\'offre',
    description: 'Analyse IA de l\'offre d\'emploi : compétences requises, culture d\'entreprise, opportunités.',
  },
  match_score: {
    modules: ['mod_ats'],
    features: ['ats_analyze'],
    action: 'ats_analyze',
    label: 'HireNova Match Score\u2122',
    description: 'Score de compatibilité CV↔offre basé sur 7 critères pondérés.',
  },
  optimize_cv: {
    modules: ['mod_cv'],
    features: ['cv_generate'],
    action: 'cv_generate',
    label: 'CV optimisé ATS',
    description: 'Génération d\'un CV optimisé pour l\'offre spécifique.',
  },
  generate_cover_letter: {
    modules: ['mod_career'],
    features: ['cover_letter_generate'],
    action: 'cover_letter_generate',
    label: 'Lettre de motivation',
    description: 'Génération d\'une lettre de motivation adaptée à l\'offre.',
  },
  identify_skill_gaps: {
    modules: ['mod_career'],
    features: ['career_roadmap'],
    action: 'career_roadmap',
    label: 'Compétences manquantes',
    description: 'Identification des compétences à acquérir pour maximiser vos chances.',
  },
  prepare_interview: {
    modules: ['mod_interview'],
    features: ['interview_sim'],
    action: 'interview_start',
    label: 'Préparation entretien',
    description: 'Questions d\'entretien prédites et conseils de préparation.',
  },
  optimize_linkedin: {
    modules: ['mod_linkedin'],
    features: ['linkedin_optimize'],
    action: 'linkedin_analyze',
    label: 'Optimisation LinkedIn',
    description: 'Optimisation de votre profil LinkedIn pour l\'offre.',
  },
  career_roadmap: {
    modules: ['mod_career'],
    features: ['career_roadmap'],
    action: 'career_roadmap',
    label: 'Feuille de route carrière',
    description: 'Plan d\'évolution personnalisé vers ce poste.',
  },
  track_application: {
    modules: ['mod_jobs'],
    features: ['jobs_apply'],
    action: 'jobs_apply',
    label: 'Suivi de candidature',
    description: 'Suivi et gestion de votre candidature.',
  },
}

const ALL_STEPS: CopilotStep[] = [
  'analyze_offer',
  'match_score',
  'optimize_cv',
  'generate_cover_letter',
  'identify_skill_gaps',
  'prepare_interview',
  'optimize_linkedin',
  'career_roadmap',
  'track_application',
]

// ─── Match Score Weights ─────────────────────────────────────────────────────

const MATCH_WEIGHTS: Record<keyof MatchScoreInput, number> = {
  atsScore: 0.25,
  skillsMatch: 0.20,
  experienceMatch: 0.15,
  keywordsMatch: 0.15,
  linkedinScore: 0.10,
  interviewPrep: 0.10,
  coverLetter: 0.05,
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Builds the full Job Copilot pipeline for a given user and job.
 * Checks entitlements and marks inaccessible steps as 'blocked'.
 */
export function buildCopilotPipeline(params: {
  jobDescription: string
  jobTitle: string
  company: string
  userId: string
  userPlan: string
  jobId?: string
}): CopilotPipeline {
  const { jobDescription, jobTitle, company, userId, userPlan, jobId } = params

  const steps: CopilotStepResult[] = ALL_STEPS.map((step) => {
    const req = STEP_REQUIREMENTS[step]
    const accessible = isStepAccessible(userPlan, step)

    return {
      step,
      status: accessible ? 'pending' : 'blocked',
      module: req.modules[0] || 'free',
    }
  })

  const blockedSteps = steps.filter((s) => s.status === 'blocked')
  const isFullyBlocked = blockedSteps.length === ALL_STEPS.length

  // Only analyze_offer is free; everything else needs a plan
  const accessibleSteps = steps.filter((s) => s.status !== 'blocked')

  return {
    jobId,
    jobDescription,
    jobTitle,
    company,
    userId,
    userPlan,
    steps,
    status: isFullyBlocked ? 'blocked' : 'pending',
    blockedReason: isFullyBlocked
      ? 'Aucun module accessible avec votre plan actuel.'
      : blockedSteps.length > 0
        ? `${blockedSteps.length} étapes nécessitent une mise à niveau.`
        : undefined,
  }
}

/**
 * Returns which steps the user can execute based on their plan.
 */
export function getAccessibleSteps(userPlan: string): CopilotStep[] {
  return ALL_STEPS.filter((step) => isStepAccessible(userPlan, step))
}

/**
 * Given a list of required steps, finds the cheapest upgrade path.
 */
export function getBlockedStepsUpgradePath(
  userPlan: string,
  requiredSteps: CopilotStep[],
): UpgradePathResult {
  const blocked = requiredSteps.filter((s) => !isStepAccessible(userPlan, s))

  if (blocked.length === 0) {
    return { neededSteps: [], upgradePath: null, cheapestBundleName: null, cheapestBundlePrice: null }
  }

  // Collect all unique module IDs needed for the blocked steps
  const neededModules = new Set<string>()
  for (const step of blocked) {
    const req = STEP_REQUIREMENTS[step]
    for (const mod of req.modules) {
      neededModules.add(mod)
    }
  }

  const moduleIds = Array.from(neededModules)

  // Use the entitlement engine's upgrade path
  const upgrade = getUpgradePath(userPlan, moduleIds)

  // Also try the pricing engine directly for the bundle info
  const cheapest = getCheapestBundleForModules(moduleIds)

  return {
    neededSteps: blocked,
    upgradePath: upgrade
      ? { targetPlan: upgrade.targetPlan, targetBundle: upgrade.targetBundle, additionalCost: upgrade.additionalCost }
      : null,
    cheapestBundleName: cheapest?.name ?? null,
    cheapestBundlePrice: cheapest?.monthlyEur ?? null,
  }
}

/**
 * Calculates the HireNova Match Score™ from weighted components.
 * Grade: 90+ Excellent, 75-89 Bon, 60-74 Moyen, 40-59 Faible, <40 Insuffisant
 */
export function calculateMatchScore(components: MatchScoreInput): MatchScoreOutput {
  const weights = MATCH_WEIGHTS

  // Only include components that have values
  const validEntries = Object.entries(components).filter(
    ([, v]) => v !== undefined && v !== null,
  ) as [keyof MatchScoreInput, number][]

  if (validEntries.length === 0) {
    return { score: 0, breakdown: {}, grade: 'Insuffisant' }
  }

  // Calculate weighted sum with re-normalized weights (only counting provided components)
  const totalWeight = validEntries.reduce((sum, [key]) => sum + weights[key], 0)
  const breakdown: Record<string, number> = {}
  let weightedSum = 0

  for (const [key, value] of validEntries) {
    const normalizedWeight = weights[key] / totalWeight
    const contribution = value * normalizedWeight
    weightedSum += contribution
    breakdown[key] = Math.round(value)
  }

  const score = Math.round(Math.min(100, Math.max(0, weightedSum)))

  let grade: string
  if (score >= 90) grade = 'Excellent'
  else if (score >= 75) grade = 'Bon'
  else if (score >= 60) grade = 'Moyen'
  else if (score >= 40) grade = 'Faible'
  else grade = 'Insuffisant'

  return { score, breakdown, grade }
}

/**
 * Performs basic keyword matching between a CV and a job description.
 * Returns a preliminary score (0-100) without calling the full ATS API.
 */
export function basicKeywordMatch(cvText: string, jobDescription: string): {
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
} {
  // Extract significant words (>3 chars) from both texts
  const stopWords = new Set([
    'pour', 'dans', 'avec', 'une', 'des', 'les', 'vous', 'nous', 'ils',
    'elle', 'est', 'sur', 'son', 'ses', 'aux', 'qui', 'que', 'quoi',
    'the', 'and', 'for', 'with', 'you', 'are', 'this', 'that', 'from',
    'your', 'our', 'will', 'can', 'has', 'have', 'been', 'was', 'were',
    'not', 'but', 'all', 'any', 'each', 'into', 'more', 'other', 'than',
    'et', 'en', 'un', 'du', 'de', 'la', 'le', 'au', 'ce', 'se', 'ne',
    'pas', 'par', 'il', 'ou', 'si', 'très', 'plus', 'aussi', 'comme',
  ])

  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿçæœ\s]/g, ' ').split(/\s+/)
    const freq = new Map<string, number>()
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1)
      }
    }
    // Return top keywords (appear >= 1 time)
    return Array.from(freq.keys())
  }

  const cvKeywords = new Set(extractKeywords(cvText))
  const jobKeywords = extractKeywords(jobDescription)

  const matched: string[] = []
  const missing: string[] = []

  for (const kw of jobKeywords) {
    if (cvKeywords.has(kw)) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const score = jobKeywords.length > 0
    ? Math.round((matched.length / jobKeywords.length) * 100)
    : 0

  return { score, matchedKeywords: matched, missingKeywords: missing }
}

/**
 * Returns step metadata for UI display (server-safe).
 */
export function getStepInfo(step: CopilotStep) {
  return STEP_REQUIREMENTS[step]
}

/**
 * Returns all step definitions for UI rendering.
 */
export function getAllStepDefinitions(): Array<{
  step: CopilotStep
  label: string
  description: string
  modules: string[]
}> {
  return ALL_STEPS.map((step) => {
    const req = STEP_REQUIREMENTS[step]
    return {
      step,
      label: req.label,
      description: req.description,
      modules: req.modules,
    }
  })
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function isStepAccessible(userPlan: string, step: CopilotStep): boolean {
  const req = STEP_REQUIREMENTS[step]

  // analyze_offer is free (no modules/features beyond browse_pricing which all plans have)
  if (step === 'analyze_offer') return true

  // Check if any required module is accessible
  if (req.modules.length > 0) {
    const hasAnyModule = req.modules.some((mod) => hasModuleAccess(userPlan, mod))
    if (hasAnyModule) return true
  }

  // Check if any required feature is accessible
  if (req.features.length > 0) {
    const hasAnyFeature = req.features.some((feat) => hasFeatureAccess(userPlan, feat))
    if (hasAnyFeature) return true
  }

  // Check via action mapping
  if (req.action) {
    if (canPerformAction(userPlan, req.action)) return true
  }

  return false
}
