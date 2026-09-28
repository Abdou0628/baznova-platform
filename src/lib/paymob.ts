/**
 * HireNova PayMob Integration — Morocco MAD payments
 *
 * Handles PayMob authentication, order creation, payment key generation,
 * iframe checkout URLs, and webhook HMAC verification.
 *
 * Flow: User clicks "Payer" → POST /api/checkout { planType, currency: 'mad' }
 *       → createPaymobCheckout() → redirect to PayMob iframe
 *       → User pays → PayMob sends webhook to POST /api/paymob/webhook
 *       → verify HMAC → upgrade plan → generate invoice + receipt + accounting entry
 */

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || ''
const PAYMOB_INTEGRATION_ID = parseInt(process.env.PAYMOB_INTEGRATION_ID || '0', 10)
const PAYMOB_IFRAME_ID = parseInt(process.env.PAYMOB_IFRAME_ID || '0', 10)
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || ''

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api'

// ─── Plan Types & Pricing (MAD) ──────────────────────────
export type PaymobPlan = 'starter' | 'pro' | 'career_plus' | 'employer' | 'annual'

/**
 * PayMob prices in MAD (integer, not cents).
 * Aligned with HireNova PLAN_PRICES.mad from stripe.ts
 */
export const PAYMOB_PRICES: Record<PaymobPlan, number> = {
  starter:     90,    // ~9 EUR equivalent
  pro:         190,   // ~19 EUR equivalent
  career_plus: 390,   // ~39 EUR equivalent
  employer:    490,   // ~49 EUR equivalent
  annual:      700,   // ~70 EUR equivalent (one-time / annual)
}

/**
 * Reverse lookup: amount → plan type (for webhook plan detection).
 * Used when PayMob doesn't pass custom metadata back.
 */
export const PAYMOB_AMOUNT_TO_PLAN: Record<number, PaymobPlan> = {
  90:  'starter',
  190: 'pro',
  390: 'career_plus',
  490: 'employer',
  700: 'annual',
}

export const PAYMOB_CURRENCY = 'MAD' // ISO 4217 — Moroccan Dirham (PayMob supports MAD for Moroccan merchants)

// ─── PayMob API Types ────────────────────────────────────

interface PaymobTokenResponse {
  token: string
}

interface PaymobOrderResponse {
  id: number
}

interface PaymobPaymentKeyResponse {
  token: string
}

// ─── Billing Data Types ────────────────────────────────

/**
 * Billing data for PayMob payment key creation.
 * All fields are optional — sensible defaults are used for missing values.
 */
export interface PaymobBillingData {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  apartment?: string
  floor?: string
  street?: string
  building?: string
  postalCode?: string
  city?: string
  state?: string
  country?: string
  shippingMethod?: string
}

// ─── PayMob API Functions ────────────────────────────────

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE_URL}/auth/tokens/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
  })
  const data: PaymobTokenResponse = await res.json()
  if (!data.token) throw new Error('Paymob auth failed')
  return data.token
}

async function createOrder(token: string, amountCents: number, merchantOrderId: string): Promise<number> {
  const res = await fetch(`${PAYMOB_BASE_URL}/ecommerce/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents * 100, // Paymob expects cents
      currency: PAYMOB_CURRENCY,
      merchant_order_id: merchantOrderId,
      // Store the plan type in order metadata for webhook retrieval
      // Note: PayMob doesn't support metadata natively, so we encode it in merchant_order_id
    }),
  })
  const data: PaymobOrderResponse = await res.json()
  if (!data.id) throw new Error('Paymob order creation failed')
  return data.id
}

async function getPaymentKey(
  token: string,
  orderId: number,
  amountCents: number,
  userEmail: string,
  userName: string,
  billingData?: PaymobBillingData,
): Promise<string> {
  // Use provided billing data or derive from name/email with safe defaults
  const firstName = billingData?.firstName || userName.split(' ')[0] || 'User'
  const lastName = billingData?.lastName || userName.split(' ').slice(1).join(' ') || ''

  const res = await fetch(`${PAYMOB_BASE_URL}/acceptance/payment_keys/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents * 100,
      expiration: 3600, // 1 hour
      order_id: orderId,
      billing_data: {
        apartment: billingData?.apartment || 'NA',
        email: billingData?.email || userEmail,
        floor: billingData?.floor || 'NA',
        first_name: firstName,
        street: billingData?.street || 'NA',
        building: billingData?.building || 'NA',
        phone_number: billingData?.phoneNumber || 'NA',
        shipping_method: billingData?.shippingMethod || 'NA',
        postal_code: billingData?.postalCode || 'NA',
        city: billingData?.city || 'NA',
        country: billingData?.country || 'NA',
        last_name: lastName,
        state: billingData?.state || 'NA',
      },
      currency: PAYMOB_CURRENCY,
      integration_id: PAYMOB_INTEGRATION_ID,
      lock_order_when_paid: true,
    }),
  })
  const data: PaymobPaymentKeyResponse = await res.json()
  if (!data.token) throw new Error('Paymob payment key creation failed')
  return data.token
}

