import { NextRequest, NextResponse } from 'next/server'
import { AGENTS, CTO_PRINCIPAL, type DispatchResult, type CVLanguage } from '@/lib/agent-registry'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/hnsa'

// Agent keyword map for fast classification (no LLM needed for obvious cases)
const AGENT_KEYWORDS: Record<string, string[]> = {
  cv: ['cv', 'resume', 'curriculum', 'سيرة', 'generer cv', 'créer cv', 'create cv', 'crear cv', 'modèle cv', 'template cv'],
  ats: ['ats', 'score ats', 'scoring', 'optimisation ats', 'compatibilité', 'mots-clés', 'keywords'],
  interview: ['entretien', 'interview', 'مقابلة', 'entrevista', 'simulation', 'préparation entretien', 'practice interview'],
  linkedin: ['linkedin', 'profil linkedin', 'optimisation linkedin', 'linkedin profile', 'mejorar linkedin'],
  career: ['carrière', 'career', 'مسار مهني', 'orientación', 'orientation', 'roadmap', 'feuille de route', 'compétences'],
  coach: ['coach', 'coaching', 'مدرب', 'coaching carrière', 'career coach', 'objectif', 'goal'],
  formation: ['formation', 'training', 'تدريب', 'formación', 'cours', 'course', 'certification', 'certificat'],
  jobs: ['emploi', 'job', 'وظيفة', 'trabajo', 'offre d\'emploi', 'job offer', 'postuler', 'candidater'],
  recruiter: ['recruteur', 'recruiter', 'مستقبل', 'reclutador', 'pipeline', 'sourcing', 'candidat'],
  freelance: ['freelance', 'mission freelance', 'مهمة حرة', 'proyecto freelance', 'indépendant'],
  global: ['international', 'global', 'دولي', 'internacional', 'recrutement international', 'expatriation'],
  api: ['api', 'intégration', 'integration', 'تكامل', 'endpoint', 'clé api', 'api key'],
  intelligence: ['intelligence', 'tendances', 'trends', 'اتجاهات', 'tendencias', 'salaires', 'salaries', 'prévisions'],
  mobility: ['mobilité', 'mobility', 'تنقل', 'movilidad', 'ocr', 'relocalisation', 'pays'],
  chatbot: ['chatbot', 'chat', 'support', 'aide', 'مساعدة', 'ayuda', 'conseil', 'advice'],
  campus: ['campus', 'université', 'جامعة', 'universidad', 'atelier', 'workshop', 'étudiant'],
  marketplace: ['communauté', 'community', 'مجتمع', 'comunidad', 'marketplace', 'événement', 'event'],
  whiteLabel: ['white label', 'marque blanche', 'علامة بيضاء', 'marca blanca', 'personnalisation', 'customisation'],
  legal: ['juridique', 'legal', 'قانوني', 'legal', 'contrat', 'contract', 'عقد', 'rgpd', 'gdpr', 'conformité'],
}

function fastClassify(message: string): string | null {
  const lower = message.toLowerCase()
  let bestMatch: string | null = null
  let bestCount = 0

  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length
    if (count > bestCount) {
      bestCount = count
      bestMatch = agentId
    }
  }

  return bestCount > 0 ? bestMatch : null
}

async function llmClassify(message: string, language: CVLanguage): Promise<{
  primaryAgentId: string
  secondaryAgentIds: string[]
  mode: 'solo' | 'sequential' | 'parallel'
  intent: string
  response: string
}> {
  const langPrompt: Record<CVLanguage, string> = {
    fr: 'Réponds en français.',
    en: 'Respond in English.',
    ar: 'أجب بالعربية.',
    es: 'Responde en español.',
  }

  const agentList = AGENTS.map(a => `- ${a.id}: ${a.module}`).join('\n')
  const zai = await ZAI.create()

  const result = await zai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `Tu es le CTO Principal de HireNova IA, l'orchestrateur général. Tu analyses les demandes et les routes vers les bons agents.
${langPrompt[language]}

Agents disponibles:
${agentList}

Réponds UNIQUEMENT en JSON:
{"primaryAgentId": "<id>", "secondaryAgentIds": ["<id>", ...], "mode": "solo"|"sequential"|"parallel", "intent": "<intention classifiée>", "response": "<réponse courte et utile>"}`,
      },
      { role: 'user', content: message },
    ],
    temperature: 0.1,
    max_tokens: 500,
  })

  try {
    const content = result.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fallback
  }

  // Fallback: use fast classify
  const primary = fastClassify(message) ?? 'cv'
  return {
    primaryAgentId: primary,
    secondaryAgentIds: [],
    mode: 'solo',
    intent: message.slice(0, 100),
    response: 'Classification terminée.',
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await request.json()
    const { message, language = 'fr' } = body as { message: string; language?: CVLanguage }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Step 1: Fast keyword classification (< 1ms)
    const fastMatch = fastClassify(message)

    // Step 2: If fast match is confident (2+ keyword hits), use it directly
    // Otherwise, use LLM for nuanced classification
    const lower = message.toLowerCase()
    const fastConfidence = fastMatch
      ? AGENT_KEYWORDS[fastMatch].filter(kw => lower.includes(kw)).length
      : 0

    let classification: {
      primaryAgentId: string
      secondaryAgentIds: string[]
      mode: 'solo' | 'sequential' | 'parallel'
      intent: string
      response: string
    }

    if (fastConfidence >= 2) {
      // Fast path — no LLM needed
      const agent = AGENTS.find(a => a.id === fastMatch)
      const secondaries = agent?.collaborations.slice(0, 2).map(c => c.agentId) ?? []
      classification = {
        primaryAgentId: fastMatch,
        secondaryAgentIds: secondaries,
        mode: secondaries.length > 1 ? 'parallel' : secondaries.length === 1 ? 'sequential' : 'solo',
        intent: message.slice(0, 120),
        response: `Routage vers ${agent?.module ?? fastMatch} — ${agent?.description[language] ?? ''}`,
      }
    } else {
      // LLM path for nuanced requests
      classification = await llmClassify(message, language)
    }

    // Step 3: Build dispatch result
    const primaryAgent = AGENTS.find(a => a.id === classification.primaryAgentId)
    const secondaryAgents = (classification.secondaryAgentIds ?? [])
      .map(id => AGENTS.find(a => a.id === id))
      .filter(Boolean) as typeof AGENTS

    if (!primaryAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const estimatedTime = classification.mode === 'parallel'
      ? primaryAgent.avgResponseTime
      : `${(parseFloat(primaryAgent.avgResponseTime) + secondaryAgents.reduce((s, a) => s + parseFloat(a.avgResponseTime), 0)).toFixed(1)}s`

    const result: DispatchResult = {
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userLanguage: language,
      classifiedIntent: classification.intent,
      primaryAgent,
      secondaryAgents,
      collaborationMode: classification.mode,
      estimatedTime,
      response: classification.response,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Orchestration] Dispatch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Return full agent registry
export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })


  return NextResponse.json({
    ctoPrincipal: CTO_PRINCIPAL,
    agents: AGENTS,
    totalAgents: AGENTS.length,
    totalCapabilities: AGENTS.reduce((sum, a) => sum + a.capabilities.length, 0),
    totalCollaborations: AGENTS.reduce((sum, a) => sum + a.collaborations.length, 0),
  })
}
