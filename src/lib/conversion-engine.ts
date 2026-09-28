// ─── HireNova Conversion Engine ──────────────────────────────────────
// Goal-based bundle recommender + Value Calculator.
// Maps user goals → optimal bundle → value proposition.
// ──────────────────────────────────────────────────────────────────────────────

import {
  type Currency,
  type BillingPeriod,
  getPricingCatalog,
  getB2CBundlePrice,
  formatPrice,
  ANNUAL_MULTIPLIER,
} from './pricing-engine'

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserGoal =
  | 'create_cv'
  | 'find_job'
  | 'prepare_interview'
  | 'develop_career'
  | 'freelance'
  | 'international'
  | 'enterprise'

export interface GoalRecommendation {
  goal: UserGoal
  primaryBundle: {
    id: string
    name: string
    monthlyEur: number
    reason: string
  }
  alternativeBundle?: {
    id: string
    name: string
    monthlyEur: number
    reason: string
  }
  requiredModules: string[]
  savingsVsIndividual: number // percentage
  valueProps: string[] // 3-5 value propositions
}

export interface ValueCalculation {
  goal: UserGoal
  bundleId: string
  bundleName: string
  modulesIncluded: string[]
  individualCostEur: number
  bundleCostEur: number
  savingsPercent: number
  savingsAmountEur: number
  monthlyEquivalentEur: number
  billing: BillingPeriod
  currency: Currency
  currencySymbol: string
  formattedBundleCost: string
  formattedIndividualCost: string
  formattedSavings: string
}

export interface GoalOption {
  id: UserGoal
  icon: string // lucide icon name
  label: Record<string, string> // fr, en, ar, es
}

// ─── Constants ──────────────────────────────────────────────────────────────

const B2C_BUNDLES = [
  {
    id: 'hirenova_start',
    name: 'HIRENOVA START',
    monthlyEur: 9.90,
    modules: ['CV', 'ATS'],
  },
  {
    id: 'hirenova_career',
    name: 'HIRENOVA CAREER',
    monthlyEur: 19.90,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'INTERVIEW', 'LINKEDIN', 'CAREER'],
  },
  {
    id: 'hirenova_professional',
    name: 'HIRENOVA PROFESSIONNEL',
    monthlyEur: 29.90,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE'],
  },
  {
    id: 'hirenova_ai_power',
    name: 'HIRENOVA AI POWER',
    monthlyEur: 39.90,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE', 'Intelligence'],
  },
]

// Module name → individual EUR price (mirrors pricing-engine)
const MODULE_PRICES_EUR: Record<string, number> = {
  CV: 9.90,
  ATS: 7.90,
  JOBS: 9.90,
  GLOBAL: 9.90,
  MOBILITY: 12.90,
  INTERVIEW: 9.90,
  LINKEDIN: 7.90,
  CAREER: 9.90,
  COACH: 9.90,
  FORMATION: 12.90,
  FREELANCE: 9.90,
  Intelligence: 0, // not sold individually
}

// ─── Goal → Bundle Mapping ──────────────────────────────────────────────────

