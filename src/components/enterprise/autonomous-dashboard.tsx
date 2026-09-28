'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Activity, Zap, Clock, TrendingUp, CheckCircle2,
  Bot, Brain, Search, FileText, MessageCircle, Compass, BookOpen,
  Briefcase, UserCheck, Laptop, Globe, Code2, Plane, MessageSquare,
  GraduationCap, Store, Building2, Scale, CreditCard, Linkedin,
  ChevronRight, X, Shield, DollarSign, Megaphone, Headphones,
  RotateCcw, BarChart3, AlertCircle, CircleDot, Layers,
  Sparkles, Cpu, Database, Network, Eye, CircleCheck, Timer,
  Loader2, Wrench, Users, Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { AGENTS, CTO_PRINCIPAL } from '@/lib/agent-registry'
import type { AgentDefinition, AgentCategory, AgentTier } from '@/lib/agent-registry'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

// --- Icon Mapping ---
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Search, MessageCircle, Linkedin, Compass, Bot, BookOpen,
  Briefcase, UserCheck, Laptop, Globe, Code2, Brain, Plane, MessageSquare,
  GraduationCap, Store, Building2, Scale, CreditCard, Activity, Shield,
}

// --- Category Color Maps ---
const CATEGORY_COLORS: Record<AgentCategory, { border: string; bg: string; text: string; badge: string; glow: string }> = {
  candidate: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  employment: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'shadow-amber-500/20',
  },
  platform: {
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    glow: 'shadow-violet-500/20',
  },
}

const TIER_STYLES: Record<AgentTier, { label: string; color: string }> = {
  principal: { label: 'Principal', color: 'text-rose-400' },
  specialized: { label: 'Spécialisé', color: 'text-sky-400' },
  support: { label: 'Support', color: 'text-slate-400' },
}

// --- Mock / Fallback Data ---
const MOCK_SYSTEM_STATS = {
  totalAgents: 19,
  activeAgents: 12,
  idleAgents: 5,
  processingAgents: 2,
  activeMissions: 7,
  systemUptime: 99.87,
  healthStatus: 'green' as const,
  learningEfficiency: 87.3,
  tasksCompletedToday: 142,
}

const MOCK_MISSIONS = [
  { id: 'm1', title: 'Optimisation CV Candidat', type: 'cv_optimization', progress: 75, totalSteps: 4, completedSteps: 3, startedAt: '14:23', agentId: 'cv' },
  { id: 'm2', title: 'Analyse ATS Profond', type: 'ats_deep_scan', progress: 40, totalSteps: 5, completedSteps: 2, startedAt: '14:18', agentId: 'ats' },
  { id: 'm3', title: 'Pipeline Recrutement', type: 'recruitment_pipeline', progress: 60, totalSteps: 6, completedSteps: 4, startedAt: '13:55', agentId: 'recruiter' },
  { id: 'm4', title: 'Roadmap Carrière', type: 'career_roadmap', progress: 90, totalSteps: 3, completedSteps: 3, startedAt: '13:30', agentId: 'career' },
  { id: 'm5', title: 'Synchronisation LinkedIn', type: 'linkedin_sync', progress: 20, totalSteps: 5, completedSteps: 1, startedAt: '14:30', agentId: 'linkedin' },
]

const MOCK_COLLABORATIONS = [
  { from: 'Agent CV', to: 'Agent ATS', taskCount: 47, category: 'candidate' as AgentCategory },
  { from: 'Agent Coach', to: 'Agent Career', taskCount: 38, category: 'candidate' as AgentCategory },
  { from: 'Agent Recruiter', to: 'Agent Jobs', taskCount: 35, category: 'employment' as AgentCategory },
  { from: 'Agent Intelligence', to: 'Agent Career', taskCount: 29, category: 'platform' as AgentCategory },
  { from: 'Agent Formation', to: 'Agent Campus', taskCount: 22, category: 'platform' as AgentCategory },
]

