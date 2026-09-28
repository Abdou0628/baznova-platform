import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { chatCompletionJSON } from '@/lib/llm'

// ── Simple in-memory cache (TTL 5 min) ──────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && entry.expires > Date.now()) return entry.data as T
  cache.delete(key)
  return null
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL })
}

// ── Fallback forecast (used when LLM is unavailable) ────────────
const FALLBACK_FORECAST = {
  outlook: 'moderate' as const,
  careerScore: 65,
  skillDemandLevel: 'medium' as const,
  insights: [
    'This skill shows stable demand in the current market.',
    'Companies are investing in digital transformation, creating opportunities.',
    'Remote work has expanded the geographical market for this role.',
    'Competition is moderate — upskilling can provide a significant edge.',
    'The 6-12 month outlook suggests gradual salary growth.',
  ],
  emergingRoles: ['Senior Specialist', 'Team Lead', 'Consultant'],
  salaryTrend: 'Gradual upward trend expected over the next 6-12 months, with potential for 5-10% increase for experienced professionals.',
  recommendation: 'Focus on building expertise in adjacent technologies and obtaining relevant certifications to maximize your market value.',
}

const LANG_MAP: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }

// ── POST handler ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { skill, industry, region, language } = await request.json()

    if (!skill || skill.trim().length === 0) {
      return NextResponse.json({ error: 'Skill is required' }, { status: 400 })
    }

    const lang = language || 'fr'
    const responseLang = LANG_MAP[lang] || 'English'

    // Cache key based on all inputs
    const cacheKey = `forecast:${lang}:${skill}:${industry || ''}:${region || ''}`
    const cached = getCached<{
      skill: string; industry: string | null; region: string | null
      forecast: typeof FALLBACK_FORECAST; generatedAt: string
    }>(cacheKey)
    if (cached) return NextResponse.json(cached)

    // Build LLM prompt — fully dynamic, no DB dependency
    const filterParts: string[] = [`Target Skill: ${skill}`]
    if (industry) filterParts.push(`Target Industry: ${industry}`)
    if (region) filterParts.push(`Target Region: ${region}`)

    const systemPrompt = `You are BazNova Intelligence, an expert AI market analyst. You provide labor market forecasts, skill demand predictions, and career opportunity assessments based on current 2025 market data. Respond in ${responseLang}. Always provide structured, data-driven insights. Respond with JSON ONLY, no markdown.`

    const userPrompt = `Generate a detailed market intelligence forecast for the next 6-12 months (mid-2025 to early 2026).

Context:
${filterParts.map((p) => `- ${p}`).join('\n')}

Based on your knowledge of current labor market conditions, hiring trends, and industry developments, provide your analysis in the following JSON format:
{
  "outlook": "bullish|moderate|bearish",
  "careerScore": <number 0-100>,
  "skillDemandLevel": "very_high|high|medium|low",
  "insights": [
    "<insight 1 — a specific market observation>",
    "<insight 2 — hiring trend or employer behavior>",
    "<insight 3 — geographic or sector-specific detail>",
    "<insight 4 — competition or talent supply note>",
    "<insight 5 — forward-looking prediction for next 6-12 months>"
  ],
  "emergingRoles": ["<emerging role 1>", "<emerging role 2>", "<emerging role 3>"],
  "salaryTrend": "<2-3 sentence description of expected salary trend>",
  "recommendation": "<personalized career recommendation based on the skill and context>"
}

Do NOT include any other fields. Be specific and data-driven in your insights.`

    let forecast: typeof FALLBACK_FORECAST
    try {
      forecast = await chatCompletionJSON<typeof FALLBACK_FORECAST>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 2000,
      })

      // Validate & sanitize
      const validOutlooks = ['bullish', 'moderate', 'bearish']
      const validDemand = ['very_high', 'high', 'medium', 'low']
      forecast.outlook = validOutlooks.includes(forecast.outlook) ? forecast.outlook : 'moderate'
      forecast.careerScore = Math.min(100, Math.max(0, Number(forecast.careerScore) || 65))
      forecast.skillDemandLevel = validDemand.includes(forecast.skillDemandLevel) ? forecast.skillDemandLevel : 'medium'
      forecast.insights = Array.isArray(forecast.insights) ? forecast.insights.map(String).slice(0, 5) : FALLBACK_FORECAST.insights
      forecast.emergingRoles = Array.isArray(forecast.emergingRoles) ? forecast.emergingRoles.map(String).slice(0, 5) : []
      forecast.salaryTrend = String(forecast.salaryTrend || '')
      forecast.recommendation = String(forecast.recommendation || '')
    } catch (llmErr) {
      console.warn('[POST /api/intelligence/forecast] LLM failed, using fallback:', llmErr)
      forecast = FALLBACK_FORECAST
    }

    const payload = {
      skill,
      industry: industry || null,
      region: region || null,
      forecast,
      generatedAt: new Date().toISOString(),
    }

    setCache(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[POST /api/intelligence/forecast]', error)
    return NextResponse.json({
      error: 'Failed to generate forecast',
      forecast: FALLBACK_FORECAST,
    }, { status: 500 })
  }
}
