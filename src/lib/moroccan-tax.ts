/**
 * @module moroccan-tax
 * @description
 * HireNova — Moroccan Tax System (simplified)
 * Covers IS (Corporate Income Tax) with progressive brackets and TVA (VAT).
 *
 * All monetary amounts are in MAD (not centimes).
 */

// ============================================================================
// IS (Impôt sur les Sociétés) — Progressive Brackets
// ============================================================================

export const IS_BRACKETS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 1000000, rate: 0.10 },
  { min: 1000000, max: 5000000, rate: 0.175 },
  { min: 5000000, max: Infinity, rate: 0.30 },
] as const

// ============================================================================
// TVA (Taxe sur la Valeur Ajoutée) — VAT Rates
// ============================================================================

export const TVA_RATES = {
  standard: 0.20,
  reduced: 0.14,
  hospitality: 0.10,
  essential: 0.07,
} as const

// ============================================================================
// Tax Report Type
// ============================================================================

export interface TaxReport {
  revenue: number
  expenses: number
  taxableRevenue: number
  isRate: number
  isAmount: number
  tvaCollected: number
  tvaDeductible: number
  tvaNet: number
  totalTax: number
}

// ============================================================================
// IS Calculation
// ============================================================================

/**
 * Calculate Impôt sur les Sociétés (IS) using progressive brackets.
 * @param revenue - Total revenue (MAD)
 * @returns {{ taxableAmount: number, rate: number, tax: number }}
 */
export function calculateIS(revenue: number): {
  taxableAmount: number
  rate: number
  tax: number
} {
  if (revenue <= 0) {
    return { taxableAmount: 0, rate: 0, tax: 0 }
  }

  let remaining = revenue
  let totalTax = 0
  let appliedRate = 0

  for (const bracket of IS_BRACKETS) {
    if (remaining <= 0) break

    const bracketWidth = bracket.max === Infinity ? remaining : bracket.max - bracket.min
    const taxableInBracket = Math.min(remaining, bracketWidth)

    if (taxableInBracket > 0) {
      totalTax += taxableInBracket * bracket.rate
      if (bracket.rate > 0) {
        appliedRate = bracket.rate
      }
    }

    remaining -= taxableInBracket
  }

  return {
    taxableAmount: revenue,
    rate: appliedRate,
    tax: Math.round(totalTax * 100) / 100,
  }
}

// ============================================================================
// TVA Calculation
// ============================================================================

/**
 * Calculate TVA (VAT) for a given amount.
 * @param amount - Amount in MAD (HT)
 * @param rate - TVA rate (e.g. 0.20 for 20%)
 * @returns TVA amount in MAD
 */
export function calculateTVA(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100
}

// ============================================================================
// Full Tax Report Generation
// ============================================================================

/**
 * Generate a complete Moroccan tax report for a given period.
 * @param revenue - Total revenue in MAD
 * @param expenses - Total deductible expenses in MAD
 * @param tvaCollected - TVA collected on sales (MAD)
 * @param tvaDeductible - TVA paid on purchases (MAD)
 * @returns Full tax report
 */
export function generateTaxReport(
  revenue: number,
  expenses: number,
  tvaCollected: number,
  tvaDeductible: number
): TaxReport {
  const taxableRevenue = Math.max(0, revenue - expenses)
  const isResult = calculateIS(taxableRevenue)
  const tvaNet = tvaCollected - tvaDeductible

  return {
    revenue: Math.round(revenue * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    taxableRevenue: Math.round(taxableRevenue * 100) / 100,
    isRate: isResult.rate,
    isAmount: isResult.tax,
    tvaCollected: Math.round(tvaCollected * 100) / 100,
    tvaDeductible: Math.round(tvaDeductible * 100) / 100,
    tvaNet: Math.round(tvaNet * 100) / 100,
    totalTax: Math.round((isResult.tax + Math.max(0, tvaNet)) * 100) / 100,
  }
}
