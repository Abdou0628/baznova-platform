import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, recordUsage, getClientIP } from '@/lib/api-auth'
import ZAI from 'z-ai-web-dev-sdk'

const zai = ZAI.create()

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
  if (!apiKey) return NextResponse.json({ success: false, error: { code: 401, message: 'Clé API manquante' } }, { status: 401 })

  const validation = await validateApiKey(apiKey)
  if (!validation.valid) {
    return NextResponse.json({ success: false, error: validation.error }, { status: validation.error?.code || 401 })
  }

  try {
    const body = await request.json()
    const { fullName, email, phone, targetJob, skills, experience, education, language } = body
    if (!fullName || !email || !targetJob) return NextResponse.json({ success: false, error: { code: 400, message: 'fullName, email, targetJob requis' } }, { status: 400 })

    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: `Tu es un expert en rédaction de CV professionnels. Génère un CV complet et structuré en ${language || 'fr'}. Retourne un JSON valide: { "summary": "...", "experience": [{ "title":"...", "company":"...", "period":"...", "description":"..." }], "education": [{ "degree":"...", "school":"...", "period":"...", "description":"..." }], "skills": ["..."], "languages": [{ "name":"...", "level":"..." }] }` },
        { role: 'user', content: `Génère un CV pour: Nom: ${fullName}, Email: ${email}, Téléphone: ${phone || 'N/A'}, Poste visé: ${targetJob}, Compétences: ${skills || 'N/A'}, Expérience: ${experience || 'N/A'}, Formation: ${education || 'N/A'}` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = res.choices?.[0]?.message?.content || ''
    await recordUsage(validation.subscriber!.id, '/api/v1/cv/generate', 1, 'success', undefined, getClientIP(request))

    return NextResponse.json({ success: true, data: { content, creditsUsed: 1 } })
  } catch (error: any) {
    await recordUsage(validation.subscriber!.id, '/api/v1/cv/generate', 0, 'error', error.message, getClientIP(request))
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur de génération' } }, { status: 500 })
  }
}