/**
 * Create a PayMob checkout session and return the iframe URL.
 *
 * The merchant_order_id encodes: `hirenova-{planType}-{userId}-{timestamp}`
 * This allows the webhook to extract the plan type directly, avoiding fragile
 * amount-based detection.
 */
export async function createPaymobCheckout(params: {
  userId: string
  userEmail: string
  userName: string
  planType: PaymobPlan
  billingData?: PaymobBillingData
}): Promise<{ paymentUrl: string; orderId: string; merchantOrderId: string }> {
  const { userId, userEmail, userName, planType, billingData } = params
  const amount = PAYMOB_PRICES[planType]
  // Encode plan type in merchant_order_id for webhook retrieval
  const merchantOrderId = `hirenova-${planType}-${userId}-${Date.now()}`

  const token = await getAuthToken()
  const orderId = await createOrder(token, amount, merchantOrderId)
  const paymentKey = await getPaymentKey(token, orderId, amount, userEmail, userName, billingData)

  const paymentUrl = `${PAYMOB_BASE_URL}/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`

  return {
    paymentUrl,
    orderId: orderId.toString(),
    merchantOrderId,
  }
}

// ─── HMAC Verification (Webhook) ──────────────────────────

import { createHmac } from 'crypto'

/**
 * Verify PayMob webhook HMAC signature.
 * PayMob sends { type, obj, hmac } where hmac = HmacSHA512(concatenated_fields, secret)
 */
export function verifyPaymobWebhook(payload: Record<string, unknown>): boolean {
  if (!PAYMOB_HMAC_SECRET) {
    // In dev without HMAC secret, accept all (dev mode)
    console.warn('[paymob] No HMAC_SECRET configured — skipping verification (dev mode)')
    return true
  }

  const obj = payload.obj as Record<string, unknown> | undefined
  if (!obj) return false

  try {
    const concatenated = `
    ${obj.amount_cents}
    ${obj.created_at}
    ${obj.currency}
    ${obj.error_occured}
    ${obj.has_parent_transaction}
    ${obj.id}
    ${obj.integration_id}
    ${obj.is_3d_secure}
    ${obj.is_auth}
    ${obj.is_capture}
    ${obj.is_refunded}
    ${obj.is_standalone_payment}
    ${obj.is_voided}
    ${obj.order?.id}
    ${obj.owner}
    ${obj.pending}
    ${obj.source_data?.pan}
    ${obj.source_data?.sub_type}
    ${obj.source_data?.type}
    ${obj.success}
    ${obj.transaction?.id}`.trim()

    const hmac = createHmac('sha512', PAYMOB_HMAC_SECRET)
      .update(concatenated)
      .digest('hex')

    const receivedHmac = payload.hmac as string
    return hmac === receivedHmac
  } catch {
    return false
  }
}

/**
 * Extract plan type from the PayMob order's merchant_order_id.
 * Format: `hirenova-{planType}-{userId}-{timestamp}`
 */
export function extractPlanFromMerchantOrderId(merchantOrderId: string): PaymobPlan | null {
  const match = merchantOrderId.match(/^hirenova-([a-z_]+)-/)
  if (!match) return null
  const plan = match[1] as PaymobPlan
  if (plan in PAYMOB_PRICES) return plan
  return null
}

// ─── Configuration Check ────────────────────────────────

export function isPaymobConfigured(): boolean {
  return !!(
    PAYMOB_API_KEY &&
    PAYMOB_INTEGRATION_ID &&
    PAYMOB_IFRAME_ID
  )
}
