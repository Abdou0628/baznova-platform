'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Brain, Network, Zap, Clock, Globe, Link2, ArrowRightLeft,
  ChevronRight, Activity, FileText, Search, MessageCircle, Linkedin,
  UserCheck, Compass, Bot, BookOpen, Laptop, Briefcase, Code2, Plane,
  GraduationCap, Store, Building2, Scale, MessageSquare, Shield, Cpu, CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import {
  AGENTS, CTO_PRINCIPAL, getAgentsByCategory, CATEGORY_BG,
  type AgentDefinition, type AgentCategory, type AgentTier,
} from '@/lib/agent-registry'

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Search, MessageCircle, Linkedin, UserCheck, Compass, Bot, BookOpen,
  Briefcase, Laptop, Globe, Code2, Brain, Plane, MessageSquare,
  GraduationCap, Store, Building2, Scale, Network,
}

const TIER_COLORS: Record<AgentTier, string> = {
  principal: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
  specialized: 'bg-white text-foreground border shadow-sm',
  support: 'bg-slate-100 text-slate-700',
}

const TIER_BADGE: Record<AgentTier, { label: Record<string, string>; variant: 'default' | 'secondary' | 'outline' }> = {
  principal: { label: { fr: 'NIVEAU 0', en: 'LEVEL 0', ar: 'المستوى 0', es: 'NIVEL 0' }, variant: 'default' },
  specialized: { label: { fr: 'NIVEAU 1', en: 'LEVEL 1', ar: 'المستوى 1', es: 'NIVEL 1' }, variant: 'secondary' },
  support: { label: { fr: 'NIVEAU 2', en: 'LEVEL 2', ar: 'المستوى 2', es: 'NIVEL 2' }, variant: 'outline' },
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-slate-400',
  processing: 'bg-amber-500 animate-pulse',
  collaborating: 'bg-violet-500 animate-pulse',
}

function AgentCard({ agent, language, index }: { agent: AgentDefinition; language: string; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ICON_MAP[agent.icon] ?? Cpu
  const tierBadge = TIER_BADGE[agent.tier]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        className={`cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-${agent.color}-500 ${expanded ? 'ring-2 ring-' + agent.color + '-300' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${agent.color}-100 text-${agent.color}-600 shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{agent.name}</span>
                <Badge variant={tierBadge.variant} className="text-[10px] px-1.5 py-0">
                  {tierBadge.label[language] ?? tierBadge.label.fr}
                </Badge>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto shrink-0">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS.active}`} />
                  {agent.avgResponseTime}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {agent.description[language as 'fr' | 'en' | 'ar' | 'es'] ?? agent.description.fr}
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchAgentCapabilities')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map(cap => (
                      <Badge key={cap.key} variant="outline" className="text-[10px]">
                        {cap.label[language as 'fr' | 'en' | 'ar' | 'es'] ?? cap.label.fr}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchAgentCollabs')}
                  </h4>
                  {agent.collaborations.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchUniversalInterface')}</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {agent.collaborations.map((collab, i) => {
                        const partner = AGENTS.find(a => a.id === collab.agentId)
                        return (
                          <div key={i} className="flex items-center gap-1 text-[10px]">
                            {collab.type === 'bidirectional' ? (
                              <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ArrowRight className="w-3 h-3 text-sky-500" />
                            )}
                            <span className="font-medium">{partner?.name ?? collab.agentId}</span>
                            <span className="text-muted-foreground">— {collab.reason[language as 'fr' | 'en' | 'ar' | 'es'] ?? collab.reason.fr}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CtoNode({ language }: { language: string }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="flex flex-col items-center"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
        <Brain className="w-10 h-10 text-white" />
      </div>
      <h3 className="mt-2 font-bold text-sm">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCtoName')}</h3>
      <p className="text-[10px] text-emerald-600 font-medium">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCtoRole')}</p>
    </motion.div>
  )
}

function ConnectorLine() {
  return <div className="w-px h-6 bg-gradient-to-b from-emerald-400 to-transparent mx-auto" />
}

function CategorySection({
  category,
  language,
  agents,
  index,
}: {
  category: AgentCategory
  language: string
  agents: AgentDefinition[]
  index: number
}) {
  const categoryKey = category === 'candidate' ? 'orchCategoryCandidate'
    : category === 'employment' ? 'orchCategoryEmployment'
    : 'orchCategoryPlatform'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.15 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${CATEGORY_BG[category].split(' ')[0]} to-transparent`} />
        <h3 className="text-sm font-bold px-3 py-1 rounded-full border ${CATEGORY_BG[category]}">
          {t(language as 'fr' | 'en' | 'ar' | 'es', categoryKey as 'orchCategoryCandidate' | 'orchCategoryEmployment' | 'orchCategoryPlatform')}
          <span className="ml-1.5 text-muted-foreground font-normal">({agents.length})</span>
        </h3>
        <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${CATEGORY_BG[category].split(' ')[0]} to-transparent`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {agents.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} language={language} index={i} />
        ))}
      </div>
    </motion.div>
  )
}

