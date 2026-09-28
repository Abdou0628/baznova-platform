'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowLeft, Shield } from 'lucide-react'
import { UnifiedCheckout } from './unified-checkout'
import { Button } from '@/components/ui/button'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

// ── Plan Definitions ─────────────────────────────────────────────────────────

interface PlanConfig {
  planId: string
  planNameKey: string
  amount: number       // in cents
  currency: string
  interval: 'month' | 'year'
  featureKeys: string[]
  popular: boolean
}

const PLANS: PlanConfig[] = [
  {
    planId: 'starter',
    planNameKey: 'uco.starterName',
    amount: 990,
    currency: 'EUR',
    interval: 'month',
    featureKeys: [
      'uco.starterF1',
      'uco.starterF2',
      'uco.starterF3',
    ],
    popular: false,
  },
  {
    planId: 'pro',
    planNameKey: 'uco.proName',
    amount: 2490,
    currency: 'EUR',
    interval: 'month',
    featureKeys: [
      'uco.proF1',
      'uco.proF2',
      'uco.proF3',
      'uco.proF4',
      'uco.proF5',
    ],
    popular: true,
  },
  {
    planId: 'career_plus',
    planNameKey: 'uco.careerPlusName',
    amount: 4990,
    currency: 'EUR',
    interval: 'month',
    featureKeys: [
      'uco.careerPlusF1',
      'uco.careerPlusF2',
      'uco.careerPlusF3',
      'uco.careerPlusF4',
      'uco.careerPlusF5',
    ],
    popular: false,
  },
]

// ── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PricingCards() {
  const { language, setStep } = useCVStore()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      {/* Header with back button */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-sm sm:text-base font-bold">Checkout Unifié</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Payment Abstraction Layer — Provider Agnostic
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paiement sécurisé</span>
          </div>
        </div>
      </header>

      {/* Pricing Content */}
      <section className="w-full py-12 sm:py-16" aria-labelledby="pricing-title">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Header */}
          <div className="mb-10 text-center sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Sparkles className="size-3" />
                BazNova
              </div>
              <h2
                id="pricing-title"
                className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
              >
                {t(language, 'uco.plansTitle')}
              </h2>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                {t(language, 'uco.plansSubtitle')}
              </p>
            </motion.div>
          </div>

          {/* Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:gap-8 md:grid-cols-3"
          >
            {PLANS.map((plan) => (
              <motion.div key={plan.planId} variants={cardVariants}>
                <UnifiedCheckout
                  planId={plan.planId}
                  planName={t(language, plan.planNameKey)}
                  amount={plan.amount}
                  currency={plan.currency}
                  interval={plan.interval}
                  features={plan.featureKeys.map((fk) => t(language, fk))}
                  popular={plan.popular}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Trust indicator — NEVER mentions a provider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8 text-center text-xs text-gray-400 sm:mt-10"
          >
            <span>{t(language, 'uco.securedBy')}</span>
            <span className="mx-1">·</span>
            <span>256-bit SSL</span>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
