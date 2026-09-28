import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { createPaymobCheckout, isPaymobConfigured, PAYMOB_PRICES, type PaymobPlan, type PaymobBillingData } from '@/lib/paymob'

/**
 * PayMob Checkout API — Create a PayMob payment session.
 *
 * Note: The unified /api/checkout route is preferred for general use.
 * This endpoint is kept for direct PayMob integration.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPaymobConfigured()) {
      return NextResponse.json({ error: 'Paymob is not configured' }, { status: 503 })
    }

    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { planType: planTypeParam, billingData: clientBilling } = body as {
      planType?: string
      billingData?: {
        firstName?: string
        lastName?: string
        email?: string
        phoneNumber?: string
        city?: string
        state?: string
        country?: string
        postalCode?: string
        street?: string
        building?: string
        apartment?: string
        floor?: string
      }
    }

    const validPlans: PaymobPlan[] = ['starter', 'pro', 'career_plus', 'employer', 'annual']
    if (!planTypeParam || !validPlans.includes(planTypeParam as PaymobPlan)) {
      return NextResponse.json({ error: 'Invalid planType. Must be: ' + validPlans.join(', ') }, { status: 400 })
    }

    const planType = planTypeParam as PaymobPlan
    const userId = auth.userId!

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true, name: true, plan: true,
        resumes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { phone: true, location: true, fullName: true, email: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.plan !== 'free') {
      return NextResponse.json({ error: 'You already have an active plan' }, { status: 400 })
    }

    // Build billing data from: client body > user's latest resume > user profile > safe defaults
    const latestResume = user.resumes?.[0]
    const billingData: PaymobBillingData = {
      firstName: clientBilling?.firstName || latestResume?.fullName?.split(' ')[0] || user.name?.split(' ')[0] || undefined,
      lastName: clientBilling?.lastName || latestResume?.fullName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || undefined,
      email: clientBilling?.email || latestResume?.email || user.email || undefined,
      phoneNumber: clientBilling?.phoneNumber || latestResume?.phone || undefined,
      city: clientBilling?.city || latestResume?.location || undefined,
      state: clientBilling?.state || undefined,
      country: clientBilling?.country || undefined,
      postalCode: clientBilling?.postalCode || undefined,
      street: clientBilling?.street || undefined,
      building: clientBilling?.building || undefined,
      apartment: clientBilling?.apartment || undefined,
      floor: clientBilling?.floor || undefined,
    }

    const result = await createPaymobCheckout({
      userId,
      userEmail: user.email,
      userName: user.name || 'User',
      planType,
      billingData,
    })

    // Save Paymob order ID to user
    await db.user.update({
      where: { id: userId },
      data: { paymobOrderId: result.orderId },
    })

    return NextResponse.json({
      url: result.paymentUrl,
      orderId: result.orderId,
      plan: planType,
      amount: PAYMOB_PRICES[planType],
      currency: 'MAD',
    })
  } catch (error) {
    console.error('Paymob checkout error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
