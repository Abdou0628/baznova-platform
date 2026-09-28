'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Rocket,
  Clock,
  Users,
  Zap,
  Star,
  TrendingUp,
  Briefcase,
  FileText,
  Search,
  UserCheck,
  Compass,
  MessageCircle,
  Linkedin,
  Megaphone,
  BarChart3,
  GraduationCap,
  Target,
  Shield,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGENTS, getAgentById } from '@/lib/agent-registry'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

// --- Types ---
interface MissionTemplate {
  id: string
  title: string
  description: string
  category: 'recrutement' | 'carriere' | 'marketing' | 'analyse' | 'entreprise'
  agentChain: { agentId: string; action: string }[]
  estimatedWU: number
  estimatedTime: string
  difficulty: 'debutant' | 'intermediaire' | 'avance'
  popularity: number // 1-5 stars
  useCount: number
  successRate: number // percentage
  tags: string[]
  featured: boolean
}

interface TemplatesTabProps {
  onBack: () => void
  onUseTemplate: (template: MissionTemplate) => void
}

// --- Color Map (reuse pattern from hub) ---
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

// --- Category Colors ---
const CATEGORY_STYLES: Record<MissionTemplate['category'], { color: string; label: string; pill: string }> = {
  recrutement: {
    color: 'emerald',
    label: 'saalabourTpl.catRecruitment',
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
  },
  carriere: {
    color: 'sky',
    label: 'saalabourTpl.catCareer',
    pill: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-300 dark:border-sky-700',
  },
  marketing: {
    color: 'amber',
    label: 'saalabourTpl.catMarketing',
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
  },
  analyse: {
    color: 'violet',
    label: 'saalabourTpl.catAnalysis',
    pill: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border border-violet-300 dark:border-violet-700',
  },
  entreprise: {
    color: 'rose',
    label: 'saalabourTpl.catEnterprise',
    pill: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
  },
}

// --- Difficulty Styles ---
const DIFFICULTY_STYLES: Record<MissionTemplate['difficulty'], { pill: string; label: string }> = {
  debutant: {
    label: 'saalabourTpl.diffBeginner',
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
  },
  intermediaire: {
    label: 'saalabourTpl.diffIntermediate',
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
  },
  avance: {
    label: 'saalabourTpl.diffAdvanced',
    pill: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
  },
}

