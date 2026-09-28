import { NextRequest, NextResponse } from 'next/server'
import { withAuth, logAudit } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { getModulePrice, getB2CBundlePrice, type Currency as PECurrency, type BillingPeriod as PEBillingPeriod } from '@/lib/pricing-engine'
import {
  generateIdempotencyKey,
  isDuplicatePayment,
  validatePaymentIntent,
  logPaymentTransaction,
} from '@/lib/billing-safety'

type Currency = 'eur' | 'usd' | 'gbp' | 'mad'

// ─── Plan Classification ────────────────────────────────────────────────────

const LEGACY_PLANS = ['starter', 'pro', 'career_plus', 'employer', 'annual'] as const

const B2C_BUNDLE_IDS = ['hirenova_start', 'hirenova_career', 'hirenova_professional', 'hirenova_ai_power'] as const

const MODULE_IDS = [
  'mod_cv', 'mod_ats', 'mod_jobs', 'mod_global', 'mod_mobility',
  'mod_interview', 'mod_linkedin', 'mod_career', 'mod_coach', 'mod_formation', 'mod_freelance',
] as const

const ALL_VALID_PLANS = [...LEGACY_PLANS, ...B2C_BUNDLE_IDS, ...MODULE_IDS] as string[]

const PLAN_DB_MAP: Record<string, string> = {
  starter: 'starter', pro: 'pro', career_plus: 'career_plus', employer: 'employer', annual: 'annual',
  hirenova_start: 'starter', hirenova_career: 'career_plus', hirenova_professional: 'pro', hirenova_ai_power: 'pro',
  mod_cv: 'pro', mod_ats: 'pro', mod_jobs: 'pro', mod_global: 'pro',
  mod_mobility: 'pro', mod_interview: 'pro', mod_linkedin: 'pro',
  mod_career: 'pro', mod_coach: 'pro', mod_formation: 'pro', mod_freelance: 'pro',
}

const PLAN_LABEL_MAP: Record<string, string> = {
  starter: 'HireNova Start', pro: 'HireNova Pro', career_plus: 'HireNova Career+',
  employer: 'HireNova Employer', annual: 'HireNova Annuel',
  hirenova_start: 'HireNova Start', hirenova_career: 'HireNova Career',
  hirenova_professional: 'HireNova Professionnel', hirenova_ai_power: 'HireNova AI Power',
  mod_cv: 'Module CV', mod_ats: 'Module ATS', mod_jobs: 'Module Jobs',
  mod_global: 'Module Global Jobs', mod_mobility: 'Module Mobilité',
  mod_interview: 'Module Interview', mod_linkedin: 'Module LinkedIn',
  mod_career: 'Module Career', mod_coach: 'Module Coach',
  mod_formation: 'Module Formation', mod_freelance: 'Module Freelance',
}

