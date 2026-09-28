import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPaymobWebhook, extractPlanFromMerchantOrderId, PAYMOB_AMOUNT_TO_PLAN, type PaymobPlan } from '@/lib/paymob'
import { generateInvoiceForPayment, generateReceiptForPayment, generateServiceAgreement } from '@/lib/documents'

/**
 * PayMob Webhook Handler — Real Payment Confirmation
 *
 * Flow:
 * 1. Verify HMAC signature (or skip in dev mode)
 * 2. Extract order details from payload
 * 3. Find user by PayMob order ID
 * 4. Determine plan type (from merchant_order_id or amount fallback)
 * 5. Upgrade user plan
 * 6. Auto-generate invoice (facture)
 * 7. Auto-generate receipt (reçu)
 * 8. Create accounting entry for financial tracking
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('[paymob-webhook] Received:', JSON.stringify(payload, null, 2))

    // Step 1: Verify HMAC
    if (!verifyPaymobWebhook(payload)) {
      console.error('[paymob-webhook] HMAC verification failed')
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 })
    }

    const obj = payload.obj as Record<string, unknown>
    const success = obj.success as boolean
    const orderId = (obj.order as Record<string, unknown>)?.id?.toString()
    const transactionId = obj.id?.toString()
    const sourceData = obj.source_data as Record<string, unknown> | undefined
    const provider = (sourceData?.type as string) || 'card'

    if (!success || !orderId) {
      console.log(`[paymob-webhook] Payment failed/invalid for order ${orderId}`)
      return NextResponse.json({ success: true })
    }

    // Step 2: Find user by PayMob order ID
    const user = await db.user.findFirst({
      where: { paymobOrderId: orderId },
    })

    if (!user) {
      console.error(`[paymob-webhook] No user found for PayMob order ${orderId}`)
      return NextResponse.json({ success: true })
    }

    // Step 3: Skip if user already has a paid plan
    if (user.plan !== 'free') {
      console.log(`[paymob-webhook] User ${user.id} already has plan ${user.plan}, skipping`)
      return NextResponse.json({ success: true })
    }

    // Step 4: Determine plan type
    // Priority: merchant_order_id encoding > amount fallback
    let plan = 'pro' as PaymobPlan

    // Try to get the merchant_order_id from the PayMob order
    try {
      const { getAuthToken } = await import('@/lib/paymob')
      // Fetch order details from PayMob API to get merchant_order_id
      // (we stored the paymobOrderId on the user, so we can fetch it)
      const token = await getAuthToken()
      const orderRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${orderId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (orderRes.ok) {
        const orderData = await orderRes.json() as Record<string, unknown>
        const mid = (orderData.merchant_order_id as string) || ''
        const extracted = extractPlanFromMerchantOrderId(mid)
        if (extracted) {
          plan = extracted
          console.log(`[paymob-webhook] Plan from merchant_order_id: ${plan}`)
        }
      }
    } catch (fetchErr) {
      console.warn('[paymob-webhook] Could not fetch order details from PayMob API, falling back to amount detection')
    }

    // Fallback: detect plan from payment amount
    if (plan === 'pro') {
      const amountCents = Math.round((obj.amount_cents as number) / 100)
      const matchedPlan = PAYMOB_AMOUNT_TO_PLAN[amountCents]
      if (matchedPlan) {
        plan = matchedPlan
        console.log(`[paymob-webhook] Plan from amount fallback (${amountCents} MAD): ${plan}`)
      }
    }

    // Step 5: Update user plan + payment metadata
    await db.user.update({
      where: { id: user.id },
      data: {
        plan,
        paymobPaymentId: transactionId,
        paymobProvider: provider,
      },
    })

    console.log(`[paymob-webhook] User ${user.id} upgraded to ${plan} (order: ${orderId}, tx: ${transactionId})`)

    // Step 6: Auto-generate invoice + receipt
    const amountCents = Math.round((obj.amount_cents as number) / 100)

    try {
      const invoice = await generateInvoiceForPayment({
        userEmail: user.email,
        userName: user.name || 'Client',
        plan,
        amount: amountCents,
        currency: 'MAD',
        userId: user.id,
        paidAt: new Date(),
      })
      console.log(`[paymob-webhook] Invoice ${invoice.number} generated for user ${user.id} (${amountCents} MAD)`)

      const receipt = await generateReceiptForPayment({
        userEmail: user.email,
        userName: user.name || 'Client',
        amount: amountCents,
        currency: 'MAD',
        description: `Abonnement ${plan} — HireNova (PayMob)`,
        userId: user.id,
        paidAt: new Date(),
      })
      console.log(`[paymob-webhook] Receipt ${receipt.number} generated for user ${user.id}`)
    } catch (docErr) {
      console.error('[paymob-webhook] Auto-invoicing failed:', docErr instanceof Error ? docErr.message : docErr)
      // Don't throw — webhook should still return 200
    }

    // Step 6b: Auto-generate service agreement (contrat de service)
    try {
      await generateServiceAgreement({
        userId: user.id,
        userName: user.name || 'Client',
        userEmail: user.email,
        plan,
        amount: amountCents,
        currency: 'MAD',
        paymentProvider: 'paymob',
      })
      console.log(`[paymob-webhook] Service agreement generated for user ${user.id}`)
    } catch (contractErr) {
      console.error('[paymob-webhook] Service agreement generation failed:', contractErr instanceof Error ? contractErr.message : contractErr)
    }

    // Step 7: Create accounting entry for financial tracking
    try {
      await db.accountingEntry.create({
        data: {
          type: 'income',
          category: 'subscription',
          description: `Abonnement ${plan} — PayMob (${user.email})`,
          amount: amountCents,
          currency: 'MAD',
          status: 'confirmed',
          userId: user.id,
          reference: transactionId || orderId,
          metadata: JSON.stringify({
            provider: 'paymob',
            plan,
            orderId,
            transactionId,
            userEmail: user.email,
            paidAt: new Date().toISOString(),
          }),
        },
      })
      console.log(`[paymob-webhook] Accounting entry created: ${amountCents} MAD (${plan})`)
    } catch (acctErr) {
      console.error('[paymob-webhook] Accounting entry failed:', acctErr instanceof Error ? acctErr.message : acctErr)
      // Don't throw — webhook should still return 200
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[paymob-webhook] Error:', error)
    return NextResponse.json({ success: true }) // Always return 200 to Paymob
  }
}

// Paymob also sends GET for transaction verification
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