// --- Mock Templates ---
const TEMPLATES: MissionTemplate[] = [
  {
    id: 't-1',
    title: 'saalabourTpl.t1.title',
    description: 'saalabourTpl.t1.desc',
    category: 'recrutement',
    agentChain: [
      { agentId: 'recruiter', action: 'saalabourTpl.t1.act1' },
      { agentId: 'jobs', action: 'saalabourTpl.t1.act2' },
      { agentId: 'ats', action: 'saalabourTpl.t1.act3' },
      { agentId: 'cv', action: 'saalabourTpl.t1.act4' },
      { agentId: 'interview', action: 'saalabourTpl.t1.act5' },
    ],
    estimatedWU: 45,
    estimatedTime: '25 min',
    difficulty: 'avance',
    popularity: 5,
    useCount: 342,
    successRate: 96,
    tags: ['saalabourTpl.tag.developpeur', 'saalabourTpl.tag.tech', 'saalabourTpl.tag.fullCycle'],
    featured: true,
  },
  {
    id: 't-2',
    title: 'saalabourTpl.t2.title',
    description: 'saalabourTpl.t2.desc',
    category: 'recrutement',
    agentChain: [
      { agentId: 'cv', action: 'saalabourTpl.t2.act1' },
      { agentId: 'ats', action: 'saalabourTpl.t2.act2' },
    ],
    estimatedWU: 15,
    estimatedTime: '8 min',
    difficulty: 'debutant',
    popularity: 4,
    useCount: 891,
    successRate: 98,
    tags: ['saalabourTpl.tag.cv', 'saalabourTpl.tag.lettre', 'saalabourTpl.tag.ats'],
    featured: false,
  },
  {
    id: 't-3',
    title: 'saalabourTpl.t3.title',
    description: 'saalabourTpl.t3.desc',
    category: 'carriere',
    agentChain: [
      { agentId: 'career', action: 'saalabourTpl.t3.act1' },
      { agentId: 'interview', action: 'saalabourTpl.t3.act2' },
      { agentId: 'cv', action: 'saalabourTpl.t3.act3' },
    ],
    estimatedWU: 28,
    estimatedTime: '18 min',
    difficulty: 'intermediaire',
    popularity: 5,
    useCount: 156,
    successRate: 94,
    tags: ['saalabourTpl.tag.carriere', 'saalabourTpl.tag.plan', 'saalabourTpl.tag.objectifs'],
    featured: true,
  },
  {
    id: 't-4',
    title: 'saalabourTpl.t4.title',
    description: 'saalabourTpl.t4.desc',
    category: 'carriere',
    agentChain: [
      { agentId: 'interview', action: 'saalabourTpl.t4.act1' },
      { agentId: 'career', action: 'saalabourTpl.t4.act2' },
    ],
    estimatedWU: 12,
    estimatedTime: '10 min',
    difficulty: 'debutant',
    popularity: 4,
    useCount: 523,
    successRate: 92,
    tags: ['saalabourTpl.tag.entretien', 'saalabourTpl.tag.coaching', 'saalabourTpl.tag.preparation'],
    featured: false,
  },
  {
    id: 't-5',
    title: 'saalabourTpl.t5.title',
    description: 'saalabourTpl.t5.desc',
    category: 'recrutement',
    agentChain: [
      { agentId: 'recruiter', action: 'saalabourTpl.t5.act1' },
      { agentId: 'jobs', action: 'saalabourTpl.t5.act2' },
      { agentId: 'ats', action: 'saalabourTpl.t5.act3' },
    ],
    estimatedWU: 35,
    estimatedTime: '20 min',
    difficulty: 'intermediaire',
    popularity: 4,
    useCount: 267,
    successRate: 91,
    tags: ['saalabourTpl.tag.senior', 'saalabourTpl.tag.sourcing', 'saalabourTpl.tag.executive'],
    featured: false,
  },
  {
    id: 't-6',
    title: 'saalabourTpl.t6.title',
    description: 'saalabourTpl.t6.desc',
    category: 'marketing',
    agentChain: [
      { agentId: 'linkedin', action: 'saalabourTpl.t6.act1' },
      { agentId: 'recruiter', action: 'saalabourTpl.t6.act2' },
      { agentId: 'intelligence', action: 'saalabourTpl.t6.act3' },
    ],
    estimatedWU: 40,
    estimatedTime: '30 min',
    difficulty: 'avance',
    popularity: 3,
    useCount: 89,
    successRate: 87,
    tags: ['saalabourTpl.tag.marqueEmployeur', 'saalabourTpl.tag.contenu', 'saalabourTpl.tag.strategie'],
    featured: false,
  },
  {
    id: 't-7',
    title: 'saalabourTpl.t7.title',
    description: 'saalabourTpl.t7.desc',
    category: 'analyse',
    agentChain: [
      { agentId: 'jobs', action: 'saalabourTpl.t7.act1' },
      { agentId: 'intelligence', action: 'saalabourTpl.t7.act2' },
    ],
    estimatedWU: 8,
    estimatedTime: '5 min',
    difficulty: 'debutant',
    popularity: 4,
    useCount: 445,
    successRate: 95,
    tags: ['saalabourTpl.tag.salaire', 'saalabourTpl.tag.negotiation', 'saalabourTpl.tag.marche'],
    featured: false,
  },
  {
    id: 't-8',
    title: 'saalabourTpl.t8.title',
    description: 'saalabourTpl.t8.desc',
    category: 'carriere',
    agentChain: [
      { agentId: 'linkedin', action: 'saalabourTpl.t8.act1' },
      { agentId: 'cv', action: 'saalabourTpl.t8.act2' },
    ],
    estimatedWU: 10,
    estimatedTime: '7 min',
    difficulty: 'debutant',
    popularity: 5,
    useCount: 678,
    successRate: 97,
    tags: ['saalabourTpl.tag.linkedin', 'saalabourTpl.tag.profil', 'saalabourTpl.tag.reseau'],
    featured: false,
  },
  {
    id: 't-9',
    title: 'saalabourTpl.t9.title',
    description: 'saalabourTpl.t9.desc',
    category: 'recrutement',
    agentChain: [
      { agentId: 'ats', action: 'saalabourTpl.t9.act1' },
      { agentId: 'cv', action: 'saalabourTpl.t9.act2' },
    ],
    estimatedWU: 6,
    estimatedTime: '30 sec',
    difficulty: 'debutant',
    popularity: 4,
    useCount: 1203,
    successRate: 99,
    tags: ['saalabourTpl.tag.express', 'saalabourTpl.tag.scoring', 'saalabourTpl.tag.tri'],
    featured: false,
  },
  {
    id: 't-10',
    title: 'saalabourTpl.t10.title',
    description: 'saalabourTpl.t10.desc',
    category: 'carriere',
    agentChain: [
      { agentId: 'career', action: 'saalabourTpl.t10.act1' },
      { agentId: 'jobs', action: 'saalabourTpl.t10.act2' },
      { agentId: 'intelligence', action: 'saalabourTpl.t10.act3' },
    ],
    estimatedWU: 20,
    estimatedTime: '15 min',
    difficulty: 'intermediaire',
    popularity: 3,
    useCount: 198,
    successRate: 90,
    tags: ['saalabourTpl.tag.strategie', 'saalabourTpl.tag.recherche', 'saalabourTpl.tag.plan'],
    featured: false,
  },
  {
    id: 't-11',
    title: 'saalabourTpl.t11.title',
    description: 'saalabourTpl.t11.desc',
    category: 'entreprise',
    agentChain: [
      { agentId: 'intelligence', action: 'saalabourTpl.t11.act1' },
      { agentId: 'linkedin', action: 'saalabourTpl.t11.act2' },
      { agentId: 'ats', action: 'saalabourTpl.t11.act3' },
    ],
    estimatedWU: 55,
    estimatedTime: '35 min',
    difficulty: 'avance',
    popularity: 4,
    useCount: 67,
    successRate: 88,
    tags: ['saalabourTpl.tag.audit', 'saalabourTpl.tag.diagnostic', 'saalabourTpl.tag.processus'],
    featured: true,
  },
  {
    id: 't-12',
    title: 'saalabourTpl.t12.title',
    description: 'saalabourTpl.t12.desc',
    category: 'entreprise',
    agentChain: [
      { agentId: 'recruiter', action: 'saalabourTpl.t12.act1' },
      { agentId: 'interview', action: 'saalabourTpl.t12.act2' },
      { agentId: 'career', action: 'saalabourTpl.t12.act3' },
    ],
    estimatedWU: 38,
    estimatedTime: '28 min',
    difficulty: 'intermediaire',
    popularity: 3,
    useCount: 45,
    successRate: 85,
    tags: ['saalabourTpl.tag.formation', 'saalabourTpl.tag.equipe', 'saalabourTpl.tag.ia'],
    featured: false,
  },
]

