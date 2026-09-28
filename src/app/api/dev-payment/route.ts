import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { generateInvoiceForPayment, generateReceiptForPayment } from '@/lib/documents'

/**
 * POST /api/dev-payment
 *
 * Dev/sandbox payment simulator — closes the paperless loop without real
 * LemonSqueezy/PayMob configuration.
 *
 * Flow:
 *   1. User clicks "Buy" on a plan
 *   2. This endpoint simulates a successful payment
 *   3. Upgrades the user's plan
 *   4. Auto-generates invoice (FAC-YYYY-NNNN) + receipt (REC-YYYY-NNNN)
 *      with HireNova logo + electronic signature
 *   5. Returns the document IDs + download URLs
 *
 * In production (when LemonSqueezy is configured), the real checkout API
 * (/api/checkout) + webhook (/api/webhook) handle this flow automatically.
 *
 * Body: { planType: 'starter'|'pro'|'career_plus'|'employer'|'annual', currency: 'eur'|'usd'|'gbp' }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { planType, currency: currencyParam } = body as { planType?: string; currency?: string }

    const validPlans = ['starter', 'pro', 'career_plus', 'employer', 'annual']
    if (!planType || !validPlans.includes(planType)) {
      return NextResponse.json(
        { error: `Invalid planType. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      )
    }

    const currency = ['eur', 'usd', 'gbp'].includes(currencyParam) ? currencyParam : 'eur'
    const currencyUpper = currency.toUpperCase()

    // Calculate amount based on plan + currency (matches frontend pricing)
    const basePrices: Record<string, number> = { starter: 9, pro: 19, career_plus: 39, employer: 49, annual: 179 }
    const basePrice = basePrices[planType] ?? 19
    const amount = currency === 'usd' ? Math.round(basePrice * 1.1 * 100) / 100
      : currency === 'gbp' ? Math.round(basePrice * 0.85 * 100) / 100
      : basePrice

    // Fetch user
    const user = await db.user.findUnique({
      where: { id: auth.userId! },
      select: { id: true, email: true, name: true, plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ===== Simulate successful payment =====
    const paidAt = new Date()

    // 1. Upgrade user plan
    await db.user.update({
      where: { id: user.id },
      data: { plan: planType },
    })
    console.log(`[dev-payment] User ${user.id} upgraded from ${user.plan} to ${planType}`)

    // 2. Auto-generate invoice (with logo + electronic signature)
    const invoice = await generateInvoiceForPayment({
      userEmail: user.email,
      userName: user.name || 'Client',
      plan: planType,
      amount,
      currency: currencyUpper,
      userId: user.id,
      paidAt,
    })
    console.log(`[dev-payment] Invoice ${invoice.number} generated (${amount} ${currencyUpper})`)

    // 3. Auto-generate receipt (with logo + electronic signature)
    const receipt = await generateReceiptForPayment({
      userEmail: user.email,
      userName: user.name || 'Client',
      amount,
      currency: currencyUpper,
      description: `Abonnement HireNova ${planType} — paiement simulé (dev mode)`,
      userId: user.id,
      paidAt,
    })
    console.log(`[dev-payment] Receipt ${receipt.number} generated`)

    // Both documents are now linked to the user and will be included in future bilans

    return NextResponse.json({
      success: true,
      data: {
        plan: planType,
        amount,
        currency: currencyUpper,
        paidAt: paidAt.toISOString(),
        invoice: {
          id: invoice.id,
          number: invoice.number,
          type: 'invoice',
          downloadUrl: `/api/documents/${invoice.id}`,
        },
        receipt: {
          id: receipt.id,
          number: receipt.number,
          type: 'receipt',
          downloadUrl: `/api/documents/${receipt.id}`,
        },
      },
    })
  } catch (error) {
    console.error('[dev-payment] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du paiement' },
      { status: 500 }
    )
  }
}
