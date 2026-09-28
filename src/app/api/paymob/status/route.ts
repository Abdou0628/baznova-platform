import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'

/**
 * PayMob Payment Status Verification
 *
 * After user returns from PayMob iframe redirect, the frontend polls
 * this endpoint to check if the payment was processed.
 *
 * Returns:
 * - `{ status: 'paid', plan, amount }` — payment confirmed, plan upgraded
 * - `{ status: 'pending' }` — payment not yet confirmed (keep polling)
 * - `{ status: 'failed', error }` — payment failed or user not found
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ status: 'failed', error: auth.reason }, { status: auth.statusCode })
    }

    const userId = auth.userId!
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId')

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        paymobOrderId: true,
        paymobPaymentId: true,
        paymobProvider: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ status: 'failed', error: 'User not found' }, { status: 404 })
    }

    // If user already has a paid plan, payment was processed
    if (user.plan !== 'free') {
      // Get the invoice/receipt for this payment
      const documents = await db.document.findMany({
        where: {
          userId: user.id,
          status: 'paid',
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { id: true, number: true, type: true },
      })

      const invoice = documents.find(d => d.type === 'invoice')
      const receipt = documents.find(d => d.type === 'receipt')

      return NextResponse.json({
        status: 'paid',
        plan: user.plan,
        invoice: invoice ? { number: invoice.number, downloadUrl: `/api/documents/${invoice.id}` } : null,
        receipt: receipt ? { number: receipt.number, downloadUrl: `/api/documents/${receipt.id}` } : null,
        provider: 'paymob',
        updatedAt: user.updatedAt,
      })
    }

    // Check if user has a pending PayMob order
    if (user.paymobOrderId) {
      // If we have an order ID but plan is still free, payment is pending
      // Check if the order was placed recently (within last hour)
      const orderAge = Date.now() - user.updatedAt.getTime()
      if (orderAge < 3600000) { // 1 hour
        return NextResponse.json({
          status: 'pending',
          message: 'Payment is being processed. Please wait...',
          orderId: user.paymobOrderId,
        })
      }

      // Order expired (older than 1 hour)
      return NextResponse.json({
        status: 'expired',
        message: 'Payment session expired. Please try again.',
      })
    }

    // No PayMob order found
    return NextResponse.json({
      status: 'failed',
      error: 'No pending payment found',
    })
  } catch (error) {
    console.error('[paymob-status] Error:', error)
    return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 })
  }
}
