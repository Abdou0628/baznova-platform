'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Check, FileText, Shield, Search, Globe, Plane, UserCheck,
  Linkedin, Compass, BookOpen, GraduationCap, Briefcase,
  Loader2, Rocket, Crown, Sparkles, Star, ArrowRight, Mail,
  Building2, Code2, Store, MessageSquare, Laptop, Calculator, Target, TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CVLanguage } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { AppStep } from '@/store/cv-store'
import { events } from '@/lib/analytics'
import { toast } from 'sonner'

type Currency = 'eur' | 'usd' | 'gbp' | 'mad'
type BillingPeriod = 'monthly' | 'annual'

// ─── Goal Selector Types & Data ─────────────────────────────────────────────

type UserGoal = 'create_cv' | 'find_job' | 'prepare_interview' | 'develop_career' | 'freelance'

interface GoalCard {
  id: UserGoal
  icon: any
  labelKey: 'goalCreateCv' | 'goalFindJob' | 'goalPrepareInterview' | 'goalDevelopCareer' | 'goalFreelance'
  recommendedBundle: string
}

const GOALS: GoalCard[] = [
  { id: 'create_cv', icon: FileText, labelKey: 'goalCreateCv', recommendedBundle: 'baznova_start' },
  { id: 'find_job', icon: Briefcase, labelKey: 'goalFindJob', recommendedBundle: 'baznova_career' },
  { id: 'prepare_interview', icon: MessageSquare, labelKey: 'goalPrepareInterview', recommendedBundle: 'baznova_career' },
  { id: 'develop_career', icon: GraduationCap, labelKey: 'goalDevelopCareer', recommendedBundle: 'baznova_professional' },
  { id: 'freelance', icon: Laptop, labelKey: 'goalFreelance', recommendedBundle: 'baznova_professional' },
]

// Module individual prices (EUR) for value calculation
const MODULE_PRICES: Record<string, number> = {
  CV: 9.90, ATS: 7.90, JOBS: 9.90, GLOBAL: 9.90, MOBILITY: 12.90,
  INTERVIEW: 9.90, LINKEDIN: 7.90, CAREER: 9.90, COACH: 9.90,
  FORMATION: 12.90, FREELANCE: 9.90, Intelligence: 0,
}

// Goal-specific value props
const GOAL_VALUE_PROPS: Record<UserGoal, { reason: string; savingsPercent: number }> = {
  create_cv: { reason: 'priceGoalReasonCreateCv', savingsPercent: 38 },
  find_job: { reason: 'priceGoalReasonFindJob', savingsPercent: 60 },
  prepare_interview: { reason: 'priceGoalReasonPrepareInterview', savingsPercent: 54 },
  develop_career: { reason: 'priceGoalReasonDevelopCareer', savingsPercent: 72 },
  freelance: { reason: 'priceGoalReasonFreelance', savingsPercent: 62 },
}

interface PricingSectionProps {
  language: CVLanguage
  currency: Currency
  onCurrencyChange: (c: Currency) => void
  session: any
  setAuthMode: (m: 'login' | 'register') => void
  setAuthModalOpen: (b: boolean) => void
  setStep: (s: AppStep) => void
  requireAuthAndPlan: (s: AppStep) => void
  checkoutLoading: string | null
  setCheckoutLoading: (s: string | null) => void
  setPaymentSuccess: (s: any) => void
  onRequestQuote: () => void
}

// ─── Currency Helpers ───────────────────────────────────────────────────────

const CONVERSION: Record<Currency, number> = { eur: 1, usd: 1.08, gbp: 0.86, mad: 10.84 }
const SYMBOLS: Record<Currency, string> = { eur: '€', usd: '$', gbp: '£', mad: 'MAD' }

function convert(eur: number, currency: Currency): number {
  return Math.round(eur * CONVERSION[currency] * 100) / 100
}

function fmtPrice(eur: number, currency: Currency): string {
  const val = convert(eur, currency)
  if (currency === 'mad') return `${val} ${SYMBOLS[currency]} 🇲🇦`
  return `${SYMBOLS[currency]}${val.toFixed(2)}`
}

function fmtAnnual(eurMonthly: number, currency: Currency): string {
  const annualEur = eurMonthly * 10
  const val = convert(annualEur, currency)
  if (currency === 'mad') return `${Math.round(val)} ${SYMBOLS[currency]} 🇲🇦`
  return `${SYMBOLS[currency]}${val.toFixed(0)}`
}

