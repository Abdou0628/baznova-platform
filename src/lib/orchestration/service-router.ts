import type { UserIntentCategory, ServiceMode, ServiceDefinition } from './types'

const SERVICE_CATALOG: ServiceDefinition[] = [
  // SaaS Simple (10)
  { id: 'cv_generator', name: 'CV Generator', mode: 'saas_simple', intentCategories: ['optimize_profile'], planRequired: ['starter', 'pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'ats_scanner', name: 'ATS Scanner', mode: 'saas_simple', intentCategories: ['optimize_profile'], planRequired: ['starter', 'pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'cover_letter', name: 'Cover Letter Generator', mode: 'saas_simple', intentCategories: ['optimize_profile'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'linkedin_optimizer', name: 'LinkedIn Optimizer', mode: 'saas_simple', intentCategories: ['optimize_profile', 'career_growth'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'job_search', name: 'Job Search', mode: 'saas_simple', intentCategories: ['find_job'], planRequired: ['starter', 'pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'career_planner', name: 'Career Planner', mode: 'saas_simple', intentCategories: ['career_growth'], planRequired: ['career_plus', 'employer', 'enterprise'] },
  { id: 'formation', name: 'Formation & Certification', mode: 'saas_simple', intentCategories: ['learn_skill'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'market_intelligence', name: 'Market Intelligence', mode: 'saas_simple', intentCategories: ['analyze_market'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'] },
  { id: 'legal_templates', name: 'Legal Templates', mode: 'saas_simple', intentCategories: ['legal_compliance'], planRequired: ['employer', 'enterprise'] },
  { id: 'interview_prep', name: 'Interview Prep', mode: 'saas_simple', intentCategories: ['career_growth', 'get_hired'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'] },
  // SaaS Labour (6)
  { id: 'agent_cv_optimization', name: 'AI CV Optimization', mode: 'saas_labour', intentCategories: ['optimize_profile'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'], labourCost: 12 },
  { id: 'agent_job_copilot', name: 'Job Copilot Agent', mode: 'saas_labour', intentCategories: ['find_job'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'], labourCost: 45 },
  { id: 'agent_sourcing', name: 'AI Sourcing Agent', mode: 'saas_labour', intentCategories: ['get_hired'], planRequired: ['employer', 'enterprise'], labourCost: 35 },
  { id: 'agent_career_plan', name: 'AI Career Plan', mode: 'saas_labour', intentCategories: ['career_growth'], planRequired: ['career_plus', 'employer', 'enterprise'], labourCost: 18 },
  { id: 'agent_market_analysis', name: 'AI Market Analysis', mode: 'saas_labour', intentCategories: ['analyze_market'], planRequired: ['pro', 'career_plus', 'employer', 'enterprise'], labourCost: 22 },
  { id: 'agent_legal_review', name: 'AI Legal Review', mode: 'saas_labour', intentCategories: ['legal_compliance'], planRequired: ['employer', 'enterprise'], labourCost: 15 },
]

const INTENT_SERVICE_MAP: Record<UserIntentCategory, string[]> = {
  optimize_profile: ['cv_generator', 'ats_scanner', 'cover_letter', 'linkedin_optimizer', 'agent_cv_optimization'],
  find_job: ['job_search', 'agent_job_copilot'],
  get_hired: ['agent_sourcing'],
  career_growth: ['career_planner', 'linkedin_optimizer', 'agent_career_plan'],
  delegate_work: ['agent_cv_optimization', 'agent_job_copilot', 'agent_sourcing'],
  analyze_market: ['market_intelligence', 'agent_market_analysis'],
  manage_team: ['agent_sourcing'],
  learn_skill: ['formation'],
  legal_compliance: ['legal_templates', 'agent_legal_review'],
}

export function routeToService(intent: UserIntentCategory, plan: string, mode?: ServiceMode): ServiceDefinition[] {
  const serviceIds = INTENT_SERVICE_MAP[intent] ?? []
  return SERVICE_CATALOG.filter(s =>
    serviceIds.includes(s.id)
    && s.planRequired.includes(plan)
    && (!mode || s.mode === mode)
  )
}

export function getServiceCatalog(): ServiceDefinition[] {
  return SERVICE_CATALOG
}

export function getServicesByMode(mode: ServiceMode): ServiceDefinition[] {
  return SERVICE_CATALOG.filter(s => s.mode === mode)
}
