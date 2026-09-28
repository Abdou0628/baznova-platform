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

// ── Types matching the frontend ──────────────────────────────────
interface TrendRow {
  skill: string
  industry: string
  growthRate: number
  demand: 'high' | 'medium' | 'low'
  region: string
}

interface Analysis {
  growing: string
  declining: string
  summary: string
}

// ── Fallback data (used when LLM is unavailable) ────────────────
const FALLBACK_TRENDS: TrendRow[] = [
  { skill: 'Intelligence Artificielle', industry: 'Tech', growthRate: 34.5, demand: 'high', region: 'Europe' },
  { skill: 'Machine Learning', industry: 'Tech', growthRate: 28.2, demand: 'high', region: 'Europe' },
  { skill: 'Cybersécurité', industry: 'Tech', growthRate: 22.1, demand: 'high', region: 'Europe' },
  { skill: 'Cloud Computing', industry: 'Tech', growthRate: 19.8, demand: 'high', region: 'Amériques' },
  { skill: 'Data Science', industry: 'Tech', growthRate: 25.4, demand: 'high', region: 'Europe' },
  { skill: 'DevOps', industry: 'Tech', growthRate: 18.3, demand: 'medium', region: 'Amériques' },
  { skill: 'UX/UI Design', industry: 'Design', growthRate: 15.7, demand: 'medium', region: 'Europe' },
  { skill: 'Green Tech', industry: 'Énergie', growthRate: 31.2, demand: 'high', region: 'Europe' },
  { skill: 'ESG Compliance', industry: 'Finance', growthRate: 27.8, demand: 'high', region: 'Europe' },
  { skill: 'Blockchain', industry: 'Finance', growthRate: 8.4, demand: 'low', region: 'Amériques' },
  { skill: 'Marketing Digital', industry: 'Marketing', growthRate: 12.5, demand: 'medium', region: 'MENA' },
  { skill: 'E-commerce', industry: 'Commerce', growthRate: 20.3, demand: 'high', region: 'MENA' },
  { skill: 'Télémedicine', industry: 'Santé', growthRate: 26.7, demand: 'high', region: 'Europe' },
  { skill: 'Robotique Industrielle', industry: 'Industrie', growthRate: 16.9, demand: 'medium', region: 'Asie' },
]

const LANG_MAP: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }

// ── Generate trends via LLM ──────────────────────────────────────
async function generateTrends(
  lang: string,
  industry: string,
  region: string,
): Promise<TrendRow[]> {
  const responseLang = LANG_MAP[lang] || 'English'

  const filterParts: string[] = []
  if (industry && industry !== 'all') filterParts.push(`industry: "${industry}"`)
  if (region && region !== 'all') filterParts.push(`region: "${region}"`)
  const filterContext = filterParts.length > 0
    ? `Filter focus: ${filterParts.join(', ')}. You may include some adjacent sectors for context but prioritize the requested filters.`
    : 'Cover a diverse range of industries and regions globally.'

  const systemPrompt = `You are HireNova Intelligence, an AI-powered labor market analyst. You track real-time employment trends across tech, green energy, finance, healthcare, and more. All skill names and industry labels must be written in ${responseLang}. Respond with JSON ONLY, no markdown.`

  const userPrompt = `Generate 12 current, real-world labor market trends for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
${filterContext}

For each trend provide:
- "skill": skill or competency name (in ${responseLang})
- "industry": industry sector (in ${responseLang})
- "growthRate": year-over-year growth percentage (float, 1-50 range, be realistic for 2025)
- "demand": one of "high", "medium", "low"
- "region": one of "Europe", "Amériques", "MENA", "Asie", "Africa", or a specific region

Respond with a JSON object: {"trends": [...array of trend objects...]}
Do NOT include any other fields.`

  const parsed = await chatCompletionJSON<{ trends: TrendRow[] }>({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 3000,
  })

  return (parsed.trends || []).map((t) => ({
    skill: String(t.skill || ''),
    industry: String(t.industry || ''),
    growthRate: Number(t.growthRate) || 0,
    demand: ['high', 'medium', 'low'].includes(t.demand) ? (t.demand as 'high' | 'medium' | 'low') : 'medium',
    region: String(t.region || ''),
  })).sort((a, b) => b.growthRate - a.growthRate)
}

// ── Generate analysis via LLM (for POST) ────────────────────────
async function generateAnalysis(
  trends: TrendRow[],
  lang: string,
): Promise<Analysis> {
  const responseLang = LANG_MAP[lang] || 'English'

  const systemPrompt = `You are HireNova Intelligence, an expert AI market analyst. You provide concise, data-driven analysis of labor market trends. Respond in ${responseLang}. Respond with JSON ONLY, no markdown.`

  const userPrompt = `Analyze the following labor market trends and provide a summary:
${JSON.stringify(trends, null, 2)}

Respond with a JSON object:
{
  "growing": "<comma-separated list of the top skills with growth > 15%>",
  "declining": "<comma-separated list of skills with growth < 10%, or a message saying none are critically declining>",
  "summary": "<2-3 sentence analysis covering: number of trends, average growth, highest-demand skill, and a key insight>"
}
Do NOT include any other fields.`

  return chatCompletionJSON<Analysis>({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 1000,
  })
}

