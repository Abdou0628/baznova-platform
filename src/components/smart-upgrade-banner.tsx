'use client'

// ─── Smart Upgrade Banner ───────────────────────────────────────────────
// Contextual, non-aggressive upsell banner embedded in module workflows.
// Shows a friendly suggestion + CTA to upgrade, only when user lacks access.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

// ─── Types ──────────────────────────────────────────────────────────────

export interface SmartUpgradeBannerProps {
  currentPlan: string
  requiredModule: string
  context: 'cv' | 'ats' | 'jobs' | 'interview' | 'linkedin' | 'career' | 'string'
  language?: 'fr' | 'en' | 'ar' | 'es'
  onDismiss?: () => void
  className?: string
}

interface SmartUpgradeData {
  showBanner: boolean
  currentPlan: string
  requiredModule: string
  upgradePath: {
    targetPlan: string
    targetBundle: string
    additionalCost: number
  } | null
  message: string
  cta: string
}

// ─── Context → Required Module Mapping ──────────────────────────────────
// Each context maps to the module that the user would GAIN by upgrading.

const CONTEXT_TO_MODULE: Record<string, string> = {
  cv: 'mod_jobs',
  ats: 'mod_linkedin',
  jobs: 'mod_interview',
  interview: 'mod_career',
  linkedin: 'mod_jobs',
  career: 'mod_formation',
}

// ─── Multilingual Messages ─────────────────────────────────────────────

const MESSAGES: Record<string, Record<string, string>> = {
  cv: {
    fr: 'Votre CV est prêt. Analysez votre compatibilité avec les offres d\'emploi avec le module JOBS.',
    en: 'Your CV is ready. Analyze your compatibility with job postings using the JOBS module.',
    ar: 'سيرتك الذاتية جاهزة. حلل توافقك مع عروض الوظائف باستخدام وحدة JOBS.',
    es: 'Tu CV está listo. Analiza tu compatibilidad con las ofertas de empleo con el módulo JOBS.',
  },
  ats: {
    fr: 'Votre score ATS est calculé. Optimisez votre profil LinkedIn pour maximiser vos chances.',
    en: 'Your ATS score is calculated. Optimize your LinkedIn profile to maximize your chances.',
    ar: 'تم حساب درجة ATS الخاصة بك. حسّن ملفك على لينكد إن لتعظيم فرصك.',
    es: 'Tu puntuación ATS está calculada. Optimiza tu perfil de LinkedIn para maximizar tus posibilidades.',
  },
  jobs: {
    fr: 'Vous parcourez des offres. Préparez vos entretiens avec notre simulateur IA.',
    en: 'You\'re browsing job offers. Prepare for your interviews with our AI simulator.',
    ar: 'أنت تتصفح عروض الوظائف. استعد لمقابلاتك مع محاكي الذكاء الاصطناعي لدينا.',
    es: 'Estás navegando ofertas. Prepárate para tus entrevistas con nuestro simulador IA.',
  },
  interview: {
    fr: "L'entretien approche. Affinez votre feuille de route de carrière.",
    en: 'The interview is approaching. Refine your career roadmap.',
    ar: 'المقابلة تقترب. حسّن خارطة طريقك المهنية.',
    es: 'La entrevista se acerca. Perfecciona tu hoja de ruta profesional.',
  },
  linkedin: {
    fr: 'Votre LinkedIn est optimisé. Postulez directement aux offres adaptées.',
    en: 'Your LinkedIn is optimized. Apply directly to matching job offers.',
    ar: 'تم تحسين ملفك على لينكد إن. تقدم مباشرة للعروض المناسبة.',
    es: 'Tu LinkedIn está optimizado. Postúlate directamente a las ofertas adaptadas.',
  },
  career: {
    fr: 'Votre roadmap est prête. Développez vos compétences avec nos formations certifiantes.',
    en: 'Your roadmap is ready. Develop your skills with our certified training courses.',
    ar: 'خارطة طريقك جاهزة. طوّر مهاراتك مع دوراتنا التدريبية المعتمدة.',
    es: 'Tu hoja de ruta está lista. Desarrolla tus habilidades con nuestros cursos certificados.',
  },
  default: {
    fr: 'Débloquez plus de modules pour accélérer votre recherche.',
    en: 'Unlock more modules to accelerate your job search.',
    ar: 'افتح المزيد من الوحدات لتسريع بحثك عن وظيفة.',
    es: 'Desbloquea más módulos para acelerar tu búsqueda.',
  },
}

