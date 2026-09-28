// ─── HireNova AI Contextual Upsell Recommendation Engine ─────────────────
// Rule-based recommendation engine that analyzes user context and returns
// relevant upsell suggestions. No LLM calls needed for core logic.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserContext {
  currentPlan: string          // 'free' | 'hirenova_start' | 'hirenova_career' | etc.
  modulesUsed: string[]        // which module steps the user has visited (from analytics)
  cvCount: number              // CVs generated this month
  clCount: number              // cover letters generated
  applicationsCount: number    // total applications
  daysSinceRegistration: number
  hasLinkedInOptimized: boolean
  hasInterviewPrep: boolean
  hasCareerRoadmap: boolean
  lastActivityDate: string
  role?: string                // 'candidate' | 'employer'
  locale?: string              // 'fr' | 'en' | 'ar' | 'es' — default 'fr'

  // AI context enrichment (from API route)
  recentActions?: string[]     // last 30 days audit action types
  totalPayments?: number       // total successful payments
  totalSpentEur?: number       // total amount spent (EUR)
  freelanceProposalsCount?: number
  formationEnrollmentsCount?: number
  coachSessionsCount?: number
  globalApplicationsCount?: number
  referralCount?: number
}

export interface UpsellRecommendation {
  id: string
  targetId: string             // module id or bundle id to recommend
  targetType: 'module' | 'bundle' | 'b2b'
  title: string                // localised text
  description: string          // localised text
  reason: string               // why we recommend this (localised)
  priority: number             // 1-10, higher = more relevant
  discountPercent?: number     // if applicable
  validUntil?: string          // urgency
}

export interface PersonalizedBanner {
  text: string
  cta: string
  targetId: string
  targetType: string
}

// ─── Multilingual Helper ────────────────────────────────────────────────────

/**
 * Simple translation helper. Falls back to French, then to the first value.
 */
function t(translations: Record<string, string>, locale: string | undefined): string {
  const loc = locale ?? 'fr'
  return translations[loc] || translations['fr'] || Object.values(translations)[0]
}

// ─── Recommendation Builders ─────────────────────────────────────────────────

function addUrgency(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ─── Rule Implementations ────────────────────────────────────────────────────

/**
 * Rule 1: Free user with 1+ CV generated → Career bundle
 */
function ruleFreeUserWithCV(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.currentPlan === 'free' && ctx.cvCount >= 1) {
    return {
      id: 'r1-cv-to-career',
      targetId: 'hirenova_career',
      targetType: 'bundle',
      title: t({ fr: 'HIRENOVA CAREER', en: 'HIRENOVA CAREER', ar: 'هيرينوفا كاريير', es: 'HIRENOVA CARRERA' }, ctx.locale),
      description: t({
        fr: 'Débloquez 7 modules carrière',
        en: 'Unlock 7 career modules',
        ar: 'افتح 7 وحدات المسار المهني',
        es: 'Desbloquea 7 módulos de carrera',
      }, ctx.locale),
      reason: t({
        fr: 'Votre CV est prêt, optimisez votre recherche avec nos 7 modules carrière',
        en: 'Your CV is ready, optimize your search with our 7 career modules',
        ar: 'سيرتك الذاتية جاهزة، حسّن بحثك مع وحداتنا السبعة',
        es: 'Tu CV está listo, optimiza tu búsqueda con nuestros 7 módulos de carrera',
      }, ctx.locale),
      priority: 9,
      discountPercent: 10,
      validUntil: addUrgency(3),
    }
  }
  return null
}

/**
 * Rule 2: Free user who visited jobs page → JOBS module
 */
function ruleFreeUserVisitedJobs(ctx: UserContext): UpsellRecommendation | null {
  if (
    ctx.currentPlan === 'free' &&
    ctx.modulesUsed.some(m => m.toLowerCase().includes('jobs') || m.toLowerCase().includes('job'))
  ) {
    return {
      id: 'r2-jobs-module',
      targetId: 'mod_jobs',
      targetType: 'module',
      title: t({
        fr: "Module Offres d'Emploi",
        en: 'Job Listings Module',
        ar: 'وحدة عروض التوظيف',
        es: 'Módulo de Ofertas de Empleo',
      }, ctx.locale),
      description: t({
        fr: "Accédez à des milliers d'offres triées par IA",
        en: 'Access thousands of AI-sorted job listings',
        ar: 'الوصول إلى آلاف العروض المرتبة بالذكاء الاصطناعي',
        es: 'Accede a miles de ofertas ordenadas por IA',
      }, ctx.locale),
      reason: t({
        fr: "Accédez à des milliers d'offres triées par IA",
        en: 'Access thousands of AI-sorted job listings',
        ar: 'الوصول إلى آلاف العروض المرتبة بالذكاء الاصطناعي',
        es: 'Accede a miles de ofertas ordenadas por IA',
      }, ctx.locale),
      priority: 7,
      validUntil: addUrgency(5),
    }
  }
  return null
}

