import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, recordUsage, getClientIP } from '@/lib/api-auth'
import ZAI from 'z-ai-web-dev-sdk'

const zai = ZAI.create()

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
  if (!apiKey) return NextResponse.json({ success: false, error: { code: 401, message: 'Clé API manquante' } }, { status: 401 })

  const validation = await validateApiKey(apiKey)
  if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: validation.error?.code || 401 })

  try {
    const body = await request.json()
    const { fullName, email, companyName, jobTitle, tone, language, keyStrengths, whyCompany } = body
    if (!fullName || !companyName || !jobTitle) return NextResponse.json({ success: false, error: { code: 400, message: 'fullName, companyName, jobTitle requis' } }, { status: 400 })

    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: `Tu es un expert en rédaction de lettres de motivation. Génère une lettre en ${language || 'fr'}, ton: ${tone || 'semi-formel'}. Retourne la lettre complète et professionnelle.` },
        { role: 'user', content: `Lettre pour: ${fullName} (${email}), Poste: ${jobTitle} chez ${companyName}. Forces: ${keyStrengths || 'N/A'}. Pourquoi cette entreprise: ${whyCompany || 'N/A'}` }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const content = res.choices?.[0]?.message?.content || ''
    await recordUsage(validation.subscriber!.id, '/api/v1/cl/generate', 1, 'success', undefined, getClientIP(request))

    return NextResponse.json({ success: true, data: { content, creditsUsed: 1 } })
  } catch (error: any) {
    await recordUsage(validation.subscriber!.id, '/api/v1/cl/generate', 0, 'error', error.message, getClientIP(request))
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur de génération' } }, { status: 500 })
  }
}
