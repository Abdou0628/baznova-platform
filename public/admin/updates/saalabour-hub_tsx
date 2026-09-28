'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Bot, Zap, Activity, Clock, CheckCircle2, XCircle, Loader2,
  Plus, ChevronRight, GripVertical, Trash2, Rocket, FileText, Search,
  MessageCircle, Linkedin, UserCheck, Compass, BookOpen, Briefcase, Laptop,
  Globe, Code2, Brain, Plane, MessageSquare, GraduationCap, Store,
  Building2, Scale, Network, Megaphone, BarChart3, Wallet, LayoutGrid,
  Coins, Users, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AGENTS, getAgentById,
  type AgentTier,
} from '@/lib/agent-registry'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

const SaalabourMarketplace = dynamic(() => import('./saalabour-marketplace'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>,
})
const WalletTab = dynamic(() => import('./saalabour-wallet'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>,
})
const TemplatesTab = dynamic(() => import('./saalabour-templates'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>,
})

// --- Icon Map ---
const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Search, MessageCircle, Linkedin, UserCheck, Compass, Bot, BookOpen,
  Briefcase, Laptop, Globe, Code2, Brain, Plane, MessageSquare,
  GraduationCap, Store, Building2, Scale, Network, Megaphone, CreditCard,
}

function getAgentIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Bot
}

// --- Color utilities ---
const AGENT_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string; pill: string }> = {
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
  },
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
    pill: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-300 dark:border-sky-700',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-300 dark:border-violet-700',
    dot: 'bg-violet-500',
    pill: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border border-violet-300 dark:border-violet-700',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
    pill: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-700',
    dot: 'bg-teal-500',
    pill: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 border border-teal-300 dark:border-teal-700',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    dot: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
    pill: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border border-orange-300 dark:border-orange-700',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    pill: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-300 dark:border-red-700',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    dot: 'bg-slate-500',
    pill: 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200 border border-slate-300 dark:border-slate-600',
  },
}

function getAgentColors(color: string) {
  return AGENT_COLOR_MAP[color] || AGENT_COLOR_MAP.slate
}

// --- Types ---
interface Mission {
  id: string
  title: string
  description: string
  type: MissionType
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  agentChain: MissionAgentStep[]
  progress: number
  createdAt: string
  result?: string
}

interface MissionAgentStep {
  agentId: string
  action: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: string
}

interface WorkforceAgent {
  id: string
  name: string
  module: string
  icon: string
  color: string
  tier: AgentTier
  status: 'available' | 'busy' | 'offline'
}

type MissionType =
  | 'cv_processing'
  | 'candidate_sourcing'
  | 'career_planning'
  | 'interview_prep'
  | 'marketing'
  | 'job_analysis'
  | 'linkedin_optimization'
  | 'custom'

type TabId = 'dashboard' | 'create' | 'detail' | 'marketplace' | 'templates' | 'wallet'

// --- Mission Type Definitions (labels/descs are i18n keys) ---
const MISSION_TYPES: { type: MissionType; label: string; desc: string; icon: React.ElementType; agents: string[] }[] = [
  { type: 'cv_processing', label: 'saalabour.missionTypes.cvProcessing.label', desc: 'saalabour.missionTypes.cvProcessing.desc', icon: FileText, agents: ['cv', 'ats'] },
  { type: 'candidate_sourcing', label: 'saalabour.missionTypes.sourcing.label', desc: 'saalabour.missionTypes.sourcing.desc', icon: UserCheck, agents: ['recruiter', 'jobs', 'ats'] },
  { type: 'career_planning', label: 'saalabour.missionTypes.career.label', desc: 'saalabour.missionTypes.career.desc', icon: Compass, agents: ['career', 'interview', 'cv'] },
  { type: 'interview_prep', label: 'saalabour.missionTypes.interview.label', desc: 'saalabour.missionTypes.interview.desc', icon: MessageCircle, agents: ['interview', 'career'] },
  { type: 'marketing', label: 'saalabour.missionTypes.marketing.label', desc: 'saalabour.missionTypes.marketing.desc', icon: Megaphone, agents: ['marketing', 'sales'] },
  { type: 'job_analysis', label: 'saalabour.missionTypes.jobAnalysis.label', desc: 'saalabour.missionTypes.jobAnalysis.desc', icon: BarChart3, agents: ['jobs', 'intelligence'] },
  { type: 'linkedin_optimization', label: 'saalabour.missionTypes.linkedin.label', desc: 'saalabour.missionTypes.linkedin.desc', icon: Linkedin, agents: ['linkedin', 'cv', 'ats'] },
  { type: 'custom', label: 'saalabour.missionTypes.custom.label', desc: 'saalabour.missionTypes.custom.desc', icon: Zap, agents: [] },
]

