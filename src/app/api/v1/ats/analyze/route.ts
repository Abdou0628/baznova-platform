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
    const { cvContent, jobDescription } = body
    if (!cvContent || !jobDescription) return NextResponse.json({ success: false, error: { code: 400, message: 'cvContent et jobDescription requis' } }, { status: 400 })

    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Tu es un expert ATS (Applicant Tracking System). Analyse un CV par rapport à une offre. Retourne un JSON: { "overallScore": 0-100, "categories": [{"name":"...", "score":0-100,"description":"..."}], "suggestions": ["..."] }' },
        { role: 'user', content: `CV:\n${cvContent}\n\nOffre:\n${jobDescription}` }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const content = res.choices?.[0]?.message?.content || ''
    await recordUsage(validation.subscriber!.id, '/api/v1/ats/analyze', 1, 'success', undefined, getClientIP(request))

    return NextResponse.json({ success: true, data: { content, creditsUsed: 1 } })
  } catch (error: any) {
    await recordUsage(validation.subscriber!.id, '/api/v1/ats/analyze', 0, 'error', error.message, getClientIP(request))
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur d\'analyse' } }, { status: 500 })
  }
}
