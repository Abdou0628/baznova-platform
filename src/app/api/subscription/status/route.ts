// ─── Subscription Status API ─────────────────────────────────────────
// GET endpoint returning user's subscription state, plan, entitlements,
// and suggested next action. Uses the subscription state machine.
// ─────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import {
  getSubscriptionState,
  getValidEvents,
  getStateLabel,
  getStateColor,
  getStateBgColor,
  getNextAction,
} from '@/lib/subscription-state-machine'
import {
  getEntitlements,
  getAccessibleModules,
  getMonthlyLimits,
  getAILevel,
  resolveCanonicalPlan,
} from '@/lib/entitlement-engine'

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const userId = auth.userId!
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'fr'

    // Fetch user with subscription fields
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        updatedAt: true,
        planExpiresAt: true,
        gracePeriodUntil: true,
        cvCountThisMonth: true,
        clCountThisMonth: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      )
    }

    // Compute state via state machine
    const state = getSubscriptionState({
      plan: user.plan,
      updatedAt: user.updatedAt,
      planExpiresAt: user.planExpiresAt,
      gracePeriodUntil: user.gracePeriodUntil,
    })

    // Compute entitlements
    const entitlements = getEntitlements(user.plan)
    const modules = getAccessibleModules(user.plan)
    const limits = getMonthlyLimits(user.plan)
    const aiLevel = getAILevel(user.plan)
    const canonicalPlan = resolveCanonicalPlan(user.plan)

    // Get valid events for current state
    const validEvents = getValidEvents(state)

    // Determine next action suggestion
    const nextAction = getNextAction(state, locale)

    return NextResponse.json({
      success: true,
      data: {
        state,
        stateLabel: getStateLabel(state, locale),
        stateColor: getStateColor(state),
        stateBgColor: getStateBgColor(state),
        plan: user.plan,
        canonicalPlan,
        entitlements: {
          modules,
          features: entitlements.features,
          aiLevel,
        },
        limits: {
          cv: { used: user.cvCountThisMonth, max: limits.maxCv },
          cl: { used: user.clCountThisMonth, max: limits.maxCl },
          interviews: { used: 0, max: limits.maxInterviews },
          ats: { used: 0, max: limits.maxAts },
        },
        validEvents,
        nextAction,
        expiryInfo: {
          planExpiresAt: user.planExpiresAt,
          gracePeriodUntil: user.gracePeriodUntil,
        },
      },
    })
  } catch (error) {
    console.error('[subscription/status] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
