/**
 * HNSA — Account Lockout Management API (Admin Only)
 *
 * GET    /api/admin/security-lockouts       — List all lockouts
 * POST   /api/admin/security-lockouts       — Manually unlock an account
 *
 * HNSA Pillars: 1 (Identity), 8 (Monitoring)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unlockAccount, getLockoutStatus, logAudit, AUDIT_ACTIONS, withAuth } from '@/lib/hnsa'

/** GET — List all lockouts (paginated) */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = request.nextUrl
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const skip = (page - 1) * limit

    const [lockouts, total] = await Promise.all([
      db.accountLockout.findMany({
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.accountLockout.count(),
    ])

    return NextResponse.json({
      success: true,
      lockouts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[HNSA] Lockouts list error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/** POST — Unlock an account */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const adminId = auth.userId!

    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const unlocked = await unlockAccount(email, adminId)

    if (unlocked) {
      await logAudit({
        actorId: adminId,
        actorEmail: auth.email!,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.ADMIN.ADMIN_USER_UNLOCKED,
        resource: 'account_lockout',
        resourceId: email,
        outcome: 'success',
        path: '/api/admin/security-lockouts',
        method: 'POST',
        details: { email },
      })
    }

    return NextResponse.json({
      success: true,
      unlocked,
      message: unlocked
        ? `Account ${email} has been unlocked`
        : `Account ${email} was not locked`,
    })
  } catch (error) {
    console.error('[HNSA] Unlock error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
