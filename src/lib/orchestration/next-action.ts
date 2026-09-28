import type { UserIntentCategory, NextAction, ActionPriority, ServiceMode } from './types'

interface UserState {
  hasCV: boolean; hasCoverLetter: boolean; hasAtsAnalysis: boolean
  hasLinkedInOptimized: boolean; hasCareerPlan: boolean; hasInterviewPrep: boolean
  hasJobApplications: number; completedMissions: number; plan: string
}

const ACTION_LIBRARY: NextAction[] = [
  { id: 'create_cv', title: 'Créer votre CV', description: 'Générer un CV optimisé ATS avec IA', category: 'optimize_profile', mode: 'saas_simple', priority: 'critical', impact: 95, effort: 15, expectedValue: 0, confidence: 0.95, products: ['cv', 'ats'] },
  { id: 'ats_scan', title: 'Analyse ATS', description: 'Vérifier la compatibilité ATS de votre CV', category: 'optimize_profile', mode: 'saas_simple', priority: 'high', impact: 80, effort: 10, expectedValue: 0, confidence: 0.9, products: ['ats', 'cv'] },
  { id: 'create_cl', title: 'Lettre de motivation', description: 'Générer une lettre personnalisée pour chaque offre', category: 'optimize_profile', mode: 'saas_simple', priority: 'high', impact: 75, effort: 15, expectedValue: 0, confidence: 0.85, products: ['cl'] },
  { id: 'optimize_linkedin', title: 'Optimiser LinkedIn', description: 'Boostez votre profil LinkedIn pour les recruteurs', category: 'optimize_profile', mode: 'saas_simple', priority: 'medium', impact: 70, effort: 20, expectedValue: 0, confidence: 0.85, products: ['linkedin'] },
  { id: 'delegate_cv_opt', title: "Déléguer l'optimisation CV", description: "Laissez l'agent IA optimiser CV + ATS + lettre", category: 'optimize_profile', mode: 'saas_labour', priority: 'high', impact: 90, effort: 5, expectedValue: 50, confidence: 0.88, products: ['cv', 'ats', 'cl'], labourCost: 12 },
  { id: 'delegate_job_copilot', title: 'Job Copilot', description: 'Pipeline complet : analyse → match → optimise → postule', category: 'find_job', mode: 'saas_labour', priority: 'critical', impact: 98, effort: 5, expectedValue: 200, confidence: 0.9, products: ['jobs', 'cv', 'cl', 'interview', 'career'], labourCost: 45 },
  { id: 'delegate_sourcing', title: 'Sourcing IA', description: "L'agent trouve et score les meilleurs candidats", category: 'get_hired', mode: 'saas_labour', priority: 'critical', impact: 92, effort: 5, expectedValue: 500, confidence: 0.85, products: ['recruiter', 'jobs'], labourCost: 35 },
  { id: 'career_assessment', title: 'Évaluation carrière', description: 'Analysez vos compétences et identifiez les opportunités', category: 'career_growth', mode: 'saas_simple', priority: 'high', impact: 85, effort: 25, expectedValue: 100, confidence: 0.85, products: ['career', 'coach'] },
  { id: 'delegate_career_plan', title: 'Plan carrière IA', description: "L'agent construit votre roadmap personnalisée", category: 'career_growth', mode: 'saas_labour', priority: 'high', impact: 88, effort: 5, expectedValue: 150, confidence: 0.87, products: ['career', 'coach', 'intelligence'], labourCost: 18 },
  { id: 'market_analysis', title: 'Analyse marché', description: 'Salaires, tendances et opportunités dans votre secteur', category: 'analyze_market', mode: 'saas_simple', priority: 'medium', impact: 65, effort: 15, expectedValue: 50, confidence: 0.8, products: ['intelligence'] },
  { id: 'interview_prep', title: 'Préparation entretien', description: 'Simulation IA avec feedback personnalisé', category: 'career_growth', mode: 'saas_simple', priority: 'high', impact: 82, effort: 30, expectedValue: 100, confidence: 0.88, products: ['interview', 'coach'] },
]

export function getNextActions(state: Partial<UserState>, limit: number = 5): NextAction[] {
  const scored = ACTION_LIBRARY.map(action => {
    let adjustedImpact = action.impact
    let adjustedConfidence = action.confidence
    if (action.id === 'create_cv' && state.hasCV) adjustedImpact *= 0.1
    if (action.id === 'create_cl' && state.hasCoverLetter) adjustedImpact *= 0.2
    if (action.id === 'ats_scan' && state.hasAtsAnalysis) adjustedImpact *= 0.15
    if (action.id === 'optimize_linkedin' && state.hasLinkedInOptimized) adjustedImpact *= 0.2
    if (action.id === 'career_assessment' && state.hasCareerPlan) adjustedImpact *= 0.15
    if (action.id === 'interview_prep' && state.hasInterviewPrep) adjustedImpact *= 0.2
    if (action.mode === 'saas_labour' && (state.completedMissions ?? 0) > 2) adjustedConfidence = Math.min(adjustedConfidence + 0.1, 1)
    if ((state.hasJobApplications ?? 0) > 0 && action.category === 'find_job') adjustedImpact *= 1.2
    const score = (adjustedImpact * adjustedConfidence) / Math.max(action.effort, 1)
    return { action, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.action)
}

export function getActionLibrary(): NextAction[] { return ACTION_LIBRARY }
export function getActionsByMode(mode: ServiceMode): NextAction[] { return ACTION_LIBRARY.filter(a => a.mode === mode) }

export function calculateActionSequenceValue(actions: NextAction[]): { totalValue: number; totalEffort: number; totalWuCost: number; valuePerEffort: number } {
  const totalValue = actions.reduce((sum, a) => sum + a.expectedValue, 0)
  const totalEffort = actions.reduce((sum, a) => sum + a.effort, 0)
  const totalWuCost = actions.reduce((sum, a) => sum + (a.labourCost ?? 0), 0)
  const valuePerEffort = totalEffort > 0 ? totalValue / totalEffort : 0
  return { totalValue, totalEffort, totalWuCost, valuePerEffort }
}
