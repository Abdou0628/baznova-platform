import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { db } from '@/lib/db'

const PLAN_CONFIG = {
  pro: {
    product_name: 'BazNova Pro',
    unit_amount: 14900, // 149.00 MAD in centimes
  },
  elite: {
    product_name: 'BazNova Elite',
    unit_amount: 39900, // 399.00 MAD in centimes
  },
} as const

type PlanId = keyof typeof PLAN_CONFIG

interface CheckoutRequestBody {
  planId: string
  userId: string
}

function isValidBody(body: unknown): body is CheckoutRequestBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.planId === 'string' &&
    (b.planId === 'pro' || b.planId === 'elite') &&
    typeof b.userId === 'string'
  )
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check Stripe configuration
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // 2. Parse and validate request body
    const body: unknown = await request.json()

    if (!isValidBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: planId (pro | elite), userId' },
        { status: 400 }
      )
    }

    const { planId, userId } = body
    const config = PLAN_CONFIG[planId as PlanId]

    // 3. Look up user for email/name
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: config.product_name,
            },
            unit_amount: config.unit_amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?payment=cancel`,
      customer_email: user.email,
      metadata: {
        planId,
        userId,
        name: user.name || '',
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          planId,
          userId,
        },
      },
    })

    // 5. Return session details
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('[payments/checkout] Error creating checkout session:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
