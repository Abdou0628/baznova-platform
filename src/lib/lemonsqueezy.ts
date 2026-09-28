import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
  onError: (error) => {
    console.error('LemonSqueezy SDK Error:', error)
  },
})

type Currency = 'eur' | 'usd' | 'gbp'

// Supported countries organized by region
export const SUPPORTED_REGIONS = {
  europe: {
    label: 'Europe',
    flags: ['🇫🇷', '🇧🇪', '🇨🇭', '🇱🇺', '🇲🇨', '🇪🇸'],
    countries: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco', 'Espagne'],
    currency: 'eur' as Currency,
  },
  americas: {
    label: 'Amériques',
    flags: ['🇺🇸', '🇨🇦'],
    countries: ['États-Unis', 'Canada'],
    currency: 'usd' as Currency,
  },
  oceania: {
    label: 'Océanie',
    flags: ['🇦🇺'],
    countries: ['Australie'],
    currency: 'usd' as Currency,
  },
  gcc: {
    label: 'Golf (GCC)',
    flags: ['🇸🇦', '🇦🇪', '🇶🇦', '🇰🇼', '🇧🇭', '🇴🇲'],
    countries: ['Arabie Saoudite', 'Émirats Arabes Unis', 'Qatar', 'Koweït', 'Bahreïn', 'Oman'],
    currency: 'usd' as Currency,
  },
}

// Variant IDs per currency - replace with real ones after creating products in LemonSqueezy Dashboard
// Plans: starter, pro, career_plus, employer, annual (legacy)
export const VARIANTS: Record<Currency, Record<string, string>> = {
  eur: {
    starter: process.env.LS_STARTER_VARIANT_ID_EUR || 'variant_starter_eur',
    pro: process.env.LS_PRO_VARIANT_ID_EUR || 'variant_pro_eur',
    career_plus: process.env.LS_CAREER_VARIANT_ID_EUR || 'variant_career_eur',
    employer: process.env.LS_EMPLOYER_VARIANT_ID_EUR || 'variant_employer_eur',
    annual: process.env.LS_ANNUAL_VARIANT_ID_EUR || 'variant_annual_eur',
  },
  usd: {
    starter: process.env.LS_STARTER_VARIANT_ID_USD || 'variant_starter_usd',
    pro: process.env.LS_PRO_VARIANT_ID_USD || 'variant_pro_usd',
    career_plus: process.env.LS_CAREER_VARIANT_ID_USD || 'variant_career_usd',
    employer: process.env.LS_EMPLOYER_VARIANT_ID_USD || 'variant_employer_usd',
    annual: process.env.LS_ANNUAL_VARIANT_ID_USD || 'variant_annual_usd',
  },
  gbp: {
    starter: process.env.LS_STARTER_VARIANT_ID_GBP || 'variant_starter_gbp',
    pro: process.env.LS_PRO_VARIANT_ID_GBP || 'variant_pro_gbp',
    career_plus: process.env.LS_CAREER_VARIANT_ID_GBP || 'variant_career_gbp',
    employer: process.env.LS_EMPLOYER_VARIANT_ID_GBP || 'variant_employer_gbp',
    annual: process.env.LS_ANNUAL_VARIANT_ID_GBP || 'variant_annual_gbp',
  },
}

export type PlanType = 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual'

export function getPlans(currency: Currency = 'eur') {
  return {
    starter: { name: 'Starter', variantId: VARIANTS[currency].starter, type: 'recurring' as const, currency },
    pro: { name: 'Pro', variantId: VARIANTS[currency].pro, type: 'recurring' as const, currency },
    career_plus: { name: 'Career+', variantId: VARIANTS[currency].career_plus, type: 'recurring' as const, currency },
    employer: { name: 'Employer', variantId: VARIANTS[currency].employer, type: 'recurring' as const, currency },
    annual: { name: 'Annual', variantId: VARIANTS[currency].annual, type: 'recurring' as const, currency },
  }
}

// Store ID from LemonSqueezy Dashboard
export const STORE_ID = process.env.LS_STORE_ID || ''

// Price display per currency
export const PRICES: Record<Currency, { 
  starter: string; pro: string; career_plus: string; employer: string; annual: string;
  monthly: string; annualPeriod: string 
}> = {
  eur: { starter: '9€', pro: '19€', career_plus: '39€', employer: '49€', annual: '70€', monthly: '/mois', annualPeriod: '/an' },
  usd: { starter: '$9.99', pro: '$19.99', career_plus: '$39.99', employer: '$49.99', annual: '$79', monthly: '/month', annualPeriod: '/year' },
  gbp: { starter: '£7.99', pro: '£15.99', career_plus: '£31.99', employer: '£39.99', annual: '£59', monthly: '/month', annualPeriod: '/year' },
}
