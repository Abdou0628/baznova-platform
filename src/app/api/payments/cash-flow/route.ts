import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ------------------------------------------------------------------ */
/*  GET  — Cash flow data: monthly inflows vs outflows                 */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const now = new Date()
    const Y = now.getFullYear()
    const M = now.getMonth() + 1

    // Get last 6 months of accounting entries
    const entries = await db.accountingEntry.findMany({
      where: {
        createdAt: { gte: new Date(Y, M - 7, 1), lt: new Date(Y, M + 1, 1) },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Also get payment data for real inflows
    const payments = await db.payment.findMany({
      where: {
        status: 'succeeded',
        createdAt: { gte: new Date(Y, M - 7, 1), lt: new Date(Y, M + 1, 1) },
      },
      select: { amount: true, currency: true, createdAt: true, provider: true },
    })

    const CURRENCY_TO_MAD: Record<string, number> = { MAD: 1, EUR: 10.85, USD: 10.40, GBP: 13.65 }
    const c2m = (a: number, c: string) => (a / 100) * (CURRENCY_TO_MAD[c.toUpperCase()] ?? 1)

    // Build monthly buckets
    const months: Array<{ key: string; label: string; inflow: number; outflow: number; net: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Y, M - 1 - i, 1)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('fr-FR', { month: 'short' })
      months.push({ key, label, inflow: 0, outflow: 0, net: 0 })
    }

    // Map payments to inflows
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (bucket) bucket.inflow += c2m(p.amount, p.currency)
    }

    // Map accounting entries
    for (const e of entries) {
      const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (!bucket) continue
      if (e.type === 'income') bucket.inflow += e.amount
      else if (e.type === 'expense' || e.type === 'platform_fee') bucket.outflow += e.amount
      else if (e.type === 'refund') bucket.outflow += e.amount
    }

    // Round and compute net
    for (const m of months) {
      m.inflow = Math.round(m.inflow * 100) / 100
      m.outflow = Math.round(m.outflow * 100) / 100
      m.net = Math.round((m.inflow - m.outflow) * 100) / 100
    }

    // Current month totals
    const current = months[months.length - 1]
    const previous = months[months.length - 2]
    const inflowTrend = previous.inflow > 0 ? Math.round(((current.inflow - previous.inflow) / previous.inflow) * 10000) / 100 : 0
    const outflowTrend = previous.outflow > 0 ? Math.round(((current.outflow - previous.outflow) / previous.outflow) * 10000) / 100 : 0

    // Burn rate (average monthly outflow)
    const avgOutflow = months.reduce((s, m) => s + m.outflow, 0) / months.length
    const runway = current.inflow > 0 && avgOutflow > 0
      ? Math.round(((current.inflow / avgOutflow) * 30)) // days of runway
      : 0

    return NextResponse.json({
      months,
      currentMonth: { inflow: current.inflow, outflow: current.outflow, net: current.net },
      trends: { inflowTrend, outflowTrend },
      metrics: {
        avgMonthlyInflow: Math.round(months.reduce((s, m) => s + m.inflow, 0) / months.length),
        avgMonthlyOutflow: Math.round(avgOutflow),
        burnRate: Math.round(avgOutflow),
        runwayDays: Math.max(0, runway),
        profitMargin: current.inflow > 0 ? Math.round(((current.net / current.inflow) * 10000) / 100) : 0,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: `Cash-flow error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
