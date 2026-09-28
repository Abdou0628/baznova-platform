/**
 * HireNova — AI Marketing Content Generator
 *
 * POST /api/ai/marketing-content
 *
 * Generates AI-powered marketing content for HireNova products using the LLM.
 * Any authenticated user can access this endpoint.
 *
 * @module api/ai/marketing-content
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/llm'
import { withAuth, logAudit } from '@/lib/hnsa'

// ===== Types =====

type ContentType = 'product_description' | 'social_post' | 'email_campaign' | 'landing_hero' | 'testimonials'
type Language = 'fr' | 'en' | 'ar' | 'es'
type Audience = 'students' | 'professionals' | 'freelancers' | 'employers' | 'enterprise'
type Tone = 'professional' | 'dynamic' | 'inspiring' | 'urgent'

interface MarketingContentRequest {
  type: ContentType
  product?: string
  language?: Language
  audience?: Audience
  tone?: Tone
}

// ===== Product Catalog =====

interface ProductInfo {
  name: { fr: string; en: string; ar: string; es: string }
  price: string
  bundle: string
}

const PRODUCTS: Record<string, ProductInfo> = {
  cv: {
    name: { fr: 'CV IA', en: 'AI Resume', ar: 'سيرة ذاتية IA', es: 'CV IA' },
    price: '€7.90',
    bundle: 'Start',
  },
  'cover-letter': {
    name: { fr: 'Lettre de Motivation IA', en: 'AI Cover Letter', ar: 'رسالة motivations IA', es: 'Carta de Presentación IA' },
    price: '€7.90',
    bundle: 'Start',
  },
  ats: {
    name: { fr: 'Analyse ATS', en: 'ATS Analysis', ar: 'تحليل ATS', es: 'Análisis ATS' },
    price: '€7.90',
    bundle: 'Start',
  },
  interview: {
    name: { fr: 'Simulateur Entretien', en: 'Interview Simulator', ar: 'محاكي المقابلة', es: 'Simulador de Entrevista' },
    price: '€9.90',
    bundle: 'Career',
  },
  linkedin: {
    name: { fr: 'LinkedIn Optimizer', en: 'LinkedIn Optimizer', ar: 'محسن لينكد إن', es: 'Optimizador LinkedIn' },
    price: '€9.90',
    bundle: 'Career',
  },
  career: {
    name: { fr: 'Career Roadmap', en: 'Career Roadmap', ar: 'خارطة المسار المهني', es: 'Mapa de Carrera' },
    price: '€9.90',
    bundle: 'Career',
  },
  coach: {
    name: { fr: 'Coach IA', en: 'AI Coach', ar: 'مدرب IA', es: 'Coach IA' },
    price: '€12.90',
    bundle: 'Professional',
  },
  formation: {
    name: { fr: 'Formation & Certification', en: 'Training & Certification', ar: 'تدريب وشهادة', es: 'Formación y Certificación' },
    price: '€12.90',
    bundle: 'Professional',
  },
  freelance: {
    name: { fr: 'Freelance Marketplace', en: 'Freelance Marketplace', ar: 'سوق العمل الحر', es: 'Mercado Freelance' },
    price: '€12.90',
    bundle: 'AI Power',
  },
  mobility: {
    name: { fr: 'Mobilité Internationale', en: 'International Mobility', ar: 'التنقل الدولي', es: 'Movilidad Internacional' },
    price: '€12.90',
    bundle: 'AI Power',
  },
  jobs: {
    name: { fr: 'Job Marketplace', en: 'Job Marketplace', ar: 'سوق العمل', es: 'Mercado Laboral' },
    price: 'Inclus',
    bundle: 'Gratuit',
  },
}

// ===== Pricing Bundles =====

const PRICING_BUNDLES = {
  Start: { price: '€9.90/mois', includes: 'CV IA + Lettre de Motivation IA + Analyse ATS' },
  Career: { price: '€19.90/mois', includes: 'Start + Simulateur Entretien + LinkedIn Optimizer + Career Roadmap' },
  Professional: { price: '€29.90/mois', includes: 'Career + Coach IA + Formation & Certification' },
  'AI Power': { price: '€39.90/mois', includes: 'Professional + Freelance Marketplace + Mobilité Internationale + API Access' },
}

// ===== Audience Context =====

const AUDIENCE_CONTEXT: Record<Audience, string> = {
  students: 'Jeunes diplômés et étudiants en recherche de premier emploi, stage ou alternance.',
  professionals: 'Professionnels en activité cherchant à évoluer, se reconvertir ou changer de poste.',
  freelancers: 'Travailleurs indépendants et freelances cherchant des missions et des clients.',
  employers: 'Recruteurs et entreprises cherchant des talents qualifiés.',
  enterprise: 'Grandes entreprises et organisations cherchant des solutions RH complètes.',
}

// ===== Tone Directives =====

const TONE_DIRECTIVES: Record<Tone, string> = {
  professional: 'Use a polished, authoritative tone. Emphasize expertise, reliability, and industry standards. No slang.',
  dynamic: 'Use an energetic, action-oriented tone. Short punchy sentences, active verbs, and a sense of urgency. Engage and excite.',
  inspiring: 'Use an aspirational, motivational tone. Paint a picture of success and transformation. Appeal to ambition and dreams.',
  urgent: 'Use a time-sensitive, persuasive tone. Create FOMO, emphasize limited-time opportunities, and push for immediate action.',
}

// ===== Language Directives =====

const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'French',
  en: 'English',
  ar: 'Arabic',
  es: 'Spanish',
}

// ===== System Prompt Builder =====

function buildSystemPrompt(params: {
  type: ContentType
  product?: string
  language: Language
  audience?: Audience
  tone: Tone
}): string {
  const { type, product, language, audience, tone } = params
  const productName = product ? PRODUCTS[product]?.name[language] : undefined
  const bundleName = product ? PRODUCTS[product]?.bundle : undefined
  const bundleInfo = bundleName ? PRICING_BUNDLES[bundleName as keyof typeof PRICING_BUNDLES] : undefined
  const audienceDesc = audience ? AUDIENCE_CONTEXT[audience] : 'Tous les utilisateurs.'
  const toneDirective = TONE_DIRECTIVES[tone]

  const brandIdentity = [
    'You are the marketing copywriter for "HireNova by E-Society 2050" — a Premium AI Recruitment Platform.',
    'HireNova is the all-in-one AI-powered recruitment and career platform that helps candidates, professionals, freelancers, and employers succeed.',
    'Key differentiators:',
    '- AI-powered: All features leverage cutting-edge artificial intelligence',
    '- Multi-language: Available in French, English, Arabic, and Spanish',
    '- HNSA Security: 8-pillar security framework ensuring enterprise-grade data protection',
    '- Multi-currency: Supports EUR, USD, MAD, XOF, XAF, GBP, and more',
  ].join('\n')

  const pricingContext = bundleInfo
    ? `\n\nPricing context for ${productName}:\n- Individual price: ${PRODUCTS[product!]?.price}\n- Available in the "${bundleName}" bundle at ${bundleInfo.price} (includes: ${bundleInfo.includes})\n- Mention the bundle pricing when relevant to drive upsells.`
    : `\n\nPricing bundles:\n${Object.entries(PRICING_BUNDLES)
        .map(([name, info]) => `- ${name} (${info.price}): ${info.includes}`)
        .join('\n')}`

  const productContext = productName
    ? `\n\nFocus product: ${productName} (slug: ${product}, bundle: ${bundleName}, price: ${PRODUCTS[product!]?.price})`
    : '\n\nYou may reference any HireNova product naturally. The full product catalog includes: CV IA, Lettre de Motivation IA, Analyse ATS, Simulateur Entretien, LinkedIn Optimizer, Career Roadmap, Coach IA, Formation & Certification, Freelance Marketplace, Mobilité Internationale, Job Marketplace.'

  const typeInstructions = getTypeInstructions(type)

  return [
    brandIdentity,
    productContext,
    pricingContext,
    '',
    `Target audience: ${audienceDesc}`,
    `Tone directive: ${toneDirective}`,
    `CRITICAL: All generated content MUST be in ${LANGUAGE_NAMES[language]}. Do not mix languages.`,
    '',
    typeInstructions,
  ].join('\n')
}

function getTypeInstructions(type: ContentType): string {
  switch (type) {
    case 'product_description':
      return [
        'Generate a compelling product description in exactly 3 paragraphs:',
        '1. Hook — Open with an emotional appeal or pain point that resonates with the target audience. Make them feel understood.',
        '2. Value & Benefits — Describe the product features and their tangible benefits. Use social proof language (e.g., "thousands of professionals trust...", "used by top recruiters"). Include specific metrics or outcomes where possible.',
        '3. CTA — Close with a clear, compelling call-to-action that drives the reader to sign up or learn more. Mention the relevant pricing bundle.',
        '',
        'Format: Use clean paragraphs. No markdown headers. Write like a premium landing page copy.',
      ].join('\n')

    case 'social_post':
      return [
        'Generate a social media post optimized for LinkedIn.',
        'Also provide a Twitter/X version in the same output, clearly separated.',
        '',
        'LinkedIn version requirements:',
        '- Maximum 700 characters',
        '- Include 2-3 relevant emojis (not excessive)',
        '- End with 3-5 relevant hashtags (mix of broad and niche)',
        '- Start with an engagement hook (question, bold statement, or surprising statistic)',
        '- Include a clear CTA',
        '',
        'Twitter/X version requirements:',
        '- Maximum 280 characters',
        '- Include 1-2 emojis',
        '- End with 2 hashtags',
        '- Concise and punchy',
        '',
        'Format the output as:',
        '[LINKEDIN]',
        '(LinkedIn post here)',
        '',
        '[TWITTER]',
        '(Twitter post here)',
      ].join('\n')

    case 'email_campaign':
      return [
        'Generate a marketing email with the following structure:',
        '',
        '[SUBJECT] — Compelling subject line (max 60 characters, no emoji)',
        '[PREVIEW] — Preview text for inbox (max 100 characters)',
        '',
        '[BODY]',
        'Section 1 — Personalized hook (reference the recipient\'s career situation)',
        'Section 2 — Value proposition with benefits and social proof',
        'Section 3 — Urgency/scarcity element + clear CTA',
        '',
        '[CTA_BUTTON] — Button text (max 30 characters)',
        '',
        'Rules:',
        '- Write in a conversational but professional tone',
        '- Use short paragraphs (2-3 sentences max)',
        '- Include specific product mentions where natural',
        '- Reference the relevant bundle pricing when appropriate',
        '- Personalization tokens: {{firstName}}, {{industry}}, {{goal}}',
      ].join('\n')

    case 'landing_hero':
      return [
        'Generate hero section copy for a landing page:',
        '',
        '[HEADLINE] — Main headline (max 10 words, impactful and clear)',
        '[SUBTITLE] — Supporting subtitle (max 20 words, expands on the headline)',
        '[CTA] — Primary button text (max 5 words, action-oriented)',
        '',
        'Rules:',
        '- Headline must be the strongest statement about the value proposition',
        '- Subtitle should address the primary pain point or aspiration',
        '- CTA must be a clear, specific action (not generic like "Learn More")',
        '- Keep it clean and premium — no exclamation marks in the headline',
      ].join('\n')

    case 'testimonials':
      return [
        'Generate 3 realistic testimonials from different user personas:',
        '',
        'Persona 1 — Student/Recent Graduate',
        'Persona 2 — Mid-career Professional',
        'Persona 3 — Employer/Recruiter',
        '',
        'For each testimonial, provide:',
        '- Name: A realistic localised name matching the content language',
        '- Role: Job title and company (realistic but fictional)',
        '- Quote: 2-3 sentences describing their experience with HireNova, specific results, and emotional impact',
        '- Rating: A number from 4 to 5 (e.g., ⭐⭐⭐⭐⭐ or 5/5)',
        '',
        'Format:',
        '--- Testimonial 1 ---',
        'Name: ...',
        'Role: ...',
        'Quote: ...',
        'Rating: ...',
        '',
        '--- Testimonial 2 ---',
        '...',
        '',
        '--- Testimonial 3 ---',
        '...',
        '',
        'Rules:',
        '- Quotes should feel genuine, not overly promotional',
        '- Include specific features mentioned (e.g., "the ATS analysis helped me...", "the interview simulator prepared me for...")',
        '- Mention measurable outcomes where possible (e.g., "got 3 interviews in a week", "scored 95% on ATS")',
      ].join('\n')

    default:
      return 'Generate high-quality marketing content following best practices.'
  }
}

// ===== User Prompt Builder =====

function buildUserPrompt(params: {
  type: ContentType
  product?: string
  language: Language
  audience?: Audience
  tone: Tone
}): string {
  const { type, product, language, audience, tone } = params
  const productName = product ? PRODUCTS[product]?.name[language] : undefined

  const parts = [
    `Generate a ${type.replace('_', ' ')} marketing content.`,
  ]

  if (productName) {
    parts.push(`Product: ${productName}`)
  }

  if (audience) {
    parts.push(`Audience: ${audience}`)
  }

  parts.push(`Tone: ${tone}`)
  parts.push(`Language: ${LANGUAGE_NAMES[language]}`)

  if (type === 'product_description') {
    parts.push('Make it persuasive, emotionally engaging, and conversion-focused.')
  } else if (type === 'social_post') {
    parts.push('Make it shareable and engagement-driven.')
  } else if (type === 'email_campaign') {
    parts.push('Make it personal, warm, and conversion-focused with clear urgency.')
  } else if (type === 'landing_hero') {
    parts.push('Make it bold, clear, and premium-feeling.')
  } else if (type === 'testimonials') {
    parts.push('Make them authentic and relatable with specific outcomes.')
  }

  return parts.join('. ')
}

// ===== Validation =====

function validateRequest(body: Partial<MarketingContentRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.type) {
    errors.push('Missing required field: type')
  } else if (!['product_description', 'social_post', 'email_campaign', 'landing_hero', 'testimonials'].includes(body.type)) {
    errors.push(`Invalid type: "${body.type}". Must be one of: product_description, social_post, email_campaign, landing_hero, testimonials`)
  }

  if (body.product && !PRODUCTS[body.product]) {
    errors.push(`Invalid product slug: "${body.product}". Must be one of: ${Object.keys(PRODUCTS).join(', ')}`)
  }

  if (body.type === 'product_description' && !body.product) {
    errors.push('Product slug is required when type is "product_description"')
  }

  if (body.language && !['fr', 'en', 'ar', 'es'].includes(body.language)) {
    errors.push(`Invalid language: "${body.language}". Must be one of: fr, en, ar, es`)
  }

  if (body.audience && !['students', 'professionals', 'freelancers', 'employers', 'enterprise'].includes(body.audience)) {
    errors.push(`Invalid audience: "${body.audience}". Must be one of: students, professionals, freelancers, employers, enterprise`)
  }

  if (body.tone && !['professional', 'dynamic', 'inspiring', 'urgent'].includes(body.tone)) {
    errors.push(`Invalid tone: "${body.tone}". Must be one of: professional, dynamic, inspiring, urgent`)
  }

  return { valid: errors.length === 0, errors }
}

// ===== POST Handler =====

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    // 2. Parse body
    let body: MarketingContentRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Please send a valid JSON request.' },
        { status: 400 }
      )
    }

    // 3. Validate
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // 4. Defaults
    const language = body.language ?? 'fr'
    const tone = body.tone ?? 'professional'
    const audience = body.audience ?? 'professionals'

    // 5. Build prompts
    const systemPrompt = buildSystemPrompt({
      type: body.type,
      product: body.product,
      language,
      audience,
      tone,
    })

    const userPrompt = buildUserPrompt({
      type: body.type,
      product: body.product,
      language,
      audience,
      tone,
    })

    // 6. Call LLM
    const result = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 2000,
    })

    const content = result.content

    // 7. Non-blocking audit log
    logAudit({
      actorId: auth.userId,
      action: 'AI_MARKETING_CONTENT_GENERATED',
      resource: 'MarketingContent',
      outcome: 'success',
      details: {
        type: body.type,
        product: body.product ?? null,
        language,
        audience,
        tone,
      },
    }).catch(() => {})

    // 8. Return response
    return NextResponse.json({
      success: true,
      content,
      type: body.type,
      language,
      product: body.product,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] /api/ai/marketing-content error:', error)

    // Non-blocking audit log for failure
    logAudit({
      actorId: undefined,
      action: 'AI_MARKETING_CONTENT_GENERATED',
      resource: 'MarketingContent',
      outcome: 'error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => {})

    return NextResponse.json(
      {
        error: 'Failed to generate marketing content. Please try again later.',
        details: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}
