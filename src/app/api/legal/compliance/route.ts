import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

const jurisdictionInfo: Record<string, string> = {
  ma: 'Morocco (Code du Travail marocain, Loi 09-08 sur la protection des données personnelles)',
  fr: 'France (Code du Travail, RGPD, Loi informatique et libertés)',
  eu: 'European Union (EU Labour Directives, GDPR, Working Time Directive)',
  sa: 'Saudi Arabia (Saudi Labour Law, PDPL)',
  ae: 'United Arab Emirates (UAE Labour Law, DIFC Data Protection Law)',
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const { jurisdiction, language } = await req.json()

    const j = jurisdiction || 'ma'
    const lang = language || 'fr'
    const langMap: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }
    const responseLang = langMap[lang] || 'English'

    const systemPrompt = `You are HireNova IA LEGAL, an expert legal compliance AI specializing in employment law and GDPR compliance across Morocco, France, EU, Saudi Arabia, and UAE. Provide structured compliance analysis. Respond in ${responseLang}.`

    const userPrompt = `Perform a comprehensive employment law compliance analysis for the following jurisdiction: ${jurisdictionInfo[j] || j}

Provide your analysis in the following JSON format (respond with JSON ONLY, no markdown):
{
  "score": <number 0-100>,
  "checklist": [
    {"item": "<compliance item description>", "checked": true/false, "required": true/false},
    {"item": "<compliance item description>", "checked": true/false, "required": true/false}
  ],
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>",
    "<recommendation 4>",
    "<recommendation 5>"
  ]
}

Include at least 12 checklist items covering:
- Employment contract requirements
- Working hours regulations
- Minimum wage compliance
- Leave and holidays
- Health and safety
- Data protection (GDPR/local equivalent)
- Anti-discrimination policies
- Termination procedures
- Social security/insurance
- Employee documentation
- Probation period rules
- Overtime regulations

Generate realistic checked/unchecked states. The score should reflect the overall compliance level.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || ''

    let result: { score: number; checklist: Array<{ item: string; checked: boolean; required: boolean }>; recommendations: string[] }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 50, checklist: [], recommendations: [raw] }
    } catch {
      result = { score: 50, checklist: [], recommendations: [raw] }
    }

    // Save to DB
    const check = await db.complianceCheck.create({
      data: {
        jurisdiction: j,
        score: result.score || 0,
        checklist: JSON.stringify(result.checklist || []),
        recommendations: JSON.stringify(result.recommendations || []),
        language: lang,
      },
    })

    return NextResponse.json({
      id: check.id,
      jurisdiction: check.jurisdiction,
      score: check.score,
      checklist: result.checklist || [],
      recommendations: result.recommendations || [],
      language: check.language,
      createdAt: check.createdAt,
    })
  } catch (error) {
    console.error('[POST /api/legal/compliance]', error)
    return NextResponse.json({ error: 'Failed to run compliance check' }, { status: 500 })
  }
}
