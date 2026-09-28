import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { db } from '@/lib/db'

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for managing subscriptions and billing.
 * Internal use — no auth required. Caller must provide userId in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    // Stripe configuration guard
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: 'Le portail de facturation Stripe n\'est pas encore configuré. Veuillez contacter l\'administrateur.',
          code: 'STRIPE_NOT_CONFIGURED',
        },
        { status: 503 },
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'L\'identifiant utilisateur (userId) est requis.' },
        { status: 400 },
      )
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé.' },
        { status: 404 },
      )
    }

    // Get or create Stripe customer
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

    // Build return URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/billing`

    // Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
