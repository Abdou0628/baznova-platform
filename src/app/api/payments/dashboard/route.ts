import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTaxReport, IS_BRACKETS, TVA_RATES } from '@/lib/moroccan-tax'

const CURRENCY_TO_MAD: Record<string, number> = { MAD: 1, EUR: 10.85, USD: 10.40, GBP: 13.65 }

function centsToMad(cents: number, currency: string): number {
  return (cents / 100) * (CURRENCY_TO_MAD[currency.toUpperCase()] ?? 1)
}

function parseMeta(m: string | null | undefined): Record<string, unknown> | null {
  if (!m) return null
  try { const p = JSON.parse(m); return typeof p === 'object' && p !== null ? p as Record<string, unknown> : null } catch { return null }
}

export async function GET() {
  try {
    const now = new Date()
    const Y = now.getFullYear(), M = now.getMonth() + 1
    const LM = M === 1 ? 12 : M - 1, LY = M === 1 ? Y - 1 : Y
    const cr = { gte: new Date(Y, M - 1, 1), lte: new Date(Y, M, 0, 23, 59, 59, 999) }
    const lr = { gte: new Date(LY, LM - 1, 1), lte: new Date(LY, LM, 0, 23, 59, 59, 999) }

    const [allOk, thisOk, lastOk, subs, newSub, newSubLast, pInv, recent, sixM, taxRec, plans] = await Promise.all([
      db.payment.findMany({ where: { status: 'succeeded' }, select: { amount: true, currency: true } }),
      db.payment.findMany({ where: { status: 'succeeded', createdAt: cr }, select: { amount: true, currency: true } }),
      db.payment.findMany({ where: { status: 'succeeded', createdAt: lr }, select: { amount: true, currency: true } }),
      db.userSubscription.findMany({ where: { status: 'active' }, include: { plan: { select: { name: true, price: true, currency: true } } } }),
      db.userSubscription.count({ where: { createdAt: cr } }),
      db.userSubscription.count({ where: { createdAt: lr } }),
      db.invoice.findMany({ where: { status: { in: ['pending', 'draft'] } }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
      db.payment.findMany({ where: { status: 'succeeded' }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.payment.findMany({ where: { status: 'succeeded', createdAt: { gte: new Date(Y, M - 7, 1), lt: new Date(Y, M, 1) } }, select: { amount: true, currency: true, createdAt: true } }),
      db.taxRecord.findUnique({ where: { year_month: { year: Y, month: M } } }),
      db.subscriptionPlan.findMany({ select: { id: true, name: true } }),
    ])

    const c2m = (a: number, c: string) => centsToMad(a, c)
    const totalRev = allOk.reduce((s, p) => s + c2m(p.amount, p.currency), 0)
    const mrr = subs.reduce((s, sub) => s + sub.plan.price * (CURRENCY_TO_MAD[sub.plan.currency?.toUpperCase() ?? 'MAD'] ?? 1), 0)
    const thisRev = thisOk.reduce((s, p) => s + c2m(p.amount, p.currency), 0)
    const lastRev = lastOk.reduce((s, p) => s + c2m(p.amount, p.currency), 0)
    const rTrend = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 10000) / 100 : (thisRev > 0 ? 100 : 0)
    const sTrend = newSubLast > 0 ? Math.round(((newSub - newSubLast) / newSubLast) * 10000) / 100 : (newSub > 0 ? 100 : 0)

    const txns = recent.map(p => {
      const meta = parseMeta(p.metadata)
      return { id: p.id, clientName: p.user?.name ?? 'Anonyme', email: p.user?.email ?? '', amountMAD: Math.round(c2m(p.amount, p.currency) * 100) / 100, currency: p.currency, status: p.status, provider: p.provider, plan: typeof meta?.plan === 'string' ? meta.plan : '', description: p.description, createdAt: p.createdAt.toISOString() }
    })

    const mMap = new Map<string, number>()
    for (let i = 5; i >= 0; i--) { const d = new Date(Y, M - 1 - i, 1); mMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0) }
    for (const p of sixM) { const k = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`; mMap.set(k, (mMap.get(k) ?? 0) + c2m(p.amount, p.currency)) }
    const monthlyRev = Array.from(mMap.entries()).map(([k, a]) => { const [y, m] = k.split('-'); return { month: new Date(Number(y), Number(m) - 1, 1).toLocaleString('fr-FR', { month: 'short' }), amount: Math.round(a * 100) / 100 } })

    const pMap = new Map(plans.map(p => [p.id, p.name]))
    const sbp = new Map<string, number>()
    for (const sub of subs) { const n = pMap.get(sub.planId) ?? sub.plan.name; sbp.set(n, (sbp.get(n) ?? 0) + 1) }
    const subBreak = Array.from(sbp.entries()).map(([planName, count]) => ({ planName, count })).sort((a, b) => b.count - a.count)

    let taxSummary
    if (taxRec) {
      taxSummary = { revenueMAD: taxRec.revenue, estimatedExpensesMAD: taxRec.expenses, taxReport: { revenue: taxRec.revenue, expenses: taxRec.expenses, taxableRevenue: taxRec.taxableRevenue, isRate: taxRec.isRate, isAmount: taxRec.isAmount, tvaCollected: taxRec.tvaCollected, tvaDeductible: taxRec.tvaDeductible, tvaNet: taxRec.tvaNet, totalTax: taxRec.totalTax }, source: 'cached' as const }
    } else {
      const tvaC = thisRev * TVA_RATES.standard
      const report = generateTaxReport(thisRev, 0, tvaC, 0)
      taxSummary = { revenueMAD: thisRev, estimatedExpensesMAD: 0, taxReport: report, source: 'calculated' as const }
    }

    const pInvList = pInv.map(inv => ({ id: inv.id, invoiceNumber: inv.invoiceNumber, amountMAD: Math.round(c2m(inv.amount, inv.currency) * 100) / 100, currency: inv.currency, status: inv.status, description: inv.description, dueDate: inv.dueDate?.toISOString() ?? null, clientName: inv.user?.name ?? 'Anonyme', createdAt: inv.createdAt.toISOString() }))

    return NextResponse.json({
      totalRevenueMAD: Math.round(totalRev * 100) / 100, mrrMAD: Math.round(mrr * 100) / 100,
      activeSubscriptionsCount: subs.length, pendingInvoicesCount: pInv.length,
      revenueTrendPercent: rTrend, subscriptionTrendPercent: sTrend,
      recentTransactions: txns, monthlyRevenue: monthlyRev, subBreakdown: subBreak,
      taxSummary, pendingInvoices: pInvList, isBrackets: IS_BRACKETS, tvaRates: TVA_RATES,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: `Dashboard error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