/**
 * Rule 3: Free user who visited interview page → Career bundle
 */
function ruleFreeUserVisitedInterview(ctx: UserContext): UpsellRecommendation | null {
  if (
    ctx.currentPlan === 'free' &&
    ctx.modulesUsed.some(m => m.toLowerCase().includes('interview') || m.toLowerCase().includes('entretien'))
  ) {
    return {
      id: 'r3-interview-career',
      targetId: 'hirenova_career',
      targetType: 'bundle',
      title: t({ fr: 'HIRENOVA CAREER', en: 'HIRENOVA CAREER', ar: 'هيرينوفا كاريير', es: 'HIRENOVA CARRERA' }, ctx.locale),
      description: t({
        fr: 'Préparez vos entretiens avec notre simulateur IA',
        en: 'Prepare for interviews with our AI simulator',
        ar: 'استعد للمقابلات مع محاكي الذكاء الاصطناعي',
        es: 'Prepárate para entrevistas con nuestro simulador IA',
      }, ctx.locale),
      reason: t({
        fr: 'Préparez vos entretiens avec notre simulateur IA',
        en: 'Prepare for interviews with our AI simulator',
        ar: 'استعد للمقابلات مع محاكي الذكاء الاصطناعي',
        es: 'Prepárate para entrevistas con nuestro simulador IA',
      }, ctx.locale),
      priority: 8,
      discountPercent: 10,
      validUntil: addUrgency(3),
    }
  }
  return null
}

/**
 * Rule 4: Start plan user → upgrade to Career
 */
function ruleStartPlanUpgrade(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.currentPlan === 'hirenova_start') {
    return {
      id: 'r4-start-to-career',
      targetId: 'hirenova_career',
      targetType: 'bundle',
      title: t({
        fr: 'Passez à HIRENOVA CAREER',
        en: 'Upgrade to HIRENOVA CAREER',
        ar: 'ترقية إلى هيرينوفا كاريير',
        es: 'Pasa a HIRENOVA CARRERA',
      }, ctx.locale),
      description: t({
        fr: '5 modules supplémentaires pour 10€ de plus',
        en: '5 additional modules for just 10€ more',
        ar: '5 وحدات إضافية مقابل 10€ فقط',
        es: '5 módulos adicionales por solo 10€ más',
      }, ctx.locale),
      reason: t({
        fr: 'Débloquez 5 modules supplémentaires pour 10€ de plus',
        en: 'Unlock 5 additional modules for just 10€ more',
        ar: 'افتح 5 وحدات إضافية مقابل 10€ فقط',
        es: 'Desbloquea 5 módulos adicionales por solo 10€ más',
      }, ctx.locale),
      priority: 7,
      validUntil: addUrgency(7),
    }
  }
  return null
}

/**
 * Rule 5: Career plan user who used mobility → upgrade to Professional
 */
function ruleCareerMobilityUpgrade(ctx: UserContext): UpsellRecommendation | null {
  if (
    ctx.currentPlan === 'hirenova_career' &&
    ctx.modulesUsed.some(m => m.toLowerCase().includes('mobility') || m.toLowerCase().includes('mobilité'))
  ) {
    return {
      id: 'r5-career-to-pro',
      targetId: 'hirenova_professional',
      targetType: 'bundle',
      title: t({
        fr: 'HIRENOVA PROFESSIONNEL',
        en: 'HIRENOVA PROFESSIONAL',
        ar: 'هيرينوفا احترافي',
        es: 'HIRENOVA PROFESIONAL',
      }, ctx.locale),
      description: t({
        fr: 'Mobilité, Coach et Formation inclus',
        en: 'Mobility, Coach and Training included',
        ar: 'التنقل والمدرب والتدريب مشمولان',
        es: 'Movilidad, Coach y Formación incluidos',
      }, ctx.locale),
      reason: t({
        fr: 'Ajoutez Mobilité, Coach et Formation à votre arsenal',
        en: 'Add Mobility, Coach and Training to your toolkit',
        ar: 'أضف التنقل والمدرب والتدريب إلى أدواتك',
        es: 'Añade Movilidad, Coach y Formación a tu arsenal',
      }, ctx.locale),
      priority: 8,
      discountPercent: 15,
      validUntil: addUrgency(5),
    }
  }
  return null
}

