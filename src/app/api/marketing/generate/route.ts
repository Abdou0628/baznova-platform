/**
 * HireNova — AI Marketing Copy Generator
 *
 * POST /api/marketing/generate
 *
 * Generates AI-enhanced marketing copy for a given product.
 * If the product exists in the database, base data is enhanced with LLM.
 * Falls back to static data if LLM fails or times out.
 */

import { NextRequest, NextResponse } from 'next/server'
import { marketingProducts, type MarketingProduct } from '@/lib/marketing/products'
import { CVLanguage } from '@/lib/i18n'

// ===== Types =====

type MarketingTone = 'premium' | 'friendly' | 'urgent'
type MarketingObjective = 'conversion' | 'awareness' | 'retention'

interface GenerateRequest {
  product: string
  language: CVLanguage
  tone?: MarketingTone
  objective?: MarketingObjective
}

interface GenerateResponse {
  product: string
  language: CVLanguage
  headline: string
  description: string
  voiceScript: string
  cta: string
  animation: string
  voice: 'female' | 'male'
  duration: number
}

// ===== Helpers =====

const LANGUAGE_NAMES: Record<CVLanguage, string> = {
  fr: 'French',
  en: 'English',
  ar: 'Arabic',
  es: 'Spanish',
}

const TONE_LABELS: Record<MarketingTone, string> = {
  premium: 'premium, luxurious, high-end',
  friendly: 'friendly, approachable, warm',
  urgent: 'urgent, compelling, action-driven',
}

const OBJECTIVE_LABELS: Record<MarketingObjective, string> = {
  conversion: 'drive immediate purchase/signup conversion',
  awareness: 'build brand awareness and product discovery',
  retention: 'engage existing users and encourage repeat usage',
}

/**
 * Estimate audio duration from text length (~60ms per character)
 */
function estimateDuration(text: string): number {
  return Math.round(text.length * 60)
}

/**
 * Build static fallback from the product database
 */
function buildStaticResponse(
  product: MarketingProduct,
  language: CVLanguage
): GenerateResponse {
  return {
    product: product.slug,
    language,
    headline: product.headlines[language],
    description: product.descriptions[language],
    voiceScript: product.voiceScript[language],
    cta: product.cta[language],
    animation: 'slide-up',
    voice: 'female',
    duration: estimateDuration(product.voiceScript[language]),
  }
}

/**
 * Generate LLM-enhanced marketing copy
 */
async function generateWithLLM(
  product: MarketingProduct,
  language: CVLanguage,
  tone: MarketingTone,
  objective: MarketingObjective
): Promise<Partial<GenerateResponse> | null> {
  try {
    const { LLM } = await import('z-ai-web-dev-sdk')
    const llm = new LLM()

    const langName = LANGUAGE_NAMES[language]
    const toneLabel = TONE_LABELS[tone]
    const objectiveLabel = OBJECTIVE_LABELS[objective]

    const baseName = product.names[language]
    const baseHeadline = product.headlines[language]
    const baseDescription = product.descriptions[language]
    const baseVoiceScript = product.voiceScript[language]
    const baseCta = product.cta[language]

    const prompt = `
You are a world-class marketing copywriter. Write your entire response in ${langName}.

Your task is to ENHANCE the following marketing copy for the product "${baseName}".
The tone should be ${toneLabel}. The objective is to ${objectiveLabel}.

Base copy to enhance:
- Headline: ${baseHeadline}
- Description: ${baseDescription}
- Voice Script (for audio narration): ${baseVoiceScript}
- CTA button text: ${baseCta}

You MUST respond with ONLY a valid JSON object (no markdown, no code fences) with these exact keys:
{
  "headline": "enhanced headline in ${langName}",
  "description": "enhanced product description in ${langName}",
  "voiceScript": "enhanced voice narration script in ${langName}",
  "cta": "enhanced call-to-action button text in ${langName}"
}

Important rules:
- Keep the voice script natural and suitable for audio narration (conversational but persuasive)
- The CTA should be short (2-5 words) and action-oriented
- The description should be compelling but concise (2-3 sentences)
- Make sure all text is in ${langName}
- Return ONLY the JSON, nothing else
`.trim()

    const result = await llm.chat({
      messages: [{ role: 'user', content: prompt }],
    })

    const content = result?.content ?? ''

    // Try to parse the LLM response as JSON
    // Handle potential markdown code fences
    let jsonStr = content.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : baseHeadline,
      description: typeof parsed.description === 'string' ? parsed.description : baseDescription,
      voiceScript: typeof parsed.voiceScript === 'string' ? parsed.voiceScript : baseVoiceScript,
      cta: typeof parsed.cta === 'string' ? parsed.cta : baseCta,
    }
  } catch {
    // LLM failed — return null to trigger fallback
    return null
  }
}

// ===== Route Handler =====

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { product: productSlug, language, tone = 'premium', objective = 'conversion' } = body

    // Validate required fields
    if (!productSlug || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: product and language are required' },
        { status: 400 }
      )
    }

    // Validate language
    const validLanguages: CVLanguage[] = ['fr', 'en', 'ar', 'es']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate tone
    const validTones: MarketingTone[] = ['premium', 'friendly', 'urgent']
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Invalid tone. Must be one of: ${validTones.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate objective
    const validObjectives: MarketingObjective[] = ['conversion', 'awareness', 'retention']
    if (!validObjectives.includes(objective)) {
      return NextResponse.json(
        { error: `Invalid objective. Must be one of: ${validObjectives.join(', ')}` },
        { status: 400 }
      )
    }

    // Find product in database
    const product = marketingProducts.find((p) => p.slug === productSlug)

    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${productSlug}` },
        { status: 404 }
      )
    }

    // Build base static response
    const baseResponse = buildStaticResponse(product, language)

    // Try to enhance with LLM
    const enhanced = await generateWithLLM(product, language, tone, objective)

    if (enhanced) {
      // Merge enhanced data with base response
      const response: GenerateResponse = {
        ...baseResponse,
        headline: enhanced.headline ?? baseResponse.headline,
        description: enhanced.description ?? baseResponse.description,
        voiceScript: enhanced.voiceScript ?? baseResponse.voiceScript,
        cta: enhanced.cta ?? baseResponse.cta,
        duration: estimateDuration(enhanced.voiceScript ?? baseResponse.voiceScript),
      }
      return NextResponse.json(response)
    }

    // LLM failed — return static fallback
    return NextResponse.json(baseResponse)
  } catch (error) {
    console.error('[/api/marketing/generate] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error while generating marketing copy' },
      { status: 500 }
    )
  }
}
