/**
 * Payment Orchestrator — Checkout API
 *
 * Creates a payment through the orchestrator's smart routing layer.
 * This route does NOT replace the existing /api/checkout route.
 * It adds: state machine, event sourcing, idempotency, provider capability routing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCheckout, bootstrapOrchestrator, OrchestratorError } from '@/lib/payment-orchestrator'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, currency, amount, country, paymentMethod, preferredProvider } = body

    // Validate required fields
    if (!planId || !currency || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, currency, amount' },
        { status: 400 },
      )
    }

    const userId = (session.user as any).id
    const email = session.user.email

    // Ensure orchestrator is bootstrapped
    await bootstrapOrchestrator()

    const result = await createCheckout({
      userId,
      email,
      planId,
      currency: currency.toUpperCase(),
      amount: Math.round(Number(amount)),
      country,
      paymentMethod,
      preferredProvider,
      metadata: {
        source: 'payment-orchestrator-api',
        timestamp: new Date().toISOString(),
      },
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      paymentRecordId: result.paymentRecordId,
      providerId: result.providerId,
      checkoutUrl: result.checkoutUrl,
      transactionId: result.transactionId,
      state: result.state,
      routingReason: result.routingReason,
    })
  } catch (error) {
    if (error instanceof OrchestratorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'NO_PROVIDER_AVAILABLE' ? 503 : 400 },
      )
    }
    console.error('[PaymentOrchestrator/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Internal payment orchestrator error' },
      { status: 500 },
    )
  }
}
