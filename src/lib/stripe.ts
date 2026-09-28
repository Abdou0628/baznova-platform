import Stripe from 'stripe'

// ─── Stripe Config ─────────────────────────────────────
// Lazy initialization — avoids crash when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || !key.startsWith('sk_')) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }
  return _stripe
}

// Backwards-compatible alias — defers instantiation until first property access
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe()
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY.startsWith('sk_')
  )
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// ─── Pricing Configuration ────────────────────────────
// All prices in cents (smallest currency unit)

export type HireNovaPlan = 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual'
export type Currency = 'eur' | 'usd' | 'gbp' | 'mad'

export const PLAN_PRICES: Record<Currency, Record<HireNovaPlan, { amount: number; label: string }>> = {
  eur: {
    starter:    { amount: 900,  label: '9€' },
    pro:        { amount: 1900, label: '19€' },
    career_plus:{ amount: 3900, label: '39€' },
    employer:   { amount: 4900, label: '49€' },
    annual:    { amount: 7000, label: '70€' },
  },
  usd: {
    starter:    { amount: 999,  label: '$9.99' },
    pro:        { amount: 1999, label: '$19.99' },
    career_plus:{ amount: 3999, label: '$39.99' },
    employer:   { amount: 4999, label: '$49.99' },
    annual:    { amount: 7900, label: '$79' },
  },
  gbp: {
    starter:    { amount: 799,  label: '£7.99' },
    pro:        { amount: 1599, label: '£15.99' },
    career_plus:{ amount: 3199, label: '£31.99' },
    employer:   { amount: 3999, label: '£39.99' },
    annual:    { amount: 5900, label: '£59' },
  },
  mad: {
    starter:    { amount: 9000,  label: '90 MAD' },
    pro:        { amount: 19000, label: '190 MAD' },
    career_plus:{ amount: 39000, label: '390 MAD' },
    employer:   { amount: 49000, label: '490 MAD' },
    annual:    { amount: 70000, label: '700 MAD' },
  },
}

// Stripe Price IDs — set in Stripe Dashboard → Products
// These are Price IDs (price_xxx), NOT Product IDs
export const STRIPE_PRICE_IDS: Record<Currency, Record<HireNovaPlan, string>> = {
  eur: {
    starter:    process.env.STRIPE_STARTER_EUR || 'price_starter_eur',
    pro:        process.env.STRIPE_PRO_EUR || 'price_pro_eur',
    career_plus: process.env.STRIPE_CAREER_EUR || 'price_career_eur',
    employer:   process.env.STRIPE_EMPLOYER_EUR || 'price_employer_eur',
    annual:     process.env.STRIPE_ANNUAL_EUR || 'price_annual_eur',
  },
  usd: {
    starter:    process.env.STRIPE_STARTER_USD || 'price_starter_usd',
    pro:        process.env.STRIPE_PRO_USD || 'price_pro_usd',
    career_plus: process.env.STRIPE_CAREER_USD || 'price_career_usd',
    employer:   process.env.STRIPE_EMPLOYER_USD || 'price_employer_usd',
    annual:     process.env.STRIPE_ANNUAL_USD || 'price_annual_usd',
  },
  gbp: {
    starter:    process.env.STRIPE_STARTER_GBP || 'price_starter_gbp',
    pro:        process.env.STRIPE_PRO_GBP || 'price_pro_gbp',
    career_plus: process.env.STRIPE_CAREER_GBP || 'price_career_gbp',
    employer:   process.env.STRIPE_EMPLOYER_GBP || 'price_employer_gbp',
    annual:     process.env.STRIPE_ANNUAL_GBP || 'price_annual_gbp',
  },
  mad: {}, // PayMob handles MAD, not Stripe
}

export const VALID_PLANS: HireNovaPlan[] = ['starter', 'pro', 'career_plus', 'employer', 'annual']
export const VALID_CURRENCIES: Currency[] = ['eur', 'usd', 'gbp', 'mad']

// ─── Payment Provider Detection ────────────────────────

export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'paymob' | 'dev'

export function getAvailableProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = []
  if (isStripeConfigured()) providers.push('stripe')
  if (process.env.LS_STORE_ID && !process.env.LS_STORE_ID.startsWith('variant_')) providers.push('lemonsqueezy')
  // PayMob is always available for MAD payments
  providers.push('paymob')
  return providers
}

export function getProviderForCurrency(currency: Currency): PaymentProvider {
  if (currency === 'mad') return 'paymob'
  if (isStripeConfigured()) return 'stripe'
  if (process.env.LS_STORE_ID && !process.env.LS_STORE_ID.startsWith('variant_')) return 'lemonsqueezy'
  return 'dev'
}

// Helper: format cents to display string
export function formatCents(cents: number, currency: Currency): string {
  if (currency === 'mad') {
    return `${(cents / 100).toFixed(0)} MAD`
  }
  return new Intl.NumberFormat(currency === 'eur' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: currency === 'mad' ? 0 : 2,
  }).format(cents / 100)
}
