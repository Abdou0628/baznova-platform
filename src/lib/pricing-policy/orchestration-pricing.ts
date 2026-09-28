import type { ServiceMode, UserIntentCategory } from '../orchestration/types'

export interface OrchestrationTier {
  id: string
  name: string
  description: string
  monthlyPrice: number
  includedWorkflows: number
  includedServices: number
  maxConcurrentMissions: number
  labourCreditsIncluded: number
  simpleActionsIncluded: number
  orchestrationLevel: number
  features: string[]
}

export const ORCHESTRATION_TIERS: OrchestrationTier[] = [
  {
    id: 'self_service', name: 'Self-Service', description: 'Starter plan — access SaaS Simple tools yourself',
    monthlyPrice: 9, includedWorkflows: 0, includedServices: 3, maxConcurrentMissions: 0,
    labourCreditsIncluded: 0, simpleActionsIncluded: 10, orchestrationLevel: 1,
    features: ['CV Generator', 'ATS Scanner', 'Job Search', 'Basic cover letters', 'Platform access included'],
  },
  {
    id: 'guided', name: 'Guided Orchestration', description: 'Platform guides you through optimal workflows',
    monthlyPrice: 29, includedWorkflows: 5, includedServices: 8, maxConcurrentMissions: 3,
    labourCreditsIncluded: 100, simpleActionsIncluded: 50, orchestrationLevel: 2,
    features: ['All Self-Service', 'Workflow templates', 'Next-action recommendations', '3 agent missions/mo', '100 WU included'],
  },
  {
    id: 'automated', name: 'Automated Orchestration', description: 'AI orchestrates services autonomously for maximum results',
    monthlyPrice: 79, includedWorkflows: 20, includedServices: 15, maxConcurrentMissions: 10,
    labourCreditsIncluded: 500, simpleActionsIncluded: 200, orchestrationLevel: 3,
    features: ['All Guided', 'Auto-workflow execution', 'Parallel orchestration', '10 concurrent missions', '500 WU included', 'Priority agent access'],
  },
  {
    id: 'full_intelligence', name: 'Full Intelligence', description: 'Complete AI orchestration with proactive optimization',
    monthlyPrice: 149, includedWorkflows: -1, includedServices: -1, maxConcurrentMissions: -1,
    labourCreditsIncluded: -1, simpleActionsIncluded: -1, orchestrationLevel: 4,
    features: ['All Automated', 'Unlimited workflows', 'Unlimited missions', 'Proactive AI suggestions', 'Custom agent chains', 'Dedicated AI account manager', 'API access'],
  },
  {
    id: 'enterprise_orchestration', name: 'Enterprise Orchestration', description: 'White-glove AI orchestration for organizations',
    monthlyPrice: 399, includedWorkflows: -1, includedServices: -1, maxConcurrentMissions: -1,
    labourCreditsIncluded: -1, simpleActionsIncluded: -1, orchestrationLevel: 5,
    features: ['All Full Intelligence', 'Multi-team orchestration', 'Custom workflow builder', 'SLA guarantees', 'On-premise agents', 'Dedicated CTO agent', 'Custom integrations'],
  },
]

export interface WorkflowPricing {
  intent: UserIntentCategory
  simpleCost: number
  labourCost: number
  orchestrationBonus: number
}

const WORKFLOW_PRICING: Record<UserIntentCategory, WorkflowPricing> = {
  optimize_profile: { intent: 'optimize_profile', simpleCost: 0, labourCost: 12, orchestrationBonus: 35 },
  find_job: { intent: 'find_job', simpleCost: 0, labourCost: 45, orchestrationBonus: 80 },
  get_hired: { intent: 'get_hired', simpleCost: 0, labourCost: 35, orchestrationBonus: 120 },
  career_growth: { intent: 'career_growth', simpleCost: 0, labourCost: 18, orchestrationBonus: 45 },
  delegate_work: { intent: 'delegate_work', simpleCost: 0, labourCost: 25, orchestrationBonus: 60 },
  analyze_market: { intent: 'analyze_market', simpleCost: 0, labourCost: 22, orchestrationBonus: 30 },
  manage_team: { intent: 'manage_team', simpleCost: 0, labourCost: 35, orchestrationBonus: 90 },
  learn_skill: { intent: 'learn_skill', simpleCost: 0, labourCost: 0, orchestrationBonus: 20 },
  legal_compliance: { intent: 'legal_compliance', simpleCost: 0, labourCost: 0, orchestrationBonus: 15 },
}

export function calculateWorkflowPrice(intent: UserIntentCategory, mode: ServiceMode, tierId: string): { baseCost: number; wuCost: number; totalMAD: number; savingsVsStandalone: number } {
  const pricing = WORKFLOW_PRICING[intent]
  const tier = ORCHESTRATION_TIERS.find(t => t.id === tierId) ?? ORCHESTRATION_TIERS[0]
  const isSimple = mode === 'saas_simple'
  const baseCost = isSimple ? pricing.simpleCost : 0
  const wuCost = isSimple ? 0 : pricing.labourCost
  const wuCovered = tier.labourCreditsIncluded === -1 || wuCost <= tier.labourCreditsIncluded
  const wuMAD = wuCovered ? 0 : Math.max(0, wuCost - tier.labourCreditsIncluded) * 0.05
  const totalMAD = baseCost + wuMAD
  const savingsVsStandalone = pricing.orchestrationBonus
  return { baseCost, wuCost, totalMAD, savingsVsStandalone }
}

export function recommendTier(monthlyActions: number, missionCount: number, intentDiversity: number): OrchestrationTier {
  const score = (monthlyActions * 2) + (missionCount * 5) + (intentDiversity * 10)
  if (score <= 20) return ORCHESTRATION_TIERS[0]
  if (score <= 80) return ORCHESTRATION_TIERS[1]
  if (score <= 200) return ORCHESTRATION_TIERS[2]
  if (score <= 500) return ORCHESTRATION_TIERS[3]
  return ORCHESTRATION_TIERS[4]
}

export function getOrchestrationTiers(): OrchestrationTier[] { return ORCHESTRATION_TIERS }
export function getAllWorkflowPricing(): Record<UserIntentCategory, WorkflowPricing> { return WORKFLOW_PRICING }
