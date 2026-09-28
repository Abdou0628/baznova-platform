import { NextRequest, NextResponse } from 'next/server'
import {
  getPricingCatalog,
  getB2BCategoryTiers,
  type Currency,
  type BillingPeriod,
  VALID_CURRENCIES,
  VALID_BILLING_PERIODS,
} from '@/lib/pricing-engine'

const VALID_SECTIONS = ['b2c', 'modules', 'b2b', 'catalog'] as const
const VALID_B2B_CATEGORIES = ['recruiter', 'campus', 'whitelabel', 'api'] as const

type Section = (typeof VALID_SECTIONS)[number]
type B2BCategory = (typeof VALID_B2B_CATEGORIES)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const section = searchParams.get('section') as Section | null
  const category = searchParams.get('category') as B2BCategory | null
  const currency = (searchParams.get('currency') ?? 'eur') as Currency
  const billing = (searchParams.get('billing') ?? 'monthly') as BillingPeriod

  // Validate params
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      { error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}` },
      { status: 400 },
    )
  }

  if (billing && !VALID_BILLING_PERIODS.includes(billing)) {
    return NextResponse.json(
      { error: `Invalid billing period. Must be one of: ${VALID_BILLING_PERIODS.join(', ')}` },
      { status: 400 },
    )
  }

  // No section → return full catalog (raw, no conversion)
  if (!section || section === 'catalog') {
    return NextResponse.json({
      data: getPricingCatalog(),
      meta: { currency: 'eur', billingPeriod: 'monthly' },
    })
  }

  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json(
      { error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  // B2B section — returns computed prices for a specific category
  if (section === 'b2b') {
    if (category && !VALID_B2B_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid B2B category. Must be one of: ${VALID_B2B_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    const catalog = getPricingCatalog()

    if (category) {
      const tiers = getB2BCategoryTiers(category, currency, billing)
      const catMeta = catalog.b2b.find(c => c.key === category)
      return NextResponse.json({
        data: {
          category,
          label: catMeta?.label ?? category,
          tiers,
          currency,
          billingPeriod: billing,
        },
        meta: { currency, billingPeriod: billing },
      })
    }

    // All B2B categories with computed prices
    const allCategories = catalog.b2b.map(cat => ({
      category: cat.key,
      label: cat.label,
      tiers: getB2BCategoryTiers(cat.key, currency, billing),
    }))

    return NextResponse.json({
      data: allCategories,
      meta: { currency, billingPeriod: billing },
    })
  }

  // B2C section
  if (section === 'b2c') {
    const catalog = getPricingCatalog()
    return NextResponse.json({
      data: catalog.b2c,
      meta: { currency: 'eur', billingPeriod: 'monthly' },
    })
  }

  // Modules section
  if (section === 'modules') {
    const catalog = getPricingCatalog()
    return NextResponse.json({
      data: catalog.modules,
      meta: { currency: 'eur', billingPeriod: 'monthly' },
    })
  }

  // Fallback
  return NextResponse.json({ data: getPricingCatalog() })
}