const MOCK_REVENUE_ATTRIBUTION = [
  { agent: 'Agent CV', percentage: 42, color: 'bg-emerald-500' },
  { agent: 'Agent ATS', percentage: 28, color: 'bg-sky-500' },
  { agent: 'Agent Recruiter', percentage: 15, color: 'bg-amber-500' },
  { agent: 'Agent LinkedIn', percentage: 9, color: 'bg-violet-500' },
  { agent: 'Autres', percentage: 6, color: 'bg-slate-500' },
]

const MOCK_LEARNING = {
  efficiency: 87.3,
  positiveOutcomes: 312,
  negativeOutcomes: 24,
  neutralOutcomes: 56,
  topPatterns: [
    'CV + ATS itératif → +23% taux de passage',
    'Coach post-entretien → +31% feedback positif',
    'LinkedIn sync hebdo → +18% visibilité profil',
    'Matching IA v3 → +27% placement',
  ],
  memoryUsage: 67,
}

const MOCK_AUTONOMOUS_OPS = [
  { id: 'billing', label: 'Auto-Billing', icon: DollarSign, status: 'active', lastAction: 'Facture #2847 générée', emoji: '🤖' },
  { id: 'marketing', label: 'Auto-Marketing', icon: Megaphone, status: 'active', lastAction: 'Campagne Q1 lancée', emoji: '📣' },
  { id: 'support', label: 'Auto-Support', icon: Headphones, status: 'processing', lastAction: '12 tickets résolus aujourd\'hui', emoji: '🎧' },
  { id: 'healing', label: 'Self-Healing', icon: RotateCcw, status: 'idle', lastAction: 'Fix API timeout 14:22', emoji: '🔄' },
  { id: 'analytics', label: 'Auto-Analytics', icon: BarChart3, status: 'active', lastAction: '3 rapports générés', emoji: '📊' },
]

const MOCK_ACTIVITY_FEED = [
  { id: 'a1', timestamp: '14:32', agent: 'Agent CV', action: 'Génération CV', result: 'success' as const },
  { id: 'a2', timestamp: '14:30', agent: 'Agent LinkedIn', action: 'Sync profil', result: 'success' as const },
  { id: 'a3', timestamp: '14:28', agent: 'Agent ATS', action: 'Scan profondeur', result: 'success' as const },
  { id: 'a4', timestamp: '14:25', agent: 'Agent Payment', action: 'Vérif abonnement', result: 'success' as const },
  { id: 'a5', timestamp: '14:22', agent: 'Self-Healing', action: 'Fix timeout API', result: 'success' as const },
  { id: 'a6', timestamp: '14:20', agent: 'Agent Coach', action: 'Session coaching', result: 'success' as const },
  { id: 'a7', timestamp: '14:18', agent: 'Agent Recruiter', action: 'Matching candidat', result: 'fail' as const },
  { id: 'a8', timestamp: '14:15', agent: 'Agent Formation', action: 'Certification', result: 'success' as const },
  { id: 'a9', timestamp: '14:10', agent: 'Agent Jobs', action: 'Publication offre', result: 'success' as const },
  { id: 'a10', timestamp: '14:05', agent: 'Auto-Billing', action: 'Relance paiement', result: 'fail' as const },
]

