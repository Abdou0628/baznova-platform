import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { generateAccountingStatement } from '@/lib/documents'

/**
 * Compute period start/end from a preset string.
 * Presets: this_month | last_month | this_quarter | last_quarter | this_year | last_year | ytd
 */
function resolvePreset(preset: string, tz = 'Africa/Casablanca'): { start: Date; end: Date } | null {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  switch (preset) {
    case 'this_month':
      return {
        start: new Date(year, month, 1, 0, 0, 0, 0),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      }
    case 'last_month':
      return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      }
    case 'this_quarter': {
      const qStartMonth = Math.floor(month / 3) * 3
      return {
        start: new Date(year, qStartMonth, 1, 0, 0, 0, 0),
        end: new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999),
      }
    }
    case 'last_quarter': {
      const qStartMonth = Math.floor(month / 3) * 3 - 3
      const qYear = qStartMonth < 0 ? year - 1 : year
      const adjustedStart = qStartMonth < 0 ? qStartMonth + 12 : qStartMonth
      return {
        start: new Date(qYear, adjustedStart, 1, 0, 0, 0, 0),
        end: new Date(qYear, adjustedStart + 3, 0, 23, 59, 59, 999),
      }
    }
    case 'this_year':
      return {
        start: new Date(year, 0, 1, 0, 0, 0, 0),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      }
    case 'last_year':
      return {
        start: new Date(year - 1, 0, 1, 0, 0, 0, 0),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      }
    case 'ytd': // year to date
      return {
        start: new Date(year, 0, 1, 0, 0, 0, 0),
        end: now,
      }
    default:
      return null
  }
}

/**
 * POST /api/admin/documents/bilan
 * Admin: generate an accounting statement (bilan comptable) for a period.
 *
 * The bilan aggregates all paid invoices in the period and computes:
 *   - Total HT, Total TVA, Total TTC encaissé
 *   - Frais de plateforme (payment processing + infra)
 *   - Redevances (royalties)
 *   - Bénéfice net (profit)
 *
 * Body:
 *   {
 *     "preset": "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "ytd",
 *     // OR custom dates:
 *     "periodStart": "2026-01-01",
 *     "periodEnd": "2026-01-31",
 *     // Optional overrides:
 *     "platformFeesRate": 0.03,      // 3% of total collected
 *     "platformFeesFixed": 0.30,     // fixed fee per invoice
 *     "royaltyFees": 0,              // total royalties for the period
 *     "currency": "EUR",
 *     "notes": "..."
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const {
      preset,
      periodStart: rawStart,
      periodEnd: rawEnd,
      platformFeesRate,
      platformFeesFixed,
      royaltyFees,
      currency,
      notes,
    } = body || {}

    // Resolve period
    let start: Date
    let end: Date

    if (preset) {
      const resolved = resolvePreset(preset)
      if (!resolved) {
        return NextResponse.json(
          { error: `Preset invalide. Valeurs acceptées: this_month, last_month, this_quarter, last_quarter, this_year, last_year, ytd` },
          { status: 400 }
        )
      }
      start = resolved.start
      end = resolved.end
    } else if (rawStart && rawEnd) {
      start = new Date(rawStart)
      end = new Date(rawEnd)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
      }
      // Ensure end of day for the end date
      end.setHours(23, 59, 59, 999)
    } else {
      return NextResponse.json(
        { error: 'Spécifiez un preset ou periodStart + periodEnd' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json({ error: 'La date de début doit être antérieure à la date de fin' }, { status: 400 })
    }

    // Generate the bilan
    const result = await generateAccountingStatement({
      periodStart: start,
      periodEnd: end,
      platformFeesRate: typeof platformFeesRate === 'number' ? platformFeesRate : undefined,
      platformFeesFixed: typeof platformFeesFixed === 'number' ? platformFeesFixed : undefined,
      royaltyFees: typeof royaltyFees === 'number' ? royaltyFees : undefined,
      currency: currency || 'EUR',
      notes,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        number: result.number,
        type: result.type,
        invoiceCount: result.invoiceCount,
        totalCollected: result.totalCollected,
        netProfit: result.netProfit,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    })
  } catch (error) {
    console.error('[admin/documents/bilan] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur lors de la génération du bilan' },
      { status: 500 }
    )
  }
}
