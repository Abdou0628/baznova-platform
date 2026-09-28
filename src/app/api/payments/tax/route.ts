import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateIS, calculateTVA, generateTaxReport, IS_BRACKETS, TVA_RATES } from '@/lib/moroccan-tax'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) // optional — specific month

    // Aggregate payment data for the period
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1)
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999)

    const payments = await db.payment.findMany({
      where: {
        status: 'succeeded',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, currency: true },
    })

    // Sum revenue (convert from cents to MAD)
    const revenue = payments.reduce((sum, p) => sum + (p.currency === 'mad' ? p.amount / 100 : p.amount / 100 * 10.85), 0)

    // Get active subscriptions count
    const activeSubs = await db.userSubscription.count({
      where: { status: 'active' },
    })

    // Get subscription breakdown
    const proPlan = await db.subscriptionPlan.findFirst({ where: { name: 'Pro' } })
    const elitePlan = await db.subscriptionPlan.findFirst({ where: { name: 'Elite' } })

    const proCount = proPlan
      ? await db.userSubscription.count({ where: { planId: proPlan.id, status: 'active' } })
      : 0
    const eliteCount = elitePlan
      ? await db.userSubscription.count({ where: { planId: elitePlan.id, status: 'active' } })
      : 0

    // Calculate taxes
    const expenses = 0 // Would need expense tracking — placeholder
    const tvaCollected = calculateTVA(revenue, TVA_RATES.standard)
    const tvaDeductible = calculateTVA(expenses, TVA_RATES.standard)
    const isResult = calculateIS(revenue - expenses)

    const report = generateTaxReport(revenue, expenses, tvaCollected, tvaDeductible)

    // Upsert tax record
    if (month) {
      await db.taxRecord.upsert({
        where: { year_month: { year, month } },
        create: {
          year,
          month,
          revenue,
          expenses,
          taxableRevenue: report.taxableRevenue,
          isRate: report.isRate,
          isAmount: report.isAmount,
          tvaCollected: report.tvaCollected,
          tvaDeductible: report.tvaDeductible,
          tvaNet: report.tvaNet,
          totalTax: report.totalTax,
          status: 'calculated',
        },
        update: {
          revenue,
          expenses,
          taxableRevenue: report.taxableRevenue,
          isRate: report.isRate,
          isAmount: report.isAmount,
          tvaCollected: report.tvaCollected,
          tvaDeductible: report.tvaDeductible,
          tvaNet: report.tvaNet,
          totalTax: report.totalTax,
        },
      })
    }

    return NextResponse.json({
      period: { year, month: month || null },
      revenue,
      expenses,
      activeSubscriptions: activeSubs,
      subscriptionBreakdown: { pro: proCount, elite: eliteCount },
      tax: report,
      isBrackets: IS_BRACKETS,
      tvaRates: TVA_RATES,
    })
  } catch (error) {
    console.error('[payments/tax] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tax summary' }, { status: 500 })
  }
}
