import type { UserIntentCategory, ServiceMode, ValueMetric, CommercialFlow } from './types'

export function calculateValue(intent: UserIntentCategory, mode: ServiceMode): ValueMetric {
  const baseValues: Record<string, { simple: number; labour: number; unit: string }> = {
    optimize_profile: { simple: 30, labour: 80, unit: 'employability_points' },
    find_job: { simple: 20, labour: 90, unit: 'match_quality' },
    get_hired: { simple: 15, labour: 85, unit: 'hire_probability' },
    career_growth: { simple: 25, labour: 70, unit: 'growth_score' },
    delegate_work: { simple: 10, labour: 95, unit: 'time_saved_hours' },
    analyze_market: { simple: 40, labour: 75, unit: 'insight_quality' },
    manage_team: { simple: 20, labour: 60, unit: 'efficiency_gain' },
    learn_skill: { simple: 35, labour: 50, unit: 'skill_progress' },
    legal_compliance: { simple: 30, labour: 45, unit: 'compliance_score' },
  }
  const v = baseValues[intent] ?? { simple: 20, labour: 50, unit: 'value' }
  return {
    metric: intent,
    simpleValue: v.simple,
    labourValue: v.labour,
    combinedValue: mode === 'saas_labour' ? v.labour : v.simple,
    unit: v.unit,
  }
}

export function buildCommercialFlow(users: number, avgSubPrice: number, avgServices: number, avgUsages: number): CommercialFlow {
  const valuePerUser = avgSubPrice + (avgServices * avgUsages * 0.5)
  const retentionRate = Math.min(0.4 + (avgServices * 0.05) + (avgUsages * 0.02), 0.98)
  const profitabilityMargin = retentionRate > 0.7 ? 0.65 : 0.35
  return { users, subscriptions: users, services: avgServices, usages: avgUsages, valuePerUser, retentionRate, profitabilityMargin }
}

export function calculateROI(investment: number, monthlyReturn: number, months: number): number {
  return investment > 0 ? ((monthlyReturn * months - investment) / investment) * 100 : 0
}

export function valueByMode(intent: UserIntentCategory): { simpleAdvantage: string; labourAdvantage: string } {
  const advantages: Record<string, { simpleAdvantage: string; labourAdvantage: string }> = {
    optimize_profile: { simpleAdvantage: 'Control over every detail', labourAdvantage: 'AI optimizes for maximum ATS score' },
    find_job: { simpleAdvantage: 'Browse and filter at your pace', labourAdvantage: 'AI finds and applies to matching jobs' },
    get_hired: { simpleAdvantage: 'Post jobs and review manually', labourAdvantage: 'AI sources and scores candidates' },
    career_growth: { simpleAdvantage: 'Self-paced learning paths', labourAdvantage: 'AI builds personalized roadmap' },
    delegate_work: { simpleAdvantage: 'Use tools directly', labourAdvantage: 'Delegate to autonomous agents' },
    analyze_market: { simpleAdvantage: 'View reports and data', labourAdvantage: 'AI generates insights and forecasts' },
    manage_team: { simpleAdvantage: 'Dashboard and manual tracking', labourAdvantage: 'AI manages team workflows' },
    learn_skill: { simpleAdvantage: 'Follow courses at your pace', labourAdvantage: 'AI tutoring and adaptation' },
    legal_compliance: { simpleAdvantage: 'Access templates', labourAdvantage: 'AI reviews and suggests compliance' },
  }
  return advantages[intent] ?? { simpleAdvantage: 'Direct access', labourAdvantage: 'AI-powered automation' }
}
