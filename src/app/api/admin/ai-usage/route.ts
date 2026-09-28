/**
 * HireNova AI Usage Admin API (Admin Only)
 *
 * GET /api/admin/ai-usage — Global AI usage analytics
 *   Query params: startDate, endDate, module (optional)
 *
 * GET /api/admin/ai-usage?userId=xxx — Single user detailed usage
 *   Query params: userId, startDate, endDate, module (all optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { getAIUsageSummary, getUserAIUsageWithPlan, getUserAIUsageDetail } from '@/lib/ai-usage-engine'

export async function GET(request: NextRequest) {
  try {
    // --- Auth + Admin check ---
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10)
    const aiModule = searchParams.get('module') || undefined

    // --- Single user detailed view ---
    if (userId) {
      const [user, records, _usage] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, plan: true } }),
        getUserAIUsageDetail(userId, { startDate, endDate, module: aiModule }),
        getUserAIUsageWithPlan(userId, 'free'), // placeholder, re-fetched with correct plan below
      ])

      if (!user) {
        return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
      }

      // Re-fetch with the user's actual plan
      const planUsage = await getUserAIUsageWithPlan(userId, user.plan || 'free')

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
        usage: planUsage,
        records,
      })
    }

    // --- Global analytics ---
    const summary = await getAIUsageSummary({ startDate, endDate, module: aiModule })

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      ...summary,
    })
  } catch (error) {
    console.error('[AI-Usage] Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
