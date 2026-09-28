// ─── HireNova Centralized Pricing Engine ──────────────────────────────────
// Single source of truth for ALL prices (B2C bundles, modules, B2B tiers).
// This file is server-only — the frontend consumes it via /api/pricing.

// ─── Types ──────────────────────────────────────────────────────────────────

export type Currency = 'eur' | 'usd' | 'gbp' | 'mad'
export type BillingPeriod = 'monthly' | 'annual'

export interface B2CBundle {
  id: string
  name: string
  monthlyEur: number
  modules: string[]
}

export interface IndividualModule {
  id: string
  name: string
  monthlyEur: number
  shortDesc: string
  fullDesc: string
  features: string[]
}

export interface B2BTierDef {
  tier: string
  monthlyEur: number | null // null = custom pricing
  minMonthlyEur?: number   // for "X+" tiers
  description: string
  features: string[]
}

export interface B2BCategory {
  key: string
  label: string
  tiers: B2BTierDef[]
}

export interface ComputedPrice {
  price: number
  originalMonthly: number
  currency: Currency
  billingPeriod: BillingPeriod
}

export interface BundlePriceResult extends ComputedPrice {
 savings: number // percentage saved vs 12× monthly
  bundleId: string
}

export interface ModulePriceResult extends ComputedPrice {
  moduleId: string
}

export interface B2BTierPriceResult {
  price: string | null  // null for custom
  isCustom: boolean
  originalMonthly: number | null
  minPrice?: string     // for "X+" tiers in annual
  currency: Currency
  billingPeriod: BillingPeriod
}

export interface B2BTierComputed extends B2BTierPriceResult {
  tier: string
  description: string
  features: string[]
}

export interface PricingCatalog {
  b2c: B2CBundle[]
  modules: IndividualModule[]
  b2b: B2BCategory[]
  currencies: { code: Currency; symbol: string; rate: number }[]
  annualMultiplier: number
  annualSavingsPercent: number
}

// ─── Currency Config ─────────────────────────────────────────────────────────

const CURRENCY_RATES: Record<Currency, number> = {
  eur: 1,
  usd: 1.08,
  gbp: 0.86,
  mad: 10.84,
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  eur: '€',
  usd: '$',
  gbp: '£',
  mad: 'MAD',
}

export const VALID_CURRENCIES: Currency[] = ['eur', 'usd', 'gbp', 'mad']
export const VALID_BILLING_PERIODS: BillingPeriod[] = ['monthly', 'annual']
export const ANNUAL_MULTIPLIER = 10  // annual = 10× monthly (17% savings)
export const ANNUAL_SAVINGS_PERCENT = 17

// ─── B2C Bundles ─────────────────────────────────────────────────────────────