// --- Category filter options ---
const CATEGORIES = [
  { key: 'all', label: 'saalabourTpl.catAll' },
  { key: 'recrutement', label: 'saalabourTpl.catRecruitment' },
  { key: 'carriere', label: 'saalabourTpl.catCareer' },
  { key: 'marketing', label: 'saalabourTpl.catMarketing' },
  { key: 'analyse', label: 'saalabourTpl.catAnalysis' },
  { key: 'entreprise', label: 'saalabourTpl.catEnterprise' },
] as const

type CategoryFilter = (typeof CATEGORIES)[number]['key']

// --- Stars Component ---
function Stars({ count, size = 12 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
        />
      ))}
    </span>
  )
}

// --- Agent Chain Pills ---
function AgentChainPills({ agentChain, compact = false }: { agentChain: MissionTemplate['agentChain']; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : ''}`}>
      {agentChain.map((step, i) => {
        const agent = getAgentById(step.agentId)
        const color = agent?.color ? getAgentColors(agent.color) : getAgentColors('slate')
        const label = agent?.name || step.agentId
        return (
          <span
            key={`${step.agentId}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${color.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
            {compact ? label.replace('Agent ', '') : label}
          </span>
        )
      })}
    </div>
  )
}

// --- Featured Template Card (horizontal scroll) ---
function FeaturedCard({
  template,
  onUse,
  language,
}: {
  template: MissionTemplate
  onUse: (t: MissionTemplate) => void
  language: 'fr' | 'en' | 'ar' | 'es'
}) {
  const catStyle = CATEGORY_STYLES[template.category]
  const colors = getAgentColors(catStyle.color)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-[280px] max-w-[320px] sm:min-w-[300px] sm:max-w-[340px] flex-shrink-0"
    >
      <Card className="h-full overflow-hidden border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Gradient top bar */}
        <div className={`h-1.5 w-full ${colors.dot}`} />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={catStyle.pill}>
              {t(language, catStyle.label)}
            </Badge>
            <Stars count={template.popularity} size={11} />
          </div>
          <CardTitle className="mt-1.5 text-sm leading-snug font-semibold line-clamp-1">
            {template.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {template.description}
          </p>
          <AgentChainPills agentChain={template.agentChain} compact />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap size={11} className={colors.text} />
                <span className="font-medium">{template.estimatedWU} WU</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                <span>{template.estimatedTime}</span>
              </span>
            </div>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium px-3"
              onClick={() => onUse(template)}
            >
              <Sparkles size={11} />
              {t(language, 'saalabourTpl.use')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// --- Template Grid Card ---
function TemplateCard({
  template,
  index,
  onUse,
  language,
}: {
  template: MissionTemplate
  index: number
  onUse: (t: MissionTemplate) => void
  language: 'fr' | 'en' | 'ar' | 'es'
}) {
  const catStyle = CATEGORY_STYLES[template.category]
  const diffStyle = DIFFICULTY_STYLES[template.difficulty]
  const colors = getAgentColors(catStyle.color)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
      className="group"
    >
      <Card className="h-full overflow-hidden border border-border/50 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="outline" className={catStyle.pill}>
              {t(language, catStyle.label)}
            </Badge>
            <Badge variant="outline" className={diffStyle.pill}>
              {t(language, diffStyle.label)}
            </Badge>
          </div>
          <CardTitle className="mt-2 text-base font-bold leading-tight">
            {template.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {template.description}
          </p>

          {/* Agent chain pills */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {t(language, 'saalabourTpl.agentChain')}
              </span>
            </div>
            <AgentChainPills agentChain={template.agentChain} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap size={12} className={colors.text} />
              <span className="font-medium text-foreground">{template.estimatedWU} WU</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-muted-foreground" />
              <span>{template.estimatedTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-emerald-500" />
              <span>{template.successRate}% {t(language, 'saalabourTpl.successRate')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Star size={12} className="text-amber-400" />
              <span>{template.popularity}/5</span>
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-border/60 bg-muted/30 px-2 py-0 text-[10px] font-normal text-muted-foreground hover:bg-muted/50"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Use count + CTA */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground">
              {t(language, 'saalabourTpl.usedTimes').replace('{count}', template.useCount.toLocaleString())}
            </span>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold px-4 transition-colors"
              onClick={() => onUse(template)}
            >
              <Rocket size={13} />
              {t(language, 'saalabourTpl.hireTeam')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// =============================================================================
// Main Component
// =============================================================================
export default function TemplatesTab({ onBack, onUseTemplate }: TemplatesTabProps) {
  const { language } = useCVStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')

  // Translate all templates
  const translatedTemplates = useMemo(() => {
    return TEMPLATES.map((tpl) => ({
      ...tpl,
      title: t(language, tpl.title),
      description: t(language, tpl.description),
      agentChain: tpl.agentChain.map((step) => ({
        ...step,
        action: t(language, step.action),
      })),
      tags: tpl.tags.map((tag) => t(language, tag)),
    }))
  }, [language])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return translatedTemplates.filter((t) => {
      // Category filter
      if (activeCategory !== 'all' && t.category !== activeCategory) return false
      // Search filter
      if (query) {
        return (
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
      return true
    })
  }, [search, activeCategory, translatedTemplates])

  const featuredTemplates = useMemo(
    () => translatedTemplates.filter((t) => t.featured),
    [translatedTemplates]
  )

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: TEMPLATES.length }
    for (const t of TEMPLATES) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    return counts
  }, [])

  const isSearching = search.trim().length > 0

  const handleUseTemplate = (template: MissionTemplate) => {
    toast.success(t(language, 'saalabourTpl.toastActivated').replace('{title}', template.title))
    onUseTemplate(template)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={onBack}
              aria-label={t(language, 'saalabourTpl.back')}
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {t(language, 'saalabourTpl.title')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {t(language, 'saalabourTpl.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        {/* Search Bar */}
        <section aria-label={t(language, 'saalabourTpl.searchLabel')}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={t(language, 'saalabourTpl.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/40 border-border/60 focus-visible:ring-emerald-500/30"
            />
          </div>
          {!isSearching && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{TEMPLATES.length}</span> {t(language, 'saalabourTpl.templatesCount')}
            </p>
          )}
          {isSearching && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filteredTemplates.length}</span>{' '}
              {filteredTemplates.length === 1
                ? t(language, 'saalabourTpl.foundSingular')
                : t(language, 'saalabourTpl.foundPlural').replace('{count}', String(filteredTemplates.length))
              }
            </p>
          )}
        </section>

        {/* Featured Templates (only when not searching) */}
        {!isSearching && featuredTemplates.length > 0 && (
          <section aria-label={t(language, 'saalabourTpl.popularTemplates')}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-amber-500" />
              <h2 className="text-base font-bold">{t(language, 'saalabourTpl.popularTemplates')}</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
              {featuredTemplates.map((ft) => (
                <FeaturedCard key={ft.id} template={ft} onUse={handleUseTemplate} language={language} />
              ))}
            </div>
          </section>
        )}

        {/* Category Filters */}
        <section aria-label={t(language, 'saalabourTpl.categoryFilters')}>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key
              const count = categoryCounts[cat.key] || 0
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border
                    ${
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  {t(language, cat.label)}
                  <span
                    className={`
                      inline-flex items-center justify-center h-4 min-w-4 rounded-full px-1 text-[10px] font-semibold
                      ${
                        isActive
                          ? 'bg-background/20 text-background'
                          : 'bg-muted-foreground/10 text-muted-foreground'
                      }
                    `}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Template Grid */}
        <section aria-label={t(language, 'saalabourTpl.templateList')}>
          <AnimatePresence mode="wait">
            {filteredTemplates.length > 0 ? (
              <motion.div
                key={`${activeCategory}-${search}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              >
                {filteredTemplates.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={i}
                    onUse={handleUseTemplate}
                    language={language}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Compass size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t(language, 'saalabourTpl.noResults')}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {t(language, 'saalabourTpl.noResultsHint')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  )
}
