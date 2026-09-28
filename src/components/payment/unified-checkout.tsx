'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Shield, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { CheckoutSuccessDialog } from './checkout-success-dialog'

// ── Props ────────────────────────────────────────────────────────────────────

export interface UnifiedCheckoutProps {
  planId: string          // 'starter' | 'pro' | 'career_plus' | 'employer' | 'enterprise'
  planName: string        // Display name
  amount: number          // Price in cents (e.g., 990 for €9.90)
  currency: string        // 'EUR' | 'MAD' | 'USD'
  interval?: 'month' | 'year'
  features?: string[]     // Plan features list
  popular?: boolean       // Highlight as most popular
}

// ── Checkout States ──────────────────────────────────────────────────────────

type CheckoutState = 'idle' | 'processing' | 'error' | 'success'

// ── Currency Formatting ──────────────────────────────────────────────────────

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string }> = {
  EUR: { locale: 'fr-FR', symbol: '€' },
  USD: { locale: 'en-US', symbol: '$' },
  MAD: { locale: 'fr-MA', symbol: 'MAD' },
  GBP: { locale: 'en-GB', symbol: '£' },
}

function formatPrice(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] ?? CURRENCY_CONFIG.EUR
  const value = amount / 100

  if (currency.toUpperCase() === 'MAD') {
    return `${value.toFixed(value % 1 === 0 ? 0 : 2)} MAD`
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value)
}

// ── Country Detection ────────────────────────────────────────────────────────

function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Map common timezones to country codes
    const tzMap: Record<string, string> = {
      'Europe/Paris': 'FR',
      'Africa/Casablanca': 'MA',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'Europe/London': 'GB',
      'Europe/Brussels': 'BE',
      'Europe/Berlin': 'DE',
      'Europe/Madrid': 'ES',
      'Africa/Tunis': 'TN',
      'Africa/Algiers': 'DZ',
      'Africa/Cairo': 'EG',
      'Asia/Dubai': 'AE',
    }
    return tzMap[tz] ?? 'FR'
  } catch {
    return 'FR'
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function UnifiedCheckout({
  planId,
  planName,
  amount,
  currency,
  interval = 'month',
  features = [],
  popular = false,
}: UnifiedCheckoutProps) {
  const { language } = useCVStore()
  const [state, setState] = useState<CheckoutState>('idle')
  const [showSuccess, setShowSuccess] = useState(false)

  const priceDisplay = formatPrice(amount, currency)
  const intervalLabel = interval === 'year'
    ? t(language, 'uco.perYear')
    : t(language, 'uco.perMonth')

  const handleCheckout = useCallback(async () => {
    setState('processing')

    try {
      const country = detectCountry()

      const response = await fetch('/api/checkout-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'anonymous', // Will be replaced by auth context
          planId,
          amount,
          currency: currency.toUpperCase(),
          country,
          successUrl: typeof window !== 'undefined'
            ? `${window.location.origin}?checkout=success&plan=${planId}`
            : undefined,
          cancelUrl: typeof window !== 'undefined'
            ? `${window.location.origin}?checkout=cancelled`
            : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Checkout request failed')
      }

      const data = await response.json()

      // Handle redirect to external payment provider (Stripe, PayMob, etc.)
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      // For embedded / dev_simulator: simulate a brief processing delay
      // so the user sees a "Traitement en cours..." animation (feels real)
      await new Promise((resolve) => setTimeout(resolve, 2200))

      // Now show success
      setState('success')
      setShowSuccess(true)
    } catch {
      // NEVER show provider-specific errors
      setState('error')
    }
  }, [planId, amount, currency])

  const handleRetry = useCallback(() => {
    setState('idle')
  }, [])

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false)
    setState('idle') // Reset so the "Choisir ce plan" button reappears
  }, [])

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="h-full"
      >
        <Card
          className={`relative flex h-full flex-col overflow-hidden border bg-white transition-shadow hover:shadow-xl ${
            popular
              ? 'border-emerald-200 shadow-lg ring-1 ring-emerald-200'
              : 'border-gray-200 shadow-sm'
          }`}
        >
          {/* Popular badge */}
          {popular && (
            <div className="absolute top-0 right-0">
              <div className="bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                {t(language, 'uco.popular')}
              </div>
            </div>
          )}

          <CardHeader className="pb-2 pt-6">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {planName}
            </CardTitle>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-gray-900">
                {priceDisplay}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {intervalLabel}
              </span>
            </div>
          </CardHeader>

          <Separator className="mx-6" />

          <CardContent className="flex-1 pt-4 pb-2">
            <ul className="space-y-3" role="list">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="flex-col gap-3 pt-2 pb-6">
            {state === 'idle' && (
              <Button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg transition-all"
                size="lg"
                aria-label={`${t(language, 'uco.choosePlan')} — ${planName}`}
              >
                {t(language, 'uco.choosePlan')}
              </Button>
            )}

            {state === 'processing' && (
              <div className="w-full space-y-2">
                <Button
                  disabled
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  size="lg"
                >
                  <Loader2 className="size-4 animate-spin" />
                  {t(language, 'uco.processing')}
                </Button>
                <p className="text-center text-xs text-gray-400">
                  {t(language, 'uco.processingHint')}
                </p>
              </div>
            )}

            {state === 'error' && (
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{t(language, 'uco.errorMessage')}</span>
                </div>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  size="lg"
                >
                  {t(language, 'uco.retry')}
                </Button>
              </div>
            )}

            {/* Secured indicator — NEVER mentions a provider */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="size-3" aria-hidden="true" />
              <span>{t(language, 'uco.securedBy')}</span>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Success Dialog */}
      <CheckoutSuccessDialog
        open={showSuccess}
        onClose={handleCloseSuccess}
        planName={planName}
        amount={amount}
        currency={currency}
      />
    </>
  )
}