// ─── CTA Labels ─────────────────────────────────────────────────────────

const CTA_SEE_PLAN: Record<string, string> = {
  fr: 'Voir le plan',
  en: 'View plan',
  ar: 'عرض الخطة',
  es: 'Ver plan',
}

const PLAN_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  hirenova_career: { fr: 'Career', en: 'Career', ar: 'كاريير', es: 'Carrera' },
  hirenova_professional: { fr: 'Professionnel', en: 'Professional', ar: 'بروفيسيونال', es: 'Profesional' },
  hirenova_ai_power: { fr: 'AI Power', en: 'AI Power', ar: 'AI باور', es: 'AI Power' },
  hirenova_start: { fr: 'Start', en: 'Start', ar: 'ستارت', es: 'Start' },
}

// ─── localStorage key ───────────────────────────────────────────────────

function getDismissKey(context: string): string {
  return `smart_upgrade_dismissed_${context}`
}

// ─── Component ──────────────────────────────────────────────────────────

export function SmartUpgradeBanner({
  currentPlan,
  requiredModule: requiredModuleProp,
  context,
  language = 'fr',
  onDismiss,
  className,
}: SmartUpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [data, setData] = useState<SmartUpgradeData | null>(null)
  const [loading, setLoading] = useState(true)

  const effectiveModule = requiredModuleProp || CONTEXT_TO_MODULE[context] || 'mod_jobs'

  // Check localStorage on mount
  useEffect(() => {
    try {
      const key = getDismissKey(context)
      const val = localStorage.getItem(key)
      if (val === 'true') {
        setDismissed(true)
        return
      }
    } catch {
      // SSR or restricted storage — ignore
    }

    // Fetch smart upgrade data from API
    async function fetchUpgrade() {
      try {
        const params = new URLSearchParams({
          context,
          requiredModule: effectiveModule,
          lang: language,
        })
        const res = await fetch(`/api/smart-upgrade?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Fallback to local computation if API fails
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUpgrade()
  }, [context, effectiveModule, language])

  // Don't render if dismissed, loading, or user has access
  if (dismissed || loading) return null
  if (data && !data.showBanner) return null

  // Determine message and CTA
  const message = data?.message || MESSAGES[context]?.[language] || MESSAGES.default[language]
  const targetPlan = data?.upgradePath?.targetPlan || 'hirenova_career'
  const cost = data?.upgradePath?.additionalCost || 19.90
  const planName = PLAN_DISPLAY_NAMES[targetPlan]?.[language] || targetPlan
  const ctaLabel = data?.cta || `${CTA_SEE_PLAN[language]} ${planName} — €${cost.toFixed(2)}/${t(language, 'lot3_smartUpgradeBanner_month')}`

  // Handle dismiss
  function handleDismiss() {
    try {
      localStorage.setItem(getDismissKey(context), 'true')
    } catch {
      // Ignore
    }
    setDismissed(true)
    onDismiss?.()
  }

  // Handle CTA click — scroll to pricing section
  function handleCtaClick() {
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Fallback: navigate to pricing
      window.location.href = '/#pricing'
    }
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
        className,
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-emerald-600/60 transition-colors hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-400/60 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-200"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pr-10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {message}
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/70 dark:text-emerald-300/70">
              {planName} — €{cost.toFixed(2)}/{t(language, 'lot3_smartUpgradeBanner_month')}
            </p>
          </div>
        </div>

        <Button
          onClick={handleCtaClick}
          size="sm"
          className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {CTA_SEE_PLAN[language]}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

export default SmartUpgradeBanner