function StatsPanel({ language }: { language: string }) {
  const totalCapabilities = AGENTS.reduce((sum, a) => sum + a.capabilities.length, 0)
  const totalCollabs = AGENTS.reduce((sum, a) => sum + a.collaborations.length, 0)
  const avgResponse = (AGENTS.reduce((sum, a) => sum + parseFloat(a.avgResponseTime), 0) / AGENTS.length).toFixed(1)
  const bidirCount = AGENTS.reduce((sum, a) => sum + a.collaborations.filter(c => c.type === 'bidirectional').length, 0)
  const unidirCount = totalCollabs - bidirCount

  const stats = [
    { icon: Cpu, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsAgents'), value: '19', color: 'text-emerald-600' },
    { icon: Zap, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsCapabilities'), value: String(totalCapabilities), color: 'text-amber-600' },
    { icon: Link2, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsCollabs'), value: String(totalCollabs), color: 'text-violet-600' },
    { icon: Clock, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsAvgResponse'), value: `${avgResponse}s`, color: 'text-sky-600' },
    { icon: Globe, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsLanguages'), value: '4', color: 'text-rose-600' },
    { icon: Activity, label: t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsUptime'), value: '99.9%', color: 'text-teal-600' },
  ]

  return (
    <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchStatsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map(stat => {
            const SIcon = stat.icon
            return (
              <div key={stat.label} className="text-center">
                <SIcon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            )
          })}
        </div>
        {/* Speed indicator */}
        <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchSpeedTitle')}
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">
            {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchSpeedDesc')}
          </p>
          <Progress value={92} className="mt-2 h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================================
// Autonomous Agents Live Monitor
// ==========================================================

type LiveStatus = 'processing' | 'collaborating' | 'idle' | 'active'

const AUTONOMOUS_TASKS: Record<string, Record<string, string[]>> = {
  fr: {
    cv: ['Génération CV en français', 'Optimisation ATS pour développeur', 'Création CV graphique'],
    ats: ['Analyse de compatibilité', 'Score ATS calculé: 94%', 'Vérification mots-clés'],
    cover_letter: ['Rédaction lettre pour Tech Corp', 'Personnalisation motivation', 'Lettre bilingue FR/EN'],
    interview: ['Simulation entretien technique', 'Questions comportementales générées', 'Feedback IA en cours'],
    linkedin: ['Optimisation profil LinkedIn', 'Génération headline', 'Suggestions de posts'],
    career: ['Plan de carrière 2026', 'Analyse compétences transférables', 'Feuille de route IA'],
    coach: ['Session coaching en cours', 'Objectifs professionnels définis', 'Suivi progression'],
    jobs: ['Matching candidats-emplois', 'Alerte nouvelle offre', 'Analyse marchéemploi'],
    global: ['Surveillance marchés internationaux', 'Veille opportunités Mondial', 'Rapport tendances global'],
    recruiter: ['Pipeline recrutement actif', 'Scoring candidats', 'Entretiens planifiés'],
    campus: ['Connecté à 12 universités', 'Kit étudiant distribué', 'Workshop IA planifié'],
    freelance: ['Matching mission freelance', 'Proposition commerciale', 'Évaluation profil'],
    api: ['API: 847 requêtes/jour', 'Webhook activé', 'Rate limit monitoring'],
    intelligence: ['Analyse tendances salariales', 'Prédictions marché 2026', 'Rapport intelligence'],
    formation: ['Catalogue formation à jour', 'Certifications en cours', 'Parcours d\'apprentissage'],
    marketplace: ['3 nouvelles offres publiées', 'Événement communautaire prévu', 'Mise à jour profil vendeur'],
    white_label: ['Configuration client SaaS', 'Branding personnalisé', 'Dashboard multi-tenant'],
    legal: ['Vérification conformité RGPD', 'Mise à jour templates', 'Audit légal automatisé'],
    payment: ['Reconciliation paiements', 'Facture #HN-4521 générée', 'Rapport revenus'],
  },
  en: {
    cv: ['Generating CV in English', 'ATS optimization for developer', 'Creating graphic CV'],
    ats: ['Compatibility analysis running', 'ATS score calculated: 94%', 'Keyword verification'],
    cover_letter: ['Writing cover letter for Tech Corp', 'Personalizing motivation letter', 'Bilingual FR/EN letter'],
    interview: ['Technical interview simulation', 'Behavioral questions generated', 'AI feedback in progress'],
    linkedin: ['LinkedIn profile optimization', 'Headline generation', 'Post suggestions'],
    career: ['Career plan 2026 created', 'Transferable skills analysis', 'AI roadmap generation'],
    coach: ['Coaching session active', 'Professional goals defined', 'Progress tracking'],
    jobs: ['Candidate-job matching', 'New job alert sent', 'Job market analysis'],
    global: ['International market monitoring', 'Global opportunity watch', 'Global trends report'],
    recruiter: ['Recruitment pipeline active', 'Candidate scoring in progress', 'Interviews scheduled'],
    campus: ['Connected to 12 universities', 'Student kit distributed', 'AI workshop planned'],
    freelance: ['Freelance mission matching', 'Business proposal created', 'Profile evaluation'],
    api: ['API: 847 requests/day', 'Webhook activated', 'Rate limit monitoring'],
    intelligence: ['Salary trends analysis', '2026 market predictions', 'Intelligence report'],
    formation: ['Training catalog updated', 'Certifications in progress', 'Learning path active'],
    marketplace: ['3 new listings published', 'Community event planned', 'Seller profile updated'],
    white_label: ['SaaS client configuration', 'Custom branding applied', 'Multi-tenant dashboard'],
    legal: ['GDPR compliance check', 'Templates updated', 'Automated legal audit'],
    payment: ['Payment reconciliation', 'Invoice #HN-4521 generated', 'Revenue report'],
  },
  ar: {
    cv: ['إنشاء سيرة ذاتية بالعربية', 'تحسين ATS لمطور', 'إنشاء سيرة ذاتية رسومية'],
    ats: ['تحليل التوافق جارٍ', 'درجة ATS: 94%', 'التحقق من الكلمات المفتاحية'],
    cover_letter: ['كتابة رسالة تعريف', 'تخصيص الرسالة', 'رسالة ثنائية اللغة'],
    interview: ['محاكاة مقابلة تقنية', 'أسئلة سلوكية مُولّدة', 'تغذية راجعة من الذكاء الاصطناعي'],
    linkedin: ['تحسين ملف لينكد إن', 'إنشاء عنوان', 'اقتراحات منشورات'],
    career: ['خطة مهنية 2026', 'تحليل المهارات القابلة للنقل', 'خارطة طريق ذكية'],
    coach: ['جلسة تدريب نشطة', 'أهداف مهنية محددة', 'تتبع التقدم'],
    jobs: ['مطابقة المرشحين بالوظائف', 'تنبيه وظيفة جديد', 'تحليل سوق العمل'],
    global: ['مراقبة الأسواق الدولية', 'فرص عالمية', 'تقرير الاتجاهات'],
    recruiter: ['خط أنابيب التوظيف نشط', 'تقييم المرشحين', 'مقابلات مجدولة'],
    campus: ['متصل بـ 12 جامعة', 'توزيع حزمة طالب', 'ورشة عمل ذكية مخططة'],
    freelance: ['مطابقة المهام الحرة', 'اقتراح تجاري', 'تقييم الملف الشخصي'],
    api: ['API: 847 طلب/يوم', 'ويب هوك مُفعّل', 'مراقبة معدل الطلبات'],
    intelligence: ['تحليل اتجاهات الرواتب', 'توقعات السوق 2026', 'تقرير الاستخبارات'],
    formation: ['تحديث كتالوج التدريب', 'شهادات جارية', 'مسار تعلم نشط'],
    marketplace: ['3 قوائم جديدة', 'حدث مجتمعي مخطط', 'تحديث ملف البائع'],
    white_label: ['تكوين عميل SaaS', 'علامة تجارية مخصصة', 'لوحة متعددة المستأجرين'],
    legal: ['التحقق من الامتثال', 'تحديث القوالب', 'تدقيق قانوني آلي'],
    payment: ['تسوية المدفوعات', 'فاتورة #HN-4521', 'تقرير الإيرادات'],
  },
  es: {
    cv: ['Generando CV en español', 'Optimización ATS para desarrollador', 'Creando CV gráfico'],
    ats: ['Análisis de compatibilidad', 'Puntuación ATS calculada: 94%', 'Verificación de palabras clave'],
    cover_letter: ['Escribiendo carta para Tech Corp', 'Personalizando carta', 'Carta bilingüe'],
    interview: ['Simulación de entrevista técnica', 'Preguntas conductuales generadas', 'Feedback IA en progreso'],
    linkedin: ['Optimización de perfil LinkedIn', 'Generación de titular', 'Sugerencias de posts'],
    career: ['Plan de carrera 2026', 'Análisis de habilidades transferibles', 'Hoja de ruta IA'],
    coach: ['Sesión de coaching activa', 'Objetivos profesionales definidos', 'Seguimiento de progreso'],
    jobs: ['Matching candidatos-empleos', 'Alerta de nueva oferta', 'Análisis del mercado laboral'],
    global: ['Monitorización de mercados internacionales', 'Vigilancia de oportunidades', 'Informe de tendencias'],
    recruiter: ['Pipeline de reclutamiento activo', 'Puntuación de candidatos', 'Entrevistas programadas'],
    campus: ['Conectado a 12 universidades', 'Kit estudiantil distribuido', 'Taller IA planificado'],
    freelance: ['Matching de misión freelance', 'Propuesta comercial', 'Evaluación de perfil'],
    api: ['API: 847 solicitudes/día', 'Webhook activado', 'Monitoreo de límite de tasa'],
    intelligence: ['Análisis de tendencias salariales', 'Predicciones de mercado 2026', 'Informe de inteligencia'],
    formation: ['Catálogo de formación actualizado', 'Certificaciones en progreso', 'Ruta de aprendizaje'],
    marketplace: ['3 nuevas ofertas publicadas', 'Evento comunitario planificado', 'Perfil de vendedor actualizado'],
    white_label: ['Configuración de cliente SaaS', 'Branding personalizado', 'Dashboard multi-tenant'],
    legal: ['Verificación de cumplimiento RGPD', 'Plantillas actualizadas', 'Auditoría legal automatizada'],
    payment: ['Reconciliación de pagos', 'Factura #HN-4521 generada', 'Informe de ingresos'],
  },
}

interface AgentLiveStatus {
  agentId: string
  name: string
  icon: string
  color: string
  status: LiveStatus
  currentTask: string
  tasksCompleted: number
  lastActive: string
}

interface ActivityLogEntry {
  id: string
  agentName: string
  agentIcon: string
  agentColor: string
  action: string
  timestamp: string
  type: 'task' | 'collab' | 'alert'
}

function AutonomousAgentsMonitor({ language }: { language: string }) {
  const lang = language as 'fr' | 'en' | 'ar' | 'es'

  // Initialize with useMemo to avoid lint warning about setState in effect
  const initialStatuses = useMemo(() => AGENTS.map((agent) => {
    const tasks = AUTONOMOUS_TASKS[lang]?.[agent.id] ?? AUTONOMOUS_TASKS.fr[agent.id] ?? [t(lang, 'orchSurveillanceActive')]
    const statusRoll = Math.random()
    const status: LiveStatus = statusRoll < 0.5 ? 'processing' : statusRoll < 0.75 ? 'collaborating' : statusRoll < 0.9 ? 'active' : 'idle'
    return {
      agentId: agent.id,
      name: agent.name,
      icon: agent.icon,
      color: agent.color,
      status,
      currentTask: tasks[Math.floor(Math.random() * tasks.length)],
      tasksCompleted: Math.floor(Math.random() * 500) + 50,
      lastActive: t(lang, 'orchMaintenant'),
    }
  }), [lang])

  const [agentStatuses, setAgentStatuses] = useState<AgentLiveStatus[]>(initialStatuses)

  const initialLog = useMemo(() => {
    const log: ActivityLogEntry[] = []
    for (let i = 0; i < 8; i++) {
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      const tasks = AUTONOMOUS_TASKS[lang]?.[agent.id] ?? AUTONOMOUS_TASKS.fr[agent.id] ?? [t(lang, 'orchTask')]
      log.push({
        id: String(i),
        agentName: agent.name,
        agentIcon: agent.icon,
        agentColor: agent.color,
        action: tasks[Math.floor(Math.random() * tasks.length)],
        timestamp: `-${Math.floor(Math.random() * 120) + 1}s`,
        type: (Math.random() < 0.7 ? 'task' : Math.random() < 0.5 ? 'collab' : 'alert') as 'task' | 'collab' | 'alert',
      })
    }
    return log
  }, [lang])

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialLog)

  // Simulate live activity updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentStatuses(prev => prev.map(agent => {
        const tasks = AUTONOMOUS_TASKS[lang]?.[agent.id] ?? AUTONOMOUS_TASKS.fr[agent.id] ?? [t(lang, 'orchSurveillanceActive')]
        const roll = Math.random()
        if (roll < 0.15) {
          // Agent changes status
          const statuses: LiveStatus[] = ['processing', 'collaborating', 'active', 'idle']
          const weights = [0.45, 0.25, 0.2, 0.1]
          let r = Math.random()
          let newStatus: LiveStatus = 'active'
          for (let i = 0; i < statuses.length; i++) {
            r -= weights[i]
            if (r <= 0) { newStatus = statuses[i]; break }
          }
          return {
            ...agent,
            status: newStatus,
            currentTask: tasks[Math.floor(Math.random() * tasks.length)],
            tasksCompleted: agent.tasksCompleted + (newStatus !== 'idle' ? 1 : 0),
            lastActive: t(lang, 'orchMaintenant'),
          }
        }
        return agent
      }))

      // Add new activity log entry
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      const tasks = AUTONOMOUS_TASKS[lang]?.[agent.id] ?? AUTONOMOUS_TASKS.fr[agent.id] ?? [t(lang, 'orchTask')]
      const newEntry: ActivityLogEntry = {
        id: String(Date.now()),
        agentName: agent.name,
        agentIcon: agent.icon,
        agentColor: agent.color,
        action: tasks[Math.floor(Math.random() * tasks.length)],
        timestamp: t(lang, 'orchJustNow'),
        type: (Math.random() < 0.7 ? 'task' : Math.random() < 0.5 ? 'collab' : 'alert') as 'task' | 'collab' | 'alert',
      }
      setActivityLog(prev => [newEntry, ...prev.slice(0, 19)])
    }, 3000)

    return () => clearInterval(interval)
  }, [lang])

  const processingCount = agentStatuses.filter(a => a.status === 'processing' || a.status === 'collaborating').length
  const totalTasks = agentStatuses.reduce((s, a) => s + a.tasksCompleted, 0)

  const statusLabel: Record<string, Record<string, string>> = {
    processing: { fr: 'Traitement', en: 'Processing', ar: 'معالجة', es: 'Procesando' },
    collaborating: { fr: 'Collaboration', en: 'Collaborating', ar: 'تعاون', es: 'Colaborando' },
    active: { fr: 'Actif', en: 'Active', ar: 'نشط', es: 'Activo' },
    idle: { fr: 'Veille', en: 'Standby', ar: 'انتظار', es: 'En espera' },
  }

  return (
    <div className="space-y-6">
      {/* Live Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{agentStatuses.length}</p>
            <p className="text-[10px] text-muted-foreground">{t(lang, 'boardActiveAgents')}</p>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{processingCount}</p>
            <p className="text-[10px] text-muted-foreground">{statusLabel.processing[lang] ?? statusLabel.processing.fr}</p>
          </div>
        </div>
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{totalTasks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{t(lang, 'boardTotalDecisions')}</p>
          </div>
        </div>
        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
            <Network className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">99.9%</p>
            <p className="text-[10px] text-muted-foreground">{t(lang, 'orchStatsUptime')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Grid - 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-600" />
              {t(lang, 'boardExecutives')}
            </h4>
            <Badge variant="outline" className="text-[10px]">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {processingCount} {statusLabel.processing[lang] ?? statusLabel.processing.fr}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {agentStatuses.map((agent, idx) => {
              const Icon = ICON_MAP[agent.icon] ?? Cpu
              const isActive = agent.status === 'processing' || agent.status === 'collaborating'
              return (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                  className={`rounded-lg border p-3 transition-all ${
                    isActive
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-${agent.color}-100 dark:bg-${agent.color}-900/50`}
                    >
                      <Icon className={`w-4 h-4 text-${agent.color}-600 dark:text-${agent.color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[agent.status]}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{agent.currentTask}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                          {statusLabel[agent.status]?.[lang] ?? statusLabel[agent.status]?.fr ?? agent.status}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          <CheckCircle className="w-2.5 h-2.5 inline mr-0.5 text-emerald-500" />
                          {agent.tasksCompleted}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Activity Feed - 1 col */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600" />
            {t(lang, 'boardSystemStats')}
          </h4>
          <div className="rounded-xl border bg-white dark:bg-slate-800/50 overflow-hidden">
            <div className="px-3 py-2 border-b bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Feed</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {activityLog.map((entry, i) => {
                const Icon = ICON_MAP[entry.agentIcon] ?? Cpu
                const typeColors = {
                  task: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
                  collab: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
                  alert: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                }
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-2 px-3 py-2 border-b last:border-b-0 text-xs ${i === 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${typeColors[entry.type]}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[11px] truncate">{entry.agentName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{entry.action}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">{entry.timestamp}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrchestrationHub() {
  const { language, setStep } = useCVStore()
  const lang = language

  const candidateAgents = useMemo(() => getAgentsByCategory('candidate'), [])
  const employmentAgents = useMemo(() => getAgentsByCategory('employment'), [])
  const platformAgents = useMemo(() => getAgentsByCategory('platform'), [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="ml-1.5 hidden sm:inline">{t(lang, 'orchBack')}</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate">{t(lang, 'orchTitle')}</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block truncate">{t(lang, 'orchSubtitle')}</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shrink-0">
            <Shield className="w-3 h-3 mr-1" />
            {t(lang, 'orchBadgeAgents')}
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsPanel language={lang} />

        {/* CTO Principal Node */}
        <div className="flex flex-col items-center">
          <CtoNode language={lang} />
          <ConnectorLine />
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-emerald-300" />
            <Network className="w-4 h-4 text-emerald-500" />
            <div className="h-px w-8 bg-emerald-300" />
          </div>
        </div>

        {/* Tabs for 3 views */}
        <Tabs defaultValue="hub" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hub">{t(lang, 'orchTabHub')}</TabsTrigger>
            <TabsTrigger value="dispatch">{t(lang, 'orchTabDispatch')}</TabsTrigger>
            <TabsTrigger value="collab">{t(lang, 'orchTabCollab')}</TabsTrigger>
            <TabsTrigger value="board">{t(lang, 'orchTabBoard')}</TabsTrigger>
          </TabsList>

          <TabsContent value="hub" className="mt-6 space-y-6">
            {/* Live Autonomous Agents Monitor */}
            <AutonomousAgentsMonitor language={lang} />
            {/* Category: Candidate */}
            <CategorySection category="candidate" language={lang} agents={candidateAgents} index={0} />
            {/* Category: Employment */}
            <CategorySection category="employment" language={lang} agents={employmentAgents} index={1} />
            {/* Category: Platform */}
            <CategorySection category="platform" language={lang} agents={platformAgents} index={2} />
          </TabsContent>

          <TabsContent value="dispatch" className="mt-6">
            <OrchestrationDispatch language={lang} />
          </TabsContent>

          <TabsContent value="collab" className="mt-6">
            <CollaborationMatrix language={lang} />
          </TabsContent>

          <TabsContent value="board" className="mt-6">
            <DigitalBoardPanel language={lang} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// ==========================================================
// Dispatch Component
// ==========================================================
function OrchestrationDispatch({ language }: { language: string }) {
  const { language: storeLang, setStep } = useCVStore()
  const [message, setMessage] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleDispatch() {
    if (!message.trim()) return
    setIsDispatching(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/orchestration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language: storeLang }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(t(storeLang, 'orchConnexionError'))
    } finally {
      setIsDispatching(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleDispatch()
    }
  }

  function navigateToAgent(step: string | null) {
    if (step) setStep(step as any)
  }

  const IconMap = ICON_MAP
  const modeLabels: Record<string, string> = {
    solo: t(storeLang, 'orchDispatchSolo'),
    sequential: t(storeLang, 'orchDispatchSequential'),
    parallel: t(storeLang, 'orchDispatchParallel'),
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            {t(storeLang, 'orchDispatchTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t(storeLang, 'orchDispatchSubtitle')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(storeLang, 'orchDispatchPlaceholder')}
              className="w-full min-h-[80px] p-4 pr-24 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isDispatching}
            />
            <Button
              onClick={handleDispatch}
              disabled={isDispatching || !message.trim()}
              className="absolute bottom-3 right-3"
              size="sm"
            >
              {isDispatching ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                {t(storeLang, 'orchDispatchAnalyzing')}</>
              ) : (
                <><Zap className="w-4 h-4 mr-1.5" />{t(storeLang, 'orchDispatchSend')}</>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  {t(storeLang, 'orchDispatchResult')}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">{result.requestId}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Classification Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">{t(storeLang, 'orchDispatchIntent')}</div>
                  <div className="text-xs font-medium">{result.classifiedIntent}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">{t(storeLang, 'orchDispatchMode')}</div>
                  <Badge variant="secondary" className="text-xs">
                    {modeLabels[result.collaborationMode] ?? result.collaborationMode}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">{t(storeLang, 'orchDispatchEstimated')}</div>
                  <div className="text-xs font-bold text-emerald-600">{result.estimatedTime}</div>
                </div>
              </div>

              {/* Primary Agent */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">{t(storeLang, 'orchDispatchPrimary')}</h4>
                <Card className="border-l-4 border-l-emerald-500" onClick={() => navigateToAgent(result.primaryAgent?.step)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      {(() => { const Ic = IconMap[result.primaryAgent?.icon] ?? Cpu; return <Ic className="w-4 h-4" /> })()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{result.primaryAgent?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{result.primaryAgent?.module}</div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">{result.primaryAgent?.avgResponseTime}</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Secondary Agents */}
              {result.secondaryAgents?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">{t(storeLang, 'orchDispatchSecondary')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.secondaryAgents.map((agent: any, i: number) => (
                      <Card key={i} className="border-l-4 border-l-violet-400" onClick={() => navigateToAgent(agent?.step)}>
                        <CardContent className="p-3 flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-violet-100 text-violet-600 flex items-center justify-center">
                            {(() => { const Ic = IconMap[agent?.icon] ?? Cpu; return <Ic className="w-3.5 h-3.5" /> })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{agent?.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{agent?.module}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Response */}
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">{t(storeLang, 'orchDispatchResponse')}</div>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">{result.response}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// ==========================================================
// Collaboration Matrix Component
// ==========================================================
function CollaborationMatrix({ language }: { language: string }) {
  const { setStep } = useCVStore()

  const allCollabs = useMemo(() => {
    const links: { from: AgentDefinition; to: AgentDefinition; type: string; reason: Record<string, string> }[] = []
    for (const agent of AGENTS) {
      for (const collab of agent.collaborations) {
        const partner = AGENTS.find(a => a.id === collab.agentId)
        if (partner) {
          links.push({ from: agent, to: partner, type: collab.type, reason: collab.reason })
        }
      }
    }
    return links
  }, [])

  const totalCollabs = allCollabs.length
  const bidir = allCollabs.filter(c => c.type === 'bidirectional').length
  const unidir = totalCollabs - bidir

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5 text-violet-600" />
            {t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCollabTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCollabSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <div className="text-2xl font-bold text-violet-600">{totalCollabs}</div>
              <div className="text-[10px] text-muted-foreground">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCollabTotal')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-2xl font-bold text-emerald-600">{bidir}</div>
              <div className="text-[10px] text-muted-foreground">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCollabBidir')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30">
              <div className="text-2xl font-bold text-sky-600">{unidir}</div>
              <div className="text-[10px] text-muted-foreground">{t(language as 'fr' | 'en' | 'ar' | 'es', 'orchCollabUnidir')}</div>
            </div>
          </div>

          {/* Collaboration Links List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {allCollabs.map((link, i) => {
              const FromIcon = ICON_MAP[link.from.icon] ?? Cpu
              const ToIcon = ICON_MAP[link.to.icon] ?? Cpu
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <FromIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium min-w-0 truncate max-w-[120px]">{link.from.name}</span>
                  {link.type === 'bidirectional' ? (
                    <ArrowRightLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-sky-500 shrink-0" />
                  )}
                  <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <ToIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium min-w-0 truncate max-w-[120px]">{link.to.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0 hidden sm:inline">
                    {link.reason[language as 'fr' | 'en' | 'ar' | 'es'] ?? link.reason.fr}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================================
// Digital Board Panel — AI Executive Council
// ==========================================================

interface BoardExecutive {
  id: string
  title: string
  name: string
  role: string
  avatar: string
  status: string
  metrics: { decisions: number; accuracy: number; uptime: number }
  department: string
}

interface BoardSystemStats {
  totalDecisions: number
  averageAccuracy: number
  systemUptime: number
  activeAgents: number
  memoryUsage: number
  lastUpdate: string
}

function DigitalBoardPanel({ language }: { language: string }) {
  const [data, setData] = useState<{ executives: BoardExecutive[]; systemStats: BoardSystemStats } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai-os/board')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const lang = language

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { executives, systemStats } = data

  const statCards = [
    { label: t(lang, 'boardTotalDecisions'), value: systemStats.totalDecisions.toLocaleString(), icon: Activity, color: 'text-emerald-500' },
    { label: t(lang, 'boardAvgAccuracy'), value: `${systemStats.averageAccuracy}%`, icon: Brain, color: 'text-emerald-400' },
    { label: t(lang, 'boardSystemUptime'), value: `${systemStats.systemUptime}%`, icon: Cpu, color: 'text-teal-400' },
    { label: t(lang, 'boardActiveAgents'), value: String(systemStats.activeAgents), icon: Network, color: 'text-emerald-300' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-foreground">{t(lang, 'boardTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t(lang, 'boardSubtitle')}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t(lang, 'boardSystemStats')}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-emerald-50 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">{t(lang, 'boardExecutives')}</h4>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400">{t(lang, 'boardStatusActive')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {executives.map((exec, idx) => (
            <motion.div
              key={exec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              <div className="rounded-xl bg-slate-800/80 border border-slate-700/50 p-4 space-y-3 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                      {exec.avatar}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{exec.title}</p>
                      <p className="text-slate-400 text-xs">{exec.name}</p>
                    </div>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>

                <div>
                  <p className="text-slate-300 text-xs font-medium">{exec.role}</p>
                  <Badge className="mt-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                    {exec.department}
                  </Badge>
                </div>

                <div className="space-y-2.5 pt-1">
                  <MetricBar
                    label={t(lang, 'boardDecisions')}
                    value={exec.metrics.decisions}
                    max={5000}
                    display={exec.metrics.decisions.toLocaleString()}
                  />
                  <MetricBar
                    label={t(lang, 'boardAccuracy')}
                    value={exec.metrics.accuracy}
                    max={100}
                    display={`${exec.metrics.accuracy}%`}
                  />
                  <MetricBar
                    label={t(lang, 'boardUptime')}
                    value={exec.metrics.uptime}
                    max={100}
                    display={`${exec.metrics.uptime}%`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t(lang, 'boardMemoryUsage')}</span>
            <span className="text-emerald-400 font-medium">{systemStats.memoryUsage}%</span>
          </div>
          <Progress value={systemStats.memoryUsage} className="mt-1.5 h-1.5 bg-slate-700 [&>div]:bg-emerald-500" />
        </div>
      </div>
    </div>
  )
}

function MetricBar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-emerald-400 font-semibold">{display}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