// ── Build fallback analysis ──────────────────────────────────────
function buildFallbackAnalysis(trends: TrendRow[], lang: string): Analysis {
  const growing = trends.filter((t) => t.growthRate > 15).map((t) => t.skill)
  const declining = trends.filter((t) => t.growthRate < 10).map((t) => t.skill)
  const avgGrowth = trends.length > 0
    ? (trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length).toFixed(1)
    : '0'
  const topSkill = trends[0]?.skill || 'N/A'
  const highDemandCount = trends.filter((t) => t.demand === 'high').length

  const summaryMap: Record<string, string> = {
    fr: `Analyse IA : ${trends.length} tendances analysées. Croissance moyenne de ${avgGrowth}%. ${highDemandCount} compétences en forte demande. La compétence la plus dynamique est ${topSkill}.`,
    en: `AI Analysis: ${trends.length} trends analyzed. Average growth of ${avgGrowth}%. ${highDemandCount} skills in high demand. The most dynamic skill is ${topSkill}.`,
    ar: `تحليل الذكاء الاصطناعي: تم تحليل ${trends.length} اتجاه. متوسط النمو ${avgGrowth}%. ${highDemandCount} مهارات عالية الطلب. المهارة الأكثر ديناميكية هي ${topSkill}.`,
    es: `Análisis IA: ${trends.length} tendencias analizadas. Crecimiento medio de ${avgGrowth}%. ${highDemandCount} habilidades en alta demanda. La habilidad más dinámica es ${topSkill}.`,
  }

  const emptyMap: Record<string, string> = {
    fr: 'Aucune compétence en déclin critique.',
    en: 'No critically declining skills.',
    ar: 'لا توجد مهارات متراجعة بشكل حرج.',
    es: 'Sin habilidades en declive crítico.',
  }

  return {
    growing: growing.length > 0 ? growing.join(', ') : '',
    declining: declining.length > 0 ? declining.join(', ') : (emptyMap[lang] || emptyMap.en),
    summary: summaryMap[lang] || summaryMap.en,
  }
}

// ── GET handler ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry') || ''
    const region = searchParams.get('region') || ''
    const lang = searchParams.get('lang') || 'fr'

    const cacheKey = `trends:get:${lang}:${industry}:${region}`
    const cached = getCached<TrendRow[]>(cacheKey)
    if (cached) return NextResponse.json(cached)

    let trends: TrendRow[]
    try {
      trends = await generateTrends(lang, industry, region)
    } catch (llmErr) {
      console.warn('[GET /api/intelligence/trends] LLM failed, using fallback:', llmErr)
      trends = [...FALLBACK_TRENDS]
      // Apply simple filtering on fallback
      if (industry && industry !== 'all') {
        trends = trends.filter((t) => t.industry === industry)
      }
      if (region && region !== 'all') {
        trends = trends.filter((t) => t.region === region)
      }
      if (trends.length === 0) trends = FALLBACK_TRENDS
    }

    setCache(cacheKey, trends)
    return NextResponse.json(trends)
  } catch (error) {
    console.error('[GET /api/intelligence/trends]', error)
    return NextResponse.json(FALLBACK_TRENDS)
  }
}

// ── POST handler ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json()
    const { industry, region, language } = body
    const lang = language || 'fr'

    const cacheKey = `trends:post:${lang}:${industry || ''}:${region || ''}`
    const cached = getCached<{ trends: TrendRow[]; analysis: Analysis; meta: { totalTrends: number; avgGrowth: string; topSkill: string; highDemandCount: number } }>(cacheKey)
    if (cached) return NextResponse.json(cached)

    // Generate trends
    let trends: TrendRow[]
    try {
      trends = await generateTrends(lang, industry || '', region || '')
    } catch (llmErr) {
      console.warn('[POST /api/intelligence/trends] LLM trends failed, using fallback:', llmErr)
      trends = [...FALLBACK_TRENDS]
      if (industry && industry !== 'all') trends = trends.filter((t) => t.industry === industry)
      if (region && region !== 'all') trends = trends.filter((t) => t.region === region)
      if (trends.length === 0) trends = FALLBACK_TRENDS
    }

    // Generate analysis
    let analysis: Analysis
    try {
      analysis = await generateAnalysis(trends, lang)
    } catch (llmErr) {
      console.warn('[POST /api/intelligence/trends] LLM analysis failed, using fallback:', llmErr)
      analysis = buildFallbackAnalysis(trends, lang)
    }

    const avgGrowth = trends.length > 0
      ? (trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length).toFixed(1)
      : '0'
    const topSkill = trends[0]?.skill || 'N/A'
    const highDemandCount = trends.filter((t) => t.demand === 'high').length

    const payload = {
      trends,
      analysis,
      meta: { totalTrends: trends.length, avgGrowth, topSkill, highDemandCount },
    }

    setCache(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[POST /api/intelligence/trends]', error)
    return NextResponse.json({
      trends: FALLBACK_TRENDS,
      analysis: buildFallbackAnalysis(FALLBACK_TRENDS, 'fr'),
      meta: { totalTrends: FALLBACK_TRENDS.length, avgGrowth: '21.8', topSkill: 'Intelligence Artificielle', highDemandCount: 8 },
    })
  }
}