const MISSION_TYPE_DEFAULTS: Record<MissionType, { agents: string[]; actions: string[] }> = {
  cv_processing: { agents: ['cv', 'ats'], actions: ['saalabour.actions.cvGeneration', 'saalabour.actions.atsScoring'] },
  candidate_sourcing: { agents: ['recruiter', 'jobs', 'ats'], actions: ['saalabour.actions.candidateSearch', 'saalabour.actions.jobMatching', 'saalabour.actions.atsEvaluation'] },
  career_planning: { agents: ['career', 'interview', 'cv'], actions: ['saalabour.actions.skillsAssessment', 'saalabour.actions.interviewSimulation', 'saalabour.actions.targetCvGeneration'] },
  interview_prep: { agents: ['interview', 'career'], actions: ['saalabour.actions.aiInterviewSimulation', 'saalabour.actions.coachingPlan'] },
  marketing: { agents: ['marketing', 'sales'], actions: ['saalabour.actions.contentCreation', 'saalabour.actions.salesStrategy'] },
  job_analysis: { agents: ['jobs', 'intelligence'], actions: ['saalabour.actions.jobAnalysis', 'saalabour.actions.marketIntelligence'] },
  linkedin_optimization: { agents: ['linkedin', 'cv', 'ats'], actions: ['saalabour.actions.profileOptimization', 'saalabour.actions.cvDataExtraction', 'saalabour.actions.atsVerification'] },
  custom: { agents: [], actions: [] },
}

const PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
  low: { label: 'saalabour.priority.low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  normal: { label: 'saalabour.priority.normal', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  high: { label: 'saalabour.priority.high', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  urgent: { label: 'saalabour.priority.urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'saalabour.status.pending', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: Clock },
  running: { label: 'saalabour.status.running', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Loader2 },
  completed: { label: 'saalabour.status.completed', color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
  failed: { label: 'saalabour.status.failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle },
}

// --- Mock Data ---
const MOCK_MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Optimisation CV pour poste Développeur Full-Stack',
    description: 'Générer un CV optimisé ATS et analyser sa compatibilité avec les offres de développeur full-stack.',
    type: 'cv_processing',
    status: 'running',
    priority: 'high',
    agentChain: [
      { agentId: 'cv', action: 'saalabour.actions.cvGeneration', status: 'completed', duration: '2.1s' },
      { agentId: 'ats', action: 'saalabour.actions.atsScoring', status: 'running' },
    ],
    progress: 55,
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'm2',
    title: 'Sourcing candidats Senior Data Engineer',
    description: 'Trouver 10 candidats qualifiés pour le poste de Senior Data Engineer à Casablanca.',
    type: 'candidate_sourcing',
    status: 'completed',
    priority: 'urgent',
    agentChain: [
      { agentId: 'recruiter', action: 'saalabour.actions.candidateSearch', status: 'completed', duration: '3.8s' },
      { agentId: 'jobs', action: 'saalabour.actions.jobMatching', status: 'completed', duration: '1.9s' },
      { agentId: 'ats', action: 'saalabour.actions.atsEvaluation', status: 'completed', duration: '2.2s' },
    ],
    progress: 100,
    createdAt: '2025-01-14T08:00:00Z',
    result: '12 candidats identifiés, 8 matchs qualifiés, 3 recommandations prioritaires.',
  },
  {
    id: 'm3',
    title: 'Plan de carrière Junior UX Designer',
    description: 'Élaborer une feuille de route de 12 mois pour un junior UX designer avec recommandations de formation.',
    type: 'career_planning',
    status: 'pending',
    priority: 'normal',
    agentChain: [
      { agentId: 'career', action: 'saalabour.actions.skillsAssessment', status: 'pending' },
      { agentId: 'interview', action: 'saalabour.actions.interviewSimulation', status: 'pending' },
      { agentId: 'cv', action: 'saalabour.actions.targetCvGeneration', status: 'pending' },
    ],
    progress: 0,
    createdAt: '2025-01-15T14:00:00Z',
  },
]