const GOAL_BUNDLE_MAP: Record<UserGoal, GoalRecommendation> = {
  create_cv: {
    goal: 'create_cv',
    primaryBundle: {
      id: 'hirenova_start',
      name: 'HIRENOVA START',
      monthlyEur: 9.90,
      reason: 'Le bundle idéal pour créer un CV professionnel et vérifier sa compatibilité ATS.',
    },
    alternativeBundle: {
      id: 'hirenova_career',
      name: 'HIRENOVA CAREER',
      monthlyEur: 19.90,
      reason: 'Ajoutez la recherche d\'emploi, les entretiens et l\'optimisation LinkedIn.',
    },
    requiredModules: ['CV', 'ATS'],
    savingsVsIndividual: 38,
    valueProps: [
      'Générateur de CV IA professionnel',
      'Analyse de compatibilité ATS incluse',
      'Templates modernes et export PDF/Word',
      'Optimisé pour passer les filtres automatiques',
    ],
  },

  find_job: {
    goal: 'find_job',
    primaryBundle: {
      id: 'hirenova_career',
      name: 'HIRENOVA CAREER',
      monthlyEur: 19.90,
      reason: 'Le bundle recommandé pour maximiser vos chances de trouver un emploi.',
    },
    alternativeBundle: {
      id: 'hirenova_professional',
      name: 'HIRENOVA PROFESSIONNEL',
      monthlyEur: 29.90,
      reason: 'Accédez au coaching, à la formation et à la marketplace freelance.',
    },
    requiredModules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'INTERVIEW', 'LINKEDIN', 'CAREER'],
    savingsVsIndividual: 60,
    valueProps: [
      '7 modules essentiels pour la recherche d\'emploi',
      'Marketplace d\'offres en temps réel',
      'Simulateur d\'entretien IA',
      'Optimisation profil LinkedIn',
      'Roadmap de carrière personnalisée',
    ],
  },

  prepare_interview: {
    goal: 'prepare_interview',
    primaryBundle: {
      id: 'hirenova_career',
      name: 'HIRENOVA CAREER',
      monthlyEur: 19.90,
      reason: 'Préparez-vous aux entretiens avec le simulateur IA et la coaching.',
    },
    alternativeBundle: {
      id: 'hirenova_professional',
      name: 'HIRENOVA PROFESSIONNEL',
      monthlyEur: 29.90,
      reason: 'Ajoutez un coach IA dédié et des formations ciblées.',
    },
    requiredModules: ['CV', 'ATS', 'INTERVIEW', 'CAREER', 'LINKEDIN'],
    savingsVsIndividual: 54,
    valueProps: [
      'Simulateur d\'entretien IA réaliste',
      'Feedback instantané sur vos réponses',
      'Questions personnalisées par métier',
      'Coaching vocal et suivi de progression',
    ],
  },

  develop_career: {
    goal: 'develop_career',
    primaryBundle: {
      id: 'hirenova_professional',
      name: 'HIRENOVA PROFESSIONNEL',
      monthlyEur: 29.90,
      reason: 'Best Value — Tous les outils pour développer votre carrière au maximum.',
    },
    alternativeBundle: {
      id: 'hirenova_ai_power',
      name: 'HIRENOVA AI POWER',
      monthlyEur: 39.90,
      reason: 'Ajoutez l\'IA avancée et le Job Copilot pour une expérience premium.',
    },
    requiredModules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE', 'MOBILITY'],
    savingsVsIndividual: 72,
    valueProps: [
      '11 modules complets pour votre carrière',
      'Coach IA de carrière personnalisé',
      'Catalogue de formations et certifications',
      'Marketplace freelance intégrée',
      'Économisez 72% vs modules individuels',
    ],
  },

  freelance: {
    goal: 'freelance',
    primaryBundle: {
      id: 'hirenova_professional',
      name: 'HIRENOVA PROFESSIONNEL',
      monthlyEur: 29.90,
      reason: 'Accédez à la marketplace freelance, au coaching et aux formations.',
    },
    alternativeBundle: {
      id: 'hirenova_career',
      name: 'HIRENOVA CAREER',
      monthlyEur: 19.90,
      reason: 'Si vous avez juste besoin des outils de base pour vos missions.',
    },
    requiredModules: ['CV', 'ATS', 'JOBS', 'FREELANCE', 'COACH', 'FORMATION'],
    savingsVsIndividual: 62,
    valueProps: [
      'Marketplace freelance avec missions IA-matchées',
      'Gestion de contrats et paiements sécurisés',
      'CV et lettres de motivation optimisés',
      'Formations pour développer vos compétences',
    ],
  },

  international: {
    goal: 'international',
    primaryBundle: {
      id: 'hirenova_professional',
      name: 'HIRENOVA PROFESSIONNEL',
      monthlyEur: 29.90,
      reason: 'Accédez aux offres mondiales, à la mobilité internationale et au coaching.',
    },
    alternativeBundle: {
      id: 'hirenova_career',
      name: 'HIRENOVA CAREER',
      monthlyEur: 19.90,
      reason: 'Pour les offres internationales sans les outils de mobilité avancés.',
    },
    requiredModules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'CAREER', 'LINKEDIN'],
    savingsVsIndividual: 61,
    valueProps: [
      'Offres d\'emploi dans le monde entier',
      'Guide visa et relocation',
      'Analyse OCR de documents de mobilité',
      'Matching IA international',
      'Optimisation profil LinkedIn multilingue',
    ],
  },

  enterprise: {
    goal: 'enterprise',
    primaryBundle: {
      id: 'b2b_recruiter_enterprise',
      name: 'B2B Recruiter Enterprise',
      monthlyEur: 0,
      reason: 'Solution sur mesure avec SLA garanti, intégration custom et account manager dédié.',
    },
    requiredModules: [],
    savingsVsIndividual: 0,
    valueProps: [
      'Recrutement illimité',
      'SLA garanti 99.9%',
      'Intégration custom (API, SSO)',
      'Account manager dédié',
      'Formation de l\'équipe incluse',
    ],
  },
}

// ─── Exported Functions ──────────────────────────────────────────────────────

export const VALID_GOALS: UserGoal[] = [
  'create_cv',
  'find_job',
  'prepare_interview',
  'develop_career',
  'freelance',
  'international',
  'enterprise',
]

/**
 * Get the recommendation for a given user goal.
 */
export function getGoalRecommendation(goal: UserGoal): GoalRecommendation {
  return GOAL_BUNDLE_MAP[goal] ?? GOAL_BUNDLE_MAP.find_job
}

/**
 * Calculate the value proposition for a goal + billing + currency.
 */
