import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { referralCode, email } = body

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Code de parrainage requis' } },
        { status: 400 }
      )
    }

    const referrer = await db.user.findUnique({
      where: { referralCode },
      select: { id: true, referralCode: true },
    })

    if (!referrer) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Code de parrainage invalide' } },
        { status: 404 }
      )
    }

    if (referrer.id === email) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Vous ne pouvez pas utiliser votre propre code' } },
        { status: 400 }
      )
    }

    const safeEmail = (email || '').toLowerCase().trim()

    if (safeEmail) {
      const existing = await db.referral.findUnique({
        where: { referrerId_referredEmail: { referrerId: referrer.id, referredEmail: safeEmail } },
      })

      if (!existing) {
        await db.referral.create({
          data: {
            referrerId: referrer.id,
            referralCode,
            referredEmail: safeEmail,
            status: 'PENDING',
            rewardType: 'FREE_MONTH',
            rewardValue: '1',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referrerId: referrer.id,
        tracked: true,
      },
    })
  } catch (error) {
    console.error('[Referral Track Error]', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: "Erreur interne du serveur" } },
      { status: 500 }
    )
  }
}
