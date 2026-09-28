import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stripe, STRIPE_WEBHOOK_SECRET, type HireNovaPlan } from '@/lib/stripe'
import { generateInvoiceForPayment, generateReceiptForPayment } from '@/lib/documents'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[stripe/webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(invoice)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }
  } catch (error) {
    console.error(`[stripe/webhook] Error processing ${event.type}:`, error)
    // Return 200 to prevent Stripe retries
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ─── Handlers ──────────────────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planType = session.metadata?.planType as HireNovaPlan | undefined
  const currency = session.metadata?.currency || 'eur'

  if (!userId) {
    console.error('[stripe/webhook] checkout.completed: missing userId')
    return
  }

  const validPlans: HireNovaPlan[] = ['starter', 'pro', 'career_plus', 'employer', 'annual']
  const plan = validPlans.includes(planType!) ? planType! : 'pro'

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true, stripeCustomerId: true },
  })

  if (!user) {
    console.error(`[stripe/webhook] User ${userId} not found`)
    return
  }

  // Update user plan and Stripe customer ID
  await db.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeCustomerId: session.customer as string || undefined,
    },
  })

  console.log(`[stripe/webhook] User ${userId} upgraded to ${plan} via Stripe checkout`)

  // Auto-generate invoice + receipt for one-time payments (annual)
  if (session.mode === 'payment') {
    const amountTotal = session.amount_total // in cents
    if (amountTotal && amountTotal > 0) {
      try {
        await generateInvoiceForPayment({
          userEmail: user.email,
          userName: user.name || 'Client',
          plan,
          amount: amountTotal / 100,
          currency,
          userId,
          paidAt: new Date(),
        })
        console.log(`[stripe/webhook] Invoice generated for ${userId} (${amountTotal / 100} ${currency})`)

        await generateReceiptForPayment({
          userEmail: user.email,
          userName: user.name || 'Client',
          amount: amountTotal / 100,
          currency,
          description: `Abonnement ${plan} — HireNova (Stripe)`,
          userId,
          paidAt: new Date(),
        })
        console.log(`[stripe/webhook] Receipt generated for ${userId}`)

        // Create accounting entry
        try {
          await db.accountingEntry.create({
            data: {
              type: 'income',
              category: 'subscription',
              description: `Abonnement ${plan} — Stripe (${user.email})`,
              amount: amountTotal / 100,
              currency: currency.toUpperCase(),
              status: 'confirmed',
              userId,
              reference: session.payment_intent as string || session.id,
              metadata: JSON.stringify({ provider: 'stripe', plan, sessionId: session.id }),
            },
          })
          console.log(`[stripe/webhook] Accounting entry created for ${userId}`)
        } catch (acctErr) {
          console.error('[stripe/webhook] Accounting entry failed:', acctErr)
        }
      } catch (docErr) {
        console.error('[stripe/webhook] Auto-invoicing failed:', docErr instanceof Error ? docErr.message : docErr)
      }
    }
  }
  // For subscriptions, the first invoice is handled by invoice.paid event
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Only process subscription invoices (not one-time)
  if (!invoice.subscription) return

  const customerId = invoice.customer as string
  const userId = invoice.metadata?.userId

  if (!userId && customerId) {
    // Find user by Stripe customer ID
    const user = await db.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })
    if (!user) return

    // Still update plan from metadata if available
    const planType = invoice.metadata?.planType as HireNovaPlan | undefined
    if (planType) {
      const validPlans: HireNovaPlan[] = ['starter', 'pro', 'career_plus', 'employer', 'annual']
      const plan = validPlans.includes(planType) ? planType : undefined
      if (plan) {
        await db.user.update({
          where: { id: user.id },
          data: { plan },
        })
      }
    }
  }

  // Generate invoice for recurring payment
  if (invoice.paid && invoice.amount_paid > 0) {
    const user = userId
      ? await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
      : customerId
        ? await db.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true, email: true, name: true } })
        : null

    if (user) {
      const currency = (invoice.currency || 'eur').toUpperCase() as 'EUR' | 'USD' | 'GBP'
      try {
        await generateInvoiceForPayment({
          userEmail: user.email,
          userName: user.name || 'Client',
          plan: invoice.metadata?.planType || user.plan,
          amount: invoice.amount_paid / 100,
          currency,
          userId: user.id,
          paidAt: new Date(invoice.created_at * 1000),
        })
        console.log(`[stripe/webhook] Recurring invoice generated for ${user.id}`)

        // Create accounting entry for recurring payment
        try {
          await db.accountingEntry.create({
            data: {
              type: 'income',
              category: 'subscription',
              description: `Abonnement récurrent — Stripe (${user.email})`,
              amount: invoice.amount_paid / 100,
              currency: (invoice.currency || 'eur').toUpperCase(),
              status: 'confirmed',
              userId: user.id,
              reference: invoice.payment_intent as string || invoice.id,
              metadata: JSON.stringify({ provider: 'stripe', recurring: true, invoiceId: invoice.id }),
            },
          })
        } catch (acctErr) {
          console.error('[stripe/webhook] Recurring accounting entry failed:', acctErr)
        }
      } catch (err) {
        console.error('[stripe/webhook] Recurring invoice failed:', err)
      }
    }
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  if (!customerId) return

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (user) {
    console.log(`[stripe/webhook] Payment failed for user ${user.id}. Attempt: ${invoice.attempt_count}`)
    // On 3rd failed attempt, could downgrade to free (optional)
    if (invoice.attempt_count >= 3) {
      console.log(`[stripe/webhook] 3 failed attempts for ${user.id}, considering downgrade`)
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  if (!customerId) return

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) return

  // Map Stripe status to plan
  if (subscription.status === 'active') {
    // Keep current plan
    console.log(`[stripe/webhook] Subscription active for ${user.id}`)
  } else if (subscription.status === 'past_due') {
    console.log(`[stripe/webhook] Subscription past_due for ${user.id}`)
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // Downgrade to free (unless lifetime)
    if (user.plan !== 'lifetime') {
      await db.user.update({
        where: { id: user.id },
        data: { plan: 'free' },
      })
      console.log(`[stripe/webhook] User ${user.id} downgraded to free (subscription ${subscription.status})`)
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  if (!customerId) return

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) return
  if (user.plan === 'lifetime') return

  await db.user.update({
    where: { id: user.id },
    data: { plan: 'free' },
  })

  console.log(`[stripe/webhook] User ${user.id} downgraded to free (subscription deleted)`)
}
