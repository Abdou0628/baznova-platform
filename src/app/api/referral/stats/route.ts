import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const userId = auth.userId

    const [total, completed, rewarded, pending, recentReferrals] = await Promise.all([
      db.referral.count({ where: { referrerId: userId } }),
      db.referral.count({ where: { referrerId: userId, status: { in: ['COMPLETED', 'REWARDED'] } } }),
      db.referral.count({ where: { referrerId: userId, status: 'REWARDED' } }),
      db.referral.count({ where: { referrerId: userId, status: 'PENDING' } }),
      db.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          referredEmail: true,
          status: true,
          rewardType: true,
          rewardValue: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ])

    const freeMonthsEarned = rewarded // Each reward = 1 free month

    return NextResponse.json({
      success: true,
      data: {
        totalReferrals: total,
        completedReferrals: completed,
        rewardedReferrals: rewarded,
        pendingReferrals: pending,
        freeMonthsEarned,
        recentReferrals,
      },
    })
  } catch (error) {
    console.error('[Referral Stats Error]', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 }
    )
  }
}
