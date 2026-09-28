import { NextRequest, NextResponse } from 'next/server'
import { calculateIS, generateTaxReport, IS_BRACKETS, TVA_RATES } from '@/lib/moroccan-tax'

/**
 * POST /api/payments/tax/calculate
 * Moroccan tax calculator — computes IS (Corporate Income Tax) with progressive brackets
 * and TVA net (VAT collected minus deductible). Returns French-labeled report.
 */

interface TaxCalculateRequest {
  revenue: number
  expenses: number
  tvaCollected: number
  tvaDeductible: number
  tvaRate?: number
}

interface ISBracketDetail {
  tranche: string
  taux: number
  baseImposable: number
  impot: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function formatBracketRange(min: number, max: number | typeof Infinity): string {
  if (max === Infinity) {
    return `Plus de ${(min / 1000).toLocaleString('fr-FR')} 000 MAD`
  }
  if (min === 0) {
    return `De 0 à ${(max / 1000).toLocaleString('fr-FR')} 000 MAD`
  }
  return `De ${(min / 1000).toLocaleString('fr-FR')} 000 à ${(max / 1000).toLocaleString('fr-FR')} 000 MAD`
}

function computeBracketBreakdown(taxableRevenue: number): ISBracketDetail[] {
  const breakdown: ISBracketDetail[] = []
  let remaining = taxableRevenue

  for (const bracket of IS_BRACKETS) {
    const bracketWidth = bracket.max === Infinity ? remaining : bracket.max - bracket.min
    const taxableInBracket = Math.min(Math.max(0, remaining), bracketWidth)
    const impot = round2(taxableInBracket * bracket.rate)

    breakdown.push({
      tranche: formatBracketRange(bracket.min, bracket.max),
      taux: bracket.rate,
      baseImposable: round2(taxableInBracket),
      impot,
    })

    remaining -= taxableInBracket
    if (remaining <= 0) break
  }

  return breakdown
}

function validateNonNegative(value: unknown, field: string): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TaxCalculateRequest
    const { revenue, expenses, tvaCollected, tvaDeductible, tvaRate } = body

    // Validate all required inputs are non-negative numbers
    const fields: Array<{ key: keyof TaxCalculateRequest; label: string; value: unknown }> = [
      { key: 'revenue', label: 'Chiffre d\'affaires', value: revenue },
      { key: 'expenses', label: 'Charges déductibles', value: expenses },
      { key: 'tvaCollected', label: 'TVA collectée', value: tvaCollected },
      { key: 'tvaDeductible', label: 'TVA déductible', value: tvaDeductible },
    ]

    const parsed: Record<string, number> = {}

    for (const field of fields) {
      const result = validateNonNegative(field.value, field.key)
      if (result === null) {
        return NextResponse.json(
          {
            error: `Le champ « ${field.label} » doit être un nombre positif ou nul.`,
            field: field.key,
          },
          { status: 400 },
        )
      }
      parsed[field.key] = result
    }

    // Optional tvaRate validation
    let effectiveTvaRate: number | undefined
    if (tvaRate !== undefined) {
      if (typeof tvaRate !== 'number' || !Number.isFinite(tvaRate) || tvaRate < 0) {
        return NextResponse.json(
          {
            error: 'Le taux de TVA doit être un nombre positif ou nul.',
            field: 'tvaRate',
          },
          { status: 400 },
        )
      }
      effectiveTvaRate = tvaRate
    }

    const revenueVal = parsed.revenue
    const expensesVal = parsed.expenses
    const tvaCollectedVal = parsed.tvaCollected
    const tvaDeductibleVal = parsed.tvaDeductible

    // Generate the full tax report
    const report = generateTaxReport(revenueVal, expensesVal, tvaCollectedVal, tvaDeductibleVal)

    // Compute IS progressive bracket breakdown for display
    const taxableRevenue = Math.max(0, revenueVal - expensesVal)
    const isBreakdown = computeBracketBreakdown(taxableRevenue)

    // Identify which TVA rate label applies based on optional tvaRate param
    let tvaRateLabel: string | undefined
    if (effectiveTvaRate !== undefined) {
      const rateEntries = Object.entries(TVA_RATES) as Array<[string, number]>
      const matched = rateEntries.find(([, v]) => v === effectiveTvaRate)
      const rateLabels: Record<string, string> = {
        standard: 'Taux normal (20%)',
        reduced: 'Taux réduit (14%)',
        hospitality: 'Taux hôtellerie (10%)',
        essential: 'Taux de première nécessité (7%)',
      }
      tvaRateLabel = matched ? rateLabels[matched[0]] : undefined
    }

    return NextResponse.json({
      // Tax report with French labels
      rapport: {
        chiffreAffaires: report.revenue,
        chargesDeductibles: report.expenses,
        resultatImposable: report.taxableRevenue,
        impotSurSocietes: {
          tauxEffectif: report.isRate,
          montant: report.isAmount,
          decompositionTranches: isBreakdown,
        },
        tva: {
          tvaCollectee: report.tvaCollected,
          tvaDeductible: report.tvaDeductible,
          tvaNette: report.tvaNet,
          ...(tvaRateLabel ? { tauxUtilise: tvaRateLabel } : {}),
        },
        chargeFiscaleTotale: report.totalTax,
      },
      // Raw IS brackets info for frontend table rendering
      tranchesIS: IS_BRACKETS.map((b) => ({
        minimum: b.min,
        maximum: b.max,
        taux: b.rate,
        libelle: formatBracketRange(b.min, b.max),
      })),
      // Available TVA rates for reference
      tauxTVA: Object.entries(TVA_RATES).map(([key, value]) => ({
        cle: key,
        taux: value,
        libelle: {
          standard: 'Taux normal',
          reduced: 'Taux réduit',
          hospitality: 'Taux hôtellerie',
          essential: 'Taux de première nécessité',
        }[key],
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