/**
 * Rule 6: Any user who used 3+ different modules as individual → cheapest bundle
 */
function ruleBundleSavings(ctx: UserContext): UpsellRecommendation | null {
  // Only applies if user seems to be using modules individually (not already on a bundle)
  const individualModules = [
    'mod_cv', 'mod_ats', 'mod_jobs', 'mod_global', 'mod_mobility',
    'mod_interview', 'mod_linkedin', 'mod_career', 'mod_coach', 'mod_formation', 'mod_freelance',
  ]
  const usedIndividual = ctx.modulesUsed.filter(m => individualModules.includes(m))

  if (usedIndividual.length >= 3 && ctx.currentPlan === 'free') {
    // Map module IDs to bundle module names
    const moduleToBundleName: Record<string, string> = {
      mod_cv: 'CV', mod_ats: 'ATS', mod_jobs: 'JOBS', mod_global: 'GLOBAL',
      mod_mobility: 'MOBILITY', mod_interview: 'INTERVIEW', mod_linkedin: 'LINKEDIN',
      mod_career: 'CAREER', mod_coach: 'COACH', mod_formation: 'FORMATION', mod_freelance: 'FREELANCE',
    }
    const usedNames = usedIndividual.map(m => moduleToBundleName[m]).filter(Boolean)

    // Find cheapest bundle covering all
    const bundles = [
      { id: 'hirenova_start', price: 9.9, modules: ['CV', 'ATS'] },
      { id: 'hirenova_career', price: 19.9, modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'INTERVIEW', 'LINKEDIN', 'CAREER'] },
      { id: 'hirenova_professional', price: 29.9, modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE'] },
      { id: 'hirenova_ai_power', price: 39.9, modules: ['CV', 'ATS', 'JOBS', 'GLOBAL', 'MOBILITY', 'INTERVIEW', 'LINKEDIN', 'CAREER', 'COACH', 'FORMATION', 'FREELANCE', 'Intelligence'] },
    ]

    const covering = bundles
      .filter(b => usedNames.every(n => b.modules.includes(n)))
      .sort((a, b) => a.price - b.price)

    if (covering.length > 0) {
      const best = covering[0]
      const individualTotal = usedIndividual.length * 9.9 // avg individual price
      const savings = Math.round(((individualTotal - best.price) / individualTotal) * 100)

      return {
        id: 'r6-bundle-savings',
        targetId: best.id,
        targetType: 'bundle',
        title: best.id.replace('hirenova_', '').toUpperCase(),
        description: t({
          fr: `Économisez ${savings}% avec un bundle`,
          en: `Save ${savings}% with a bundle`,
          ar: `وفّر ${savings}% مع باقة`,
          es: `Ahorra ${savings}% con un paquete`,
        }, ctx.locale),
        reason: t({
          fr: 'Économisez avec un bundle — vos modules coûtent moins cher ensemble',
          en: 'Save with a bundle — your modules cost less together',
          ar: 'وفّر مع باقة — وحداتك أرخص مجتمعة',
          es: 'Ahorra con un paquete — tus módulos cuestan menos juntos',
        }, ctx.locale),
        priority: 8,
        discountPercent: savings,
        validUntil: addUrgency(7),
      }
    }
  }
  return null
}

/**
 * Rule 7: User approaching monthly limit on Start plan
 */
