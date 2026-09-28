/**
 * Payment Orchestrator — Payment Status Query
 *
 * Returns the full event history of a payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentStatus, getPaymentsForUser, bootstrapOrchestrator, OrchestratorError } from '@/lib/payment-orchestrator'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await bootstrapOrchestrator()

    const userId = (session.user as any).id
    const { searchParams } = request.nextUrl
    const paymentRecordId = searchParams.get('payment_id')

    if (paymentRecordId) {
      // Get specific payment status
      const result = await getPaymentStatus(paymentRecordId)

      // Security: only allow users to see their own payments
      if (result.userId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      return NextResponse.json({ success: true, payment: result })
    }

    // Get all payments for user (last 20)
    const payments = await getPaymentsForUser(userId)
    return NextResponse.json({
      success: true,
      payments: payments.slice(0, 20).map(p => ({
        id: p.id,
        planId: p.planId,
        providerId: p.providerId,
        amount: p.amount,
        currency: p.currency,
        state: p.state,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    if (error instanceof OrchestratorError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    console.error('[PaymentOrchestrator/status] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
