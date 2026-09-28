import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/hnsa'

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const { missionTitle, missionDescription, missionSkills, language } = await req.json()

    if (!missionTitle || !missionDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const langMap: Record<string, string> = { fr: 'français', en: 'English', ar: 'Arabic', es: 'Spanish' }
    const lang = langMap[language] || 'français'

    const zai = await ZAI.create()
    const prompt = `Tu es un expert en rédaction de propositions freelance. Rédige une lettre de motivation convaincante et professionnelle en ${lang} pour la mission suivante.

Titre de la mission : ${missionTitle}
Description : ${missionDescription}
Compétences requises : ${missionSkills || 'Non spécifiées'}

La proposition doit :
1. Être concise (150-250 mots)
2. Montrer une compréhension claire du besoin
3. Mettre en avant une expérience pertinente
4. Proposer une approche méthodique
5. Se terminer par un appel à l'action

Ne rajoute pas de titre ni de formule de salutation. Rédige directement le contenu de la lettre.`

    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Tu es un assistant spécialisé dans la rédaction de propositions freelance professionnelles.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    })

    const proposal = res.choices?.[0]?.message?.content?.trim()
    if (!proposal) {
      return NextResponse.json({ error: 'Failed to generate proposal' }, { status: 500 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Proposal generation error:', error)
    return NextResponse.json({ error: 'Failed to generate proposal' }, { status: 500 })
  }
}
