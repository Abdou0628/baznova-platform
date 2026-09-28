/**
 * BazNova Subscription Plans — SINGLE SOURCE OF TRUTH
 *
 * Every product / feature gate in the application MUST reference this file.
 * Do NOT duplicate plan logic elsewhere.
 */

import type { BazNovaPlan, PlanFeatures } from './types'

// ─── All valid plan IDs ─────────────────────────────────

export const ALL_PLANS: BazNovaPlan[] = [
  'free',
  'starter',
  'pro',
  'career_plus',
  'employer',
  'enterprise',
  'annual',
  'api',
  'lifetime',
]

// ─── Features matrix ───────────────────────────────────

const PLAN_FEATURES_MAP: Record<BazNovaPlan, PlanFeatures> = {
  free: {
    planId: 'free',
    cvLimit: 2,
    clLimit: 1,
    atsAccess: 'basic',
    templates: 1,
    formats: ['pdf'],
    watermark: true,
    prioritySupport: false,
    products: ['cv', 'ats'],
  },

  starter: {
    planId: 'starter',
    cvLimit: 10,
    clLimit: 5,
    atsAccess: 'detailed',
    templates: 3,
    formats: ['pdf'],
    watermark: false,
    prioritySupport: false,
    products: ['cv', 'ats', 'jobs'],
  },

  pro: {
    planId: 'pro',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: 3,
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: ['cv', 'ats', 'jobs', 'interview', 'linkedin', 'coach', 'career'],
  },

  career_plus: {
    planId: 'career_plus',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: 5,
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: [
      'cv', 'ats', 'jobs', 'interview', 'linkedin', 'coach', 'career',
      'mobility', 'global', 'intelligence',
    ],
  },

  employer: {
    planId: 'employer',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: 3,
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: ['cv', 'ats', 'jobs', 'recruiter', 'freelance', 'api'],
  },

  enterprise: {
    planId: 'enterprise',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: -1, // unlimited templates
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: [
      'cv', 'ats', 'jobs', 'interview', 'linkedin', 'coach', 'career',
      'mobility', 'global', 'intelligence', 'recruiter', 'freelance', 'api',
    ],
  },

  annual: {
    // Same features as pro, billed annually
    planId: 'annual',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: 3,
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: ['cv', 'ats', 'jobs', 'interview', 'linkedin', 'coach', 'career'],
  },

  api: {
    planId: 'api',
    cvLimit: 0,
    clLimit: 0,
    atsAccess: 'none',
    templates: 0,
    formats: [],
    watermark: false,
    prioritySupport: true,
    products: ['api'],
  },

  lifetime: {
    // Same features as career_plus, no expiry
    planId: 'lifetime',
    cvLimit: -1,
    clLimit: -1,
    atsAccess: 'detailed',
    templates: 5,
    formats: ['pdf', 'word'],
    watermark: false,
    prioritySupport: true,
    products: [
      'cv', 'ats', 'jobs', 'interview', 'linkedin', 'coach', 'career',
      'mobility', 'global', 'intelligence',
    ],
  },
}

// ─── Public API ────────────────────────────────────────

/**
 * Returns the full feature set for a given plan.
 * Falls back to `free` plan if an unknown plan ID is provided.
 */
export function getPlanFeatures(planId: BazNovaPlan): PlanFeatures {
  return PLAN_FEATURES_MAP[planId] ?? PLAN_FEATURES_MAP.free
}

// Re-export types so consumers can import from this single file
export type { BazNovaPlan, PlanFeatures } from './types'