// ─── B2C Bundle Data ────────────────────────────────────────────────────────

interface BundlePlan {
  id: string
  name: string
  monthlyEur: number
  color: string
  borderClass: string
  bgIcon: string
  iconColor: string
  btnClass: string
  badge: string | null
  badgeClass: string
  icon: any
  modules: string[]
  description: string
}

const BUNDLES: BundlePlan[] = [
  {
    id: 'baznova_start',
    name: 'HIRENOVA START',
    monthlyEur: 9.9,
    color: 'emerald',
    borderClass: 'border-2 border-emerald-400',
    bgIcon: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    badge: null,
    badgeClass: '',
    icon: Rocket,
    modules: ['CV', 'ATS'],
    description: 'priceBundleStartDesc',
  },
  {
    id: 'baznova_career',
    name: 'HIRENOVA CAREER',
    monthlyEur: 19.9,
    color: 'sky',
    borderClass: 'border-2 border-sky-400',
    bgIcon: 'bg-sky-100',
    iconColor: 'text-sky-600',
    btnClass: 'bg-sky-500 hover:bg-sky-600 text-white',
    badge: 'priceBundleCareerBadge',
    badgeClass: 'bg-sky-500 text-white',
    icon: Star,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'INTERVIEW', 'LINKEDIN', 'CAREER'],
    description: 'priceBundleCareerDesc',
  },
  {
    id: 'baznova_professional',
    name: 'HIRENOVA PROFESSIONNEL',
    monthlyEur: 29.9,
    color: 'violet',
    borderClass: 'border-2 border-violet-400',
    bgIcon: 'bg-violet-100',
    iconColor: 'text-violet-600',
    btnClass: 'bg-violet-500 hover:bg-violet-600 text-white',
    badge: 'priceBundleProBadge',
    badgeClass: 'bg-violet-500 text-white',
    icon: Crown,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE', 'Intelligence'],
    description: 'priceBundleProDesc',
  },
  {
    id: 'baznova_ai_power',
    name: 'HIRENOVA AI POWER',
    monthlyEur: 39.9,
    color: 'amber',
    borderClass: 'border-2 border-amber-400',
    bgIcon: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    badge: 'priceBundleAiPowerBadge',
    badgeClass: 'bg-amber-500 text-white',
    icon: Sparkles,
    modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE', 'Intelligence', 'AI Intelligence', 'AI Chatbot Advanced', 'lot5_pricing_advancedAi'],
    description: 'priceBundleAiPowerDesc',
  },
]

// ─── Individual Module Data ─────────────────────────────────────────────────

interface IndividualModule {
  id: string
  name: string
  monthlyEur: number
  icon: any
  shortDesc: string
  fullDesc: string
  features: string[]
}