function getDevPrice(planId: string, currency: string, billing: string): number {
  const peCurrency = (['eur','usd','gbp','mad'].includes(currency) ? currency : 'eur') as PECurrency
  const peBilling = (billing === 'annual' ? 'annual' : 'monthly') as PEBillingPeriod

  if ((B2C_BUNDLE_IDS as readonly string[]).includes(planId)) {
    const result = getB2CBundlePrice(planId, peCurrency, peBilling)
    return Math.round(result.price)
  }
  if ((MODULE_IDS as readonly string[]).includes(planId)) {
    const result = getModulePrice(planId, peCurrency, peBilling)
    return Math.round(result.price)
  }

  const legacyPrices: Record<string, number> = { starter: 9, pro: 19, career_plus: 39, employer: 49, annual: 179 }
  const basePrice = legacyPrices[planId] ?? 19
  const rates: Record<string, number> = { usd: 1.08, gbp: 0.86, mad: 10.84, eur: 1 }
  return Math.round(basePrice * (rates[currency] ?? 1))
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized || !auth.userId) {
      return NextResponse.json({ error: auth.reason || 'Authentification requise' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { planType: planTypeParam, currency: currencyParam, provider: providerParam, billing: billingParam, billingData: clientBilling } = body as {
      planType?: string
      currency?: string
      provider?: string
      billing?: string
      billingData?: {
        firstName?: string; lastName?: string; email?: string; phoneNumber?: string
        city?: string; state?: string; country?: string; postalCode?: string
        street?: string; building?: string; apartment?: string; floor?: string
      }
    }

    if (!planTypeParam || !ALL_VALID_PLANS.includes(planTypeParam)) {
      return NextResponse.json(
        { error: 'Plan invalide.', code: 'INVALID_PLAN' },
        { status: 400 }
      )
    }

    const planType = planTypeParam
    const currency = (['eur', 'usd', 'gbp', 'mad'].includes(currencyParam) ? currencyParam : 'eur') as Currency
    const billing = billingParam || 'monthly'
    const userId = auth.userId
    const isBundle = (B2C_BUNDLE_IDS as readonly string[]).includes(planType)
    const isModule = (MODULE_IDS as readonly string[]).includes(planType)
    const isLegacy = (LEGACY_PLANS as readonly string[]).includes(planType)

    // ─── Billing Safety: Idempotency Check ─────────────────────────────
    const idempotencyKey = generateIdempotencyKey(userId, planType, billing)
    if (await isDuplicatePayment(idempotencyKey)) {
      return NextResponse.json(
        { error: 'Cette transaction a déjà été initiée.', code: 'DUPLICATE_PAYMENT' },
        { status: 409 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, plan: true,
        stripeCustomerId: true, lsCustomerId: true,
        resumes: { orderBy: { createdAt: 'desc' }, take: 1, select: { phone: true, location: true, fullName: true, email: true } },
      },
    })

    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    if (isBundle || isLegacy) {
      if (user.plan !== 'free') {
        return NextResponse.json({ error: 'Vous avez déjà un abonnement actif.', code: 'ALREADY_SUBSCRIBED' }, { status: 400 })
      }
    }

    // ─── Billing Safety: Payment Validation ─────────────────────────────
    const validation = await validatePaymentIntent({
      userId, planType, amount: 0, currency, billing,
    })
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation de paiement échouée.', code: 'PAYMENT_VALIDATION_FAILED', reason: validation.reason },
        { status: 400 },
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const planLabel = PLAN_LABEL_MAP[planType] || planType

    // ─── Billing Safety: Log Transaction Initiated ──────────────────────
    logPaymentTransaction({
      userId, provider: providerParam || 'auto', planType,
      amount: 0, currency, status: 'initiated',
      metadata: { idempotencyKey, billing, isBundle, isModule },
    }).catch(() => {})

    await logAudit({
      userId, action: 'CHECKOUT_INITIATED', resourceType: 'payment',
      details: { planType, currency, billing, provider: providerParam || 'auto', isBundle, isModule },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    }).catch(() => {})

    // ─── MAD → PayMob ───────────────────────────────────────
    if (currency === 'mad') {
      try {
        const paymob = await import('@/lib/paymob')
        if (paymob.isPaymobConfigured() && isLegacy) {
          const latestResume = user.resumes?.[0]
          const billingData = {
            firstName: clientBilling?.firstName || latestResume?.fullName?.split(' ')[0] || user.name?.split(' ')[0] || undefined,
            lastName: clientBilling?.lastName || latestResume?.fullName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || undefined,
            email: clientBilling?.email || latestResume?.email || user.email || undefined,
            phoneNumber: clientBilling?.phoneNumber || latestResume?.phone || undefined,
            city: clientBilling?.city || latestResume?.location || undefined,
            state: clientBilling?.state || undefined, country: clientBilling?.country || undefined,
            postalCode: clientBilling?.postalCode || undefined, street: clientBilling?.street || undefined,
            building: clientBilling?.building || undefined, apartment: clientBilling?.apartment || undefined,
            floor: clientBilling?.floor || undefined,
          }

          const result = await paymob.createPaymobCheckout({
            userId, userEmail: user.email, userName: user.name || 'User',
            planType: planType as 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual', billingData,
          })

          await db.user.update({ where: { id: userId }, data: { paymobOrderId: result.orderId } })
          return NextResponse.json({
            url: result.paymentUrl, orderId: result.orderId, provider: 'paymob', plan: planType,
            amount: paymob.PAYMOB_PRICES[planType as keyof typeof paymob.PAYMOB_PRICES], currency: 'MAD',
          })
        }
      } catch (e) {
        console.error('[checkout] PayMob error:', e)
      }
    }

    // ─── EUR/USD/GBP → Stripe or LemonSqueezy ──────────────
    try {
      const stripeMod = await import('@/lib/stripe')
      if (stripeMod.isStripeConfigured() && isLegacy) {
        try {
          let customerId = user.stripeCustomerId
          if (!customerId) {
            const customer = await stripeMod.stripe.customers.create({
              email: user.email, name: user.name || undefined, metadata: { userId },
            })
            customerId = customer.id
            await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
          }

          const priceId = stripeMod.STRIPE_PRICE_IDS[currency]?.[planType as keyof typeof stripeMod.STRIPE_PRICE_IDS[Currency]]
          if (priceId && priceId.startsWith('price_')) {
            const isAnnualPayment = billing === 'annual' || planType === 'annual'
            const session = await stripeMod.stripe.checkout.sessions.create({
              customer: customerId, mode: isAnnualPayment ? 'payment' : 'subscription',
              line_items: [{ price: priceId, quantity: 1 }],
              success_url: `${baseUrl}/?checkout=success&plan=${planType}&provider=stripe`,
              cancel_url: `${baseUrl}/?checkout=canceled`,
              metadata: { userId, planType, currency, billing }, allow_promotion_codes: true,
              subscription_data: isAnnualPayment ? undefined : { metadata: { userId, planType, currency, billing } },
            })
            return NextResponse.json({ url: session.url, sessionId: session.id, provider: 'stripe', plan: planType })
          }
        } catch (stripeErr) { console.error('[checkout] Stripe error:', stripeErr) }
      }
    } catch (e) { /* Stripe not available */ }

    try {
      const lsMod = await import('@/lib/lemonsqueezy')
      const STORE_ID = lsMod.STORE_ID
      if (STORE_ID && !STORE_ID.startsWith('variant_')) {
        try {
          const lsPlanType = isLegacy ? planType as 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual' : 'pro'
          const plans = lsMod.getPlans(currency as 'eur' | 'usd' | 'gbp')
          const plan = plans[lsPlanType]
          if (plan && !plan.variantId.startsWith('variant_')) {
            const { createCheckout } = await import('@lemonsqueezy/lemonsqueezy.js')
            const { data, error } = await createCheckout({
              storeId: STORE_ID, variantId: plan.variantId,
              checkoutData: { email: user.email, name: user.name || undefined, custom: { userId, planType, currency, billing } },
              checkoutOptions: { redirectUrl: `${baseUrl}/?checkout=success&plan=${planType}&provider=lemonsqueezy`, cancelUrl: `${baseUrl}/?checkout=canceled`, embed: false },
              productOptions: { enabledVariants: [plan.variantId], isSubscription: billing !== 'annual' && planType !== 'annual' },
            })
            if (!error && data?.data?.attributes?.url) {
              const lsCustomerId = data.data.attributes.customer_id?.toString()
              if (lsCustomerId) await db.user.update({ where: { id: userId }, data: { lsCustomerId } })
              return NextResponse.json({ url: data.data.attributes.url, provider: 'lemonsqueezy', plan: planType })
            }
          }
        } catch (lsErr) { console.error('[checkout] LemonSqueezy error:', lsErr) }
      }
    } catch (e) { /* LemonSqueezy not available */ }

    // ─── Dev Payment Simulator ──────────────────────────────
    const amount = getDevPrice(planType, currency, billing)
    const currencyLabel = currency.toUpperCase()
    const dbPlan = PLAN_DB_MAP[planType] || 'pro'

    const { generateInvoiceForPayment, generateReceiptForPayment, generateServiceAgreement } = await import('@/lib/documents')

    await db.user.update({ where: { id: userId }, data: { plan: dbPlan } })

    const description = `${isModule ? 'Module' : 'Abonnement'} ${planLabel} — HireNova`

    const invoice = await generateInvoiceForPayment({
      userEmail: user.email, userName: user.name || 'Client',
      plan: planType, amount, currency: currencyLabel, userId, paidAt: new Date(),
    })

    const receipt = await generateReceiptForPayment({
      userEmail: user.email, userName: user.name || 'Client',
      amount, currency: currencyLabel, description, userId, paidAt: new Date(),
    })

    try {
      await generateServiceAgreement({
        userId, userName: user.name || 'Client', userEmail: user.email,
        plan: planType, amount, currency: currencyLabel, paymentProvider: 'dev_simulation',
      })
    } catch (contractErr) {
      console.error('[checkout] Service agreement failed:', contractErr instanceof Error ? contractErr.message : contractErr)
    }

    try {
      await db.accountingEntry.create({
        data: {
          type: 'income', category: isModule ? 'module_purchase' : 'subscription',
          description: `${description} — Dev Simulation (${user.email})`,
          amount, currency: currencyLabel, status: 'confirmed', userId,
          metadata: JSON.stringify({ provider: 'dev_simulation', planType, planLabel, billing, userEmail: user.email, invoiceNumber: invoice.number, receiptNumber: receipt.number }),
        },
      })
    } catch (acctErr) { console.error('[checkout] Accounting entry failed:', acctErr) }

    // ─── Billing Safety: Log Transaction Succeeded ─────────────────────
    logPaymentTransaction({
      userId, provider: 'dev_simulation', planType,
      amount, currency: currencyLabel, status: 'succeeded',
      metadata: { billing, isBundle, isModule, planLabel },
    }).catch(() => {})

    await logAudit({
      userId, action: 'PAYMENT_SUCCESS', resourceType: 'payment',
      details: { planType, planLabel, amount, currency: currencyLabel, billing, provider: 'dev_simulation' },
    }).catch(() => {})

    return NextResponse.json({
      code: 'DEV_PAYMENT', success: true,
      data: {
        plan: planType, planLabel, amount, currency: currencyLabel, billing,
        invoice: { number: invoice.number, downloadUrl: `/api/documents/${invoice.id}` },
        receipt: { number: receipt.number, downloadUrl: `/api/documents/${receipt.id}` },
      },
    })
  } catch (error) {
    console.error('[checkout] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 })
  }
}