// --- Types ---
interface BoardData {
  executives?: Array<{
    id: string; title: string; name: string; role: string;
    avatar: string; status: string;
    metrics: { decisions: number; accuracy: number; uptime: number };
    department: string;
  }>;
  systemStats?: {
    totalDecisions: number; averageAccuracy: number;
    systemUptime: number; activeAgents: number;
    memoryUsage: number; lastUpdate: string;
  };
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// --- Main Component ---
export default function AutonomousDashboard() {
  const { language, setStep } = useCVStore()
  const [boardData, setBoardData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)

  // Simulate agent statuses
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'active' | 'idle' | 'processing'>>({})

  useEffect(() => {
    // Assign random but deterministic statuses based on agent index
    const statuses: Record<string, 'active' | 'idle' | 'processing'> = {}
    AGENTS.forEach((agent, i) => {
      if (i < 12) statuses[agent.id] = 'active'
      else if (i < 17) statuses[agent.id] = 'idle'
      else statuses[agent.id] = 'processing'
    })
    statuses['cto-principal'] = 'active'
    setAgentStatuses(statuses)
  }, [])

  // Fetch board data
  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-os/board?XTransformPort=3000')
      if (res.ok) {
        const data = await res.json()
        setBoardData(data)
      }
    } catch {
      // Use fallback data silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBoardData()
  }, [fetchBoardData])

  // Compute stats
  const stats = boardData?.systemStats
    ? {
      ...MOCK_SYSTEM_STATS,
      activeAgents: boardData.systemStats.activeAgents,
      systemUptime: boardData.systemStats.systemUptime,
      learningEfficiency: boardData.systemStats.averageAccuracy,
    }
    : MOCK_SYSTEM_STATS

  const healthColor = stats.systemUptime >= 99.5 ? 'emerald' : stats.systemUptime >= 98 ? 'amber' : 'red'

  const openAgentPanel = (agent: AgentDefinition) => {
    setSelectedAgent(agent)
    setAgentPanelOpen(true)
  }

  // --- Section 1: System Overview ---
  const renderSystemOverview = () => (
    <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
        { icon: Bot, label: t(language, 'entAgents') ?? 'Agents Actifs', value: `${stats.activeAgents}/${stats.totalAgents}`, sub: `${stats.idleAgents} inactifs`, color: 'text-emerald-400' },
        { icon: Target, label: t(language, 'entMissions') ?? 'Missions', value: `${stats.activeMissions}`, sub: 'en cours', color: 'text-sky-400' },
        { icon: Activity, label: t(language, 'entUptime') ?? 'Uptime', value: `${stats.systemUptime}%`, sub: healthColor === 'emerald' ? 'Sain' : healthColor === 'amber' ? 'Dégradé' : 'Critique', color: `text-${healthColor}-400` },
        { icon: Brain, label: t(language, 'entLearning') ?? 'Apprentissage', value: `${stats.learningEfficiency}%`, sub: 'efficacité', color: 'text-violet-400' },
        { icon: CheckCircle2, label: t(language, 'entTasksToday') ?? 'Tâches', value: `${stats.tasksCompletedToday}`, sub: "aujourd'hui", color: 'text-amber-400' },
        { icon: Cpu, label: t(language, 'entProcessing') ?? 'En traitement', value: `${stats.processingAgents}`, sub: 'agents', color: 'text-rose-400' },
      ].map((item, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-2 mb-2">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{item.label}</span>
          </div>
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-[11px] text-slate-500 mt-1">{item.sub}</div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-gradient-to-tl from-white/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      ))}
    </motion.div>
  )

  // --- Section 2: Agent Grid ---
  const renderAgentGrid = () => {
    const allAgents: Array<AgentDefinition & { isCto?: boolean }> = [
      { ...CTO_PRINCIPAL, id: 'cto-principal', module: 'CTO', icon: 'Brain', color: 'rose', capabilities: [], collaborations: [], avgResponseTime: '0.1s', step: null, description: CTO_PRINCIPAL.description, category: 'platform' as AgentCategory, isCto: true },
      ...AGENTS,
    ]

    return (
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-5 h-5 text-slate-300" />
          <h3 className="text-lg font-semibold text-white">{t(language, 'entAgentGrid') ?? 'Grille d\'Agents'}</h3>
          <Badge variant="outline" className="text-xs border-white/20 text-slate-400">{allAgents.length} agents</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {allAgents.map((agent, i) => {
            const IconComp = ICON_MAP[agent.icon] || Bot
            const catColors = CATEGORY_COLORS[agent.category]
            const status = agentStatuses[agent.id] || 'idle'
            const statusColors: Record<string, string> = {
              active: 'bg-emerald-500',
              idle: 'bg-slate-500',
              processing: 'bg-amber-500 animate-pulse',
            }
            const tierStyle = TIER_STYLES[agent.tier]

            return (
              <motion.div
                key={agent.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAgentPanel(agent)}
                className={`cursor-pointer rounded-xl bg-white/5 backdrop-blur-md border ${catColors.border} p-4 hover:bg-white/8 transition-all shadow-lg ${catColors.glow} shadow-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${catColors.bg}`}>
                    <IconComp className={`w-5 h-5 ${catColors.text}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                    <span className="text-[10px] text-slate-500 uppercase">{status}</span>
                  </div>
                </div>
                <div className="font-medium text-white text-sm mb-1">{agent.name}</div>
                <div className="text-[11px] text-slate-400 mb-3 line-clamp-1">{agent.description[language]}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${catColors.badge} border`}>
                    {agent.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    {tierStyle.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    {agent.capabilities.length} caps
                  </Badge>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // --- Section 3: Active Missions ---
  const renderActiveMissions = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entActiveMissions') ?? 'Missions Actives'}</h3>
        <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-300">{MOCK_MISSIONS.length}</Badge>
      </div>
      <div className="space-y-3">
        {MOCK_MISSIONS.map((mission, i) => {
          const agent = AGENTS.find(a => a.id === mission.agentId)
          const catColors = agent ? CATEGORY_COLORS[agent.category] : CATEGORY_COLORS.platform
          return (
            <motion.div
              key={mission.id}
              variants={itemVariants}
              className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${catColors.bg.replace('/10', '/60')}`} />
                  <span className="font-medium text-white text-sm">{mission.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    <Timer className="w-3 h-3 mr-1" />
                    {mission.startedAt}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white">
                    <Eye className="w-3 h-3 mr-1" />
                    Détails
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={mission.progress} className="h-2" />
                </div>
                <span className="text-xs text-slate-400 min-w-[60px] text-right">
                  {mission.completedSteps}/{mission.totalSteps} étapes
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )

  // --- Section 4: Collaboration Graph ---
  const renderCollaborationGraph = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entCollabGraph') ?? 'Graphe de Collaboration'}</h3>
        <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-300">Top 5</Badge>
      </div>
      <div className="space-y-3">
        {MOCK_COLLABORATIONS.map((collab, i) => {
          const catColors = CATEGORY_COLORS[collab.category]
          return (
            <motion.div
              key={i}
              variants={itemVariants}
              className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 hover:border-white/15 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${catColors.text}`}>{collab.from}</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-6 h-[2px] ${catColors.bg.replace('/10', '/50')}`} />
                    <ChevronRight className={`w-4 h-4 ${catColors.text}`} />
                  </div>
                  <span className={`font-medium text-sm ${catColors.text}`}>{collab.to}</span>
                </div>
                <Badge className={`text-xs ${catColors.badge} border`}>
                  {collab.taskCount} tâches
                </Badge>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )

  // --- Section 5: Revenue Attribution ---
  const renderRevenueAttribution = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entRevenueAttr') ?? 'Attribution Revenus'}</h3>
      </div>
      <div className="space-y-3">
        {MOCK_REVENUE_ATTRIBUTION.map((item, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{item.agent}</span>
              <span className="text-sm font-bold text-emerald-400">{item.percentage}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${item.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )

  // --- Section 6: Learning & Self-Improvement ---
  const renderLearning = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entLearningTitle') ?? 'Apprentissage & Auto-amélioration'}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Efficacité', value: `${MOCK_LEARNING.efficiency}%`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Positifs', value: MOCK_LEARNING.positiveOutcomes, icon: CircleCheck, color: 'text-emerald-400' },
          { label: 'Négatifs', value: MOCK_LEARNING.negativeOutcomes, icon: AlertCircle, color: 'text-rose-400' },
          { label: 'Mémoire', value: `${MOCK_LEARNING.memoryUsage}%`, icon: Database, color: 'text-sky-400' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-3 text-center">
            <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-2`} />
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
        <div className="text-sm font-medium text-white mb-3">{t(language, 'entTopPatterns') ?? 'Patterns Appris'}</div>
        <div className="space-y-2">
          {MOCK_LEARNING.topPatterns.map((pattern, i) => (
            <div key={i} className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">{pattern}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )

  // --- Section 7: Autonomous Operations ---
  const renderAutonomousOps = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entAutonomousOps') ?? 'Opérations Autonomes'}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOCK_AUTONOMOUS_OPS.map((op, i) => {
          const statusStyles: Record<string, { dot: string; label: string }> = {
            active: { dot: 'bg-emerald-500', label: 'Actif' },
            processing: { dot: 'bg-amber-500 animate-pulse', label: 'En traitement' },
            idle: { dot: 'bg-slate-500', label: 'Inactif' },
          }
          const style = statusStyles[op.status] || statusStyles.idle
          return (
            <motion.div
              key={op.id}
              variants={itemVariants}
              className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{op.emoji}</span>
                  <span className="font-medium text-white text-sm">{op.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="text-[10px] text-slate-500">{style.label}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400">{op.lastAction}</div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )

  // --- Section 8: Activity Feed ---
  const renderActivityFeed = () => (
    <motion.div variants={itemVariants}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-semibold text-white">{t(language, 'entActivityFeed') ?? 'Activité Récente'}</h3>
      </div>
      <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {MOCK_ACTIVITY_FEED.map((event, i) => {
            const isSuccess = event.result === 'success'
            return (
              <motion.div
                key={event.id}
                variants={itemVariants}
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${i === 0 ? 'bg-white/5' : ''}`}
              >
                <span className="text-[11px] text-slate-500 font-mono min-w-[40px]">{event.timestamp}</span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-sm text-slate-300 flex-1">
                  <span className="text-white font-medium">{event.agent}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  {event.action}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${isSuccess ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}
                >
                  {isSuccess ? '✓' : '✗'}
                </Badge>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )

  // --- Loading Skeleton ---
  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <Skeleton className="h-4 w-20 mb-2 bg-white/10" />
            <Skeleton className="h-8 w-16 mb-1 bg-white/10" />
            <Skeleton className="h-3 w-12 bg-white/10" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <Skeleton className="h-10 w-10 rounded-lg mb-3 bg-white/10" />
            <Skeleton className="h-4 w-24 mb-1 bg-white/10" />
            <Skeleton className="h-3 w-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )

  // --- Agent Detail Panel ---
  const renderAgentPanel = () => {
    if (!selectedAgent) return null
    const IconComp = ICON_MAP[selectedAgent.icon] || Bot
    const catColors = CATEGORY_COLORS[selectedAgent.category]
    const status = agentStatuses[selectedAgent.id] || 'idle'
    const tierStyle = TIER_STYLES[selectedAgent.tier]

    return (
      <Sheet open={agentPanelOpen} onOpenChange={setAgentPanelOpen}>
        <SheetContent className="bg-slate-950/95 backdrop-blur-xl border-white/10 text-white w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${catColors.bg}`}>
                <IconComp className={`w-6 h-6 ${catColors.text}`} />
              </div>
              <div>
                <div>{selectedAgent.name}</div>
                <div className="text-sm font-normal text-slate-400">{selectedAgent.module}</div>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Détails de l&apos;agent {selectedAgent.name}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
            {/* Status & Tier */}
            <div className="flex items-center gap-3">
              <Badge className={`${catColors.badge} border`}>{selectedAgent.category}</Badge>
              <Badge variant="outline" className={`border-white/20 ${tierStyle.color}`}>{tierStyle.label}</Badge>
              <Badge variant="outline" className={`border-white/20 ${status === 'active' ? 'text-emerald-400' : status === 'processing' ? 'text-amber-400' : 'text-slate-400'}`}>
                <div className={`w-2 h-2 rounded-full mr-1.5 ${status === 'active' ? 'bg-emerald-500' : status === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`} />
                {status}
              </Badge>
            </div>

            {/* Description */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</div>
              <div className="text-sm text-slate-300">{selectedAgent.description[language]}</div>
            </div>

            {/* Response Time */}
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center flex-1">
                <Clock className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{selectedAgent.avgResponseTime}</div>
                <div className="text-[10px] text-slate-500">Temps de réponse</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center flex-1">
                <Layers className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{selectedAgent.capabilities.length}</div>
                <div className="text-[10px] text-slate-500">Capacités</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center flex-1">
                <Network className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{selectedAgent.collaborations.length}</div>
                <div className="text-[10px] text-slate-500">Collaborations</div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Capacités</div>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities.map((cap) => (
                  <Badge key={cap.key} variant="outline" className="border-white/15 text-slate-300 text-xs">
                    {cap.label[language]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Collaborations */}
            {selectedAgent.collaborations.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Collaborations</div>
                <div className="space-y-2">
                  {selectedAgent.collaborations.map((collab, i) => {
                    const targetAgent = AGENTS.find(a => a.id === collab.agentId)
                    const targetIcon = targetAgent ? ICON_MAP[targetAgent.icon] || Bot : Bot
                    const targetCatColors = targetAgent ? CATEGORY_COLORS[targetAgent.category] : CATEGORY_COLORS.platform
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
                        <targetIcon className={`w-4 h-4 ${targetCatColors.text}`} />
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{targetAgent?.name || collab.agentId}</div>
                          <div className="text-xs text-slate-400">{collab.reason[language]}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-white/15 text-slate-400">
                          {collab.type === 'bidirectional' ? '↔' : '→'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Navigate Button */}
            {selectedAgent.step && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setAgentPanelOpen(false)
                  setStep(selectedAgent.step as any)
                }}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Accéder à {selectedAgent.name}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-white/10"
              onClick={() => setStep('orchestrationHub')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                <Brain className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BazNova Entreprise Autonome</h1>
                <p className="text-xs text-slate-500">Centre de Contrôle Autonome</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Système Actif
            </Badge>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderSkeleton()}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Section 1: System Overview */}
              {renderSystemOverview()}

              {/* Tabs for remaining sections */}
              <Tabs defaultValue="agents" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 backdrop-blur-md w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
                  <TabsTrigger value="agents" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-slate-400 text-xs sm:text-sm">
                    <Bot className="w-4 h-4 mr-1.5" />
                    Agents
                  </TabsTrigger>
                  <TabsTrigger value="missions" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 text-slate-400 text-xs sm:text-sm">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Missions
                  </TabsTrigger>
                  <TabsTrigger value="collab" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-slate-400 text-xs sm:text-sm">
                    <Network className="w-4 h-4 mr-1.5" />
                    Collaboration
                  </TabsTrigger>
                  <TabsTrigger value="revenue" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-slate-400 text-xs sm:text-sm">
                    <DollarSign className="w-4 h-4 mr-1.5" />
                    Revenus
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300 text-slate-400 text-xs sm:text-sm">
                    <Brain className="w-4 h-4 mr-1.5" />
                    IA Learning
                  </TabsTrigger>
                  <TabsTrigger value="ops" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 text-slate-400 text-xs sm:text-sm">
                    <Wrench className="w-4 h-4 mr-1.5" />
                    Ops
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 text-slate-400 text-xs sm:text-sm">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Activité
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="agents" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderAgentGrid()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="missions" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderActiveMissions()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="collab" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderCollaborationGraph()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="revenue" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderRevenueAttribution()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="learning" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderLearning()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="ops" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderAutonomousOps()}
                  </motion.div>
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {renderActivityFeed()}
                  </motion.div>
                </TabsContent>
              </Tabs>

              {/* CTO Principal Callout */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-rose-500/10 to-amber-500/10 backdrop-blur-md border border-white/10 p-6 text-center"
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Brain className="w-6 h-6 text-violet-400" />
                  <span className="text-lg font-bold text-white">{CTO_PRINCIPAL.name}</span>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 border text-xs">Principal</Badge>
                </div>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                  {CTO_PRINCIPAL.description[language]}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Agent Detail Panel */}
      {renderAgentPanel()}
    </div>
  )
}
