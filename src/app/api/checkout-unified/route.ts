/**
 * BazNova Unified Checkout API Route
 *
 * POST /api/checkout-unified  — Create a checkout session (provider-agnostic)
 * GET  /api/checkout-unified  — Get available plans and pricing (provider-agnostic)
 *
 * The frontend NEVER specifies which provider to use.
 * The region router decides automatically based on country/currency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { baznovaCheckout, baznovaVerifyPayment } from '@/lib/payment-layer';
import type { CheckoutRequest, PlanPricing } from '@/lib/payment-layer';

// ── Plan Pricing Configuration ──────────────────────────────────────────────
// Provider-agnostic pricing — what the user sees

const PLAN_PRICING: PlanPricing[] = [
  {
    planId: 'starter',
    name: 'Starter',
    amount: 900,
    currency: 'EUR',
    displayPrice: '9,00 € / mois',
    interval: 'month',
    features: [
      '10 CV / month',
      '5 cover letters / month',
      'ATS analysis',
      '3 templates',
      'PDF export',
    ],
  },
  {
    planId: 'pro',
    name: 'Pro',
    amount: 1900,
    currency: 'EUR',
    displayPrice: '19,00 € / mois',
    interval: 'month',
    features: [
      'Unlimited CVs',
      'Unlimited cover letters',
      'ATS analysis + detailed insights',
      'Interview simulator',
      'LinkedIn optimizer',
      'Career coach',
      '100 SaaLabour credits',
    ],
  },
  {
    planId: 'career_plus',
    name: 'Career+',
    amount: 3900,
    currency: 'EUR',
    displayPrice: '39,00 € / mois',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Career mobility analysis',
      'Global job market access',
      'Market intelligence',
      '5 premium templates',
      'PDF + Word export',
      '500 SaaLabour credits',
    ],
  },
  {
    planId: 'employer',
    name: 'Employer',
    amount: 4900,
    currency: 'EUR',
    displayPrice: '49,00 € / mois',
    interval: 'month',
    features: [
      'Unlimited job posts',
      'AI candidate matching',
      'Recruiter pipeline',
      'Freelance marketplace',
      'API access',
      '500 SaaLabour credits',
    ],
  },
  {
    planId: 'enterprise',
    name: 'Enterprise',
    amount: 0, // Custom pricing
    currency: 'EUR',
    displayPrice: 'Sur devis',
    interval: 'month',
    features: [
      'Everything in Career+',
      'Unlimited SaaLabour credits',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO / SAML',
      'Priority support',
    ],
  },
  {
    planId: 'annual',
    name: 'Annual (Pro)',
    amount: 7000,
    currency: 'EUR',
    displayPrice: '70,00 € / an',
    interval: 'year',
    features: [
      'Same as Pro plan',
      'Billed annually (save 40%)',
      '100 SaaLabour credits/month',
    ],
  },
];

// ── Currency → price mapping ────────────────────────────────────────────────
const CURRENCY_MULTIPLIERS: Record<string, { multiplier: number; symbol: string; locale: string }> = {
  EUR: { multiplier: 1, symbol: '€', locale: 'fr-FR' },
  USD: { multiplier: 1.11, symbol: '$', locale: 'en-US' },
  GBP: { multiplier: 0.89, symbol: '£', locale: 'en-GB' },
  MAD: { multiplier: 10, symbol: 'MAD', locale: 'fr-MA' },
};

/**
 * Format pricing for a specific currency.
 */
function formatPricingForCurrency(currency: string): PlanPricing[] {
  const config = CURRENCY_MULTIPLIERS[currency.toUpperCase()] ?? CURRENCY_MULTIPLIERS.EUR;

  return PLAN_PRICING.map(plan => {
    if (plan.planId === 'enterprise') return plan; // Enterprise is always "Sur devis"

    const convertedAmount = Math.round(plan.amount * config.multiplier);
    const displayPrice = plan.interval === 'year'
      ? `${formatAmount(convertedAmount, currency)} / an`
      : `${formatAmount(convertedAmount, currency)} / mois`;

    return {
      ...plan,
      amount: convertedAmount,
      currency: currency.toUpperCase(),
      displayPrice,
    };
  });
}

/**
 * Format an amount in cents for display.
 */
function formatAmount(cents: number, currency: string): string {
  const config = CURRENCY_MULTIPLIERS[currency.toUpperCase()] ?? CURRENCY_MULTIPLIERS.EUR;
  const value = cents / 100;

  if (currency.toUpperCase() === 'MAD') {
    return `${value.toFixed(0)} MAD`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value);
}

// ── POST: Create Checkout ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.planId || !body.amount || !body.currency) {
      return NextResponse.json(
        {
          error: 'Missing required fields: userId, planId, amount, currency',
          required: ['userId', 'planId', 'amount', 'currency'],
          optional: ['country', 'paymentMethod', 'email', 'successUrl', 'cancelUrl', 'metadata'],
        },
        { status: 400 },
      );
    }

    // Validate amount is positive
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number (in cents)' },
        { status: 400 },
      );
    }

    // Build the checkout request
    const checkoutRequest: CheckoutRequest = {
      userId: String(body.userId),
      planId: String(body.planId),
      amount: body.amount,
      currency: String(body.currency).toUpperCase(),
      country: body.country ? String(body.country).toUpperCase() : undefined,
      paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
      email: body.email ? String(body.email) : undefined,
      successUrl: body.successUrl ? String(body.successUrl) : undefined,
      cancelUrl: body.cancelUrl ? String(body.cancelUrl) : undefined,
      metadata: body.metadata ?? {},
    };

    // Call the unified checkout
    const result = await baznovaCheckout(checkoutRequest);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[checkout-unified] POST error:', error);
    return NextResponse.json(
      {
        error: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ── GET: Available Plans ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'EUR';
    const checkoutId = searchParams.get('checkoutId');

    // If checkoutId is provided, return payment status instead
    if (checkoutId) {
      try {
        const status = await baznovaVerifyPayment(checkoutId);
        return NextResponse.json(status, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          { error: 'Checkout not found', checkoutId },
          { status: 404 },
        );
      }
    }

    // Return provider-agnostic pricing for the requested currency
    const pricing = formatPricingForCurrency(currency);

    return NextResponse.json({
      plans: pricing,
      currency: currency.toUpperCase(),
      // The user NEVER sees which provider will be used
      // That decision is made at checkout time
    }, { status: 200 });
  } catch (error) {
    console.error('[checkout-unified] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get pricing' },
      { status: 500 },
    );
  }
}