function ruleApproachingLimit(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.currentPlan === 'hirenova_start' && (ctx.cvCount >= 3 || ctx.clCount >= 2)) {
    return {
      id: 'r7-approaching-limit',
      targetId: 'hirenova_career',
      targetType: 'bundle',
      title: t({
        fr: 'Augmentez vos limites',
        en: 'Increase your limits',
        ar: 'زد حدودك',
        es: 'Aumenta tus límites',
      }, ctx.locale),
      description: t({
        fr: 'Vous approchez votre limite mensuelle',
        en: "You're approaching your monthly limit",
        ar: 'أنت تقترب من حصتك الشهرية',
        es: 'Te acercas a tu límite mensual',
      }, ctx.locale),
      reason: t({
        fr: 'Vous approchez votre limite mensuelle',
        en: "You're approaching your monthly limit",
        ar: 'أنت تقترب من حصتك الشهرية',
        es: 'Te acercas a tu límite mensual',
      }, ctx.locale),
      priority: 10, // Urgent!
      validUntil: addUrgency(1),
    }
  }
  return null
}

/**
 * Rule 8: Employer role user → B2B recruiter plans
 */
function ruleEmployerUpsell(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.role === 'employer') {
    return {
      id: 'r8-employer-b2b',
      targetId: 'b2b_recruiter',
      targetType: 'b2b',
      title: t({
        fr: 'Solutions Recruteur',
        en: 'Recruiter Solutions',
        ar: 'حلول التوظيف',
        es: 'Soluciones de Reclutamiento',
      }, ctx.locale),
      description: t({
        fr: 'Recrutez plus efficacement',
        en: 'Recruit more efficiently',
        ar: 'وظّف بكفاءة أكبر',
        es: 'Recluta de forma más eficiente',
      }, ctx.locale),
      reason: t({
        fr: 'Recrutez plus efficacement avec nos solutions entreprise',
        en: 'Recruit more efficiently with our enterprise solutions',
        ar: 'وظّف بكفاءة أكبر مع حلولنا للمؤسسات',
        es: 'Recluta de forma más eficiente con nuestras soluciones empresariales',
      }, ctx.locale),
      priority: 9,
      validUntil: addUrgency(14),
    }
  }
  return null
}

/**
 * Rule 9: User registered 7+ days ago still on free → Start with urgency
 */
function ruleRegisteredFreeUrgency(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.currentPlan === 'free' && ctx.daysSinceRegistration >= 7) {
    return {
      id: 'r9-registered-free',
      targetId: 'hirenova_start',
      targetType: 'bundle',
      title: t({
        fr: 'Offre de lancement',
        en: 'Launch offer',
        ar: 'عرض الإطلاق',
        es: 'Oferta de lanzamiento',
      }, ctx.locale),
      description: t({
        fr: 'Débutez pour 9.90€/mois',
        en: 'Get started for 9.90€/month',
        ar: 'ابدأ بـ 9.90€/شهر',
        es: 'Comienza por 9.90€/mes',
      }, ctx.locale),
      reason: t({
        fr: 'Offre de lancement : débuter pour 9.90€/mois',
        en: 'Launch offer: get started for 9.90€/month',
        ar: 'عرض الإطلاق: ابدأ بـ 9.90€/شهر',
        es: 'Oferta de lanzamiento: comienza por 9.90€/mes',
      }, ctx.locale),
      priority: 6,
      discountPercent: 20,
      validUntil: addUrgency(2),
    }
  }
  return null
}

/**
 * Rule 10: Professional plan user → AI Power
 */
function ruleProfessionalToAIPower(ctx: UserContext): UpsellRecommendation | null {
  if (ctx.currentPlan === 'hirenova_professional') {
    return {
      id: 'r10-pro-to-ai',
      targetId: 'hirenova_ai_power',
      targetType: 'bundle',
      title: t({
        fr: 'HIRENOVA AI POWER',
        en: 'HIRENOVA AI POWER',
        ar: 'هيرينوفا آي باور',
        es: 'HIRENOVA AI POWER',
      }, ctx.locale),
      description: t({
        fr: "Débloquez tout le potentiel de l'IA avancée",
        en: 'Unlock the full potential of advanced AI',
        ar: 'افتح كل إمكانات الذكاء الاصطناعي المتقدم',
        es: 'Desbloquea todo el potencial de la IA avanzada',
      }, ctx.locale),
      reason: t({
        fr: "Débloquez tout le potentiel de l'IA avancée",
        en: 'Unlock the full potential of advanced AI',
        ar: 'افتح كل إمكانات الذكاء الاصطناعي المتقدم',
        es: 'Desbloquea todo el potencial de la IA avanzada',
      }, ctx.locale),
      priority: 5,
      validUntil: addUrgency(14),
    }
  }
  return null
}

