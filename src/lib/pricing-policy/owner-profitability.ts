export interface ProfitabilityMetrics {
  mrr: number
  wuRevenue: number
  orchestrationPremium: number
  totalRevenue: number
  operationalCost: number
  netMargin: number
  ltv: number
  retentionRate: number
}

export function calculateProfitability(users: number, avgSubPrice: number, avgWuPerUser: number, wuPrice: number, avgOrchestrationTier: number): ProfitabilityMetrics {
  const mrr = users * avgSubPrice
  const wuRevenue = users * avgWuPerUser * wuPrice
  const orchestrationPremium = users * avgOrchestrationTier * 10
  const totalRevenue = mrr + wuRevenue + orchestrationPremium
  const operationalCost = totalRevenue * 0.35
  const netMargin = (totalRevenue - operationalCost) / totalRevenue
  const retentionRate = Math.min(0.4 + (avgOrchestrationTier * 0.08) + (avgWuPerUser * 0.002), 0.98)
  const ltv = (avgSubPrice + avgWuPerUser * wuPrice + avgOrchestrationTier * 10) / (1 - retentionRate)
  return { mrr, wuRevenue, orchestrationPremium, totalRevenue, operationalCost, netMargin, ltv, retentionRate }
}

export interface CohortData { month: number; users: number; revenue: number; churnRate: number }

export function calculateCohortProfitability(initialUsers: number, monthlyGrowth: number, monthlyChurn: number, avgRevenue: number, months: number): CohortData[] {
  const cohorts: CohortData[] = []
  let currentUsers = initialUsers
  for (let m = 1; m <= months; m++) {
    currentUsers = currentUsers * (1 + monthlyGrowth) * (1 - monthlyChurn)
    cohorts.push({ month: m, users: Math.round(currentUsers), revenue: currentUsers * avgRevenue, churnRate: monthlyChurn })
  }
  return cohorts
}

export function projectRevenueGrowth(currentMrr: number, monthlyGrowthRate: number, months: number): { month: number; mrr: number; cumulative: number }[] {
  const projections: { month: number; mrr: number; cumulative: number }[] = []
  let cumulative = 0
  for (let m = 1; m <= months; m++) {
    const mrr = currentMrr * Math.pow(1 + monthlyGrowthRate, m)
    cumulative += mrr
    projections.push({ month: m, mrr: Math.round(mrr), cumulative: Math.round(cumulative) })
  }
  return projections
}
