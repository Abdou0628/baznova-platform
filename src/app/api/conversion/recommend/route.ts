import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getGoalRecommendation,
  calculateValue,
  isValidGoal,
  type UserGoal,
} from '@/lib/conversion-engine'
import { type Currency, type BillingPeriod, VALID_CURRENCIES, VALID_BILLING_PERIODS } from '@/lib/pricing-engine'
import { db } from '@/lib/db'
import { withAuth, forwardToSIEM, createSIEMEvent } from '@/lib/hnsa'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse body
    const body = await request.json()
    const { goal, currency = 'eur', billing = 'monthly' } = body as {
      goal: string
      currency?: Currency
      billing?: BillingPeriod
    }

    // Validate goal
    if (!goal || !isValidGoal(goal)) {
      return NextResponse.json(
        {
          error: `Invalid goal. Must be one of: create_cv, find_job, prepare_interview, develop_career, freelance, international, enterprise`,
        },
        { status: 400 },
      )
    }

    // Validate currency
    if (currency && !VALID_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}` },
        { status: 400 },
      )
    }

    // Validate billing
    if (billing && !VALID_BILLING_PERIODS.includes(billing)) {
      return NextResponse.json(
        { error: `Invalid billing period. Must be one of: ${VALID_BILLING_PERIODS.join(', ')}` },
        { status: 400 },
      )
    }

    // Get recommendation and value calculation
    const recommendation = getGoalRecommendation(goal as UserGoal)
    const value = calculateValue(goal as UserGoal, billing as BillingPeriod, currency as Currency)

    // Try to get authenticated user (optional — works for anonymous too)
    let userContext: {
      isAuthenticated: boolean
      currentPlan?: string
      currentPlanName?: string
      needsUpgrade?: boolean
      missingModules?: string[]
    } | null = null

    try {
      const auth = await withAuth(request)
      if (auth.authorized && auth.userId) {
        const user = await db.user.findUnique({
          where: { id: auth.userId },
          select: { plan: true, name: true },
        })

        if (user) {
          userContext = {
            isAuthenticated: true,
            currentPlan: user.plan,
            currentPlanName: user.plan.replace(/_/g, ' ').toUpperCase(),
          }

          // Check if user already has the recommended bundle
          if (recommendation.primaryBundle.id !== 'b2b_recruiter_enterprise') {
            const planOrder = ['free', 'hirenova_start', 'hirenova_career', 'hirenova_professional', 'hirenova_ai_power']
            const currentIdx = planOrder.indexOf(user.plan)
            const recommendedIdx = planOrder.indexOf(recommendation.primaryBundle.id)
            userContext.needsUpgrade = recommendedIdx > currentIdx
          }
        }
      }
    } catch {
      // Auth check failed — continue anonymously
      userContext = { isAuthenticated: false }
    }

    return NextResponse.json({
      data: {
        recommendation,
        value,
        userContext,
      },
      meta: {
        goal,
        currency,
        billing,
        latencyMs: Date.now() - startTime,
      },
    })
  } catch (error) {
    // SIEM logging
    try {
      await forwardToSIEM(createSIEMEvent({
        type: 'API_ABUSE_DETECTED',
        severity: 'warning',
        path: request.url,
        metadata: {
          action: 'conversion_recommend_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }))
    } catch { /* ignore SIEM failures */ }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
