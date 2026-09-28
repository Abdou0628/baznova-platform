// =============================================================================
// BazNova IA — Autonomous Agent Brain (Phase 3B/C)
// Decision engine, memory system, inter-agent collaboration, proactive intelligence
// Enhanced with LLM-powered decisions + real-time event broadcasting
// SERVER-ONLY — do not import in client components
// =============================================================================

import { db } from '@/lib/db'
import { AGENTS } from '@/lib/agent-registry'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentDecision {
  agentId: string
  action: 'delegate' | 'act' | 'suggest' | 'wait' | 'escalate'
  targetAgent?: string
  reasoning: string
  confidence: number
  payload?: Record<string, unknown>
}

export interface ProactiveInsight {
  type: string
  sourceAgent: string
  title: { fr: string; en: string; ar: string; es: string }
  description: { fr: string; en: string; ar: string; es: string }
  actionUrl?: string
  confidence: number
  reason: string
  category: string
}

export interface AgentCollaboration {
  fromAgent: string
  toAgent: string
  type: 'delegate' | 'inform' | 'request' | 'respond'
  payload: Record<string, unknown>
  priority: number
  reasoning: string
}

export interface UserContext {
  userId: string
  plan: string
  role: string
  hasResume: boolean
  resumeCount: number
  atsScores: number[]
  interviewSessions: number
  coverLetters: number
  linkedinAnalyses: number
  careerAssessments: number
  coachSessions: number
  recentActivity: string[]
  applicationCount: number
}

export type AgentEvent =
  | 'resume_created'
  | 'resume_updated'
  | 'ats_analyzed'
  | 'cover_letter_generated'
  | 'interview_completed'
  | 'linkedin_analyzed'
  | 'career_assessment_done'
  | 'job_applied'
  | 'coach_session_done'
  | 'pipeline_executed'
  | 'suggestion_dismissed'
  | 'suggestion_accepted'
  | 'user_login'
  | 'plan_changed'

// ─── Event Broadcaster (→ WebSocket Agent Bus) ────────────────────────────

const AGENT_BUS_URL = process.env.AGENT_BUS_URL || 'http://localhost:3005'