const MOCK_WORKFORCE: WorkforceAgent[] = AGENTS.map(a => ({
  id: a.id,
  name: a.name,
  module: a.module,
  icon: a.icon,
  color: a.color,
  tier: a.tier,
  status: ['available', 'available', 'available', 'busy', 'available', 'offline'][(Math.abs(a.id.charCodeAt(0) * 7 + a.id.length * 3)) % 6] as WorkforceAgent['status'],
}))

// --- Tier badge styling ---
const TIER_BADGE_STYLES: Record<AgentTier, string> = {
  principal: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
  specialized: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  support: 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400',
}

const TIER_LABELS: Record<AgentTier, string> = {
  principal: 'saalabour.tier.principal',
  specialized: 'saalabour.tier.specialized',
  support: 'saalabour.tier.support',
}

// --- Tab Navigation Definition (labels are i18n keys) ---
const NAV_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'saalabour.missionControl', icon: LayoutGrid },
  { id: 'marketplace', label: 'saalabour.marketplace', icon: Store },
  { id: 'templates', label: 'saalabour.templates', icon: Zap },
  { id: 'wallet', label: 'saalabour.wallet', icon: Wallet },
]

// ============================================================================
// Main Component
// ============================================================================
export default function SaalabourHub() {
  const { language } = useCVStore()
  const [selectedTab, setSelectedTab] = useState<TabId>('dashboard')
  const [missions, setMissions] = useState<Mission[]>([])
  const [workforce, setWorkforce] = useState<WorkforceAgent[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // --- Fetch data on mount ---
  useEffect(() => {
    async function fetchData() {
      try {
        const [missionsRes, workforceRes] = await Promise.allSettled([
          fetch('/api/saalabour/missions').then(r => r.ok ? r.json() : null),
          fetch('/api/saalabour/workforce').then(r => r.ok ? r.json() : null),
        ])
        if (missionsRes.status === 'fulfilled' && missionsRes.value?.missions) {
          setMissions(missionsRes.value.missions)
        } else {
          setMissions(MOCK_MISSIONS)
        }
        if (workforceRes.status === 'fulfilled' && workforceRes.value?.workforce) {
          setWorkforce(workforceRes.value.workforce)
        } else {
          setWorkforce(MOCK_WORKFORCE)
        }
      } catch {
        setMissions(MOCK_MISSIONS)
        setWorkforce(MOCK_WORKFORCE)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- Stats ---
  const stats = useMemo(() => {
    const active = missions.filter(m => m.status === 'running').length
    const available = workforce.filter(w => w.status === 'available').length
    const completed = missions.filter(m => m.status === 'completed').length
    const successRate = missions.length > 0
      ? Math.round((completed / missions.length) * 100)
      : 94
    return {
      active,
      available,
      processed: completed * 7 + 23,
      successRate,
    }
  }, [missions, workforce])

  const handleSelectMission = useCallback((mission: Mission) => {
    setSelectedMission(mission)
    setSelectedTab('detail')
  }, [])

  const handleBackToDashboard = useCallback(() => {
    setSelectedMission(null)
    setSelectedTab('dashboard')
  }, [])

  const handleLaunchMission = useCallback(async () => {
    if (!selectedMission) return
    try {
      const res = await fetch(`/api/saalabour/missions/${selectedMission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'running' }),
      })
      if (res.ok) {
        const updated = { ...selectedMission, status: 'running' as const, progress: 10 }
        setSelectedMission(updated)
        setMissions(prev => prev.map(m => m.id === selectedMission.id ? updated : m))
        toast.success(t(language, 'saalabour.toast.missionLaunched'))
      } else {
        const updated = { ...selectedMission, status: 'running' as const, progress: 10 }
        setSelectedMission(updated)
        setMissions(prev => prev.map(m => m.id === selectedMission.id ? updated : m))
        toast.success(t(language, 'saalabour.toast.missionLaunched'))
      }
    } catch {
      const updated = { ...selectedMission, status: 'running' as const, progress: 10 }
      setSelectedMission(updated)
      setMissions(prev => prev.map(m => m.id === selectedMission.id ? updated : m))
      toast.success(t(language, 'saalabour.toast.missionLaunched'))
    }
  }, [selectedMission, language])

  const handleUseTemplate = useCallback((template: { agentChain: { agentId: string; action: string }[]; title: string; description: string }) => {
    setSelectedTab('create')
    toast.info(t(language, 'saalabour.toast.templateLoaded').replace('{title}', template.title))
  }, [language])

  const handleTabChange = useCallback((tabId: TabId) => {
    if (tabId === 'detail' && !selectedMission) return
    setSelectedMission(null)
    setSelectedTab(tabId)
  }, [selectedMission])

  // --- Don't show nav bar for create/detail views ---
  const showNav = selectedTab !== 'create' && selectedTab !== 'detail'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation Bar */}
        {showNav && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 p-1 bg-muted/60 backdrop-blur-sm rounded-xl mb-6 overflow-x-auto"
          >
            {NAV_TABS.map(tab => {
              const isActive = selectedTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{t(language, tab.label)}</span>
                  {isActive && (
                    <motion.div
                      layoutId="saalabour-tab-indicator"
                      className="absolute inset-0 bg-background rounded-lg shadow-sm -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              )
            })}
          </motion.nav>
        )}

        <AnimatePresence mode="wait">
          {selectedTab === 'dashboard' && !selectedMission && (
            <DashboardTab
              key="dashboard"
              missions={missions}
              workforce={workforce}
              stats={stats}
              isLoading={isLoading}
              onSelectMission={handleSelectMission}
              onNewMission={() => setSelectedTab('create')}
              onGoToMarketplace={() => setSelectedTab('marketplace')}
              onGoToTemplates={() => setSelectedTab('templates')}
            />
          )}
          {selectedTab === 'marketplace' && (
            <SaalabourMarketplace key="marketplace" />
          )}
          {selectedTab === 'templates' && (
            <TemplatesTab
              key="templates"
              onBack={() => setSelectedTab('dashboard')}
              onUseTemplate={handleUseTemplate}
            />
          )}
          {selectedTab === 'wallet' && (
            <WalletTab
              key="wallet"
              onBack={() => setSelectedTab('dashboard')}
            />
          )}
          {selectedTab === 'create' && (
            <CreateMissionTab
              key="create"
              onMissionCreated={(mission) => {
                setMissions(prev => [mission, ...prev])
                setSelectedMission(mission)
                setSelectedTab('detail')
                toast.success(t(language, 'saalabour.toast.missionCreated'))
              }}
              onBack={() => setSelectedTab('dashboard')}
            />
          )}
          {selectedTab === 'detail' && selectedMission && (
            <MissionDetailTab
              key="detail"
              mission={selectedMission}
              onBack={handleBackToDashboard}
              onLaunch={handleLaunchMission}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================================
// Tab 1: Dashboard
// ============================================================================
function DashboardTab({
  missions, workforce, stats, isLoading, onSelectMission, onNewMission, onGoToMarketplace, onGoToTemplates,
}: {
  missions: Mission[]
  workforce: WorkforceAgent[]
  stats: { active: number; available: number; processed: number; successRate: number }
  isLoading: boolean
  onSelectMission: (m: Mission) => void
  onNewMission: () => void
  onGoToMarketplace: () => void
  onGoToTemplates: () => void
}) {
  const { language } = useCVStore()
  const activeMissions = missions.filter(m => m.status === 'running' || m.status === 'pending')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 sm:p-12 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300" />
          </span>
          <span className="text-emerald-200 text-sm font-medium">{t(language, 'saalabour.systemActive')}</span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3"
        >
          {t(language, 'saalabour.heroTitle')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-emerald-100 text-lg sm:text-xl max-w-2xl mb-2"
        >
          {t(language, 'saalabour.heroSubtitle')}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-emerald-200/80 text-sm max-w-2xl mb-6"
        >
          {t(language, 'saalabour.heroNoSubscription')}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-3"
        >
          <Button
            onClick={onNewMission}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t(language, 'saalabour.newMission')}
          </Button>
          <Button
            onClick={onGoToMarketplace}
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Store className="w-4 h-4 mr-2" />
            {t(language, 'saalabour.marketplace')}
          </Button>
          <Button
            onClick={onGoToTemplates}
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Zap className="w-4 h-4 mr-2" />
            {t(language, 'saalabour.templates')}
          </Button>
        </motion.div>
      </section>

      {/* SaaLabour Differentiators */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'saalabour.diff.payPerWork.title',
            desc: 'saalabour.diff.payPerWork.desc',
            icon: Coins,
            accent: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            title: 'saalabour.diff.aiWorkforce.title',
            desc: 'saalabour.diff.aiWorkforce.desc',
            icon: Users,
            accent: 'text-teal-600 dark:text-teal-400',
          },
          {
            title: 'saalabour.diff.instantDelivery.title',
            desc: 'saalabour.diff.instantDelivery.desc',
            icon: Rocket,
            accent: 'text-amber-600 dark:text-amber-400',
          },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow border-dashed">
              <CardContent className="p-5">
                <item.icon className={`w-8 h-8 ${item.accent} mb-3`} />
                <h3 className="font-semibold text-foreground mb-1">{t(language, item.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(language, item.desc)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'saalabour.stats.activeMissions', value: stats.active, icon: Activity, accent: 'emerald' },
          { label: 'saalabour.stats.availableAgents', value: stats.available, icon: Bot, accent: 'teal' },
          { label: 'saalabour.stats.unitsProcessed', value: stats.processed, icon: BarChart3, accent: 'amber' },
          { label: 'saalabour.stats.successRate', value: `${stats.successRate}%`, icon: CheckCircle2, accent: 'rose' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">{t(language, stat.label)}</span>
                  <stat.icon className={`w-5 h-5 text-${stat.accent}-500`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Active Missions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{t(language, 'saalabour.activeMissions')}</h2>
          <Button variant="outline" size="sm" onClick={onNewMission}>
            <Plus className="w-4 h-4 mr-1" /> {t(language, 'saalabour.newBtn')}
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeMissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Rocket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t(language, 'saalabour.noActiveMissions')}</p>
              <Button variant="outline" className="mt-3" onClick={onNewMission}>
                {t(language, 'saalabour.createMission')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMissions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border hover:border-emerald-300 dark:hover:border-emerald-700"
                  onClick={() => onSelectMission(mission)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                        {mission.title}
                      </h3>
                      <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${STATUS_STYLES[mission.status].color}`}>
                        {mission.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {t(language, STATUS_STYLES[mission.status].label)}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t(language, MISSION_TYPES.find(mt => mt.type === mission.type)?.label || mission.type)}
                    </Badge>
                    {/* Agent chain pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {mission.agentChain.map((step, idx) => {
                        const agent = getAgentById(step.agentId)
                        if (!agent) return null
                        const colors = getAgentColors(agent.color)
                        const AgentIcon = getAgentIcon(agent.icon)
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.pill}`}
                          >
                            <AgentIcon className="w-3 h-3" />
                            {agent.name.replace('Agent ', '')}
                            {idx < mission.agentChain.length - 1 && (
                              <ChevronRight className="w-3 h-3 opacity-40" />
                            )}
                          </span>
                        )
                      })}
                    </div>
                    {/* Progress bar */}
                    {mission.progress > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t(language, 'saalabour.progression')}</span>
                          <span>{mission.progress}%</span>
                        </div>
                        <Progress value={mission.progress} className="h-1.5" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Workforce Grid */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">{t(language, 'saalabour.aiWorkforce')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {workforce.map((agent, i) => {
            const colors = getAgentColors(agent.color)
            const AgentIcon = getAgentIcon(agent.icon)
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                      <AgentIcon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          agent.status === 'available' ? 'bg-emerald-500' :
                          agent.status === 'busy' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{agent.module}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${TIER_BADGE_STYLES[agent.tier]}`}>
                      {t(language, TIER_LABELS[agent.tier])}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>
    </motion.div>
  )
}

// ============================================================================
// Tab: Create Mission
// ============================================================================
function CreateMissionTab({
  onMissionCreated,
  onBack,
}: {
  onMissionCreated: (mission: Mission) => void
  onBack: () => void
}) {
  const { language } = useCVStore()
  const [selectedType, setSelectedType] = useState<MissionType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [agentChain, setAgentChain] = useState<MissionAgentStep[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedType) {
      setAgentChain([])
      return
    }
    const defaults = MISSION_TYPE_DEFAULTS[selectedType]
    setAgentChain(
      defaults.agents.map((agentId, i) => ({
        agentId,
        action: defaults.actions[i] || 'saalabour.actions.customAction',
        status: 'pending' as const,
      }))
    )
  }, [selectedType])

  const handleRemoveAgent = (idx: number) => {
    setAgentChain(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddAgent = (agentId: string) => {
    const exists = agentChain.some(s => s.agentId === agentId)
    if (exists) {
      toast.error(t(language, 'saalabour.toast.agentAlreadyInChain'))
      return
    }
    setAgentChain(prev => [...prev, { agentId, action: 'saalabour.actions.customAction', status: 'pending' }])
  }

  const handleDragStart = (idx: number) => setDraggedIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === idx) return
    setAgentChain(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(draggedIdx, 1)
      updated.splice(idx, 0, moved)
      return updated
    })
    setDraggedIdx(idx)
  }
  const handleDragEnd = () => setDraggedIdx(null)

  const handleSubmit = async () => {
    if (!selectedType || !title.trim() || agentChain.length === 0) {
      toast.error(t(language, 'saalabour.toast.fillAllFields'))
      return
    }
    setIsSubmitting(true)
    const newMission: Mission = {
      id: `m_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type: selectedType,
      status: 'pending',
      priority,
      agentChain,
      progress: 0,
      createdAt: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/saalabour/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission),
      })
      if (res.ok) {
        const data = await res.json()
        onMissionCreated(data.mission || newMission)
      } else {
        onMissionCreated(newMission)
      }
    } catch {
      onMissionCreated(newMission)
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableAgents = AGENTS.filter(a => !agentChain.some(s => s.agentId === a.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(language, 'saalabour.createTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'saalabour.createSubtitle')}</p>
        </div>
      </div>

      {/* Mission Type Selector */}
      <section>
        <Label className="text-base font-semibold text-foreground mb-3 block">{t(language, 'saalabour.missionType')}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MISSION_TYPES.map((mt) => {
            const isSelected = selectedType === mt.type
            return (
              <motion.div key={mt.type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-500 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'hover:border-emerald-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedType(mt.type)}
                >
                  <CardContent className="p-4 text-center space-y-2">
                    <div className={`mx-auto w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <mt.icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                      {t(language, mt.label)}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t(language, mt.desc)}</p>
                    {mt.agents.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {mt.agents.map(aId => {
                          const agent = getAgentById(aId)
                          if (!agent) return null
                          const colors = getAgentColors(agent.color)
                          return (
                            <span key={aId} className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.pill}`}>
                              {agent.name.replace('Agent ', '')}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Title & Description */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mission-title" className="font-semibold">{t(language, 'saalabour.missionTitle')}</Label>
          <Input
            id="mission-title"
            placeholder={t(language, 'saalabour.missionTitlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mission-priority" className="font-semibold">{t(language, 'saalabour.priority')}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger id="mission-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t(language, 'saalabour.priority.low')}</SelectItem>
              <SelectItem value="normal">{t(language, 'saalabour.priority.normal')}</SelectItem>
              <SelectItem value="high">{t(language, 'saalabour.priority.high')}</SelectItem>
              <SelectItem value="urgent">{t(language, 'saalabour.priority.urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="mission-desc" className="font-semibold">{t(language, 'saalabour.description')}</Label>
          <Textarea
            id="mission-desc"
            placeholder={t(language, 'saalabour.descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      {/* Agent Chain Builder */}
      <section>
        <Label className="text-base font-semibold text-foreground mb-3 block">{t(language, 'saalabour.agentChain')}</Label>
        {agentChain.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Network className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-1">{t(language, 'saalabour.noAgentsInChain')}</p>
              <p className="text-xs text-muted-foreground">{t(language, 'saalabour.selectTypeOrAddManually')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {agentChain.map((step, idx) => {
                    const agent = getAgentById(step.agentId)
                    if (!agent) return null
                    const colors = getAgentColors(agent.color)
                    const AgentIcon = getAgentIcon(agent.icon)
                    return (
                      <div key={`${step.agentId}-${idx}`} className="flex items-center shrink-0">
                        <div
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                            draggedIdx === idx
                              ? 'border-emerald-500 shadow-lg scale-105 opacity-80'
                              : `${colors.border} ${colors.bg}`
                          }`}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                          <AgentIcon className={`w-5 h-5 ${colors.text}`} />
                          <div>
                            <p className={`text-sm font-medium ${colors.text}`}>{agent.name.replace('Agent ', '')}</p>
                            <p className="text-[10px] text-muted-foreground">{t(language, step.action)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 ml-1 text-muted-foreground hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); handleRemoveAgent(idx) }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {idx < agentChain.length - 1 && (
                          <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground/50" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedType === 'custom' && availableAgents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t(language, 'saalabour.addAgent')}</Label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {availableAgents.map(agent => {
                    const colors = getAgentColors(agent.color)
                    const AgentIcon = getAgentIcon(agent.icon)
                    return (
                      <button
                        key={agent.id}
                        onClick={() => handleAddAgent(agent.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 ${colors.pill}`}
                      >
                        <AgentIcon className="w-3.5 h-3.5" />
                        {agent.name.replace('Agent ', '')}
                        <Plus className="w-3 h-3 opacity-60" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onBack}>{t(language, 'saalabour.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedType || !title.trim() || agentChain.length === 0 || isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t(language, 'saalabour.creating')}</>
          ) : (
            <><Rocket className="w-4 h-4 mr-2" /> {t(language, 'saalabour.createMissionBtn')}</>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Tab: Mission Detail
// ============================================================================
function MissionDetailTab({
  mission,
  onBack,
  onLaunch,
}: {
  mission: Mission
  onBack: () => void
  onLaunch: () => void
}) {
  const { language } = useCVStore()
  const statusStyle = STATUS_STYLES[mission.status]
  const priorityStyle = PRIORITY_STYLES[mission.priority]
  const typeInfo = MISSION_TYPES.find(mt => mt.type === mission.type)
  const StatusIcon = statusStyle.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{mission.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`text-[10px] ${statusStyle.color}`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${mission.status === 'running' ? 'animate-spin' : ''}`} />
              {t(language, statusStyle.label)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{t(language, typeInfo?.label || mission.type)}</Badge>
            <Badge className={`text-[10px] ${priorityStyle.color}`}>
              {t(language, 'saalabour.priority')}: {t(language, priorityStyle.label)}
            </Badge>
          </div>
        </div>
        {mission.status === 'pending' && (
          <Button onClick={onLaunch} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Rocket className="w-4 h-4 mr-2" />
            {t(language, 'saalabour.launch')}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t(language, 'saalabour.globalProgression')}</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{mission.progress}%</span>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
          >
            <Progress value={mission.progress} className="h-3" />
          </motion.div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t(language, 'saalabour.objective')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{mission.description || t(language, 'saalabour.noDescription')}</p>
        </CardContent>
      </Card>

      {/* Agent Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t(language, 'saalabour.pipeline')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {mission.agentChain.map((step, idx) => {
            const agent = getAgentById(step.agentId)
            if (!agent) return null
            const colors = getAgentColors(agent.color)
            const AgentIcon = getAgentIcon(agent.icon)
            const isLast = idx === mission.agentChain.length - 1
            const isRunning = step.status === 'running'

            return (
              <div key={idx} className="relative">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4 py-4"
                >
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : step.status === 'running'
                          ? 'bg-sky-100 dark:bg-sky-900/40 ring-2 ring-sky-300 dark:ring-sky-700'
                          : step.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-spin" />
                      ) : step.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 min-h-[2rem] mt-1 ${
                        step.status === 'completed'
                          ? 'bg-emerald-300 dark:bg-emerald-700'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </div>

                  <div className={`flex-1 p-4 rounded-xl border mb-2 transition-all ${
                    isRunning
                      ? `${colors.border} ${colors.bg} shadow-md`
                      : 'border-border bg-card'
                  }`}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        <AgentIcon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{t(language, 'saalabour.step')} {idx + 1} — {t(language, step.action)}</p>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_STYLES[step.status].color}`}>
                        {step.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {t(language, STATUS_STYLES[step.status].label)}
                      </Badge>
                    </div>
                    {step.duration && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{t(language, 'saalabour.duration')}: {step.duration}</span>
                      </div>
                    )}
                    {isRunning && (
                      <motion.div
                        className="mt-2 h-1 rounded-full bg-sky-200 dark:bg-sky-800 overflow-hidden"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <div className="h-full w-1/3 bg-sky-500 rounded-full" style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {mission.status === 'completed' && mission.result && (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              {t(language, 'saalabour.result')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{mission.result}</p>
          </CardContent>
        </Card>
      )}

      {mission.status === 'failed' && (
        <Card className="border-red-300 dark:border-red-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-300">
              <XCircle className="w-5 h-5" />
              {t(language, 'saalabour.missionFailed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(language, 'saalabour.missionFailedDesc')}
            </p>
            <Button
              variant="outline"
              className="mt-3 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={onLaunch}
            >
              <Rocket className="w-4 h-4 mr-2" />
              {t(language, 'saalabour.retry')}
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}


