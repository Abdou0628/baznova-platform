import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkAIAbuseLimit, logAIEvent } from '@/lib/hnsa'

// ─── Inline Pipeline Engine (no external service dependency) ─────────────────

interface PipelineStepDef {
  name: string
  agentId: string
  systemPrompt: string
  buildUserPrompt: (data: PipelineData, ctx: Record<string, unknown>) => string
}

interface PipelineData {
  jobDescription: string
  jobTitle: string
  company: string
  userCV?: string
  userSkills?: string[]
}

interface StepResult {
  step: string
  agentId: string
  status: 'completed' | 'error'
  result?: Record<string, unknown>
  error?: string
  duration: number
}

// ─── System Prompts (French — app primary language) ───────────────────────────

const SYSTEM_PROMPTS = {
  analyze_offer:
    "Tu es un expert en analyse d'offres d'emploi. Analyse l'offre suivante et extrais les informations clés au format JSON: { requiredSkills: string[], preferredSkills: string[], cultureKeywords: string[], seniority: string, domain: string }",

  match_score:
    "Tu es un expert en matching candidat-offre. Calcule un score de compatibilité sur 100. Format JSON: { score: number, strengths: string[], weaknesses: string[], recommendation: string }",

  optimize_cv:
    "Tu es un expert en optimisation de CV pour les ATS. Format JSON: { recommendations: string[], keywordsToAdd: string[], sectionsToImprove: string[], summaryOptimization: string }",

  generate_cover_letter:
    "Tu es un expert en rédaction de lettres de motivation. Format JSON: { subject: string, greeting: string, paragraphs: string[], closing: string }",

  prepare_interview:
    "Tu es un coach d'entretien IA. Format JSON: { questions: { question: string, category: string, tip: string }[], generalTips: string[], attitude: string }",

  career_advice:
    "Tu es un conseiller de carrière senior. Format JSON: { shortTerm: string[], longTerm: string[], skillsToDevelop: string[], networking: string, salaryNegotiation: string }",
}

// ─── User Prompt Builders (inject previous step context) ──────────────────────

const USER_PROMPT_BUILDERS: Record<string, (data: PipelineData, ctx: Record<string, unknown>) => string> = {
  analyze_offer(data) {
    return `Analyse cette offre d'emploi:\n\nTitre: ${data.jobTitle}\nEntreprise: ${data.company}\n\nDescription de l'offre:\n${data.jobDescription}`
  },

  match_score(data, ctx) {
    const analysis = ctx.analyze_offer || {}
    const skills = data.userSkills?.length ? data.userSkills.join(', ') : 'Non fournis'
    const cv = data.userCV?.substring(0, 500) || 'Non fourni'
    return `Compare ce candidat à l'offre analysée.\n\n--- COMPÉTENCES DU CANDIDAT ---\n${skills}\n\n--- EXTRAIT DU CV ---\n${cv}\n\n--- ANALYSE DE L'OFFRE ---\n${JSON.stringify(analysis, null, 2)}`
  },

  optimize_cv(data, ctx) {
    const analysis = ctx.analyze_offer || {}
    const match = ctx.match_score || {}
    const cv = data.userCV?.substring(0, 800) || 'CV non fourni — donne des conseils généraux.'
    return `Optimise ce CV pour l'offre.\n\n--- OFFRE (${data.jobTitle} chez ${data.company}) ---\n${JSON.stringify(analysis, null, 2)}\n\n--- SCORE DE COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}\n\n--- CV ACTUEL ---\n${cv}`
  },

  generate_cover_letter(data, ctx) {
    const analysis = ctx.analyze_offer || {}
    const match = ctx.match_score || {}
    const skills = data.userSkills?.length ? data.userSkills.join(', ') : 'Non fournis'
    return `Rédige une lettre de motivation pour ce candidat.\n\n--- CANDIDAT ---\nCompétences: ${skills}\n\n--- POSTE ---\n${data.jobTitle} chez ${data.company}\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}`
  },

  prepare_interview(data, ctx) {
    const analysis = ctx.analyze_offer || {}
    const match = ctx.match_score || {}
    return `Prépare ce candidat à l'entretien.\n\n--- POSTE ---\n${data.jobTitle} chez ${data.company}\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}`
  },

  career_advice(data, ctx) {
    const analysis = ctx.analyze_offer || {}
    const match = ctx.match_score || {}
    const cvRecs = ctx.optimize_cv || {}
    return `Donne des conseils de carrière stratégiques.\n\n--- POSTE VISÉ ---\n${data.jobTitle} chez ${data.company}\n\n--- ANALYSE DE L'OFFRE ---\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}\n\n--- RECOMMANDATIONS CV ---\n${JSON.stringify(cvRecs, null, 2)}`
  },
}

// ─── Pipeline Step Definitions ────────────────────────────────────────────────

