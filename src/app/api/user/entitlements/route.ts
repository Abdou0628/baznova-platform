import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import {
  getEntitlements,
  getAccessibleModules,
  getMonthlyLimits,
  getAILevel,
  resolveCanonicalPlan,
} from '@/lib/entitlement-engine'

// ─── In-memory cache (5 min TTL) ─────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const entitlementCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached(userId: string): unknown | null {
  const entry = entitlementCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    entitlementCache.delete(userId)
    return null
  }
  return entry.data
}

function setCache(userId: string, data: unknown): void {
  entitlementCache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

// ─── Helper: get start of current month ──────────────────────────────────────

function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const userId = auth.userId!

    // Check cache
    const cached = getCached(userId)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Fetch user plan and usage counters
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        cvCountThisMonth: true,
        clCountThisMonth: true,
        lastResetMonth: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur non trouvé' } },
        { status: 404 },
      )
    }

    const plan = user.plan
    const entitlements = getEntitlements(plan)
    const modules = getAccessibleModules(plan)
    const limits = getMonthlyLimits(plan)
    const aiLevel = getAILevel(plan)
    const canonicalPlan = resolveCanonicalPlan(plan)

    // Count interviews this month (from InterviewSession table)
    const monthStart = startOfMonth()
    const [interviewCountThisMonth] = await Promise.all([
      db.interviewSession.count({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
      }),
    ])

    // ATS analyses are not tracked separately — they co-occur with CV generations.
    // Report CV count as ATS usage proxy (same limit applies).
    const atsAnalysesThisMonth = user.cvCountThisMonth

    const usage = {
      cvUsed: user.cvCountThisMonth,
      clUsed: user.clCountThisMonth,
      interviewsUsed: interviewCountThisMonth,
      atsUsed: atsAnalysesThisMonth,
    }

    const response = {
      success: true,
      data: {
        plan,
        canonicalPlan,
        modules,
        features: entitlements.features,
        aiLevel,
        limits: {
          cv: { used: usage.cvUsed, max: limits.maxCv },
          cl: { used: usage.clUsed, max: limits.maxCl },
          interviews: { used: usage.interviewsUsed, max: limits.maxInterviews },
          ats: { used: usage.atsUsed, max: limits.maxAts },
        },
        remaining: {
          cv: Math.max(0, limits.maxCv - usage.cvUsed),
          cl: Math.max(0, limits.maxCl - usage.clUsed),
          interviews: Math.max(0, limits.maxInterviews - usage.interviewsUsed),
          ats: Math.max(0, limits.maxAts - usage.atsUsed),
        },
      },
    }

    // Cache for 5 minutes
    setCache(userId, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[user/entitlements] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 },
    )
  }
}
