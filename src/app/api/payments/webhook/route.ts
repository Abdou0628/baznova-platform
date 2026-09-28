import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { db } from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // 1. Check webhook secret configuration
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 })
    }

    // 2. Read raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // 3. Verify Stripe signature and construct event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature'
      console.error(`[payments/webhook] Signature verification failed: ${message}`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 4. Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId as string | undefined
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        console.log(`[payments/webhook] Checkout completed: session=${session.id}, userId=${userId}, plan=${planId}`)

        if (userId && planId) {
          // Find or create subscription plan record
          const planName = planId === 'elite' ? 'Elite' : 'Pro'
          const planPrice = planId === 'elite' ? 399 : 149

          const plan = await db.subscriptionPlan.upsert({
            where: { id: `${planId}-monthly` },
            create: {
              id: `${planId}-monthly`,
              name: planName,
              price: planPrice,
              currency: 'MAD',
              interval: 'monthly',
              features: JSON.stringify(planId === 'elite'
                ? ['CV illimités', 'ATS avancé', 'Coach IA', 'Recruteur IA', 'API accès', 'White Label', 'Support prioritaire']
                : ['CV illimités', 'ATS basique', 'Coach IA', '3 lettres/mois']
              ),
              active: true,
            },
            update: {},
          })

          // Create user subscription
          await db.userSubscription.create({
            data: {
              userId,
              planId: plan.id,
              stripeSubscriptionId,
              stripeCustomerId,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })

          // Update user plan
          await db.user.update({
            where: { id: userId },
            data: { plan: planId },
          })

          // Create payment record
          const amountTotal = session.amount_total ?? 0
          await db.payment.create({
            data: {
              userId,
              provider: 'stripe',
              providerPaymentId: session.id,
              amount: amountTotal,
              currency: 'mad',
              status: 'succeeded',
              description: `Subscription ${planName} — Checkout`,
              idempotencyKey: `checkout-${session.id}`,
              capturedAt: new Date(),
            },
          })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

        console.log(`[payments/webhook] Invoice paid: invoice=${invoice.id}, subscription=${stripeSubscriptionId}`)

        if (stripeSubscriptionId) {
          // Update subscription period
          await db.userSubscription.updateMany({
            where: { stripeSubscriptionId },
            data: {
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
        }

        if (stripeCustomerId) {
          const subscription = await db.userSubscription.findFirst({
            where: { stripeCustomerId },
          })
          if (subscription) {
            const amountPaid = invoice.amount_paid ?? 0
            await db.payment.create({
              data: {
                userId: subscription.userId,
                subscriptionId: subscription.id,
                provider: 'stripe',
                providerPaymentId: invoice.id,
                amount: amountPaid,
                currency: 'mad',
                status: 'succeeded',
                description: `Subscription renewal — ${invoice.lines?.data?.[0]?.description || 'Recurring'}`,
                idempotencyKey: `invoice-${invoice.id}`,
                capturedAt: new Date(),
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeSubscriptionId = subscription.id

        console.log(`[payments/webhook] Subscription cancelled: subscription=${stripeSubscriptionId}`)

        // Mark subscription as canceled
        const sub = await db.userSubscription.findFirst({
          where: { stripeSubscriptionId },
        })
        if (sub) {
          await db.userSubscription.update({
            where: { id: sub.id },
            data: { status: 'canceled' },
          })
          // Downgrade user to free
          await db.user.update({
            where: { id: sub.userId },
            data: { plan: 'free' },
          })
        }
        break
      }

      default:
        console.log(`[payments/webhook] Unhandled event type: ${event.type}`)
    }

    // 5. Acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[payments/webhook] Unexpected error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
