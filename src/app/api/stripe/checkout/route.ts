import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { stripe, isStripeConfigured, STRIPE_PRICE_IDS, PLAN_PRICES, VALID_PLANS, type Currency, type HireNovaPlan } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    // 2. Stripe config check
    if (!isStripeConfigured()) {
      return NextResponse.json({
        error: 'Stripe n\'est pas encore configuré. Utilisez PayMob pour les paiements MAD.',
        code: 'STRIPE_NOT_CONFIGURED'
      }, { status: 503 })
    }

    // 3. Validate request
    const body = await request.json()
    const { planType, currency: currencyParam } = body as { planType?: string; currency?: string }

    if (!planType || !VALID_PLANS.includes(planType as HireNovaPlan)) {
      return NextResponse.json(
        { error: `Plan invalide. Options: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      )
    }

    const currency = (['eur', 'usd', 'gbp'].includes(currencyParam) ? currencyParam : 'eur') as Currency
    const plan = planType as HireNovaPlan

    // MAD not supported via Stripe — redirect to PayMob
    if (currency === 'mad') {
      return NextResponse.json({
        error: 'Utilisez PayMob pour les paiements en MAD.',
        code: 'USE_PAYMOB',
        paymobUrl: '/api/paymob/checkout'
      }, { status: 400 })
    }

    // 4. Check if user already has a plan
    const user = await db.user.findUnique({
      where: { id: auth.userId! },
      select: { id: true, email: true, name: true, plan: true, stripeCustomerId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // 5. Get or create Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // 6. Get price ID
    const priceId = STRIPE_PRICE_IDS[currency]?.[plan]
    if (!priceId || priceId.startsWith('price_') === false) {
      return NextResponse.json({
        error: `Ce plan n'est pas encore configuré pour ${currency.toUpperCase()}.`,
        code: 'PRICE_NOT_CONFIGURED'
      }, { status: 503 })
    }

    // 7. Create Stripe Checkout Session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const isAnnual = plan === 'annual'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: isAnnual ? 'payment' : 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success&plan=${plan}&provider=stripe`,
      cancel_url: `${baseUrl}/?checkout=canceled`,
      metadata: {
        userId: auth.userId!,
        planType: plan,
        currency,
      },
      allow_promotion_codes: true,
      subscription_data: isAnnual ? undefined : {
        metadata: {
          userId: auth.userId!,
          planType: plan,
          currency,
        },
      },
      payment_intent_data: isAnnual ? {
        metadata: {
          userId: auth.userId!,
          planType: plan,
          currency,
        },
      } : undefined,
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      provider: 'stripe',
    })
  } catch (error) {
    console.error('[stripe/checkout] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