// ─── New AI-Contextual Rules (11–16) ─────────────────────────────────────────

/**
 * Rule 11: Formation user without Coach → recommend Coach module
 * If user has formation enrollments but has never used Coach sessions,
 * recommend the Coach module for personalised guidance.
 */
function ruleFormationUserUpsell(ctx: UserContext): UpsellRecommendation | null {
  if (
    (ctx.formationEnrollmentsCount ?? 0) >= 1 &&
    (ctx.coachSessionsCount ?? 0) === 0 &&
    !ctx.modulesUsed.includes('mod_coach')
  ) {
    return {
      id: 'r11-formation-to-coach',
      targetId: 'mod_coach',
      targetType: 'module',
      title: t({
        fr: 'Module Coach Carrière',
        en: 'Career Coach Module',
        ar: 'وحدة المدرب المهني',
        es: 'Módulo Coach de Carrera',
      }, ctx.locale),
      description: t({
        fr: 'Complétez vos formations avec un coaching personnalisé',
        en: 'Complement your training with personalised coaching',
        ar: 'كمّل تدريباتك بتوجيه شخصي',
        es: 'Complementa tu formación con coaching personalizado',
      }, ctx.locale),
      reason: t({
        fr: 'Vous suivez des formations : un coach vous aidera à mettre en pratique vos acquis',
        en: "You're taking courses: a coach will help you apply what you learn",
        ar: 'أنت تتابع تدريبات: المدرب سيساعدك على تطبيق ما تتعلمه',
        es: 'Estás tomando cursos: un coach te ayudará a aplicar lo que aprendes',
      }, ctx.locale),
      priority: 8,
      validUntil: addUrgency(7),
    }
  }
  return null
}

/**
 * Rule 12: Freelance user without Formation certification → recommend Formation module
 * If user has submitted freelance proposals but has no formation enrollments,
 * recommend the Formation module to boost credibility.
 */
function ruleFreelanceUserUpsell(ctx: UserContext): UpsellRecommendation | null {
  if (
    (ctx.freelanceProposalsCount ?? 0) >= 1 &&
    (ctx.formationEnrollmentsCount ?? 0) === 0
  ) {
    return {
      id: 'r12-freelance-to-formation',
      targetId: 'mod_formation',
      targetType: 'module',
      title: t({
        fr: 'Module Formation & Certification',
        en: 'Training & Certification Module',
        ar: 'وحدة التدريب والشهادات',
        es: 'Módulo de Formación y Certificación',
      }, ctx.locale),
      description: t({
        fr: 'Obtenez des certifications pour booster votre profil freelance',
        en: 'Earn certifications to boost your freelance profile',
        ar: 'احصل على شهادات لتعزيز ملفك كعامل حر',
        es: 'Obtén certificaciones para impulsar tu perfil freelance',
      }, ctx.locale),
      reason: t({
        fr: 'Vos propositions freelance méritent plus de crédibilité avec une certification',
        en: 'Your freelance proposals deserve more credibility with a certification',
        ar: 'عروضك كعامل حر تستحق مزيدًا من المصداقية مع شهادة',
        es: 'Tus propuestas freelance merecen más credibilidad con una certificación',
      }, ctx.locale),
      priority: 7,
      validUntil: addUrgency(7),
    }
  }
  return null
}

/**
 * Rule 13: High spender bundling → if user spent > 30€ on individual modules,
 * recommend Professional bundle to save.
 */
