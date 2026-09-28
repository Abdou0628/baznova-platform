import type { UserIntent, UserIntentCategory } from './types'

const INTENT_PATTERNS: Record<UserIntentCategory, {
  keywords: string[]
  products: string[]
  confidence: number
}> = {
  find_job: {
    keywords: ['emploi', 'job', 'poste', 'recruter', 'cherche', 'candidature', 'apply', 'hire', 'search job', 'offres'],
    products: ['jobs', 'global', 'intelligence'],
    confidence: 0.85,
  },
  get_hired: {
    keywords: ['candidat', 'sourcing', 'pipeline', 'talent', 'recrutement', 'employer', 'post job', 'publier offre'],
    products: ['recruiter', 'freelance', 'employer'],
    confidence: 0.8,
  },
  optimize_profile: {
    keywords: ['cv', 'resume', 'lettre', 'cover letter', 'linkedin', 'ats', 'optimiser', 'optimize', 'profil', 'persona'],
    products: ['cv', 'cl', 'linkedin', 'ats'],
    confidence: 0.9,
  },
  career_growth: {
    keywords: ['carrière', 'career', 'coaching', 'coach', 'plan', 'roadmap', 'compétence', 'skill', 'assessment', 'mobilité'],
    products: ['career', 'coach', 'mobility', 'formation'],
    confidence: 0.85,
  },
  delegate_work: {
    keywords: ['agent', 'mission', 'autonome', 'delegate', 'automate', 'travail', 'workflow', 'pipeline', 'saalabour', 'work units'],
    products: ['saalabour', 'agents'],
    confidence: 0.9,
  },
  analyze_market: {
    keywords: ['marché', 'market', 'salaire', 'salary', 'tendance', 'trend', 'forecast', 'intelligence', 'analyse', 'data'],
    products: ['intelligence', 'global'],
    confidence: 0.8,
  },
  manage_team: {
    keywords: ['équipe', 'team', 'collaborateur', 'employé', 'dashboard employer', 'gestion rh'],
    products: ['employer', 'recruiter', 'enterprise'],
    confidence: 0.75,
  },
  learn_skill: {
    keywords: ['formation', 'course', 'certification', 'cert', 'apprendre', 'learn', 'workshop', 'upskill'],
    products: ['formation', 'campus'],
    confidence: 0.85,
  },
  legal_compliance: {
    keywords: ['contrat', 'contract', 'legal', 'légal', 'rgpd', 'compliance', 'cgu', 'template juridique'],
    products: ['legal'],
    confidence: 0.8,
  },
}

export function classifyIntent(rawInput: string, _metadata?: Record<string, unknown>): UserIntent {
  const input = rawInput.toLowerCase()
  const scores: Array<{ category: UserIntentCategory; score: number; matchedKeywords: string[] }> = []

  for (const [category, pattern] of Object.entries(INTENT_PATTERNS)) {
    const matchedKeywords = pattern.keywords.filter(kw => input.includes(kw))
    const score = matchedKeywords.length > 0
      ? (matchedKeywords.length / pattern.keywords.length) * pattern.confidence
      : 0
    scores.push({ category: category as UserIntentCategory, score, matchedKeywords })
  }

  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]

  if (!best || best.score === 0) {
    return {
      category: 'optimize_profile',
      confidence: 0.3,
      rawInput,
      metadata: { fallback: true, allScores: scores.map(s => ({ cat: s.category, score: s.score })) },
    }
  }

  return {
    category: best.category,
    confidence: Math.min(best.score + 0.1, 1),
    rawInput,
    metadata: {
      matchedKeywords: best.matchedKeywords,
      allScores: scores.slice(0, 3).map(s => ({ cat: s.category, score: s.score })),
    },
  }
}

export function getIntentProducts(category: UserIntentCategory): string[] {
  return INTENT_PATTERNS[category]?.products ?? []
}

export function getAllIntents(): UserIntentCategory[] {
  return Object.keys(INTENT_PATTERNS) as UserIntentCategory[]
}
