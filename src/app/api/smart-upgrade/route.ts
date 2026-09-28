// ─── Smart Upgrade API ──────────────────────────────────────────────────
// GET endpoint that checks if a user needs a smart upgrade suggestion
// for a given module context. Uses entitlement engine + upgrade path.
// ─────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'
import { hasModuleAccess, getUpgradePath } from '@/lib/entitlement-engine'
import { getB2CBundlePrice } from '@/lib/pricing-engine'

// ─── Context → Required Module Mapping ─────────────────────────────────

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

// ─── Plan Display Names ─────────────────────────────────────────────────

const PLAN_NAMES: Record<string, Record<string, string>> = {
  hirenova_career: { fr: 'Career', en: 'Career', ar: 'كاريير', es: 'Carrera' },
  hirenova_professional: { fr: 'Professionnel', en: 'Professional', ar: 'بروفيسيونال', es: 'Profesional' },
  hirenova_ai_power: { fr: 'AI Power', en: 'AI Power', ar: 'AI باور', es: 'AI Power' },
  hirenova_start: { fr: 'Start', en: 'Start', ar: 'ستارت', es: 'Start' },
}

const CTA_SEE_PLAN: Record<string, string> = {
  fr: 'Voir le plan',
  en: 'View plan',
  ar: 'عرض الخطة',
  es: 'Ver plan',
}

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const userId = auth.userId!
    const { searchParams } = new URL(request.url)
    const context = searchParams.get('context') || ''
    const requiredModule = searchParams.get('requiredModule') || CONTEXT_TO_MODULE[context] || 'mod_jobs'
    const lang = searchParams.get('lang') || 'fr'
    const isDismissed = searchParams.get('dismissed') === 'true'

    // If client-side already dismissed, skip computation
    if (isDismissed) {
      return NextResponse.json({
        showBanner: false,
        currentPlan: 'unknown',
        requiredModule,
        upgradePath: null,
        message: '',
        cta: '',
      })
    }

    // Fetch user plan
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      )
    }

    const currentPlan = user.plan

    // Check if user already has access to the required module
    if (hasModuleAccess(currentPlan, requiredModule)) {
      return NextResponse.json({
        showBanner: false,
        currentPlan,
        requiredModule,
        upgradePath: null,
        message: '',
        cta: '',
      })
    }

    // Find cheapest upgrade path
    const upgradePath = getUpgradePath(currentPlan, [requiredModule])

    // If no upgrade path found (shouldn't happen, but defensive)
    if (!upgradePath) {
      return NextResponse.json({
        showBanner: false,
        currentPlan,
        requiredModule,
        upgradePath: null,
        message: '',
        cta: '',
      })
    }

    // Get price for the target bundle
    const bundlePrice = getB2CBundlePrice(upgradePath.targetBundle, 'eur', 'monthly')
    const monthlyCost = bundlePrice?.originalMonthly ?? upgradePath.additionalCost

    // Compose localized message
    const message = MESSAGES[context]?.[lang] || MESSAGES.default[lang]

    // Compose localized CTA
    const planName = PLAN_NAMES[upgradePath.targetPlan]?.[lang] || upgradePath.targetPlan
    const ctaLabel = CTA_SEE_PLAN[lang] || 'Voir le plan'
    const cta = `${ctaLabel} ${planName} — €${monthlyCost.toFixed(2)}/mois`

    return NextResponse.json({
      showBanner: true,
      currentPlan,
      requiredModule,
      upgradePath: {
        targetPlan: upgradePath.targetPlan,
        targetBundle: upgradePath.targetBundle,
        additionalCost: monthlyCost,
      },
      message,
      cta,
    })
  } catch (error) {
    console.error('[smart-upgrade] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