function ruleHighSpenderBundling(ctx: UserContext): UpsellRecommendation | null {
  const spent = ctx.totalSpentEur ?? 0
  if (
    spent > 30 &&
    ctx.currentPlan === 'free'
  ) {
    const proPrice = 29.9
    const savings = Math.round(((spent - proPrice) / spent) * 100)

    return {
      id: 'r13-high-spender-bundle',
      targetId: 'hirenova_professional',
      targetType: 'bundle',
      title: t({
        fr: 'HIRENOVA PROFESSIONNEL',
        en: 'HIRENOVA PROFESSIONAL',
        ar: 'هيرينوفا احترافي',
        es: 'HIRENOVA PROFESIONAL',
      }, ctx.locale),
      description: t({
        fr: `Passez au bundle et économisez ${savings}% sur vos achats individuels`,
        en: `Switch to a bundle and save ${savings}% on individual purchases`,
        ar: `انتقل إلى الباقة ووفّر ${savings}% على مشترياتك الفردية`,
        es: `Cambia a un paquete y ahorra ${savings}% en compras individuales`,
      }, ctx.locale),
      reason: t({
        fr: `Vous avez dépensé ${spent.toFixed(0)}€ en modules individuels — un bundle vous ferait économiser`,
        en: `You've spent ${spent.toFixed(0)}€ on individual modules — a bundle would save you money`,
        ar: `أنفقت ${spent.toFixed(0)}€ على وحدات فردية — الباقة ستوفر عليك`,
        es: `Has gastado ${spent.toFixed(0)}€ en módulos individuales — un paquete te ahorraría`,
      }, ctx.locale),
      priority: 9,
      discountPercent: Math.max(savings, 10),
      validUntil: addUrgency(5),
    }
  }
  return null
}

/**
 * Rule 14: Referral champion → if user has 2+ referrals,
 * offer a discount on AI Power bundle as a reward.
 */
function ruleReferralChampion(ctx: UserContext): UpsellRecommendation | null {
  if ((ctx.referralCount ?? 0) >= 2) {
    return {
      id: 'r14-referral-champion',
      targetId: 'hirenova_ai_power',
      targetType: 'bundle',
      title: t({
        fr: 'Merci pour vos recommandations !',
        en: 'Thanks for your referrals!',
        ar: 'شكرًا لتوصياتك!',
        es: '¡Gracias por tus recomendaciones!',
      }, ctx.locale),
      description: t({
        fr: 'Réduction exclusive sur HIRENOVA AI POWER en remerciement',
        en: 'Exclusive discount on HIRENOVA AI POWER as a thank you',
        ar: 'خصم حصري على هيرينوفا آي باور شكرًا لك',
        es: 'Descuento exclusivo en HIRENOVA AI POWER como agradecimiento',
      }, ctx.locale),
      reason: t({
        fr: 'Vous avez recommandé HireNova : profitez d\'une réduction exclusive sur AI POWER',
        en: "You've referred others to HireNova: enjoy an exclusive AI POWER discount",
        ar: 'أوصيت بـ HireNova: استمتع بخصم حصري على آي باور',
        es: 'Has recomendado HireNova: disfruta de un descuento exclusivo en AI POWER',
      }, ctx.locale),
      priority: 8,
      discountPercent: 25,
      validUntil: addUrgency(10),
    }
  }
  return null
}

/**
 * Rule 15: Global applicant → if user applied to 3+ global jobs,
 * recommend Mobility module for relocation support.
 */
function ruleGlobalApplicantUpsell(ctx: UserContext): UpsellRecommendation | null {
  if (
    (ctx.globalApplicationsCount ?? 0) >= 3 &&
    !ctx.modulesUsed.includes('mod_mobility')
  ) {
    return {
      id: 'r15-global-to-mobility',
      targetId: 'mod_mobility',
      targetType: 'module',
      title: t({
        fr: 'Module Mobilité Internationale',
        en: 'International Mobility Module',
        ar: 'وحدة التنقل الدولي',
        es: 'Módulo de Movilidad Internacional',
      }, ctx.locale),
      description: t({
        fr: 'Préparez votre relocation : visa, CV localisé, conseils pays',
        en: 'Prepare your relocation: visa, localised CV, country-specific tips',
        ar: 'جهّز إقامتك: تأشيرة، سيرة ذاتية محلية، نصائح حسب البلد',
        es: 'Prepara tu reubicación: visa, CV localizado, consejos por país',
      }, ctx.locale),
      reason: t({
        fr: "Vous postulez à l'international : notre module Mobilité vous accompagne dans vos démarches",
        en: "You're applying internationally: our Mobility module guides you through the process",
        ar: 'أنت تتقدم دوليًا: وحدة التنقل ترشدك في الخطوات',
        es: 'Te postulas internacionalmente: nuestro módulo de Movilidad te guía en el proceso',
      }, ctx.locale),
      priority: 9,
      validUntil: addUrgency(5),
    }
  }
  return null
}

/**
 * Rule 16: Coach graduate → if user completed 3+ coach sessions,
 * recommend Career roadmap for structured planning.
 */
