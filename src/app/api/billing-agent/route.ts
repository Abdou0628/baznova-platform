/**
 * HireNova AI Billing Agent — Payment Intelligence API
 *
 * Dedicated endpoint for the 4th AI agent in HireNova Command Center.
 * Connects the billing chatbot mode to real payment/subscription data.
 *
 * CTO: "Agent AI spécifique pour le traitement des processus des abonnements,
 * des annulations et le traitement des process des paiement confirmé ou non
 * pour libérer l'accès aux différents produits HireNova"
 *
 * ⚠️ This route only reads data — no mutations.
 * Payment operations go through the Payment Orchestrator.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hnsa } from '@/lib/security'
import { getAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────

type BillingAction =
  | 'subscription_status'
  | 'payment_history'
  | 'payment_status'
  | 'available_plans'
  | 'available_gateways'
  | 'cancel_info'

interface BillingAgentRequest {
  action: BillingAction
  paymentRecordId?: string
}

// ─── POST Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // HNSA Protection
  const protection = await hnsa.protect(request, { skipInputValidation: true })
  if (!protection.allowed) return protection.response!

  // Auth
  const session = await getAuth(request)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body: BillingAgentRequest = await request.json()
    const { action } = body

    switch (action) {
      case 'subscription_status':
        return await handleSubscriptionStatus(session.user.id)
      case 'payment_history':
        return await handlePaymentHistory(session.user.id)
      case 'payment_status':
        return await handlePaymentStatus(session.user.id, body.paymentRecordId)
      case 'available_plans':
        return await handleAvailablePlans()
      case 'available_gateways':
        return await handleAvailableGateways()
      case 'cancel_info':
        return await handleCancelInfo(session.user.id)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[billing-agent] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ─── Action Handlers ─────────────────────────────────────────────────────

async function handleSubscriptionStatus(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      email: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get latest subscription event from orchestrator
  const subEvents = await db.orchestratorSubscriptionEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Get latest payment
  const latestPayment = await db.orchestratorPaymentRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: {
      currentPlan: user.plan,
      email: user.email,
      memberSince: user.createdAt.toISOString(),
      latestSubscriptionEvent: subEvents[0] ? {
        eventType: subEvents[0].eventType,
        state: subEvents[0].newState,
        date: subEvents[0].createdAt.toISOString(),
      } : null,
      subscriptionHistory: subEvents.map(e => ({
        eventType: e.eventType,
        state: e.newState,
        date: e.createdAt.toISOString(),
      })),
      latestPayment: latestPayment ? {
        id: latestPayment.id,
        state: latestPayment.state,
        provider: latestPayment.providerId,
        amount: latestPayment.amount,
        currency: latestPayment.currency,
        date: latestPayment.createdAt.toISOString(),
      } : null,
    },
  })
}

async function handlePaymentHistory(userId: string) {
  const payments = await db.orchestratorPaymentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      planId: true,
      providerId: true,
      amount: true,
      currency: true,
      state: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      payments: payments.map(p => ({
        id: p.id,
        planId: p.planId,
        provider: p.providerId,
        amount: p.amount,
        currency: p.currency,
        state: p.state,
        date: p.createdAt.toISOString(),
        lastUpdate: p.updatedAt.toISOString(),
      })),
      total: payments.length,
    },
  })
}

async function handlePaymentStatus(userId: string, paymentRecordId?: string) {
  if (!paymentRecordId) {
    return NextResponse.json({ error: 'paymentRecordId is required' }, { status: 400 })
  }

  // IDOR protection: ensure the payment belongs to this user
  const payment = await db.orchestratorPaymentRecord.findFirst({
    where: { id: paymentRecordId, userId },
    select: {
      id: true,
      planId: true,
      providerId: true,
      providerPaymentId: true,
      amount: true,
      currency: true,
      state: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // Get event history for this payment
  const events = await db.orchestratorPaymentEvent.findMany({
    where: { paymentRecordId },
    orderBy: { createdAt: 'asc' },
    select: {
      eventType: true,
      previousState: true,
      newState: true,
      providerId: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      payment,
      timeline: events,
    },
  })
}

async function handleAvailablePlans() {
  const { PLANS } = await import('@/lib/subscription/plans')
  return NextResponse.json({
    success: true,
    data: { plans: PLANS },
  })
}

async function handleAvailableGateways() {
  const { getAvailableGateways } = await import('@/lib/payment-gateway')
  await import('@/lib/payment-gateway').then(m => m.bootstrapGateways())
  const gateways = getAvailableGateways()
  return NextResponse.json({
    success: true,
    data: { gateways },
  })
}

async function handleCancelInfo(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const isFree = user.plan === 'free' || !user.plan

  return NextResponse.json({
    success: true,
    data: {
      currentPlan: user.plan,
      isFree,
      canCancel: !isFree,
      cancelSteps: isFree ? null : [
        'Contact support or use the billing agent to request cancellation',
        'Your access remains active until the end of the current billing period',
        'All your data (CVs, documents, profiles) are preserved',
        'You can resubscribe at any time',
      ],
      supportEmail: 'support@hirenova.app',
    },
  })
}