const MODULES: IndividualModule[] = [
  {
    id: 'mod_cv', name: 'CV', monthlyEur: 9.9, icon: FileText,
    shortDesc: 'priceModCvShort',
    fullDesc: 'priceModCvFull',
    features: ['priceModCvF1', 'priceModCvF2', 'priceModCvF3', 'priceModCvF4', 'priceModCvF5'],
  },
  {
    id: 'mod_ats', name: 'ATS', monthlyEur: 7.9, icon: Shield,
    shortDesc: 'priceModAtsShort',
    fullDesc: 'priceModAtsFull',
    features: ['priceModAtsF1', 'priceModAtsF2', 'priceModAtsF3', 'priceModAtsF4'],
  },
  {
    id: 'mod_jobs', name: 'JOBS', monthlyEur: 9.9, icon: Search,
    shortDesc: 'priceModJobsShort',
    fullDesc: 'priceModJobsFull',
    features: ['priceModJobsF1', 'priceModJobsF2', 'priceModJobsF3', 'priceModJobsF4', 'priceModJobsF5'],
  },
  {
    id: 'mod_global', name: 'GLOBAL', monthlyEur: 9.9, icon: Globe,
    shortDesc: 'priceModGlobalShort',
    fullDesc: 'priceModGlobalFull',
    features: ['priceModGlobalF1', 'priceModGlobalF2', 'priceModGlobalF3', 'priceModGlobalF4'],
  },
  {
    id: 'mod_mobility', name: 'MOBILITY', monthlyEur: 12.9, icon: Plane,
    shortDesc: 'priceModMobilityShort',
    fullDesc: 'priceModMobilityFull',
    features: ['priceModMobilityF1', 'priceModMobilityF2', 'priceModMobilityF3', 'priceModMobilityF4'],
  },
  {
    id: 'mod_interview', name: 'INTERVIEW', monthlyEur: 9.9, icon: UserCheck,
    shortDesc: 'priceModInterviewShort',
    fullDesc: 'priceModInterviewFull',
    features: ['priceModInterviewF1', 'priceModInterviewF2', 'priceModInterviewF3', 'priceModInterviewF4', 'priceModInterviewF5'],
  },
  {
    id: 'mod_linkedin', name: 'LINKEDIN', monthlyEur: 7.9, icon: Linkedin,
    shortDesc: 'priceModLinkedinShort',
    fullDesc: 'priceModLinkedinFull',
    features: ['priceModLinkedinF1', 'priceModLinkedinF2', 'priceModLinkedinF3', 'priceModLinkedinF4'],
  },
  {
    id: 'mod_career', name: 'CAREER', monthlyEur: 9.9, icon: Compass,
    shortDesc: 'priceModCareerShort',
    fullDesc: 'priceModCareerFull',
    features: ['priceModCareerF1', 'priceModCareerF2', 'priceModCareerF3', 'priceModCareerF4'],
  },
  {
    id: 'mod_coach', name: 'COACH', monthlyEur: 9.9, icon: BookOpen,
    shortDesc: 'priceModCoachShort',
    fullDesc: 'priceModCoachFull',
    features: ['priceModCoachF1', 'priceModCoachF2', 'priceModCoachF3', 'priceModCoachF4'],
  },
  {
    id: 'mod_formation', name: 'FORMATION', monthlyEur: 12.9, icon: GraduationCap,
    shortDesc: 'priceModFormationShort',
    fullDesc: 'priceModFormationFull',
    features: ['priceModFormationF1', 'priceModFormationF2', 'priceModFormationF3', 'priceModFormationF4'],
  },
  {
    id: 'mod_freelance', name: 'FREELANCE', monthlyEur: 9.9, icon: Briefcase,
    shortDesc: 'priceModFreelanceShort',
    fullDesc: 'priceModFreelanceFull',
    features: ['priceModFreelanceF1', 'priceModFreelanceF2', 'priceModFreelanceF3', 'priceModFreelanceF4', 'priceModFreelanceF5'],
  },
]

// ─── B2B Data (raw EUR prices — computed at render time) ───────────────────

interface B2BTier {
  name: string
  monthlyEur: number | null  // null = custom pricing ("Sur devis")
  minMonthlyEur?: number      // for "X+" tiers (e.g. campus/whitelabel enterprise)
  description: string
  features: string[]
}