export async function broadcastEvent(event: string, data: Record<string, unknown>, userId?: string) {
  try {
    await fetch(`${AGENT_BUS_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: userId ? `user:${userId}` : 'system', event, data }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Bus may not be running — fail silently
  }
}

// ─── Memory Manager ──────────────────────────────────────────────────────────

export const MemoryManager = {
  async store(params: {
    agentId: string
    userId?: string
    type: 'decision' | 'outcome' | 'preference' | 'pattern' | 'insight' | 'error_learned'
    category: string
    key: string
    data: Record<string, unknown>
    confidence?: number
  }) {
    const { agentId, userId, type, category, key, data, confidence = 0.5 } = params

    const existing = await db.agentMemory.findFirst({
      where: { agentId, userId: userId ?? null, key: { startsWith: key.split(':')[0] } }
    })

    if (existing) {
      return db.agentMemory.update({
        where: { id: existing.id },
        data: {
          data: JSON.stringify(data),
          confidence: Math.min(1.0, existing.confidence + 0.1),
          usageCount: existing.usageCount + 1,
          lastUsedAt: new Date(),
        }
      })
    }

    return db.agentMemory.create({
      data: {
        agentId, userId, type, category, key,
        data: JSON.stringify(data),
        confidence,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
  },

  async recall(params: {
    agentId?: string
    userId?: string
    category?: string
    type?: string
    limit?: number
  }) {
    const { agentId, userId, category, type, limit = 10 } = params
    const where: Record<string, unknown> = {}
    if (agentId) where.agentId = agentId
    if (userId) where.userId = userId
    if (category) where.category = category
    if (type) where.type = type

    const memories = await db.agentMemory.findMany({
      where,
      orderBy: [{ confidence: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    })

    return memories.map(m => ({ ...m, data: JSON.parse(m.data) }))
  },

  async learnFromOutcome(params: {
    agentId: string
    userId?: string
    actionType: string
    outcome: 'positive' | 'negative' | 'neutral'
    context: Record<string, unknown>
    feedback?: string
  }) {
    const { agentId, userId, actionType, outcome, context, feedback } = params

    await db.agentLearningLog.create({
      data: {
        agentId, userId, actionType, outcome,
        context: JSON.stringify(context),
        feedback,
      }
    })

    const delta = outcome === 'positive' ? 0.15 : outcome === 'negative' ? -0.1 : 0
    if (delta !== 0) {
      const category = (context.category as string) || 'general'
      const recentMemories = await db.agentMemory.findMany({
        where: { agentId, userId: userId ?? null, category },
        orderBy: { createdAt: 'desc' }, take: 3,
      })
      for (const mem of recentMemories) {
        await db.agentMemory.update({
          where: { id: mem.id },
          data: {
            confidence: Math.max(0.05, Math.min(1.0, mem.confidence + delta)),
            lastUsedAt: new Date(),
          }
        })
      }
    }
  },
}

// ─── Decision Engine ────────────────────────────────────────────────────────

export const DecisionEngine = {
  async analyze(context: UserContext): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = []

    if (!context.hasResume) {
      decisions.push({
        agentId: 'cv', action: 'suggest',
        reasoning: 'User has no resume — proactively suggest CV creation',
        confidence: 0.95,
        payload: { suggestionType: 'cv_create' }
      })
    }

    if (context.atsScores.length > 0) {
      const latestAts = context.atsScores[context.atsScores.length - 1]
      if (latestAts < 70) {
        decisions.push({
          agentId: 'ats', action: 'suggest',
          reasoning: `Latest ATS score is ${latestAts}% — below 70% threshold`,
          confidence: 0.85 + (70 - latestAts) / 100,
          payload: { suggestionType: 'ats_improve', currentScore: latestAts }
        })
      } else if (latestAts >= 85) {
        decisions.push({
          agentId: 'jobs', action: 'suggest',
          reasoning: `ATS score is ${latestAts}% — excellent, suggest applying`,
          confidence: 0.8,
          payload: { suggestionType: 'job_apply', atsScore: latestAts }
        })
      }
    }

    if (context.hasResume && context.coverLetters === 0) {
      decisions.push({
        agentId: 'career', action: 'suggest',
        reasoning: 'User has CV but no cover letters',
        confidence: 0.75,
        payload: { suggestionType: 'cover_letter' }
      })
    }

    if (context.hasResume && context.coverLetters > 0 && context.interviewSessions === 0) {
      decisions.push({
        agentId: 'interview', action: 'suggest',
        reasoning: 'User has CV and CL but no interview preparation',
        confidence: 0.7,
        payload: { suggestionType: 'interview_prep' }
      })
    }

    if (context.hasResume && context.linkedinAnalyses === 0) {
      decisions.push({
        agentId: 'linkedin', action: 'suggest',
        reasoning: 'User has CV but never optimized LinkedIn',
        confidence: 0.65,
        payload: { suggestionType: 'linkedin_optimize' }
      })
    }

    if (context.careerAssessments === 0 && context.hasResume) {
      decisions.push({
        agentId: 'career', action: 'suggest',
        reasoning: 'User has not done a career assessment',
        confidence: 0.6,
        payload: { suggestionType: 'career_assessment' }
      })
    }

    if (context.resumeCount > 2 && context.atsScores.length >= 2) {
      const trend = context.atsScores[context.atsScores.length - 1] - context.atsScores[context.atsScores.length - 2]
      if (trend < -10) {
        decisions.push({
          agentId: 'ats', action: 'delegate', targetAgent: 'cv',
          reasoning: `ATS score declined by ${Math.abs(trend)} pts — delegate to CV agent`,
          confidence: 0.9,
          payload: { suggestionType: 'cv_reoptimize', trend, scores: context.atsScores }
        })
      }
    }

    if (context.plan === 'free' && context.hasResume && context.atsScores.length >= 1) {
      decisions.push({
        agentId: 'api', action: 'suggest',
        reasoning: 'Free plan user with active usage — suggest upgrade',
        confidence: 0.5,
        payload: { suggestionType: 'plan_upgrade' }
      })
    }

    return decisions.sort((a, b) => b.confidence - a.confidence)
  },
}

// ─── Proactive Suggestion Engine ────────────────────────────────────────────

export const ProactiveEngine = {
  async generateForUser(userId: string, context: UserContext): Promise<ProactiveInsight[]> {
    const decisions = await DecisionEngine.analyze(context)
    const insights: ProactiveInsight[] = []

    for (const decision of decisions) {
      if (decision.action !== 'suggest' || !decision.payload) continue
      const st = decision.payload.suggestionType as string
      const insight = this.mapDecisionToInsight(decision, st, context)
      if (insight) insights.push(insight)
    }

    const memories = await MemoryManager.recall({ userId, limit: 5 })
    for (const mem of memories) {
      if (mem.type === 'pattern' && mem.confidence > 0.7) {
        const d = mem.data as Record<string, unknown>
        if (d.insightType) {
          insights.push({
            type: d.insightType as string, sourceAgent: mem.agentId,
            title: { fr: d.title_fr as string || 'Insight IA', en: d.title_en as string || 'AI Insight', ar: d.title_ar as string || 'رؤية الذكاء', es: d.title_es as string || 'Perspectiva IA' },
            description: { fr: d.desc_fr as string || '', en: d.desc_en as string || '', ar: d.desc_ar as string || '', es: d.desc_es as string || '' },
            actionUrl: d.actionUrl as string | undefined,
            confidence: mem.confidence, reason: 'Pattern learned from interactions', category: mem.category,
          })
        }
      }
    }

    return insights
  },

  async persistSuggestion(userId: string, insight: ProactiveInsight) {
    return db.proactiveSuggestion.create({
      data: {
        userId, type: insight.type, sourceAgent: insight.sourceAgent,
        title: insight.title.fr,
        description: insight.description.fr,
        actionData: JSON.stringify({ titles: insight.title, descriptions: insight.description }),
        actionUrl: insight.actionUrl, confidence: insight.confidence,
        reason: insight.reason,
        contextData: JSON.stringify({ category: insight.category }),
      }
    })
  },

  async getActiveSuggestions(userId: string) {
    const suggestions = await db.proactiveSuggestion.findMany({
      where: { userId, dismissed: false, actedUpon: false },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }], take: 20,
    })
    return suggestions.map(s => {
      let titles = { fr: s.title, en: s.title, ar: s.title, es: s.title }
      let descriptions = { fr: s.description, en: s.description, ar: s.description, es: s.description }
      if (s.actionData) {
        try {
          const parsed = JSON.parse(s.actionData)
          if (parsed.titles) titles = parsed.titles
          if (parsed.descriptions) descriptions = parsed.descriptions
        } catch { /* ignore */ }
      }
      return { ...s, titles, descriptions }
    })
  },

  async dismissSuggestion(suggestionId: string, userId: string) {
    return db.proactiveSuggestion.update({
      where: { id: suggestionId, userId }, data: { dismissed: true }
    })
  },

  async actOnSuggestion(suggestionId: string, userId: string) {
    return db.proactiveSuggestion.update({
      where: { id: suggestionId, userId }, data: { actedUpon: true, actedAt: new Date() }
    })
  },

  mapDecisionToInsight(decision: AgentDecision, suggestionType: string, ctx: UserContext): ProactiveInsight | null {
    const atsScore = ctx.atsScores.length > 0 ? ctx.atsScores[ctx.atsScores.length - 1] : 0
    const MAP: Record<string, ProactiveInsight> = {
      cv_create: {
        type: 'cv_optimize', sourceAgent: decision.agentId,
        title: { fr: 'Créez votre premier CV IA', en: 'Create your first AI CV', ar: 'أنشئ سيرتك الذاتية الأولى', es: 'Crea tu primer CV IA' },
        description: { fr: 'Commencez par créer un CV professionnel optimisé par notre IA. C\'est la première étape vers votre prochaine carrière.', en: 'Start by creating an AI-optimized professional CV.', ar: 'ابدأ بإنشاء سيرة ذاتية احترافية محسنة بالذكاء الاصطناعي.', es: 'Comienza creando un CV profesional optimizado por IA.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'cv',
      },
      ats_improve: {
        type: 'ats_improve', sourceAgent: decision.agentId,
        title: { fr: `Optimisez votre CV — Score ATS: ${atsScore}%`, en: `Optimize your CV — ATS Score: ${atsScore}%`, ar: `حسّن سيرتك — نقطة ATS: ${atsScore}%`, es: `Optimiza tu CV — Puntuación ATS: ${atsScore}%` },
        description: { fr: 'Votre score ATS est inférieur au seuil recommandé. L\'agent ATS recommande d\'optimiser les mots-clés.', en: 'Your ATS score is below the recommended threshold. Optimize keywords and structure.', ar: 'نقطة ATS أقل من الحد الموصى به. يوصي بتحسين الكلمات المفتاحية.', es: 'Tu puntuación ATS está por debajo del umbral recomendado.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'ats',
      },
      job_apply: {
        type: 'career_path', sourceAgent: decision.agentId,
        title: { fr: 'Votre CV est prêt — Postulez maintenant !', en: 'Your CV is ready — Apply now!', ar: 'سيرتك الذاتية جاهزة — تقدم الآن!', es: 'Tu CV está listo — ¡Aplica ahora!' },
        description: { fr: 'Avec un score ATS excellent, c\'est le moment idéal pour postuler.', en: 'With an excellent ATS score, now is the ideal time to apply.', ar: 'مع نقطة ATS ممتازة، الآن هو الوقت المثالي للتقدم.', es: 'Con una puntuación ATS excelente, ahora es el momento ideal.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'job_search',
      },
      cover_letter: {
        type: 'cover_letter', sourceAgent: decision.agentId,
        title: { fr: 'Complétez avec une lettre de motivation IA', en: 'Complete with an AI cover letter', ar: 'أكمل برسالة تحفيزية', es: 'Completa con una carta de motivación IA' },
        description: { fr: 'Une lettre de motivation personnalisée augmente vos chances de 40%.', en: 'A personalized cover letter increases your chances by 40%.', ar: 'رسالة تحفيزية مخصصة تزيد فرصك بنسبة 40%.', es: 'Una carta de motivación personalizada aumenta tus posibilidades.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'cv',
      },
      interview_prep: {
        type: 'interview_prep', sourceAgent: decision.agentId,
        title: { fr: 'Préparez-vous aux entretiens avec l\'IA', en: 'Prepare for interviews with AI', ar: 'استعد للمقابلات مع الذكاء', es: 'Prepárate para entrevistas con IA' },
        description: { fr: 'Vous avez CV + LM. La prochaine étape : simuler des entretiens.', en: 'You have CV + CL. Next step: simulate interviews.', ar: 'لديك سيرة + رسالة. الخطوة التالية: محاكاة المقابلات.', es: 'Tienes CV + CL. Siguiente paso: simular entrevistas.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'interview',
      },
      linkedin_optimize: {
        type: 'networking', sourceAgent: decision.agentId,
        title: { fr: 'Optimisez votre profil LinkedIn', en: 'Optimize your LinkedIn profile', ar: 'حسّن ملفك على لينكدإن', es: 'Optimiza tu perfil de LinkedIn' },
        description: { fr: '80% des recruteurs vérifient LinkedIn. Optimisez votre visibilité.', en: '80% of recruiters check LinkedIn. Optimize your visibility.', ar: '80% من المسؤولين يتحققون من لينكدإن.', es: 'El 80% de los reclutadores verifican LinkedIn.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'linkedin',
      },
      career_assessment: {
        type: 'career_path', sourceAgent: decision.agentId,
        title: { fr: 'Découvrez votre feuille de route carrière', en: 'Discover your career roadmap', ar: 'اكتشف خارطة طريق مسيرتك', es: 'Descubre tu hoja de ruta profesional' },
        description: { fr: 'Un bilan de compétences IA identifiera vos forces et votre plan d\'évolution.', en: 'An AI skills assessment will identify your strengths and growth plan.', ar: 'تقييم مهارات سيحدد نقاط قوتك وخطة تطورك.', es: 'Una evaluación de habilidades IA identificará tus fortalezas.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'career',
      },
      cv_reoptimize: {
        type: 'cv_optimize', sourceAgent: decision.agentId,
        title: { fr: 'Alerte — Score ATS en baisse', en: 'Alert — Declining ATS Score', ar: 'تنبيه — نقطة ATS في انخفاض', es: 'Alerta — Puntuación ATS en descenso' },
        description: { fr: 'L\'agent ATS a détecté une tendance baissière. L\'agent CV va réoptimiser.', en: 'ATS agent detected a declining trend. CV agent will re-optimize.', ar: 'اكتشف وكيل ATS اتجاهاً تنازلياً.', es: 'El agente ATS detectó una tendencia a la baja.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'cv',
      },
      plan_upgrade: {
        type: 'market_alert', sourceAgent: decision.agentId,
        title: { fr: 'Débloquez tout le potentiel de BazNova', en: 'Unlock BazNova\'s full potential', ar: 'افتح كل إمكانات BazNova', es: 'Desbloquea todo el potencial de BazNova' },
        description: { fr: 'Un plan supérieur vous donnerait accès à tous les agents IA autonomes.', en: 'A higher plan would give access to all autonomous AI agents.', ar: 'خطة أعلى ستمنحك وصولاً لجميع وكلاء الذكاء.', es: 'Un plan superior te daría acceso a todos los agentes IA autónomos.' },
        confidence: decision.confidence, reason: decision.reasoning, category: 'system',
      },
    }
    return MAP[suggestionType] || null
  },
}

// ─── Inter-Agent Communication ──────────────────────────────────────────────

export const AgentComms = {
  async sendTask(params: AgentCollaboration) {
    return db.agentTask.create({
      data: {
        fromAgent: params.fromAgent, toAgent: params.toAgent,
        type: params.type, priority: params.priority,
        payload: JSON.stringify(params.payload),
        reasoning: params.reasoning, status: 'pending',
      }
    })
  },

  async getPendingTasks(agentId: string) {
    return db.agentTask.findMany({
      where: { toAgent: agentId, status: 'pending' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], take: 20,
    })
  },

  async completeTask(taskId: string, result: Record<string, unknown>) {
    return db.agentTask.update({
      where: { id: taskId },
      data: { status: 'completed', result: JSON.stringify(result), completedAt: new Date() }
    })
  },

  async failTask(taskId: string, error: string) {
    return db.agentTask.update({
      where: { id: taskId },
      data: { status: 'failed', error, completedAt: new Date() }
    })
  },

  async getTaskHistory(params: { agentId?: string; limit?: number; status?: string }) {
    const { agentId, limit = 50, status } = params
    const where: Record<string, unknown> = {}
    if (agentId) where.OR = [{ fromAgent: agentId }, { toAgent: agentId }]
    if (status) where.status = status
    return db.agentTask.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
    })
  },

  async getCollaborationStats() {
    const [total, pending, completed, failed, agents] = await Promise.all([
      db.agentTask.count(),
      db.agentTask.count({ where: { status: 'pending' } }),
      db.agentTask.count({ where: { status: 'completed' } }),
      db.agentTask.count({ where: { status: 'failed' } }),
      db.agentTask.groupBy({ by: ['fromAgent', 'toAgent'], _count: true, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    ])
    return { total, pending, completed, failed, topCollaborations: agents }
  },
}

// ─── User Context Builder ───────────────────────────────────────────────────

export async function buildUserContext(userId: string): Promise<UserContext> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const [resumes, interviews, coverLetters, linkedinAnalyses, careerAssessments, coachSessions, applications] = await Promise.all([
    db.resume.findMany({ where: { userId }, select: { id: true } }),
    db.interviewSession.findMany({ where: { userId }, select: { id: true } }),
    db.coverLetter.findMany({ where: { userId }, select: { id: true } }),
    db.linkedinAnalysis.findMany({ where: { userId }, select: { id: true } }),
    db.careerAssessment.findMany({ where: { userId }, select: { id: true } }),
    db.coachSession.findMany({ where: { userId }, select: { id: true } }),
    db.application.findMany({ where: { userId }, select: { id: true } }),
  ])

  const recentActivity: string[] = []
  if (resumes.length > 0) recentActivity.push('resume_created')
  if (interviews.length > 0) recentActivity.push('interview_completed')
  if (coverLetters.length > 0) recentActivity.push('cover_letter_generated')

  return {
    userId, plan: user.plan, role: user.role,
    hasResume: resumes.length > 0, resumeCount: resumes.length,
    atsScores: [],
    interviewSessions: interviews.length, coverLetters: coverLetters.length,
    linkedinAnalyses: linkedinAnalyses.length,
    careerAssessments: careerAssessments.length,
    coachSessions: coachSessions.length, recentActivity,
    applicationCount: applications.length,
  }
}

// ─── LLM-Powered Deep Analysis ────────────────────────────────────────────

let llmInstance: any = null
async function getLLM() {
  if (!llmInstance) {
    const { ZAI } = await import('z-ai-web-dev-sdk')
    llmInstance = new ZAI()
  }
  return llmInstance
}

export const LLMDecisionEngine = {
  async deepAnalyze(context: UserContext): Promise<AgentDecision[]> {
    try {
      const llm = await getLLM()
      const agentList = AGENTS.map(a => `${a.id} (${a.name}: ${a.capabilities.join(', ')})`).join('\n')

      const prompt = `Tu es le CTO IA de BazNova, un système multi-agents autonome pour la recherche d'emploi. Analyse le contexte utilisateur et décide quelles actions les agents doivent entreprendre.

## Contexte Utilisateur
- Plan: ${context.plan} | Rôle: ${context.role}
- CV: ${context.hasResume ? `Oui (${context.resumeCount} versions)` : 'Non'}
- Lettres de motivation: ${context.coverLetters}
- Sessions entretien: ${context.interviewSessions}
- Analyses LinkedIn: ${context.linkedinAnalyses}
- Bilans de carrière: ${context.careerAssessments}
- Coachings: ${context.coachSessions}
- Candidatures: ${context.applicationCount}
- Activité récente: ${context.recentActivity.join(', ') || 'Aucune'}

## Agents disponibles
${agentList}

## Règles
1. Chaque décision doit avoir: agentId (un des IDs ci-dessus), action (suggest/delegate/act/wait), reasoning (en français, 1-2 phrases), confidence (0.0-1.0), et payload avec suggestionType.
2. Sois proactif — anticipe les besoins.
3. Si un agent doit déléguer, précise targetAgent.
4. Maximum 5 décisions, triées par confiance décroissante.
5. Réponds UNIQUEMENT en JSON valide: [{"agentId":"...","action":"...","targetAgent":"...","reasoning":"...","confidence":0.X,"payload":{"suggestionType":"..."}}]

Analyse et décide:`

      const response = await llm.chat({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
      const content = typeof response === 'string' ? response : response?.content || response?.choices?.[0]?.message?.content || ''
      
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      return parsed.map((d: any) => ({
        agentId: d.agentId || 'system',
        action: d.action || 'suggest',
        targetAgent: d.targetAgent,
        reasoning: d.reasoning || '',
        confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(1, d.confidence)) : 0.5,
        payload: d.payload || {},
      }))
    } catch (error) {
      console.error('[LLM Decision Engine]', error)
      return []
    }
  },
}

// ─── Enhanced Autonomous Event Handler (with broadcast) ────────────────────

export async function handleAutonomousEventEnhanced(event: AgentEvent, userId: string) {
  const context = await buildUserContext(userId)

  // Run both rule-based and LLM-based analysis in parallel
  const [ruleDecisions, llmDecisions] = await Promise.all([
    DecisionEngine.analyze(context),
    LLMDecisionEngine.deepAnalyze(context),
  ])

  // Merge: LLM decisions have higher weight, deduplicate by suggestionType
  const allDecisions = [...llmDecisions, ...ruleDecisions]
  const seen = new Set<string>()
  const merged: AgentDecision[] = []
  for (const d of allDecisions) {
    const key = `${d.agentId}:${d.payload?.suggestionType || d.action}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(d)
    }
  }
  const relevantDecisions = merged.filter(d => d.confidence > 0.5).slice(0, 5)

  const persisted: string[] = []
  const broadcasted: string[] = []

  for (const decision of relevantDecisions) {
    // Broadcast decision in real-time
    await broadcastEvent('agent:decision', {
      agentId: decision.agentId,
      action: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      timestamp: new Date().toISOString(),
    }, userId)
    broadcasted.push(decision.agentId)

    if (decision.action === 'suggest' && decision.payload?.suggestionType) {
      const insight = ProactiveEngine.mapDecisionToInsight(decision, decision.payload.suggestionType as string, context)
      if (insight) {
        const suggestion = await ProactiveEngine.persistSuggestion(userId, insight)
        persisted.push(suggestion.id)

        await broadcastEvent('agent:suggestion', {
          type: insight.type,
          title: insight.title.fr,
          confidence: insight.confidence,
          sourceAgent: insight.sourceAgent,
          timestamp: new Date().toISOString(),
        }, userId)
      }
    } else if (decision.action === 'delegate' && decision.targetAgent) {
      const task = await AgentComms.sendTask({
        fromAgent: decision.agentId, toAgent: decision.targetAgent,
        type: 'delegate', payload: decision.payload || {},
        priority: Math.max(1, Math.round(10 - decision.confidence * 10)),
        reasoning: decision.reasoning,
      })

      await broadcastEvent('agent:task', {
        fromAgent: decision.agentId,
        toAgent: decision.targetAgent,
        type: 'delegate',
        reasoning: decision.reasoning,
        timestamp: new Date().toISOString(),
      }, userId)

      // Simulate agent response after 2 seconds (autonomous execution)
      setTimeout(async () => {
        try {
          const agentName = AGENTS.find(a => a.id === decision.targetAgent)?.name || decision.targetAgent
          await AgentComms.completeTask(task.id, {
            status: 'acknowledged',
            message: `${agentName} a pris en charge la tâche et l'exécute en arrière-plan.`,
          })
          await broadcastEvent('agent:task', {
            fromAgent: decision.targetAgent || '',
            toAgent: decision.agentId,
            type: 'respond',
            reasoning: `${agentName} — tâche acceptée et en cours d'exécution`,
            timestamp: new Date().toISOString(),
          }, userId)
        } catch { /* task update may fail silently */ }
      }, 2000)
    }

    await MemoryManager.store({
      agentId: decision.agentId, userId, type: 'decision',
      category: (decision.payload?.suggestionType as string) || 'general',
      key: `event:${event}:decision:${decision.action}`,
      data: { event, decision: decision.action, confidence: decision.confidence, reasoning: decision.reasoning },
      confidence: decision.confidence,
    })
  }

  return {
    event, decisionsCount: relevantDecisions.length,
    suggestionsCreated: persisted.length,
    tasksDelegated: relevantDecisions.filter(d => d.action === 'delegate').length,
    llmPowered: llmDecisions.length > 0,
  }
}

// ─── System Dashboard Data ──────────────────────────────────────────────────

export async function getAutonomousSystemStats() {
  const [memoryCount, taskStats, suggestionCount, learningLogs, recentTasks, topMemories] = await Promise.all([
    db.agentMemory.count(),
    AgentComms.getCollaborationStats(),
    db.proactiveSuggestion.count(),
    db.agentLearningLog.count(),
    db.agentTask.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    db.agentMemory.findMany({ orderBy: { confidence: 'desc' }, take: 10 }),
  ])

  const recentLogs = await db.agentLearningLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  const positiveOutcomes = recentLogs.filter(l => l.outcome === 'positive').length
  const learningEfficiency = recentLogs.length > 0 ? Math.round((positiveOutcomes / recentLogs.length) * 100) : 0

  return {
    memory: { total: memoryCount, topMemories },
    tasks: taskStats,
    suggestions: { total: suggestionCount },
    learning: { totalLogs: learningLogs, efficiency: learningEfficiency, recentLogs: recentLogs.slice(0, 10) },
    recentActivity: recentTasks.map(t => ({
      ...t, payload: JSON.parse(t.payload),
      result: t.result ? JSON.parse(t.result) : null,
    })),
  }
}