const B2C_BUNDLES: B2CBundle[] = [
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

// ─── Individual Modules ──────────────────────────────────────────────────────

const INDIVIDUAL_MODULES: IndividualModule[] = [
  {
    id: 'mod_cv', name: 'CV', monthlyEur: 9.90,
    shortDesc: 'Générateur de CV IA professionnel',
    fullDesc: 'Créez des CV professionnels optimisés pour chaque candidature avec notre intelligence artificielle avancée.',
    features: ['Templates modernes', 'Export PDF & Word', 'Optimisation IA', 'Aperçu en temps réel', 'Multi-langues'],
  },
  {
    id: 'mod_ats', name: 'ATS', monthlyEur: 7.90,
    shortDesc: 'Analyse de compatibilité ATS',
    fullDesc: 'Analysez la compatibilité de votre CV avec les systèmes ATS des entreprises.',
    features: ['Score de compatibilité', 'Recommandations IA', 'Keywords manquants', 'Comparaison par offre'],
  },
  {
    id: 'mod_jobs', name: 'JOBS', monthlyEur: 9.90,
    shortDesc: "Marketplace d'offres d'emploi",
    fullDesc: "Parcourez des milliers d'offres d'emploi en France et à l'international.",
    features: ['Offres en temps réel', 'Filtres avancés', 'Alertes email', 'Candidature simplifiée', 'Suivi des candidatures'],
  },
  {
    id: 'mod_global', name: 'GLOBAL', monthlyEur: 9.90,
    shortDesc: 'Recrutement international',
    fullDesc: 'Accédez à des opportunités dans le monde entier.',
    features: ['Offres mondiales', 'Guide visa & relocation', 'Matching IA international', 'Alertes par pays'],
  },
  {
    id: 'mod_mobility', name: 'MOBILITY', monthlyEur: 12.90,
    shortDesc: 'OCR & Analyse de documents',
    fullDesc: "Pipeline IA complet pour l'analyse de vos documents de mobilité.",
    features: ['OCR haute précision', 'Pipeline NLP', 'Scoring automatique', 'Multi-formats supportés'],
  },
  {
    id: 'mod_interview', name: 'INTERVIEW', monthlyEur: 9.90,
    shortDesc: 'Simulateur d\'entretien IA',
    fullDesc: 'Préparez-vous aux entretiens avec notre simulateur IA.',
    features: ['Simulation IA réaliste', 'Feedback instantané', 'Entraînement vocal', 'Questions par métier', 'Suivi de progression'],
  },
  {
    id: 'mod_linkedin', name: 'LINKEDIN', monthlyEur: 7.90,
    shortDesc: 'Optimisation profil LinkedIn',
    fullDesc: 'Analysez et optimisez votre profil LinkedIn avec l\'IA.',
    features: ['Analyse IA du profil', 'Génération de résumé', "Conseils d'optimisation", 'Benchmark vs concurrents'],
  },
  {
    id: 'mod_career', name: 'CAREER', monthlyEur: 9.90,
    shortDesc: 'Feuille de route de carrière',
    fullDesc: 'Planifiez votre évolution professionnelle avec des assessments IA.',
    features: ['Assessment IA', 'Roadmap personnalisée', 'Analyse compétences', 'Objectifs de carrière'],
  },
  {
    id: 'mod_coach', name: 'COACH', monthlyEur: 9.90,
    shortDesc: 'Coach de carrière IA',
    fullDesc: 'Votre coach de carrière personnel alimenté par l\'IA.',
    features: ['Sessions coaching IA', 'Définition d\'objectifs', 'Historique & suivi', 'Plan d\'action personnalisé'],
  },
  {
    id: 'mod_formation', name: 'FORMATION', monthlyEur: 12.90,
    shortDesc: 'Formation & Certification',
    fullDesc: 'Catalogue de formations et certifications pour développer vos compétences.',
    features: ['Catalogue riche', 'Parcours personnalisés', 'Certification IA', 'Suivi de progression'],
  },
  {
    id: 'mod_freelance', name: 'FREELANCE', monthlyEur: 9.90,
    shortDesc: 'Marketplace freelance',
    fullDesc: 'Trouvez des missions freelance ou recrutez des talents.',
    features: ['Missions freelance', 'Matching IA', 'Gestion contrats', 'Paiement sécurisé', 'Dashboard freelance'],
  },
]

// ─── B2B Tiers ───────────────────────────────────────────────────────────────

const B2B_CATEGORIES: B2BCategory[] = [
  {
    key: 'recruiter',
    label: 'Recruteur',
    tiers: [
      { tier: 'starter', monthlyEur: 99, description: 'Petites entreprises', features: ["5 offres d'emploi actives", 'Dashboard recruteur', 'Recherche candidats', 'Export CSV'] },
      { tier: 'professional', monthlyEur: 249, description: 'Agences de recrutement', features: ['25 offres actives', 'Pipeline IA', 'Matching avancé', 'Support prioritaire', 'Multi-utilisateurs'] },
      { tier: 'business', monthlyEur: 499, description: 'Multi-recruteurs', features: ['Offres illimitées', 'API intégrée', 'SSO', 'Support dédié', 'Rapports avancés'] },
      { tier: 'enterprise', monthlyEur: null, description: 'Solutions sur mesure', features: ['Tout illimité', 'SLA garanti', 'Intégration custom', 'Account manager dédié', 'Formation équipe'] },
    ],
  },
  {
    key: 'campus',
    label: 'Campus SaaS',
    tiers: [
      { tier: 'starter', monthlyEur: 299, description: 'Écoles & universités', features: ['500 étudiants max', 'CV center', 'ATS intégré', 'Statistiques de base'] },
      { tier: 'professional', monthlyEur: 699, description: 'Grands campus', features: ['2 000 étudiants', 'Job board intégré', 'Analytics avancés', 'Branding custom', 'API access'] },
      { tier: 'enterprise', monthlyEur: 1499, minMonthlyEur: 1499, description: "Réseaux d'écoles", features: ['Étudiants illimités', 'Multi-campus', 'White label partiel', 'SSO & LMS', 'Support dédié 24/7'] },
    ],
  },
  {
    key: 'whitelabel',
    label: 'White Label',
    tiers: [
      { tier: 'starter', monthlyEur: 499, description: 'Marque propre', features: ['Branding complet', 'Domaine custom', 'Modules au choix', 'Support standard'] },
      { tier: 'pro', monthlyEur: 999, description: 'Déploiement complet', features: ['Tout Starter +', 'API full access', 'Analytics avancés', 'Support prioritaire', 'Formation équipe'] },
      { tier: 'enterprise', monthlyEur: 2500, minMonthlyEur: 2500, description: 'Solution clé en main', features: ['Tout Pro +', 'Source code access', 'SLA 99.9%', 'Account manager dédié', 'Développement custom'] },
    ],
  },
  {
    key: 'api',
    label: 'API',
    tiers: [
      { tier: 'starter', monthlyEur: 49, description: 'Intégration basique', features: ['1 000 requêtes/mois', 'Endpoints CV', 'Documentation', 'Support email'] },
      { tier: 'pro', monthlyEur: 149, description: 'Intégration avancée', features: ['10 000 requêtes/mois', 'Tous les endpoints', 'Webhooks', 'Support prioritaire'] },
      { tier: 'business', monthlyEur: 399, description: 'Volume élevé', features: ['50 000 requêtes/mois', 'Rate limiting custom', 'SLA garanti', 'Account manager', 'Analytics API'] },
    ],
  },
]

// ─── Module → Bundle Mapping ─────────────────────────────────────────────────
// Maps module display names (used in bundles) to module IDs
const MODULE_NAME_TO_ID: Record<string, string> = {
  'CV': 'mod_cv',
  'ATS': 'mod_ats',
  'JOBS': 'mod_jobs',
  'GLOBAL': 'mod_global',
  'MOBILITY': 'mod_mobility',
  'INTERVIEW': 'mod_interview',
  'LINKEDIN': 'mod_linkedin',
  'CAREER': 'mod_career',
  'COACH': 'mod_coach',
  'FORMATION': 'mod_formation',
  'FREELANCE': 'mod_freelance',
  'Intelligence': 'mod_intelligence',
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function convertEur(eur: number, currency: Currency): number {
  return Math.round(eur * CURRENCY_RATES[currency] * 100) / 100
}

function computePrice(monthlyEur: number, currency: Currency, billingPeriod: BillingPeriod): number {
  const base = billingPeriod === 'annual' ? monthlyEur * ANNUAL_MULTIPLIER : monthlyEur
  return convertEur(base, currency)
}

// ─── Exported Functions ──────────────────────────────────────────────────────

/**
 * Returns the entire pricing catalog (raw data, no currency conversion).
 */
export function getPricingCatalog(): PricingCatalog {
  return {
    b2c: B2C_BUNDLES,
    modules: INDIVIDUAL_MODULES,
    b2b: B2B_CATEGORIES,
    currencies: VALID_CURRENCIES.map(c => ({
      code: c,
      symbol: CURRENCY_SYMBOLS[c],
      rate: CURRENCY_RATES[c],
    })),
    annualMultiplier: ANNUAL_MULTIPLIER,
    annualSavingsPercent: ANNUAL_SAVINGS_PERCENT,
  }
}

/**
 * Get computed price for a B2C bundle.
 */
export function getB2CBundlePrice(
  bundleId: string,
  currency: Currency = 'eur',
  billingPeriod: BillingPeriod = 'monthly',
): BundlePriceResult | null {
  const bundle = B2C_BUNDLES.find(b => b.id === bundleId)
  if (!bundle) return null

  const price = computePrice(bundle.monthlyEur, currency, billingPeriod)
  const originalMonthly = convertEur(bundle.monthlyEur, currency)
  const savings = billingPeriod === 'annual' ? ANNUAL_SAVINGS_PERCENT : 0

  return { price, originalMonthly, savings, bundleId, currency, billingPeriod }
}

/**
 * Get computed price for an individual module.
 */
export function getModulePrice(
  moduleId: string,
  currency: Currency = 'eur',
  billingPeriod: BillingPeriod = 'monthly',
): ModulePriceResult | null {
  const mod = INDIVIDUAL_MODULES.find(m => m.id === moduleId)
  if (!mod) return null

  const price = computePrice(mod.monthlyEur, currency, billingPeriod)
  const originalMonthly = convertEur(mod.monthlyEur, currency)

  return { price, originalMonthly, moduleId, currency, billingPeriod }
}

/**
 * Get computed price for a specific B2B tier.
 */
export function getB2BTierPrice(
  category: string,
  tier: string,
  currency: Currency = 'eur',
  billingPeriod: BillingPeriod = 'monthly',
): B2BTierPriceResult {
  const cat = B2B_CATEGORIES.find(c => c.key === category)
  if (!cat) {
    return { price: null, isCustom: true, originalMonthly: null, currency, billingPeriod }
  }

  const tierDef = cat.tiers.find(t => t.tier === tier)
  if (!tierDef) {
    return { price: null, isCustom: true, originalMonthly: null, currency, billingPeriod }
  }

  // Custom pricing (null monthlyEur)
  if (tierDef.monthlyEur === null) {
    return { price: null, isCustom: true, originalMonthly: null, currency, billingPeriod }
  }

  const originalMonthly = convertEur(tierDef.monthlyEur, currency)
  const computed = computePrice(tierDef.monthlyEur, currency, billingPeriod)

  // Check if this is a "minimum" tier
  if (tierDef.minMonthlyEur) {
    const minComputed = computePrice(tierDef.minMonthlyEur, currency, billingPeriod)
    return {
      price: formatTierPriceRaw(computed, currency, billingPeriod),
      minPrice: formatTierPriceRaw(minComputed, currency, billingPeriod, true),
      isCustom: false,
      originalMonthly,
      currency,
      billingPeriod,
    }
  }

  return {
    price: formatTierPriceRaw(computed, currency, billingPeriod),
    isCustom: false,
    originalMonthly,
    currency,
    billingPeriod,
  }
}

/**
 * Get all tiers for a B2B category with computed prices.
 */
export function getB2BCategoryTiers(
  category: string,
  currency: Currency = 'eur',
  billingPeriod: BillingPeriod = 'monthly',
): B2BTierComputed[] {
  const cat = B2B_CATEGORIES.find(c => c.key === category)
  if (!cat) return []

  return cat.tiers.map(tierDef => {
    const base = getB2BTierPrice(category, tierDef.tier, currency, billingPeriod)
    return {
      tier: tierDef.tier,
      description: tierDef.description,
      features: tierDef.features,
      ...base,
    }
  })
}

/**
 * Get the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] ?? '€'
}

/**
 * Format a EUR amount into a localized price string.
 * Optionally accepts a billingPeriod to apply annual multiplier.
 */
export function formatPrice(
  amountEur: number,
  currency: Currency = 'eur',
  billingPeriod?: BillingPeriod,
): string {
  const effectiveAmount = billingPeriod === 'annual'
    ? amountEur * ANNUAL_MULTIPLIER
    : amountEur
  return formatTierPriceRaw(convertEur(effectiveAmount, currency), currency, billingPeriod)
}

/**
 * Validate that a bundle ID exists in the catalog.
 */
export function isValidBundle(id: string): boolean {
  return B2C_BUNDLES.some(b => b.id === id)
}

/**
 * Validate that a module ID exists in the catalog.
 */
export function isValidModule(id: string): boolean {
  return INDIVIDUAL_MODULES.some(m => m.id === id)
}

/**
 * Validate that a B2B tier exists within a category.
 */
export function isValidB2BTier(category: string, tier: string): boolean {
  const cat = B2B_CATEGORIES.find(c => c.key === category)
  if (!cat) return false
  return cat.tiers.some(t => t.tier === tier)
}

/**
 * Get all B2C bundles that include a given module.
 */
export function getBundlesForModule(moduleId: string): B2CBundle[] {
  return B2C_BUNDLES.filter(bundle => {
    return bundle.modules.some(name => {
      const mapped = MODULE_NAME_TO_ID[name]
      return mapped === moduleId || name.toLowerCase() === moduleId.replace('mod_', '').toLowerCase()
    })
  })
}

/**
 * Given a list of module IDs, find the cheapest bundle that covers all of them.
 * Returns null if no single bundle covers all requested modules.
 */
export function getCheapestBundleForModules(moduleIds: string[]): B2CBundle | null {
  if (moduleIds.length === 0) return null

  // Map module IDs to their display names (used in bundle module lists)
  const idToName: Record<string, string> = {}
  for (const [name, id] of Object.entries(MODULE_NAME_TO_ID)) {
    idToName[id] = name
  }

  // Normalize requested module IDs to display names
  const requestedNames = moduleIds.map(id => {
    if (idToName[id]) return idToName[id]
    // Fallback: try matching by the part after 'mod_'
    const shortName = id.replace('mod_', '').toUpperCase()
    return shortName
  })

  // Find bundles that include ALL requested modules
  const covering = B2C_BUNDLES.filter(bundle => {
    return requestedNames.every(name => bundle.modules.includes(name))
  })

  if (covering.length === 0) return null

  // Return the cheapest one
  return covering.reduce((cheapest, current) =>
    current.monthlyEur < cheapest.monthlyEur ? current : cheapest
  )
}

// ─── Internal Formatting ─────────────────────────────────────────────────────

function formatTierPriceRaw(
  amount: number,
  currency: Currency,
  billingPeriod?: BillingPeriod,
  isMin?: boolean,
): string {
  const sym = CURRENCY_SYMBOLS[currency]
  const period = billingPeriod === 'annual' ? '/an' : '/mois'
  const prefix = isMin ? '' : ''

  if (currency === 'mad') {
    const val = isMin ? Math.round(amount) : Math.round(amount)
    return isMin ? `${val}+ ${sym}${period}` : `${val} ${sym}${period}`
  }

  if (billingPeriod === 'annual') {
    const val = Math.round(amount)
    return isMin ? `${sym}${val}+${period}` : `${sym}${val}${period}`
  }

  const formatted = amount.toFixed(2)
  return isMin ? `${sym}${formatted}+${period}` : `${sym}${formatted}${period}`
}