const B2B: Record<string, { label: string; icon: any; tiers: B2BTier[] }> = {
  recruiter: {
    label: 'priceB2bRecruiter',
    icon: Building2,
    tiers: [
      { name: 'Starter', monthlyEur: 99, description: 'priceB2bRecStarterDesc', features: ['priceB2bRecStarterF1', 'priceB2bRecStarterF2', 'priceB2bRecStarterF3', 'priceB2bRecStarterF4'] },
      { name: 'Professional', monthlyEur: 249, description: 'priceB2bRecProDesc', features: ['priceB2bRecProF1', 'priceB2bRecProF2', 'priceB2bRecProF3', 'priceB2bRecProF4', 'priceB2bRecProF5'] },
      { name: 'Business', monthlyEur: 499, description: 'priceB2bRecBizDesc', features: ['priceB2bRecBizF1', 'priceB2bRecBizF2', 'priceB2bRecBizF3', 'priceB2bRecBizF4', 'priceB2bRecBizF5'] },
      { name: 'Enterprise', monthlyEur: null, description: 'priceB2bRecEntDesc', features: ['priceB2bRecEntF1', 'priceB2bRecEntF2', 'priceB2bRecEntF3', 'priceB2bRecEntF4', 'priceB2bRecEntF5'] },
    ],
  },
  campus: {
    label: 'priceB2bCampus',
    icon: GraduationCap,
    tiers: [
      { name: 'Starter', monthlyEur: 299, description: 'priceB2bCampStarterDesc', features: ['priceB2bCampStarterF1', 'priceB2bCampStarterF2', 'priceB2bCampStarterF3', 'priceB2bCampStarterF4'] },
      { name: 'Professional', monthlyEur: 699, description: 'priceB2bCampProDesc', features: ['priceB2bCampProF1', 'priceB2bCampProF2', 'priceB2bCampProF3', 'priceB2bCampProF4', 'priceB2bCampProF5'] },
      { name: 'Enterprise', monthlyEur: 1499, minMonthlyEur: 1499, description: 'priceB2bCampEntDesc', features: ['priceB2bCampEntF1', 'priceB2bCampEntF2', 'priceB2bCampEntF3', 'priceB2bCampEntF4', 'priceB2bCampEntF5'] },
    ],
  },
  whitelabel: {
    label: 'priceB2bWhitelabel',
    icon: Store,
    tiers: [
      { name: 'Starter', monthlyEur: 499, description: 'priceB2bWlStarterDesc', features: ['priceB2bWlStarterF1', 'priceB2bWlStarterF2', 'priceB2bWlStarterF3', 'priceB2bWlStarterF4'] },
      { name: 'Pro', monthlyEur: 999, description: 'priceB2bWlProDesc', features: ['priceB2bWlProF1', 'priceB2bWlProF2', 'priceB2bWlProF3', 'priceB2bWlProF4', 'priceB2bWlProF5'] },
      { name: 'Enterprise', monthlyEur: 2500, minMonthlyEur: 2500, description: 'priceB2bWlEntDesc', features: ['priceB2bWlEntF1', 'priceB2bWlEntF2', 'priceB2bWlEntF3', 'priceB2bWlEntF4', 'priceB2bWlEntF5'] },
    ],
  },
  api: {
    label: 'priceB2bApi',
    icon: Code2,
    tiers: [
      { name: 'Starter', monthlyEur: 49, description: 'priceB2bApiStarterDesc', features: ['priceB2bApiStarterF1', 'priceB2bApiStarterF2', 'priceB2bApiStarterF3', 'priceB2bApiStarterF4'] },
      { name: 'Pro', monthlyEur: 149, description: 'priceB2bApiProDesc', features: ['priceB2bApiProF1', 'priceB2bApiProF2', 'priceB2bApiProF3', 'priceB2bApiProF4'] },
      { name: 'Business', monthlyEur: 399, description: 'priceB2bApiBizDesc', features: ['priceB2bApiBizF1', 'priceB2bApiBizF2', 'priceB2bApiBizF3', 'priceB2bApiBizF4', 'priceB2bApiBizF5'] },
    ],
  },
}

// ─── B2B Price Computation (mirrors pricing-engine.ts formatTierPriceRaw) ───

const B2B_ANNUAL_MULTIPLIER = 10 // 17% savings

