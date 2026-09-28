import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { getAvailableProviders, PLAN_PRICES, formatCents, type Currency, type HireNovaPlan } from '@/lib/stripe'
import { isPaymobConfigured } from '@/lib/paymob'
import { STORE_ID } from '@/lib/lemonsqueezy'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const providers = getAvailableProviders()

    const providerStatus = {
      stripe: providers.includes('stripe'),
      lemonsqueezy: !!(
        process.env.LS_STORE_ID &&
        STORE_ID &&
        !STORE_ID.startsWith('variant_') &&
        process.env.LEMONSQUEEZY_API_KEY
      ),
      paymob: isPaymobConfigured(),
    }

    // Build pricing matrix for frontend
    const pricing: Record<string, Record<string, { amount: number; label: string; available: boolean; provider: string }>> = {}
    for (const currency of ['eur', 'usd', 'gbp', 'mad'] as Currency[]) {
      pricing[currency] = {}
      for (const plan of ['starter', 'pro', 'career_plus', 'employer', 'annual'] as HireNovaPlan[]) {
        const price = PLAN_PRICES[currency]?.[plan]
        if (price) {
          let available = true
          let provider = 'stripe'
          if (currency === 'mad') {
            provider = 'paymob'
            available = isPaymobConfigured()
          } else if (providers.includes('stripe')) {
            provider = 'stripe'
          } else if (providerStatus.lemonsqueezy) {
            provider = 'lemonsqueezy'
          } else {
            available = false
            provider = 'none'
          }
          pricing[currency][plan] = {
            amount: price.amount,
            label: formatCents(price.amount, currency),
            available,
            provider,
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        providers: providerStatus,
        pricing,
        // Recommended provider per currency for UI display
        recommendations: {
          eur: providers.includes('stripe') ? 'stripe' : providerStatus.lemonsqueezy ? 'lemonsqueezy' : 'none',
          usd: providers.includes('stripe') ? 'stripe' : providerStatus.lemonsqueezy ? 'lemonsqueezy' : 'none',
          gbp: providers.includes('stripe') ? 'stripe' : providerStatus.lemonsqueezy ? 'lemonsqueezy' : 'none',
          mad: providerStatus.paymob ? 'paymob' : 'none',
        },
      },
    })
  } catch (error) {
    console.error('[payment/providers] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne' } },
      { status: 500 }
    )
  }
}