export function calculateValue(
  userGoal: UserGoal,
  billing: BillingPeriod = 'monthly',
  currency: Currency = 'eur',
): ValueCalculation {
  const rec = getGoalRecommendation(userGoal)
  const bundle = B2C_BUNDLES.find(b => b.id === rec.primaryBundle.id)

  // For enterprise goals (no B2C bundle), return a simplified calculation
  if (!bundle) {
    return {
      goal: userGoal,
      bundleId: rec.primaryBundle.id,
      bundleName: rec.primaryBundle.name,
      modulesIncluded: [],
      individualCostEur: 0,
      bundleCostEur: 0,
      savingsPercent: 0,
      savingsAmountEur: 0,
      monthlyEquivalentEur: 0,
      billing,
      currency,
      currencySymbol: currency === 'eur' ? '€' : currency === 'usd' ? '$' : currency === 'gbp' ? '£' : 'MAD',
      formattedBundleCost: 'Sur devis',
      formattedIndividualCost: '—',
      formattedSavings: '—',
    }
  }

  // Calculate individual module costs (only for required modules that have a price)
  const individualTotal = rec.requiredModules.reduce(
    (sum, mod) => sum + (MODULE_PRICES_EUR[mod] ?? 0),
    0,
  )

  const bundleEur = billing === 'annual'
    ? bundle.monthlyEur * ANNUAL_MULTIPLIER
    : bundle.monthlyEur

  const savingsAmount = individualTotal - bundleEur
  const savingsPercent = individualTotal > 0
    ? Math.round((savingsAmount / individualTotal) * 100)
    : 0

  const monthlyEquiv = billing === 'annual'
    ? Math.round((bundleEur / 12) * 100) / 100
    : bundle.monthlyEur

  const sym = currency === 'eur' ? '€' : currency === 'usd' ? '$' : currency === 'gbp' ? '£' : 'MAD'

  const rates: Record<Currency, number> = { eur: 1, usd: 1.08, gbp: 0.86, mad: 10.84 }
  const rate = rates[currency]
  const convertedBundle = Math.round(bundleEur * rate * 100) / 100
  const convertedIndividual = Math.round(individualTotal * rate * 100) / 100
  const convertedSavings = Math.round(savingsAmount * rate * 100) / 100
  const convertedMonthly = Math.round(monthlyEquiv * rate * 100) / 100

  const fmtBundle = currency === 'mad'
    ? `${Math.round(convertedBundle)} ${sym}`
    : `${sym}${convertedBundle.toFixed(2)}`
  const fmtIndividual = currency === 'mad'
    ? `${Math.round(convertedIndividual)} ${sym}`
    : `${sym}${convertedIndividual.toFixed(2)}`
  const fmtSavings = currency === 'mad'
    ? `${Math.round(convertedSavings)} ${sym}`
    : `${sym}${convertedSavings.toFixed(2)}`

  return {
    goal: userGoal,
    bundleId: bundle.id,
    bundleName: bundle.name,
    modulesIncluded: bundle.modules,
    individualCostEur: individualTotal,
    bundleCostEur: bundleEur,
    savingsPercent: Math.max(0, savingsPercent),
    savingsAmountEur: Math.max(0, savingsAmount),
    monthlyEquivalentEur: convertedMonthly,
    billing,
    currency,
    currencySymbol: sym,
    formattedBundleCost: fmtBundle,
    formattedIndividualCost: fmtIndividual,
    formattedSavings: fmtSavings,
  }
}

/**
 * Get available goal options with multilingual labels.
 */
export function getGoalOptions(): GoalOption[] {
  return [
    {
      id: 'create_cv',
      icon: 'FileText',
      label: {
        fr: 'Créer mon CV',
        en: 'Create my CV',
        ar: 'إنشاء سيرتي الذاتية',
        es: 'Crear mi CV',
      },
    },
    {
      id: 'find_job',
      icon: 'Briefcase',
      label: {
        fr: 'Trouver un emploi',
        en: 'Find a job',
        ar: 'العثور على عمل',
        es: 'Encontrar empleo',
      },
    },
    {
      id: 'prepare_interview',
      icon: 'MessageSquare',
      label: {
        fr: 'Préparer un entretien',
        en: 'Prepare for an interview',
        ar: 'التحضير لمقابلة',
        es: 'Preparar una entrevista',
      },
    },
    {
      id: 'develop_career',
      icon: 'GraduationCap',
      label: {
        fr: 'Développer ma carrière',
        en: 'Develop my career',
        ar: 'تطوير مسيرتي المهنية',
        es: 'Desarrollar mi carrera',
      },
    },
    {
      id: 'freelance',
      icon: 'Laptop',
      label: {
        fr: 'Freelance',
        en: 'Freelance',
        ar: 'عمل حر',
        es: 'Freelance',
      },
    },
  ]
}

/**
 * Validate that a goal string is a valid UserGoal.
 */
export function isValidGoal(goal: string): goal is UserGoal {
  return VALID_GOALS.includes(goal as UserGoal)
}