function computeB2BPrice(tier: B2BTier, currency: Currency, billing: BillingPeriod, language: CVLanguage): string {
  if (tier.monthlyEur === null) return t(language, 'priceOnQuote')

  const rate = CONVERSION[currency]
  const sym = SYMBOLS[currency]
  const multiplier = billing === 'annual' ? B2B_ANNUAL_MULTIPLIER : 1
  const amount = Math.round(tier.monthlyEur * rate * multiplier * 100) / 100
  const period = billing === 'annual' ? t(language, 'pricePerYear') : t(language, 'pricePerMonth')
  const isMin = !!tier.minMonthlyEur

  if (currency === 'mad') {
    const val = Math.round(amount)
    return isMin ? `${val}+ ${sym}${period}` : `${val} ${sym}${period}`
  }

  if (billing === 'annual') {
    const val = Math.round(amount)
    return isMin ? `${sym}${val}+${period}` : `${sym}${val}${period}`
  }

  return isMin ? `${sym}${amount.toFixed(2)}+${period}` : `${sym}${amount.toFixed(2)}${period}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PricingSection({
  language,
  currency,
  onCurrencyChange,
  session,
  setAuthMode,
  setAuthModalOpen,
  setStep,
  requireAuthAndPlan,
  checkoutLoading,
  setCheckoutLoading,
  setPaymentSuccess,
  onRequestQuote,
}: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [selectedModule, setSelectedModule] = useState<IndividualModule | null>(null)
  const [checkoutSuccessId, setCheckoutSuccessId] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null)
  const bundleCardsRef = useRef<HTMLDivElement>(null)

  const isAnnual = billingPeriod === 'annual'
  const isLoggedIn = !!session?.user

  // Derive recommended bundle from selected goal
  const recommendedBundleId = selectedGoal ? GOALS.find(g => g.id === selectedGoal)?.recommendedBundle ?? null : null

  // Calculate value for the selected goal
  function getGoalValueCalc() {
    if (!selectedGoal) return null
    const goal = GOALS.find(g => g.id === selectedGoal)
    if (!goal) return null
    const bundle = BUNDLES.find(b => b.id === goal.recommendedBundle)
    if (!bundle) return null

    const individualTotal = bundle.modules.reduce((sum, mod) => sum + (MODULE_PRICES[mod] ?? 0), 0)
    const bundleCost = isAnnual ? bundle.monthlyEur * 10 : bundle.monthlyEur
    const savings = individualTotal - bundleCost
    const savingsPct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0
    const goalProps = GOAL_VALUE_PROPS[selectedGoal]

    return {
      bundleName: bundle.name,
      moduleCount: bundle.modules.length,
      individualTotal,
      bundleCost,
      savings: Math.max(0, savings),
      savingsPct: Math.max(0, savingsPct),
      reason: goalProps?.reason ?? '',
      formattedIndividual: fmtPrice(individualTotal, currency),
      formattedBundle: isAnnual ? fmtAnnual(bundle.monthlyEur, currency) : fmtPrice(bundle.monthlyEur, currency),
      formattedSavings: fmtPrice(Math.max(0, savings), currency),
    }
  }

  const valueCalc = getGoalValueCalc()

  function handleGoalSelect(goal: UserGoal) {
    if (selectedGoal === goal) {
      setSelectedGoal(null)
      return
    }
    setSelectedGoal(goal)
    // Scroll to recommended bundle after a short delay
    setTimeout(() => {
      const el = document.getElementById(`bundle-${GOALS.find(g => g.id === goal)?.recommendedBundle}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  async function handleCheckout(planId: string) {
    if (!isLoggedIn) {
      setAuthMode('register')
      setAuthModalOpen(true)
      return
    }
    setCheckoutLoading(planId)
    events.checkoutStarted(planId, 0, currency)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId, currency, billing: billingPeriod }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.code === 'DEV_PAYMENT' && data.success) {
        setPaymentSuccess(data.data)
        setCheckoutSuccessId(planId)
        toast.success(`${t(language, 'priceToastPaymentSuccess')} — ${data.data.planLabel || planId} ${t(language, 'priceToastActivated')}. ${t(language, 'priceToastInvoice')} ${data.data.invoice.number} ${t(language, 'priceToastGenerated')}.`)
      } else {
        toast.error(data.error || t(language, 'pricePaymentError'))
      }
    } catch {
      toast.error(t(language, 'priceConnectionError'))
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <section className="relative py-16 sm:py-24 bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/30">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-200/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-amber-200/20 to-transparent rounded-full blur-3xl" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Header ─── */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t(language, 'priceOurOffers')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            {t(language, 'priceChoosePlanDesc')}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center rounded-lg bg-muted p-1 mb-4">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={[
                'px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer',
                billingPeriod === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t(language, 'priceBillingMonthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={[
                'px-5 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                billingPeriod === 'annual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t(language, 'priceBillingAnnual')}
              <span className="text-xs text-emerald-600 font-medium">
                {t(language, 'priceSaveUpTo17')}
              </span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center justify-center gap-2">
            {([['eur', 'EUR €'], ['usd', 'USD $'], ['gbp', 'GBP £'], ['mad', 'MAD 🇲🇦']] as [Currency, string][]).map(([c, label]) => (
              <button
                key={c}
                onClick={() => onCurrencyChange(c)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  currency === c
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Goal Selector ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t(language, 'goalQuestion')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(language, 'selectYourGoal')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
            {GOALS.map((goal, i) => {
              const GoalIcon = goal.icon
              const isSelected = selectedGoal === goal.id
              const isRecommended = recommendedBundleId === goal.recommendedBundle && selectedGoal !== null
              return (
                <motion.button
                  key={goal.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => handleGoalSelect(goal.id)}
                  className={[
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer group',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                      : 'border-muted hover:border-emerald-300 hover:bg-emerald-50/50',
                  ].join(' ')}
                >
                  <div className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    isSelected ? 'bg-emerald-100' : 'bg-muted group-hover:bg-emerald-100',
                  ].join(' ')}>
                    <GoalIcon className={[
                      'w-5 h-5 transition-colors',
                      isSelected ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-600',
                    ].join(' ')} />
                  </div>
                  <span className={[
                    'text-xs font-semibold text-center leading-tight',
                    isSelected ? 'text-emerald-700' : 'text-muted-foreground group-hover:text-foreground',
                  ].join(' ')}>
                    {t(language, goal.labelKey)}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* ─── Value Calculator Summary ─── */}
        {selectedGoal && valueCalc && (
          <motion.div
            initial={{ opacity: 0, y: 15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white overflow-hidden">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground mb-1">
                      {t(language, 'valueCalculatorTitle')}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">{valueCalc.bundleName}</span>
                      {' — '}{t(language, valueCalc.reason)}
                      {'. '}{valueCalc.moduleCount} {t(language, 'includesModules').toLowerCase()}
                      {' — '}{t(language, 'bundleCost').toLowerCase()}
                      {' '}
                      <span className="font-bold text-emerald-600">{valueCalc.formattedBundle}</span>
                      {' '}{isAnnual ? t(language, 'pricePerYear') : t(language, 'pricePerMonth')}
                      {t(language, 'priceInsteadOf')}
                      <span className="line-through text-muted-foreground">{valueCalc.formattedIndividual}</span>
                      {' — '}
                      <span className="font-bold text-emerald-600">{t(language, 'youSave').toLowerCase()} {valueCalc.savingsPct}%</span>
                      {' ('}{valueCalc.formattedSavings}{')'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={t(language, 'priceClose')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── B2C Bundles ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-stretch max-w-6xl mx-auto mb-16">
          {BUNDLES.map((plan, i) => {
            const Icon = plan.icon
            const isPopular = plan.id === 'baznova_career'
            const isGoalRecommended = recommendedBundleId === plan.id
            return (
              <motion.div
                key={plan.id}
                id={`bundle-${plan.id}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={isPopular ? 'lg:-mt-2' : ''}
              >
                <Card
                  className={[
                    'relative h-full bg-white transition-all duration-300',
                    isGoalRecommended
                      ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                      : plan.borderClass,
                    isPopular && !isGoalRecommended ? 'shadow-lg shadow-sky-500/20' : '',
                  ].join(' ')}
                >
                  {/* Goal recommendation badge — shows above the normal badge */}
                  {isGoalRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white px-3 py-0.5 text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {t(language, 'recommendedForYou')}
                      </Badge>
                    </div>
                  )}
                  {!isGoalRecommended && plan.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className={`${plan.badgeClass} px-3 py-0.5 text-[10px] font-semibold rounded-full shadow-sm`}>
                        {t(language, plan.badge)}
                      </Badge>
                    </div>
                  )}
                  <CardContent className={['p-5 sm:p-6 flex flex-col h-full', (isGoalRecommended || plan.badge) ? 'pt-7' : ''].join(' ')}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-lg ${plan.bgIcon} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${plan.iconColor}`} />
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-tight">{plan.name}</h3>
                    </div>

                    <div className="mb-1">
                      {isAnnual ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-foreground">{fmtAnnual(plan.monthlyEur, currency)}</span>
                          <span className="text-muted-foreground text-xs">{t(language, 'pricePerYear')}</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-foreground">{fmtPrice(plan.monthlyEur, currency)}</span>
                          <span className="text-muted-foreground text-xs">{t(language, 'pricePerMonth')}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{t(language, plan.description)}</p>

                    <div className="space-y-2 mb-6 flex-grow">
                      {plan.modules.map((mod) => (
                        <div key={mod} className="flex items-start gap-2 text-xs">
                          <Check className={`w-3.5 h-3.5 ${plan.iconColor} mt-0.5 shrink-0`} />
                          <span className="text-muted-foreground">{mod.startsWith('lot5_') ? t(language, mod as any) : mod}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`w-full rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all ${plan.btnClass}`}
                      onClick={() => handleCheckout(plan.id)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id ? (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      ) : checkoutSuccessId === plan.id ? (
                        <Check className="mr-2 w-4 h-4" />
                      ) : (
                        <Icon className="mr-1.5 w-3.5 h-3.5" />
                      )}
                      {checkoutSuccessId === plan.id
                        ? t(language, 'priceActivated')
                        : isAnnual
                          ? `${fmtAnnual(plan.monthlyEur, currency)}${t(language, 'pricePerYear')}`
                          : t(language, 'priceStartBtn')
                      }
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* ─── Individual Modules ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
            {t(language, 'priceChooseModulesTitle')}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            {t(language, 'priceChooseModulesDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <Card
                    className="h-full border hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
                    onClick={() => setSelectedModule(mod)}
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{mod.name}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{t(language, mod.shortDesc)}</p>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {isAnnual
                            ? <><span className="font-bold text-foreground">{fmtAnnual(mod.monthlyEur, currency)}</span>{t(language, 'pricePerYear')}</>
                            : <><span className="font-bold text-foreground">{fmtPrice(mod.monthlyEur, currency)}</span>{t(language, 'pricePerMonth')}</>
                          }
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          {t(language, 'priceDiscover')} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ─── B2B Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
            {t(language, 'priceB2bTitle')}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            {t(language, 'priceB2bDesc')}
          </p>

          <Tabs defaultValue="recruiter" className="w-full">
            <TabsList className="mx-auto grid w-full max-w-lg grid-cols-4 mb-6">
              {Object.entries(B2B).map(([key, val]) => {
                const TabIcon = val.icon
                return (
                  <TabsTrigger key={key} value={key} className="text-xs sm:text-sm gap-1">
                    <TabIcon className="w-3.5 h-3.5 hidden sm:inline" />
                    <span className="truncate">{t(language, val.label)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {Object.entries(B2B).map(([key, section]) => (
              <TabsContent key={key} value={key}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                  {section.tiers.map((tier, i) => {
                    const TabIcon = section.icon
                    return (
                      <motion.div
                        key={tier.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ duration: 0.3, delay: i * 0.06 }}
                      >
                        <Card className="h-full border hover:shadow-md transition-shadow">
                          <CardContent className="p-5 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <TabIcon className="w-4 h-4 text-slate-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground">{tier.name}</h4>
                                <p className="text-[11px] text-muted-foreground">{t(language, tier.description)}</p>
                              </div>
                            </div>
                            <div className="mb-4">
                              <span className="text-2xl font-extrabold text-foreground">{computeB2BPrice(tier, currency, billingPeriod, language)}</span>
                            </div>
                            <div className="space-y-2 mb-6 flex-grow">
                              {tier.features.map((f) => (
                                <div key={f} className="flex items-start gap-2 text-xs">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{t(language, f)}</span>
                                </div>
                              ))}
                            </div>
                            {tier.monthlyEur === null ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl py-2.5 text-sm font-semibold cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onRequestQuote()
                                }}
                              >
                                <Mail className="mr-1.5 w-3.5 h-3.5" />
                                {t(language, 'priceB2bContactUs')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold cursor-pointer transition-all"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onRequestQuote()
                                }}
                              >
                                {t(language, 'priceB2bRequestQuote')}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

      </div>

      {/* ─── Module Detail Dialog ─── */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedModule && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    {(() => { const Icon = selectedModule.icon; return <Icon className="w-5 h-5 text-emerald-600" /> })()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selectedModule.name}</DialogTitle>
                    <DialogDescription>{t(language, selectedModule.shortDesc)}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t(language, selectedModule.fullDesc)}</p>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">{t(language, 'priceIncludedFeatures')}</h4>
                  <div className="space-y-1.5">
                    {selectedModule.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-muted-foreground">{t(language, f)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-bold text-foreground">
                    {isAnnual
                      ? <>{fmtAnnual(selectedModule.monthlyEur, currency)}{t(language, 'pricePerYear')}</>
                      : <>{fmtPrice(selectedModule.monthlyEur, currency)}{t(language, 'pricePerMonth')}</>
                    }
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold cursor-pointer"
                    disabled={checkoutLoading === selectedModule.id}
                    onClick={() => {
                      handleCheckout(selectedModule.id)
                      setSelectedModule(null)
                    }}
                  >
                    {checkoutLoading === selectedModule.id ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : checkoutSuccessId === selectedModule.id ? (
                      <Check className="mr-2 w-4 h-4" />
                    ) : null}
                    {checkoutSuccessId === selectedModule.id ? t(language, 'priceActivated') : t(language, 'priceStartBtn')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
