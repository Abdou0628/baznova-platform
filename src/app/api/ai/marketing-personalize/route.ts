/**
 * HireNova — AI Marketing Personalization Engine
 *
 * POST /api/ai/marketing-personalize
 *
 * Takes quiz answers and user context, returns:
 * - Personalized bundle recommendation with reasoning
 * - AI-generated testimonials matching the user profile
 * - Dynamic marketing copy (headline, subtitle, CTA)
 * - Cross-sell product suggestions
 *
 * @module api/ai/marketing-personalize
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/llm'
import { logAudit } from '@/lib/hnsa'

// ===== Types =====

type Language = 'fr' | 'en' | 'ar' | 'es'

type QuizProfile = {
  goal: 'find_job' | 'create_cv' | 'career_change' | 'prepare_interview' | 'freelance' | 'hire_talent' | 'enterprise_solution'
  experience: 'student' | 'junior' | 'mid' | 'senior' | 'executive'
  urgency: 'immediate' | 'this_month' | 'few_months' | 'exploring'
  budget: 'minimal' | 'moderate' | 'premium' | 'enterprise'
}

interface PersonalizeRequest {
  quizProfile?: QuizProfile
  language?: Language
  currentPlan?: string
  sessionId?: string
}

interface ProductRecommendation {
  slug: string
  name: string
  reason: string
  priority: 'primary' | 'secondary' | 'upsell'
}

interface Testimonial {
  name: string
  role: string
  company: string
  quote: string
  rating: number
  avatar: string
}

interface PersonalizeResponse {
  success: boolean
  bundle: {
    id: string
    name: string
    price: string
    reason: string
    savings: string
  }
  products: ProductRecommendation[]
  testimonials: Testimonial[]
  heroCopy: {
    headline: string
    subtitle: string
    cta: string
    socialProof: string
  }
  profileLabel: string
  confidenceScore: number
}

// ===== Product & Bundle Catalog =====

const BUNDLES: Record<string, { id: string; name: Record<Language, string>; price: string; products: string[] }> = {
  hirenova_start: {
    id: 'hirenova_start',
    name: { fr: 'HireNova Start', en: 'HireNova Start', ar: 'HireNova Start', es: 'HireNova Start' },
    price: '€9.90/mois',
    products: ['cv', 'cover-letter', 'ats'],
  },
  hirenova_career: {
    id: 'hirenova_career',
    name: { fr: 'HireNova Career', en: 'HireNova Career', ar: 'HireNova Career', es: 'HireNova Career' },
    price: '€19.90/mois',
    products: ['cv', 'cover-letter', 'ats', 'interview', 'linkedin', 'career'],
  },
  hirenova_professional: {
    id: 'hirenova_professional',
    name: { fr: 'HireNova Professional', en: 'HireNova Professional', ar: 'HireNova Professional', es: 'HireNova Professional' },
    price: '€29.90/mois',
    products: ['cv', 'cover-letter', 'ats', 'interview', 'linkedin', 'career', 'coach', 'formation'],
  },
  hirenova_ai_power: {
    id: 'hirenova_ai_power',
    name: { fr: 'HireNova AI Power', en: 'HireNova AI Power', ar: 'HireNova AI Power', es: 'HireNova AI Power' },
    price: '€39.90/mois',
    products: ['cv', 'cover-letter', 'ats', 'interview', 'linkedin', 'career', 'coach', 'formation', 'freelance', 'mobility'],
  },
  enterprise: {
    id: 'enterprise',
    name: { fr: 'HireNova Enterprise', en: 'HireNova Enterprise', ar: 'HireNova Enterprise', es: 'HireNova Enterprise' },
    price: 'Sur mesure',
    products: ['white-label', 'recruiter', 'api', 'legal'],
  },
}

const PRODUCTS: Record<string, { slug: string; name: Record<Language, string> }> = {
  cv: { slug: 'cv', name: { fr: 'CV IA Professionnel', en: 'Professional AI Resume', ar: 'سيرة ذاتية احترافية IA', es: 'CV Profesional IA' } },
  'cover-letter': { slug: 'cover-letter', name: { fr: 'Lettre de Motivation IA', en: 'AI Cover Letter', ar: 'رسالة تحفيزية IA', es: 'Carta de Presentación IA' } },
  ats: { slug: 'ats', name: { fr: 'Analyse ATS', en: 'ATS Analysis', ar: 'تحليل ATS', es: 'Análisis ATS' } },
  interview: { slug: 'interview', name: { fr: 'Simulateur Entretien IA', en: 'AI Interview Simulator', ar: 'محاكي المقابلة IA', es: 'Simulador de Entrevista IA' } },
  linkedin: { slug: 'linkedin', name: { fr: 'LinkedIn Optimizer', en: 'LinkedIn Optimizer', ar: 'محسن لينكد إن', es: 'Optimizador LinkedIn' } },
  career: { slug: 'career', name: { fr: 'Career Roadmap', en: 'Career Roadmap', ar: 'خارطة المسار المهني', es: 'Mapa de Carrera' } },
  coach: { slug: 'coach', name: { fr: 'Coach IA Carrière', en: 'AI Career Coach', ar: 'مدرب مسار مهني IA', es: 'Coach IA Carrera' } },
  formation: { slug: 'formation', name: { fr: 'Formation & Certification', en: 'Training & Certification', ar: 'تدريب وشهادة', es: 'Formación y Certificación' } },
  freelance: { slug: 'freelance', name: { fr: 'Freelance Marketplace', en: 'Freelance Marketplace', ar: 'سوق العمل الحر', es: 'Mercado Freelance' } },
  mobility: { slug: 'mobility', name: { fr: 'Mobilité Internationale', en: 'International Mobility', ar: 'التنقل الدولي', es: 'Movilidad Internacional' } },
  'white-label': { slug: 'white-label', name: { fr: 'Solution White-Label', en: 'White-Label Solution', ar: 'حلول العلامة البيضاء', es: 'Solución White-Label' } },
  recruiter: { slug: 'recruiter', name: { fr: 'Pipeline Recrutement IA', en: 'AI Recruitment Pipeline', ar: 'خط أنابيب التوظيف IA', es: 'Pipeline Reclutamiento IA' } },
  api: { slug: 'api', name: { fr: 'API Portal', en: 'API Portal', ar: 'بوابة API', es: 'Portal API' } },
  legal: { slug: 'legal', name: { fr: 'Legal & Compliance', en: 'Legal & Compliance', ar: 'قانوني وامتثال', es: 'Legal y Cumplimiento' } },
}

// ===== Rule-Based Bundle Matcher (fast fallback) =====

function matchBundleRule(quiz: QuizProfile): { bundleId: string; reason: string } {
  const { goal, experience, budget } = quiz

  // Enterprise path
  if (goal === 'enterprise_solution' || goal === 'hire_talent' || budget === 'enterprise') {
    return {
      bundleId: 'enterprise',
      reason: goal === 'enterprise_solution'
        ? 'custom_enterprise'
        : 'recruitment_scale',
    }
  }

  // Senior/Executive with premium budget
  if ((experience === 'senior' || experience === 'executive') && budget === 'premium') {
    return { bundleId: 'hirenova_ai_power', reason: 'senior_full_stack' }
  }

  // Career change needs comprehensive tools
  if (goal === 'career_change') {
    return { bundleId: 'hirenova_professional', reason: 'career_transition' }
  }

  // Interview prep + career development
  if (goal === 'prepare_interview') {
    if (budget === 'premium') return { bundleId: 'hirenova_ai_power', reason: 'full_career_prep' }
    return { bundleId: 'hirenova_career', reason: 'interview_career' }
  }

  // Freelance path
  if (goal === 'freelance') {
    if (budget === 'premium' || budget === 'moderate') return { bundleId: 'hirenova_ai_power', reason: 'freelance_business' }
    return { bundleId: 'hirenova_career', reason: 'freelance_start' }
  }

  // Job search - scale with experience and budget
  if (goal === 'find_job') {
    if (experience === 'executive' || budget === 'premium') return { bundleId: 'hirenova_ai_power', reason: 'executive_search' }
    if (experience === 'senior' || experience === 'mid') return { bundleId: 'hirenova_professional', reason: 'professional_search' }
    if (experience === 'junior' || budget === 'moderate') return { bundleId: 'hirenova_career', reason: 'career_launch' }
    return { bundleId: 'hirenova_start', reason: 'first_job' }
  }

  // Create CV only
  if (goal === 'create_cv') {
    if (budget === 'moderate' || budget === 'premium') return { bundleId: 'hirenova_career', reason: 'cv_plus_value' }
    return { bundleId: 'hirenova_start', reason: 'cv_essentials' }
  }

  return { bundleId: 'hirenova_start', reason: 'default_recommendation' }
}

// ===== Default Fallback Response =====

function getFallbackResponse(lang: Language): PersonalizeResponse {
  const copy: Record<Language, PersonalizeResponse> = {
    fr: {
      success: true,
      bundle: { id: 'hirenova_start', name: 'HireNova Start', price: '€9.90/mois', reason: 'Le bundle idéal pour commencer votre parcours professionnel avec l\'IA.', savings: 'Économisez 40% vs achats individuels' },
      products: [
        { slug: 'cv', name: 'CV IA Professionnel', reason: 'Créez un CV qui passe les filtres ATS', priority: 'primary' },
        { slug: 'cover-letter', name: 'Lettre de Motivation IA', reason: 'Lettres personnalisées pour chaque candidature', priority: 'secondary' },
        { slug: 'ats', name: 'Analyse ATS', reason: 'Optimisez votre score de compatibilité', priority: 'secondary' },
      ],
      testimonials: [
        { name: 'Sarah M.', role: 'Développeuse Frontend', company: 'TechStartup Paris', quote: 'Grâce à HireNova, j\'ai reçu 5 invitations d\'entretien en une semaine. Le CV IA a fait toute la différence !', rating: 5, avatar: '👩‍💻' },
        { name: 'Karim B.', role: 'Chef de Projet Digital', company: 'Maroc Telecom', quote: 'Le simulateur d\'entretien m\'a préparé parfaitement. J\'ai décroché le poste du premier coup.', rating: 5, avatar: '👨‍💼' },
        { name: 'Elena R.', role: 'Data Analyst', company: 'Casablanca Finance', quote: 'L\'analyse ATS m\'a montré exactement ce que les recruteurs cherchent. Score passé de 45% à 92%.', rating: 4, avatar: '👩‍🔬' },
      ],
      heroCopy: { headline: 'Votre Carrière, Accélérée par l\'IA', subtitle: '20+ outils IA pour chaque étape de votre parcours professionnel', cta: 'Découvrir Mon Plan', socialProof: '+12 000 professionnels nous font confiance' },
      profileLabel: 'Parcours Classique',
      confidenceScore: 75,
    },
    en: {
      success: true,
      bundle: { id: 'hirenova_start', name: 'HireNova Start', price: '€9.90/month', reason: 'The ideal bundle to kickstart your professional journey with AI.', savings: 'Save 40% vs individual purchases' },
      products: [
        { slug: 'cv', name: 'Professional AI Resume', reason: 'Create a resume that passes ATS filters', priority: 'primary' },
        { slug: 'cover-letter', name: 'AI Cover Letter', reason: 'Personalized letters for every application', priority: 'secondary' },
        { slug: 'ats', name: 'ATS Analysis', reason: 'Optimize your compatibility score', priority: 'secondary' },
      ],
      testimonials: [
        { name: 'James L.', role: 'Software Engineer', company: 'London Tech Co.', quote: 'Thanks to HireNova, I got 5 interview invitations in one week. The AI resume made all the difference!', rating: 5, avatar: '👨‍💻' },
        { name: 'Fatima Z.', role: 'Digital Project Manager', company: 'Rabat Innovation Hub', quote: 'The interview simulator prepared me perfectly. I landed the job on the first try.', rating: 5, avatar: '👩‍💼' },
        { name: 'Carlos M.', role: 'Data Analyst', company: 'Madrid Fintech', quote: 'ATS analysis showed me exactly what recruiters look for. Score went from 45% to 92%.', rating: 4, avatar: '🧑‍🔬' },
      ],
      heroCopy: { headline: 'Your Career, AI-Accelerated', subtitle: '20+ AI tools for every step of your professional journey', cta: 'Discover My Plan', socialProof: 'Trusted by 12,000+ professionals' },
      profileLabel: 'Classic Path',
      confidenceScore: 75,
    },
    ar: {
      success: true,
      bundle: { id: 'hirenova_start', name: 'HireNova Start', price: '€9.90/شهر', reason: 'الحزمة المثالية لبدء مسارك المهني بالذكاء الاصطناعي.', savings: 'وفّر 40% مقارنة بالشراء الفردي' },
      products: [
        { slug: 'cv', name: 'سيرة ذاتية احترافية IA', reason: 'أنشئ سيرة ذاتية تتجاوز فلاتر ATS', priority: 'primary' },
        { slug: 'cover-letter', name: 'رسالة تحفيزية IA', reason: 'رسائل مخصصة لكل طلب توظيف', priority: 'secondary' },
        { slug: 'ats', name: 'تحليل ATS', reason: 'حسّن نقاط توافقك', priority: 'secondary' },
      ],
      testimonials: [
        { name: 'سارة م.', role: 'مطورة واجهات أمامية', company: 'شركة تقنية الرباط', quote: 'بفضل HireNova، حصلت على 5 دعوات مقابلة في أسبوع واحد.', rating: 5, avatar: '👩‍💻' },
        { name: 'كريم ب.', role: 'مدير مشاريع رقمية', company: 'إنnovacija الدار البيضاء', quote: 'محاكي المقابلة هيأني بشكل مثالي. حصلت على الوظيفة من المحاولة الأولى.', rating: 5, avatar: '👨‍💼' },
      ],
      heroCopy: { headline: 'مسارك المهني، متسارع بالذكاء الاصطناعي', subtitle: '+20 أداة ذكاء اصطناعي لكل مرحلة من مسارك المهني', cta: 'اكتشف خطتي', socialProof: 'أكثر من 12,000 محترف يثقون بنا' },
      profileLabel: 'المسار الكلاسيكي',
      confidenceScore: 75,
    },
    es: {
      success: true,
      bundle: { id: 'hirenova_start', name: 'HireNova Start', price: '€9.90/mes', reason: 'El paquete ideal para comenzar tu camino profesional con IA.', savings: 'Ahorra 40% vs compras individuales' },
      products: [
        { slug: 'cv', name: 'CV Profesional IA', reason: 'Crea un CV que supere los filtros ATS', priority: 'primary' },
        { slug: 'cover-letter', name: 'Carta de Presentación IA', reason: 'Cartas personalizadas para cada aplicación', priority: 'secondary' },
        { slug: 'ats', name: 'Análisis ATS', reason: 'Optimiza tu puntuación de compatibilidad', priority: 'secondary' },
      ],
      testimonials: [
        { name: 'María G.', role: 'Ingeniera de Software', company: 'Barcelona Tech', quote: 'Gracias a HireNova, recibí 5 invitaciones a entrevistas en una semana.', rating: 5, avatar: '👩‍💻' },
        { name: 'Ahmed K.', role: 'Director de Proyectos', company: 'Casablanca Digital', quote: 'El simulador de entrevistas me preparó perfectamente. Conseguí el trabajo a la primera.', rating: 5, avatar: '👨‍💼' },
      ],
      heroCopy: { headline: 'Tu Carrera, Acelerada por IA', subtitle: '+20 herramientas IA para cada paso de tu camino profesional', cta: 'Descubrir Mi Plan', socialProof: 'Más de 12,000 profesionales confían en nosotros' },
      profileLabel: 'Camino Clásico',
      confidenceScore: 75,
    },
  }
  return copy[lang]
}

// ===== POST Handler =====

export async function POST(request: NextRequest) {
  try {
    let body: PersonalizeRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const lang = body.language ?? 'fr'
    const quiz = body.quizProfile

    // If no quiz profile, return default personalization
    if (!quiz) {
      return NextResponse.json(getFallbackResponse(lang))
    }

    // Rule-based matching (always works, fast)
    const ruleMatch = matchBundleRule(quiz)
    const bundle = BUNDLES[ruleMatch.bundleId]
    const bundleProducts = (bundle?.products ?? []).map((slug) => {
      const prod = PRODUCTS[slug]
      return prod ? { slug, name: prod.name[lang], reason: '', priority: 'secondary' as const } : null
    }).filter(Boolean) as ProductRecommendation[]

    // Mark primary product based on goal
    const primaryMap: Record<string, string> = {
      find_job: 'career', create_cv: 'cv', career_change: 'coach', prepare_interview: 'interview',
      freelance: 'freelance', hire_talent: 'recruiter', enterprise_solution: 'white-label',
    }
    const primarySlug = primaryMap[quiz.goal] ?? 'cv'
    bundleProducts.forEach((p) => {
      if (p.slug === primarySlug) { p.priority = 'primary'; p.reason = 'recommandé_pour_votre_objectif' }
    })

    // Try AI-powered personalization (non-blocking, with fallback)
    let aiResult: PersonalizeResponse | null = null
    try {
      const goalLabels: Record<string, Record<Language, string>> = {
        find_job: { fr: 'Trouver un emploi', en: 'Find a job', ar: 'إيجاد عمل', es: 'Encontrar empleo' },
        create_cv: { fr: 'Créer un CV', en: 'Create a resume', ar: 'إنشاء سيرة ذاتية', es: 'Crear un CV' },
        career_change: { fr: 'Reconversion professionnelle', en: 'Career change', ar: 'تغيير المسار المهني', es: 'Cambio de carrera' },
        prepare_interview: { fr: 'Préparer un entretien', en: 'Prepare for interview', ar: 'التحضير لمقابلة', es: 'Preparar entrevista' },
        freelance: { fr: 'Lancez-vous en freelance', en: 'Start freelancing', ar: 'ابدأ العمل الحر', es: 'Comenzar como freelance' },
        hire_talent: { fr: 'Recruter des talents', en: 'Hire talent', ar: 'توظيف المواهب', es: 'Reclutar talento' },
        enterprise_solution: { fr: 'Solution entreprise', en: 'Enterprise solution', ar: 'حل مؤسسي', es: 'Solución empresarial' },
      }

      const expLabels: Record<string, Record<Language, string>> = {
        student: { fr: 'Étudiant', en: 'Student', ar: 'طالب', es: 'Estudiante' },
        junior: { fr: 'Junior (0-2 ans)', en: 'Junior (0-2 years)', ar: 'مبتدئ (0-2 سنوات)', es: 'Junior (0-2 años)' },
        mid: { fr: 'Intermédiaire (3-7 ans)', en: 'Mid-level (3-7 years)', ar: 'متوسط (3-7 سنوات)', es: 'Intermedio (3-7 años)' },
        senior: { fr: 'Senior (8-15 ans)', en: 'Senior (8-15 years)', ar: 'كبير (8-15 سنة)', es: 'Senior (8-15 años)' },
        executive: { fr: 'Direction (15+ ans)', en: 'Executive (15+ years)', ar: 'تنفيذي (15+ سنة)', es: 'Ejecutivo (15+ años)' },
      }

      const langNames: Record<Language, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }

      const systemPrompt = `You are the AI Marketing Personalization Engine for "HireNova by E-Society 2050" — a Premium AI Recruitment Platform with 20+ AI-powered career tools.

You MUST respond in valid JSON only. No markdown, no explanation, just the JSON object.

The JSON must follow this exact structure:
{
  "bundle_reason": "A 2-sentence explanation of why this bundle is perfect for this user, referencing their specific goal and experience level. Be specific and personal.",
  "profile_label": "A short 3-5 word label describing this user's profile (e.g., 'Jeune Talent en Recherche', 'Cadre en Reconversion')",
  "confidence_score": 90,
  "hero_headline": "A personalized headline (max 8 words) that speaks directly to this user's situation",
  "hero_subtitle": "A supporting subtitle (max 15 words) addressing their specific pain point",
  "hero_cta": "A button text (max 4 words) that feels personal and actionable",
  "hero_social_proof": "A social proof line (max 8 words) that feels relevant to their profile",
  "testimonials": [
    {"name": "Realistic name", "role": "Job title", "company": "Company name", "quote": "2-3 sentence testimonial mentioning specific results and the user's goal. Be authentic, not promotional.", "rating": 5, "avatar": "emoji that represents this person"},
    {"name": "Realistic name", "role": "Job title", "company": "Company name", "quote": "2-3 sentence testimonial from someone with similar profile", "rating": 5, "avatar": "emoji"},
    {"name": "Realistic name", "role": "Job title", "company": "Company name", "quote": "2-3 sentence testimonial", "rating": 4, "avatar": "emoji"}
  ],
  "product_reasons": {
    "${primarySlug}": "Why this primary product is essential for their specific goal"
  }
}

IMPORTANT:
- ALL content MUST be in ${langNames[lang]}
- Names should be culturally appropriate for the language
- Companies should feel realistic (mix of known and fictional)
- Quotes must reference specific HireNova features and measurable outcomes
- The confidence_score should be 80-98 based on how clearly the user's needs map to a bundle
- Make testimonials feel genuine, not salesy
- For Arabic content, use natural Arabic (not translated French)`

      const userPrompt = `User profile:
- Goal: ${goalLabels[quiz.goal]?.[lang] ?? quiz.goal}
- Experience: ${expLabels[quiz.experience]?.[lang] ?? quiz.experience}
- Urgency: ${quiz.urgency}
- Budget: ${quiz.budget}
- Recommended bundle: ${bundle?.name[lang] ?? ruleMatch.bundleId} (${bundle?.price ?? ''})
- Bundle products: ${bundleProducts.map((p) => p.name).join(', ')}
- Primary product: ${PRODUCTS[primarySlug]?.name[lang] ?? primarySlug}

Generate personalized marketing content for this user.`

      const result = await chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2000,
      })

      // Parse AI response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const ai = JSON.parse(jsonMatch[0])

        // Merge AI reasons into products
        if (ai.product_reasons) {
          bundleProducts.forEach((p) => {
            if (ai.product_reasons[p.slug]) p.reason = ai.product_reasons[p.slug]
          })
        }

        // Build response
        aiResult = {
          success: true,
          bundle: {
            id: ruleMatch.bundleId,
            name: bundle?.name[lang] ?? ruleMatch.bundleId,
            price: bundle?.price ?? '',
            reason: ai.bundle_reason ?? '',
            savings: ruleMatch.bundleId !== 'enterprise' ? 'Économisez jusqu\'à 40% vs achats individuels' : '',
          },
          products: bundleProducts,
          testimonials: (ai.testimonials ?? []).slice(0, 3).map((t: Record<string, unknown>) => ({
            name: String(t.name ?? ''),
            role: String(t.role ?? ''),
            company: String(t.company ?? ''),
            quote: String(t.quote ?? ''),
            rating: Number(t.rating) || 5,
            avatar: String(t.avatar ?? '👤'),
          })),
          heroCopy: {
            headline: String(ai.hero_headline ?? ''),
            subtitle: String(ai.hero_subtitle ?? ''),
            cta: String(ai.hero_cta ?? ''),
            socialProof: String(ai.hero_social_proof ?? ''),
          },
          profileLabel: String(ai.profile_label ?? ''),
          confidenceScore: Number(ai.confidence_score) || 80,
        }
      }
    } catch (aiError) {
      console.error('[Marketing Personalize] AI generation failed, using rule-based fallback:', aiError)
    }

    // Use AI result or build from rules
    const response = aiResult ?? (() => {
      const fallback = getFallbackResponse(lang)
      return {
        ...fallback,
        bundle: {
          id: ruleMatch.bundleId,
          name: bundle?.name[lang] ?? ruleMatch.bundleId,
          price: bundle?.price ?? '',
          reason: fallback.bundle.reason,
          savings: ruleMatch.bundleId !== 'enterprise' ? fallback.bundle.savings : '',
        },
        products: bundleProducts,
      }
    })()

    // Audit log
    logAudit({
      actorId: undefined,
      action: 'MARKETING_PERSONALIZATION',
      resource: 'MarketingEngine',
      outcome: 'success',
      details: { goal: quiz.goal, experience: quiz.experience, bundle: ruleMatch.bundleId, language: lang },
    }).catch(() => {})

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] /api/ai/marketing-personalize error:', error)
    return NextResponse.json(getFallbackResponse('fr'))
  }
}