const JOB_COPILOT_STEPS: PipelineStepDef[] = [
  { name: 'analyze_offer', agentId: 'jobs', systemPrompt: SYSTEM_PROMPTS.analyze_offer, buildUserPrompt: USER_PROMPT_BUILDERS.analyze_offer },
  { name: 'match_score', agentId: 'ats', systemPrompt: SYSTEM_PROMPTS.match_score, buildUserPrompt: USER_PROMPT_BUILDERS.match_score },
  { name: 'optimize_cv', agentId: 'cv', systemPrompt: SYSTEM_PROMPTS.optimize_cv, buildUserPrompt: USER_PROMPT_BUILDERS.optimize_cv },
  { name: 'generate_cover_letter', agentId: 'career', systemPrompt: SYSTEM_PROMPTS.generate_cover_letter, buildUserPrompt: USER_PROMPT_BUILDERS.generate_cover_letter },
  { name: 'prepare_interview', agentId: 'interview', systemPrompt: SYSTEM_PROMPTS.prepare_interview, buildUserPrompt: USER_PROMPT_BUILDERS.prepare_interview },
  { name: 'career_advice', agentId: 'coach', systemPrompt: SYSTEM_PROMPTS.career_advice, buildUserPrompt: USER_PROMPT_BUILDERS.career_advice },
]

// ─── LLM Helper (inline SDK call) ─────────────────────────────────────────────

let zaiInstance: Awaited<ReturnType<any>> | null = null
let llmInitPromise: Promise<void> | null = null

async function ensureLLM(): Promise<boolean> {
  if (zaiInstance) return true
  if (!llmInitPromise) {
    llmInitPromise = (async () => {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        zaiInstance = await ZAI.create()
        console.log('[orchestration/execute] LLM SDK initialized')
      } catch (err) {
        console.error('[orchestration/execute] LLM SDK init failed:', err)
      }
    })()
  }
  await llmInitPromise
  return !!zaiInstance
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  if (!zaiInstance) throw new Error('LLM not initialized')

  const result = await zaiInstance.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'deepseek-chat',
    temperature: 0.5,
    max_tokens: 2000,
  })

  const text = result?.choices?.[0]?.message?.content || ''
  if (!text.trim()) throw new Error('Empty LLM response')

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>
    } catch {
      // fall through to raw
    }
  }

  return { raw: text }
}

// ─── API Route ─────────────────────────────────────────────────────────────────

/**
 * POST /api/orchestration/execute
 *
 * Executes a Job Copilot pipeline INLINE using z-ai-web-dev-sdk.
 * No dependency on external mini-services (port 3005 / 3004).
 *
 * Returns all step results synchronously once the full pipeline completes.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    // AI abuse check
    if (auth.userId) {
      const aiCheck = checkAIAbuseLimit(auth.userId)
      if (!aiCheck.allowed) {
        return NextResponse.json(
          { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(aiCheck.retryAfterMs / 1000)) } },
        )
      }
    }

    const body = await request.json()
    const { pipelineType, data } = body as {
      pipelineType: 'job_copilot'
      data: PipelineData
    }

    if (!pipelineType || pipelineType !== 'job_copilot') {
      return NextResponse.json({ error: 'Invalid pipelineType. Supported: job_copilot' }, { status: 400 })
    }

    if (!data?.jobDescription?.trim() || !data?.jobTitle?.trim()) {
      return NextResponse.json({ error: 'jobDescription and jobTitle are required' }, { status: 400 })
    }

    // Ensure LLM SDK is ready
    const llmReady = await ensureLLM()
    if (!llmReady) {
      return NextResponse.json({ error: 'Service IA temporairement indisponible. Réessayez dans quelques instants.' }, { status: 503 })
    }

    // Execute pipeline sequentially — shared context flows between steps
    const context: Record<string, unknown> = {}
    const steps: StepResult[] = []

    for (const stepDef of JOB_COPILOT_STEPS) {
      const stepStart = Date.now()
      try {
        const userPrompt = stepDef.buildUserPrompt(data, context)
        const stepResult = await callLLM(stepDef.systemPrompt, userPrompt)

        // Store in shared context for subsequent steps
        context[stepDef.name] = stepResult

        steps.push({
          step: stepDef.name,
          agentId: stepDef.agentId,
          status: 'completed',
          result: stepResult,
          duration: Date.now() - stepStart,
        })

        console.log(`[orchestration/execute] Step ${stepDef.name} ✓ (${Date.now() - stepStart}ms)`)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[orchestration/execute] Step ${stepDef.name} ✗: ${errorMsg}`)

        // Store error but continue pipeline
        context[stepDef.name] = { error: errorMsg }
        steps.push({
          step: stepDef.name,
          agentId: stepDef.agentId,
          status: 'error',
          error: errorMsg,
          duration: Date.now() - stepStart,
        })
      }
    }

    // Log AI event
    if (auth.userId) {
      logAIEvent({
        userId: auth.userId,
        action: 'pipeline_execute',
        module: 'orchestration',
        inputTokens: data.jobDescription.length,
        outputTokens: JSON.stringify(steps).length,
      }).catch(() => {})
    }

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      pipelineId: `PIPE-${Date.now().toString(36).toUpperCase()}`,
      pipelineType: 'job_copilot',
      steps,
      totalDuration,
      executedInline: true,
    })
  } catch (error) {
    console.error('[orchestration/execute] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