function ruleCoachGraduate(ctx: UserContext): UpsellRecommendation | null {
  if (
    (ctx.coachSessionsCount ?? 0) >= 3 &&
    !ctx.hasCareerRoadmap
  ) {
    return {
      id: 'r16-coach-to-roadmap',
      targetId: 'mod_career',
      targetType: 'module',
      title: t({
        fr: 'Plan de Carrière IA',
        en: 'AI Career Roadmap',
        ar: 'خطة المسار المهني بالذكاء الاصطناعي',
        es: 'Plan de Carrera IA',
      }, ctx.locale),
      description: t({
        fr: 'Transformez vos sessions coach en un plan d\'action structuré',
        en: 'Turn your coach sessions into a structured action plan',
        ar: 'حوّل جلسات المدرب إلى خطة عمل منظمة',
        es: 'Convierte tus sesiones de coach en un plan de acción estructurado',
      }, ctx.locale),
      reason: t({
        fr: 'Vos sessions coach méritent un suivi structuré — créez votre feuille de route carrière',
        en: 'Your coach sessions deserve structured follow-up — create your career roadmap',
        ar: 'جلسات المدرب تستحق متابعة منظمة — أنشئ خريطة طريقك المهنية',
        es: 'Tus sesiones de coach merecen un seguimiento estructurado — crea tu hoja de ruta',
      }, ctx.locale),
      priority: 7,
      validUntil: addUrgency(7),
    }
  }
  return null
}

// ─── Main Exports ─────────────────────────────────────────────────────────────

/**
 * Analyzes user context and returns up to 3 upsell recommendations
 * sorted by priority (highest first).
 */
export function getRecommendations(context: UserContext): UpsellRecommendation[] {
  const rules = [
    ruleApproachingLimit,    // Urgency first
    ruleFreeUserWithCV,
    ruleFreeUserVisitedInterview,
    ruleCareerMobilityUpgrade,
    ruleHighSpenderBundling,     // NEW — contextual from payment data
    ruleGlobalApplicantUpsell,   // NEW — contextual from global applications
    ruleBundleSavings,
    ruleFreeUserVisitedJobs,
    ruleStartPlanUpgrade,
    ruleEmployerUpsell,
    ruleFormationUserUpsell,     // NEW — cross-module: Formation → Coach
    ruleCoachGraduate,           // NEW — cross-module: Coach → Career Roadmap
    ruleFreelanceUserUpsell,     // NEW — cross-module: Freelance → Formation
    ruleRegisteredFreeUrgency,
    ruleReferralChampion,        // NEW — loyalty reward
    ruleProfessionalToAIPower,
  ]

  const all: UpsellRecommendation[] = []
  for (const rule of rules) {
    const rec = rule(context)
    if (rec) {
      all.push(rec)
    }
  }

  // Deduplicate by targetId (keep highest priority)
  const seen = new Map<string, UpsellRecommendation>()
  for (const rec of all) {
    const existing = seen.get(rec.targetId)
    if (!existing || rec.priority > existing.priority) {
      seen.set(rec.targetId, rec)
    }
  }

  // Sort by priority desc, return top 3
  return Array.from(seen.values())
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
}

/**
 * Returns a single banner recommendation for the top of the app,
 * or null if no recommendation applies.
 */
export function getPersonalizedBanner(context: UserContext): PersonalizedBanner | null {
  const recs = getRecommendations(context)
  if (recs.length === 0) return null

  const top = recs[0]
  const locale = context.locale ?? 'fr'

  const ctaMap: Record<string, Record<string, string>> = {
    bundle: {
      fr: 'Voir le plan',
      en: 'View plan',
      ar: 'عرض الخطة',
      es: 'Ver plan',
    },
    module: {
      fr: 'Découvrir',
      en: 'Discover',
      ar: 'اكتشف',
      es: 'Descubrir',
    },
    b2b: {
      fr: 'En savoir plus',
      en: 'Learn more',
      ar: 'اعرف المزيد',
      es: 'Saber más',
    },
  }

  return {
    text: top.reason,
    cta: ctaMap[top.targetType]?.[locale] ?? ctaMap[top.targetType]?.['fr'] ?? 'En savoir plus',
    targetId: top.targetId,
    targetType: top.targetType,
  }
}
