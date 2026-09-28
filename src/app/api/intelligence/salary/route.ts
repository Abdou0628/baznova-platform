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

// ── Type matching the frontend ──────────────────────────────────
interface SalaryRow {
  jobTitle: string
  industry: string
  location: string
  salaryMin: number
  salaryAvg: number
  salaryMax: number
  currency: string
  source: string
}

// ── Fallback data (used when LLM is unavailable) ────────────────
const FALLBACK: SalaryRow[] = [
  { jobTitle: 'Full-Stack Developer', industry: 'Tech', location: 'Paris, France', salaryMin: 38000, salaryAvg: 52000, salaryMax: 70000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'Data Scientist', industry: 'Tech', location: 'Paris, France', salaryMin: 42000, salaryAvg: 58000, salaryMax: 85000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'AI Engineer', industry: 'Tech', location: 'Paris, France', salaryMin: 50000, salaryAvg: 70000, salaryMax: 100000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'UX/UI Designer', industry: 'Design', location: 'Lyon, France', salaryMin: 32000, salaryAvg: 42000, salaryMax: 58000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'Digital Project Manager', industry: 'Tech', location: 'Bordeaux, France', salaryMin: 40000, salaryAvg: 55000, salaryMax: 75000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'DevOps Engineer', industry: 'Tech', location: 'London, UK', salaryMin: 45000, salaryAvg: 65000, salaryMax: 95000, currency: 'GBP', source: 'HireNova Intelligence' },
  { jobTitle: 'Cybersecurity Analyst', industry: 'Tech', location: 'Munich, Germany', salaryMin: 48000, salaryAvg: 62000, salaryMax: 88000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'Marketing Manager', industry: 'Marketing', location: 'Madrid, Spain', salaryMin: 30000, salaryAvg: 45000, salaryMax: 65000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'ESG Consultant', industry: 'Finance', location: 'Paris, France', salaryMin: 45000, salaryAvg: 65000, salaryMax: 90000, currency: 'EUR', source: 'HireNova Intelligence' },
  { jobTitle: 'Green Tech Engineer', industry: 'Energy', location: 'Berlin, Germany', salaryMin: 42000, salaryAvg: 58000, salaryMax: 80000, currency: 'EUR', source: 'HireNova Intelligence' },
]

const LANG_MAP: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }

// ── GET handler ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim()
    const industry = (searchParams.get('industry') || '').trim()
    const region = (searchParams.get('region') || '').trim()
    const lang = searchParams.get('lang') || 'fr'
    const responseLang = LANG_MAP[lang] || 'English'

    // Build cache key from all filters
    const cacheKey = `salary:${lang}:${query}:${industry}:${region}`
    const cached = getCached<{ results: SalaryRow[]; avgGlobal: number }>(cacheKey)
    if (cached) return NextResponse.json(cached)

    // Build prompt context from filters
    const filterParts: string[] = []
    if (query) filterParts.push(`search query: "${query}"`)
    if (industry && industry !== 'all') filterParts.push(`industry: ${industry}`)
    if (region && region !== 'all') filterParts.push(`region: ${region}`)
    const filterContext = filterParts.length > 0
      ? `The user is filtering by: ${filterParts.join(', ')}. Only return results matching these criteria.`
      : 'Return a diverse set of popular tech and digital roles across different regions.'

    const systemPrompt = `You are HireNova Intelligence, an AI-powered labor market analyst specializing in salary benchmarking data. You provide accurate, up-to-date salary estimates for various job roles across industries and regions. All job titles and descriptions must be in ${responseLang}. Respond with JSON ONLY, no markdown.`

    const userPrompt = `Generate 10 realistic salary benchmark entries for the current job market (2025). ${filterContext}

For each entry, provide:
- "jobTitle": the job title in ${responseLang}
- "industry": the industry sector
- "location": city and country (use real cities, vary across Europe, MENA, Americas, Asia)
- "salaryMin": minimum annual salary (integer, in local currency)
- "salaryAvg": average annual salary (integer, in local currency)
- "salaryMax": maximum annual salary (integer, in local currency)
- "currency": the 3-letter currency code (EUR, GBP, USD, MAD, AED, SAR, etc.)
- "source": always "HireNova Intelligence"

Use realistic 2025 market data. Vary seniority levels (junior to senior). Respond with a JSON object:
{"results": [...array of entries...]}

Do NOT include any other fields in the JSON.`

    let results: SalaryRow[] = []
    try {
      const parsed = await chatCompletionJSON<{ results: SalaryRow[] }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 3000,
      })
      results = (parsed.results || []).map((r) => ({
        jobTitle: r.jobTitle || '',
        industry: r.industry || '',
        location: r.location || '',
        salaryMin: Number(r.salaryMin) || 0,
        salaryAvg: Number(r.salaryAvg) || 0,
        salaryMax: Number(r.salaryMax) || 0,
        currency: r.currency || 'EUR',
        source: r.source || 'HireNova Intelligence',
      }))
    } catch (llmErr) {
      console.warn('[GET /api/intelligence/salary] LLM failed, using fallback:', llmErr)
      // Apply simple text filtering on fallback data
      if (query) {
        const q = query.toLowerCase()
        results = FALLBACK.filter(
          (r) =>
            r.jobTitle.toLowerCase().includes(q) ||
            r.industry.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q),
        )
      }
      if (industry && industry !== 'all') {
        const ind = industry.toLowerCase()
        results = results.filter((r) => r.industry.toLowerCase().includes(ind))
      }
      if (region && region !== 'all') {
        const reg = region.toLowerCase()
        results = results.filter((r) => r.location.toLowerCase().includes(reg))
      }
      if (results.length === 0) results = FALLBACK
    }

    // Compute avgGlobal from results (normalised roughly to EUR for display)
    const avgGlobal =
      results.length > 0
        ? Math.round(results.reduce((sum, s) => sum + s.salaryAvg, 0) / results.length)
        : 0

    const payload = { results, avgGlobal }
    setCache(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[GET /api/intelligence/salary]', error)
    const avgGlobal = Math.round(FALLBACK.reduce((s, r) => s + r.salaryAvg, 0) / FALLBACK.length)
    return NextResponse.json({ results: FALLBACK, avgGlobal })
  }
}
