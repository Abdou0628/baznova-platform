/* eslint-disable react-hooks/static-components */
'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Search, Star, Zap, Clock, CheckCircle2, ArrowRight,
  TrendingUp, Users, Briefcase, Shield, ChevronDown, Filter,
  X, Heart, Eye, Flame, Award, Sparkles, ArrowLeft, ExternalLink,
  MessageSquare, Activity, BarChart3, CircleDollarSign, ThumbsUp,
  SlidersHorizontal, Grid3X3, LayoutList, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AGENTS, getAgentById, CTO_PRINCIPAL,
  type AgentDefinition, type AgentTier, type AgentCategory,
} from '@/lib/agent-registry'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

// --- Icon Map ---
const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Search, MessageCircle, Linkedin, UserCheck, Compass, Bot, BookOpen,
  Briefcase, Laptop, Globe, Code2, Brain, Plane, MessageSquare,
  GraduationCap, Store, Building2, Scale, Network, Megaphone, CreditCard,
}

function getAgentIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Bot
}

// --- Color Map ---
const AGENT_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string; pill: string; ring: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    gradient: 'from-emerald-500 to-teal-600',
  },
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    ring: 'ring-sky-200 dark:ring-sky-800',
    gradient: 'from-sky-500 to-cyan-600',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-300 dark:border-violet-700',
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800',
    ring: 'ring-violet-200 dark:ring-violet-800',
    gradient: 'from-violet-500 to-purple-600',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    ring: 'ring-amber-200 dark:ring-amber-800',
    gradient: 'from-amber-500 to-orange-600',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
    pill: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    ring: 'ring-rose-200 dark:ring-rose-800',
    gradient: 'from-rose-500 to-pink-600',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-700',
    dot: 'bg-teal-500',
    pill: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
    ring: 'ring-teal-200 dark:ring-teal-800',
    gradient: 'from-teal-500 to-emerald-600',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    dot: 'bg-purple-500',
    pill: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    ring: 'ring-purple-200 dark:ring-purple-800',
    gradient: 'from-purple-500 to-violet-600',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
    pill: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
    ring: 'ring-orange-200 dark:ring-orange-800',
    gradient: 'from-orange-500 to-red-600',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800',
    ring: 'ring-red-200 dark:ring-red-800',
    gradient: 'from-red-500 to-rose-600',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    dot: 'bg-slate-500',
    pill: 'bg-slate-50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    ring: 'ring-slate-200 dark:ring-slate-700',
    gradient: 'from-slate-500 to-gray-600',
  },
}

function getAgentColors(color: string) {
  return AGENT_COLOR_MAP[color] || AGENT_COLOR_MAP.slate
}

// --- Unit label translation key mapping ---
const UNIT_LABEL_KEYS: Record<string, string> = {
  'CV generated': 'saalabourMp.unitCvGenerated',
  'ATS analysis': 'saalabourMp.unitAtsAnalysis',
  'simulation session': 'saalabourMp.unitSimulationSession',
  'profile optimization': 'saalabourMp.unitProfileOptimization',
  'career plan': 'saalabourMp.unitCareerPlan',
  'coaching session': 'saalabourMp.unitCoachingSession',
  'certification path': 'saalabourMp.unitCertificationPath',
  'job match': 'saalabourMp.unitJobMatch',
  'candidate sourced': 'saalabourMp.unitCandidateSourced',
  'mission matched': 'saalabourMp.unitMissionMatched',
  'intl placement': 'saalabourMp.unitIntlPlacement',
  'API call (1K)': 'saalabourMp.unitApiCall',
  'intelligence report': 'saalabourMp.unitIntelligenceReport',
  'mobility dossier': 'saalabourMp.unitMobilityDossier',
  'conversation': 'saalabourMp.unitConversation',
  'workshop session': 'saalabourMp.unitWorkshopSession',
  'community action': 'saalabourMp.unitCommunityAction',
  'white-label setup': 'saalabourMp.unitWhiteLabelSetup',
  'legal document': 'saalabourMp.unitLegalDocument',
  'transaction': 'saalabourMp.unitTransaction',
  'task': 'saalabourMp.unitTask',
}

function translateUnitLabel(lang: string, unit: string): string {
  const key = UNIT_LABEL_KEYS[unit]
  return key ? t(lang as 'fr' | 'en' | 'ar' | 'es', key) : unit
}

// --- Marketplace Types ---
interface MarketplaceAgent extends AgentDefinition {
  pricePerUnit: number
  currency: string
  unitLabel: string
  rating: number
  reviewCount: number
  tasksCompleted: number
  availability: 'available' | 'busy' | 'offline'
  hireCount: number
  isFeatured: boolean
  isTopRated: boolean
  completionRate: number
  avgDeliveryTime: string
  tags: string[]
}

// --- Generate marketplace data from agent registry ---
function generateMarketplaceData(): MarketplaceAgent[] {
  const pricing: Record<string, { price: number; unit: string }> = {
    cv:           { price: 0.50, unit: 'CV generated' },
    ats:          { price: 0.30, unit: 'ATS analysis' },
    interview:    { price: 1.20, unit: 'simulation session' },
    linkedin:     { price: 0.80, unit: 'profile optimization' },
    career:       { price: 0.90, unit: 'career plan' },
    coach:        { price: 1.50, unit: 'coaching session' },
    formation:    { price: 2.00, unit: 'certification path' },
    jobs:         { price: 0.20, unit: 'job match' },
    recruiter:    { price: 1.00, unit: 'candidate sourced' },
    freelance:    { price: 0.60, unit: 'mission matched' },
    global:       { price: 1.80, unit: 'intl placement' },
    api:          { price: 0.10, unit: 'API call (1K)' },
    intelligence: { price: 0.70, unit: 'intelligence report' },
    mobility:     { price: 2.50, unit: 'mobility dossier' },
    chatbot:      { price: 0.15, unit: 'conversation' },
    campus:       { price: 0.40, unit: 'workshop session' },
    marketplace:  { price: 0.35, unit: 'community action' },
    whiteLabel:   { price: 5.00, unit: 'white-label setup' },
    legal:        { price: 1.50, unit: 'legal document' },
    payment:      { price: 0.05, unit: 'transaction' },
  }

  const tags: Record<string, string[]> = {
    cv:           ['ATS-Friendly', 'Multi-language', 'PDF Export', 'Professional'],
    ats:          ['Keyword Optimization', 'Scoring', 'Compliance', 'Instant'],
    interview:    ['Real-time Feedback', 'STAR Method', 'Role Play', 'Technical'],
    linkedin:     ['Headline', 'About Section', 'SEO', 'Networking'],
    career:       ['Roadmap', 'Skills Gap', 'Market Trends', 'Goal Setting'],
    coach:        ['Personalized', 'Goal Tracking', 'Accountability', '24/7'],
    formation:    ['Certified', 'Self-Paced', 'Hands-on', 'Industry-Ready'],
    jobs:         ['AI Matching', 'Smart Alerts', 'Multi-Source', 'Fast Apply'],
    recruiter:    ['Pipeline', 'Scoring', 'Bulk Actions', 'Analytics'],
    freelance:    ['Mission Matching', 'Proposals', 'Contracts', 'Escrow'],
    global:       ['4 Languages', 'Visa Support', 'Cultural Fit', 'Compliance'],
    api:          ['RESTful', 'Webhooks', 'Rate Limits', 'Documentation'],
    intelligence: ['Salary Data', 'Trends', 'Forecasts', 'Benchmarking'],
    mobility:     ['OCR', 'Document Translation', 'Country-Specific', 'Fast-Track'],
    chatbot:      ['Multi-lingual', 'Context-Aware', '24/7', '4 Languages'],
    campus:       ['Universities', 'Workshops', 'Student Plans', 'Partnerships'],
    marketplace:  ['Community', 'Events', 'Networking', 'Profiles'],
    whiteLabel:   ['Full Branding', 'Custom Domain', 'SSO', 'API Access'],
    legal:        ['GDPR', 'Contracts', 'Templates', 'Compliance'],
    payment:      ['Stripe', 'Multi-Provider', 'Invoicing', 'Tax (IS 30%)'],
  }

  const seed = (id: string) => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  return AGENTS.map(agent => {
    const s = seed(agent.id)
    const p = pricing[agent.id] || { price: 0.50, unit: 'task' }
    return {
      ...agent,
      pricePerUnit: p.price,
      currency: '€',
      unitLabel: p.unit,
      rating: 3.8 + (s % 17) / 10,
      reviewCount: 40 + (s % 350),
      tasksCompleted: 500 + (s % 9500),
      availability: (['available', 'available', 'available', 'busy', 'available', 'offline'] as const)[s % 6],
      hireCount: 200 + (s % 4800),
      isFeatured: ['cv', 'recruiter', 'coach', 'intelligence'].includes(agent.id),
      isTopRated: (s % 5) === 0,
      completionRate: 88 + (s % 12),
      avgDeliveryTime: agent.avgResponseTime,
      tags: tags[agent.id] || ['AI-Powered', 'Reliable'],
    }
  })
}

const MARKETPLACE_AGENTS = generateMarketplaceData()

// --- Category definitions ---
const CATEGORIES: { value: AgentCategory | 'all'; label: string; icon: React.ElementType; desc: string; count: number }[] = [
  { value: 'all', label: 'All Agents', icon: Grid3X3, desc: 'Browse the complete workforce', count: MARKETPLACE_AGENTS.length },
  { value: 'candidate', label: 'Candidate Layer', icon: Users, desc: 'Individual-facing AI agents', count: MARKETPLACE_AGENTS.filter(a => a.category === 'candidate').length },
  { value: 'employment', label: 'Employment Layer', icon: Briefcase, desc: 'Professional & enterprise agents', count: MARKETPLACE_AGENTS.filter(a => a.category === 'employment').length },
  { value: 'platform', label: 'Platform Layer', icon: Shield, desc: 'System & infrastructure agents', count: MARKETPLACE_AGENTS.filter(a => a.category === 'platform').length },
]

// --- Tier styling ---
const TIER_CONFIG: Record<AgentTier, { label: string; badge: string; icon: React.ElementType }> = {
  principal: { label: 'Principal', badge: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0', icon: Award },
  specialized: { label: 'Specialized', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: Star },
  support: { label: 'Support', badge: 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: Bot },
}

// --- Sort options ---
type SortOption = 'featured' | 'rating' | 'price_low' | 'price_high' | 'popular' | 'newest'
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low → High' },
  { value: 'price_high', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Hired' },
  { value: 'newest', label: 'Newest' },
]

// --- Availability status ---
const AVAILABILITY_CONFIG = {
  available: { label: 'Available Now', color: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800', pulse: true },
  busy: { label: 'Busy', color: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800', pulse: false },
  offline: { label: 'Offline', color: 'bg-slate-300 dark:bg-slate-600', ring: 'ring-slate-200 dark:ring-slate-700', pulse: false },
}

// --- Reviews mock data ---
const MOCK_REVIEWS = [
  { author: 'Sarah M.', rating: 5, text: 'Excellent agent! Generated a perfect CV in seconds.', time: '2 days ago' },
  { author: 'Omar K.', rating: 5, text: 'The ATS analysis was incredibly accurate. Highly recommend.', time: '5 days ago' },
  { author: 'Claire D.', rating: 4, text: 'Very fast and professional. Will use again.', time: '1 week ago' },
  { author: 'Youssef B.', rating: 5, text: 'Saved me hours of work. The quality is outstanding.', time: '2 weeks ago' },
  { author: 'Layla T.', rating: 4, text: 'Good value for money. Responsive and accurate.', time: '3 weeks ago' },
]

// --- Translation key mappings for dynamic labels ---
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  all: 'saalabourMp.catAll',
  candidate: 'saalabourMp.catCandidate',
  employment: 'saalabourMp.catEmployment',
  platform: 'saalabourMp.catPlatform',
}

const SORT_LABEL_KEYS: Record<string, string> = {
  featured: 'saalabourMp.sortFeatured',
  rating: 'saalabourMp.sortHighestRated',
  price_low: 'saalabourMp.sortPriceLow',
  price_high: 'saalabourMp.sortPriceHigh',
  popular: 'saalabourMp.sortMostHired',
  newest: 'saalabourMp.sortNewest',
}

const TIER_LABEL_KEYS: Record<string, string> = {
  principal: 'saalabourMp.principal',
  specialized: 'saalabourMp.specialized',
  support: 'saalabourMp.support',
}

const AVAIL_LABEL_KEYS: Record<string, string> = {
  available: 'saalabourMp.availableNow',
  busy: 'saalabourMp.busy',
  offline: 'saalabourMp.offline',
}

// ============================================================================
// Main Export
// ============================================================================
export default function SaalabourMarketplace() {
  const { language } = useCVStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10])
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // --- Filtering & Sorting ---
  const filteredAgents = useMemo(() => {
    let agents = [...MARKETPLACE_AGENTS]

    // Category filter
    if (selectedCategory !== 'all') {
      agents = agents.filter(a => a.category === selectedCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q) ||
        a.description.en.toLowerCase().includes(q) ||
        a.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // Price filter
    agents = agents.filter(a => a.pricePerUnit >= priceRange[0] && a.pricePerUnit <= priceRange[1])

    // Sorting
    switch (sortBy) {
      case 'featured':
        agents.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating)
        break
      case 'rating':
        agents.sort((a, b) => b.rating - a.rating)
        break
      case 'price_low':
        agents.sort((a, b) => a.pricePerUnit - b.pricePerUnit)
        break
      case 'price_high':
        agents.sort((a, b) => b.pricePerUnit - a.pricePerUnit)
        break
      case 'popular':
        agents.sort((a, b) => b.hireCount - a.hireCount)
        break
      case 'newest':
        // For demo, reverse the default order
        agents.sort((a, b) => a.id.localeCompare(b.id))
        break
    }

    return agents
  }, [searchQuery, selectedCategory, sortBy, priceRange])

  const featuredAgents = useMemo(() =>
    MARKETPLACE_AGENTS.filter(a => a.isFeatured),
  [])

  const toggleFavorite = useCallback((agentId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
        toast(t(language, 'saalabourMp.removedFromFavs'))
      } else {
        next.add(agentId)
        toast(t(language, 'saalabourMp.addedToFavs'))
      }
      return next
    })
  }, [language])

  const handleHire = useCallback((agent: MarketplaceAgent) => {
    toast.success(
      t(language, 'saalabourMp.missionInitiated').replace('{name}', agent.name),
      {
        description: t(language, 'saalabourMp.charged').replace('{price}', `${agent.currency}${agent.pricePerUnit.toFixed(2)}`).replace('{unit}', translateUnitLabel(language, agent.unitLabel)),
      }
    )
  }, [language])

  // --- Marketplace stats ---
  const totalTasks = MARKETPLACE_AGENTS.reduce((s, a) => s + a.tasksCompleted, 0)
  const avgRating = (MARKETPLACE_AGENTS.reduce((s, a) => s + a.rating, 0) / MARKETPLACE_AGENTS.length).toFixed(1)
  const availableCount = MARKETPLACE_AGENTS.filter(a => a.availability === 'available').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ===== HERO SECTION ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white"
        >
          {/* Decorative grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative px-8 sm:px-12 py-10 sm:py-14">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {t(language, 'saalabourMp.badge')}
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                  {t(language, 'saalabourMp.heroTitle')}{' '}
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    {t(language, 'saalabourMp.heroTitleHighlight')}
                  </span>
                </h1>
                <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                  {t(language, 'saalabourMp.heroDesc').replace('{count}', String(MARKETPLACE_AGENTS.length))}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t(language, 'saalabourMp.payPerUnit')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t(language, 'saalabourMp.noSubscription')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t(language, 'saalabourMp.instantDelivery')}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                {[
                  { label: t(language, 'saalabourMp.statAgents'), value: MARKETPLACE_AGENTS.length, icon: Bot },
                  { label: t(language, 'saalabourMp.statTasks'), value: `${(totalTasks / 1000).toFixed(0)}K+`, icon: CheckCircle2 },
                  { label: t(language, 'saalabourMp.statRating'), value: `${avgRating}`, icon: Star },
                  { label: t(language, 'saalabourMp.statAvailable'), value: availableCount, icon: Zap },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-4"
                  >
                    <stat.icon className="w-4 h-4 text-emerald-400 mb-2" />
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===== FEATURED AGENTS MARQUEE ===== */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t(language, 'saalabourMp.featuredAgents')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {featuredAgents.map((agent, i) => {
              const colors = getAgentColors(agent.color)
              const AgentIcon = getAgentIcon(agent.icon)
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ y: -3 }}
                  className="shrink-0"
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 w-[200px] sm:w-[220px] border hover:border-emerald-300 dark:hover:border-emerald-700 group"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-sm`}>
                          <AgentIcon className="w-6 h-6 text-white" />
                        </div>
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          <Flame className="w-3 h-3 mr-0.5" /> {t(language, 'saalabourMp.featured')}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{agent.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{agent.module}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-foreground">{agent.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({agent.reviewCount})</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-lg font-bold text-foreground">{agent.currency}{agent.pricePerUnit.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground block">{t(language, 'saalabourMp.per')} {translateUnitLabel(language, agent.unitLabel)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${AVAILABILITY_CONFIG[agent.availability].color}`} />
                          <span className="text-[10px] text-muted-foreground">{t(language, AVAIL_LABEL_KEYS[agent.availability] || 'saalabourMp.availableNow')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* ===== SEARCH & FILTERS ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Search bar + actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t(language, 'saalabourMp.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white dark:bg-slate-900"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="h-11 gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t(language, 'saalabourMp.filters')}
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-11 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{t(language, SORT_LABEL_KEYS[opt.value] || 'saalabourMp.sortFeatured')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden sm:flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Category pills + active filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat.value
                const CatIcon = cat.icon
                return (
                  <Button
                    key={cat.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`gap-1.5 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {t(language, CATEGORY_LABEL_KEYS[cat.value] || 'saalabourMp.catAll')}
                    <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                      ({cat.count})
                    </span>
                  </Button>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredAgents.length}</span> {t(language, 'saalabourMp.agentsFound')}
            </p>
          </div>

          {/* Expandable filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Price Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t(language, 'saalabourMp.priceRange')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder={t(language, 'saalabourMp.min')}
                          value={priceRange[0] || ''}
                          onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                          className="h-9"
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="number"
                          placeholder={t(language, 'saalabourMp.max')}
                          value={priceRange[1] || ''}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 999])}
                          className="h-9"
                        />
                      </div>
                    </div>
                    {/* Availability */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t(language, 'saalabourMp.availability')}</Label>
                      <Select value="all" onValueChange={() => {}}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t(language, 'saalabourMp.all')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t(language, 'saalabourMp.allStatuses')}</SelectItem>
                          <SelectItem value="available">{t(language, 'saalabourMp.availableNow')}</SelectItem>
                          <SelectItem value="busy">{t(language, 'saalabourMp.busy')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Tier */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t(language, 'saalabourMp.tier')}</Label>
                      <Select value="all" onValueChange={() => {}}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t(language, 'saalabourMp.all')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t(language, 'saalabourMp.allTiers')}</SelectItem>
                          <SelectItem value="specialized">{t(language, 'saalabourMp.specialized')}</SelectItem>
                          <SelectItem value="support">{t(language, 'saalabourMp.support')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Reset */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        className="w-full h-9"
                        onClick={() => {
                          setPriceRange([0, 10])
                          setSearchQuery('')
                          setSelectedCategory('all')
                          setSortBy('featured')
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t(language, 'saalabourMp.clearAllFilters')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ===== AGENT GRID / LIST ===== */}
        <section>
          {filteredAgents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="border-dashed">
                <CardContent className="p-12 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{t(language, 'saalabourMp.noAgentsFound')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t(language, 'saalabourMp.noAgentsDesc')}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('all')
                      setPriceRange([0, 10])
                    }}
                  >
                    {t(language, 'saalabourMp.clearFilters')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent, i) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  index={i}
                  isFavorite={favorites.has(agent.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelect={setSelectedAgent}
                  onHire={handleHire}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAgents.map((agent, i) => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  index={i}
                  isFavorite={favorites.has(agent.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelect={setSelectedAgent}
                  onHire={handleHire}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== MARKETPLACE FOOTER ===== */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="border-t pt-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-semibold text-foreground">{t(language, 'saalabourMp.payPerUnitFooter')}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(language, 'saalabourMp.payPerUnitDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-semibold text-foreground">{t(language, 'saalabourMp.qualityGuaranteed')}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(language, 'saalabourMp.qualityDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="font-semibold text-foreground">{t(language, 'saalabourMp.realTimeTracking')}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(language, 'saalabourMp.trackingDesc')}
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ===== AGENT DETAIL SHEET ===== */}
      <Sheet open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedAgent && (
            <AgentDetailSheet
              agent={selectedAgent}
              isFavorite={favorites.has(selectedAgent.id)}
              onToggleFavorite={toggleFavorite}
              onHire={handleHire}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ============================================================================
// Agent Card (Grid View)
// ============================================================================
function AgentCard({
  agent, index, isFavorite, onToggleFavorite, onSelect, onHire,
}: {
  agent: MarketplaceAgent
  index: number
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onSelect: (agent: MarketplaceAgent) => void
  onHire: (agent: MarketplaceAgent) => void
}) {
  const { language } = useCVStore()
  const colors = getAgentColors(agent.color)
  const AgentIcon = getAgentIcon(agent.icon)
  const TierIcon = TIER_CONFIG[agent.tier].icon
  const avail = AVAILABILITY_CONFIG[agent.availability]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6) }}
      whileHover={{ y: -3 }}
      layout
    >
      <Card className="h-full hover:shadow-lg transition-all duration-200 border hover:border-emerald-300 dark:hover:border-emerald-700 group overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1 bg-gradient-to-r ${colors.gradient}`} />
        <CardContent className="p-5 space-y-4">
          {/* Header: Avatar + Name + Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-sm`}
                >
                  <AgentIcon className="w-6 h-6 text-white" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${avail.color} ${avail.pulse ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                    {agent.name}
                  </h3>
                  {agent.isTopRated && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>{t(language, 'saalabourMp.topRatedTooltip')}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{agent.module}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(agent.id) }}
            >
              <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
            </Button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {agent.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                {tag}
              </Badge>
            ))}
            {agent.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal">
                +{agent.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {agent.description[language]}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-foreground">{agent.rating.toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{agent.reviewCount} {t(language, 'saalabourMp.reviews')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm font-bold text-foreground">{agent.tasksCompleted.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{t(language, 'saalabourMp.tasksDone')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm font-bold text-foreground">{agent.completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">{t(language, 'saalabourMp.successRate')}</p>
            </div>
          </div>

          {/* Capabilities preview */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t(language, 'saalabourMp.capabilities')}</p>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.map(cap => (
                <span key={cap.key} className={`text-[10px] px-2 py-0.5 rounded-full ${colors.pill}`}>
                  {cap.label[language]}
                </span>
              ))}
            </div>
          </div>

          {/* Footer: Price + Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{agent.currency}{agent.pricePerUnit.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">/ {translateUnitLabel(language, agent.unitLabel)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {t(language, 'saalabourMp.avgPerUnit').replace('{time}', agent.avgDeliveryTime)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onSelect(agent)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {t(language, 'saalabourMp.view')}
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                onClick={() => onHire(agent)}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                {t(language, 'saalabourMp.hire')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Agent List Item
// ============================================================================
function AgentListItem({
  agent, index, isFavorite, onToggleFavorite, onSelect, onHire,
}: {
  agent: MarketplaceAgent
  index: number
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onSelect: (agent: MarketplaceAgent) => void
  onHire: (agent: MarketplaceAgent) => void
}) {
  const { language } = useCVStore()
  const colors = getAgentColors(agent.color)
  const AgentIcon = getAgentIcon(agent.icon)
  const avail = AVAILABILITY_CONFIG[agent.availability]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      layout
    >
      <Card className="hover:shadow-md transition-all duration-200 border hover:border-emerald-300 dark:hover:border-emerald-700 group">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-sm`}>
                <AgentIcon className="w-7 h-7 text-white" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${avail.color}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {agent.name}
                </h3>
                <Badge className={`text-[10px] shrink-0 ${TIER_CONFIG[agent.tier].badge}`}>
                  {t(language, TIER_LABEL_KEYS[agent.tier] || 'saalabourMp.principal')}
                </Badge>
                {agent.isFeatured && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <Flame className="w-3 h-3 mr-0.5" /> {t(language, 'saalabourMp.featured')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{agent.description[language]}</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.tags.slice(0, 4).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold">{agent.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({agent.reviewCount})</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">{agent.currency}{agent.pricePerUnit.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block">{t(language, 'saalabourMp.per')} {translateUnitLabel(language, agent.unitLabel)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onToggleFavorite(agent.id)}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                onClick={() => onHire(agent)}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                {t(language, 'saalabourMp.hire')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Agent Detail Sheet
// ============================================================================
function AgentDetailSheet({
  agent, isFavorite, onToggleFavorite, onHire,
}: {
  agent: MarketplaceAgent
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onHire: (agent: MarketplaceAgent) => void
}) {
  const { language } = useCVStore()
  const colors = getAgentColors(agent.color)
  const AgentIcon = getAgentIcon(agent.icon)
  const avail = AVAILABILITY_CONFIG[agent.availability]
  const TierIcon = TIER_CONFIG[agent.tier].icon

  const collaborationAgents = agent.collaborations
    .map(c => getAgentById(c.agentId))
    .filter(Boolean) as AgentDefinition[]

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <SheetHeader className="text-left space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-lg`}>
              <AgentIcon className="w-8 h-8 text-white" />
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${avail.color} ${avail.pulse ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl">{agent.name}</SheetTitle>
            <SheetDescription className="mt-1">{agent.module}</SheetDescription>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge className={`text-[10px] ${TIER_CONFIG[agent.tier].badge}`}>
                <TierIcon className="w-3 h-3 mr-0.5" />
                {t(language, TIER_LABEL_KEYS[agent.tier] || 'saalabourMp.principal')}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {t(language, CATEGORY_LABEL_KEYS[agent.category] || 'saalabourMp.catAll')} {t(language, 'saalabourMp.layer')}
              </Badge>
              {agent.isFeatured && (
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <Flame className="w-3 h-3 mr-0.5" /> {t(language, 'saalabourMp.featured')}
                </Badge>
              )}
              {agent.isTopRated && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Award className="w-3 h-3 mr-0.5" /> {t(language, 'saalabourMp.topRated')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SheetHeader>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t(language, 'saalabourMp.statRatingLabel'), value: agent.rating.toFixed(1), sub: `${agent.reviewCount} ${t(language, 'saalabourMp.reviews')}`, icon: Star, accent: 'text-amber-500' },
          { label: t(language, 'saalabourMp.statTasksDone'), value: agent.tasksCompleted.toLocaleString(), sub: t(language, 'saalabourMp.totalCompleted'), icon: CheckCircle2, accent: 'text-emerald-500' },
          { label: t(language, 'saalabourMp.statSuccessRate'), value: `${agent.completionRate}%`, sub: t(language, 'saalabourMp.completion'), icon: TrendingUp, accent: 'text-teal-500' },
          { label: t(language, 'saalabourMp.statResponse'), value: agent.avgDeliveryTime, sub: t(language, 'saalabourMp.avgTime'), icon: Clock, accent: 'text-violet-500' },
        ].map(stat => (
          <div key={stat.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${stat.accent}`} />
            <p className="text-base font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className={`rounded-xl border ${colors.border} p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CircleDollarSign className={`w-4 h-4 ${colors.text}`} />
            {t(language, 'saalabourMp.pricingTitle')}
          </h3>
          <Badge className={`${colors.pill}`}>
            {agent.currency}{agent.pricePerUnit.toFixed(2)} / {translateUnitLabel(language, agent.unitLabel)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(language, 'saalabourMp.pricingDesc').replace('{unit}', agent.unitLabel.toLowerCase())}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 text-center">
            <p className="text-xs text-muted-foreground">{t(language, 'saalabourMp.1unit')}</p>
            <p className="font-bold text-sm text-foreground">{agent.currency}{agent.pricePerUnit.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 text-center ring-2 ring-emerald-200 dark:ring-emerald-800">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t(language, 'saalabourMp.10units')}</p>
            <p className="font-bold text-sm text-foreground">{agent.currency}{(agent.pricePerUnit * 10 * 0.9).toFixed(2)}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t(language, 'saalabourMp.save10')}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 text-center ring-2 ring-amber-200 dark:ring-amber-800">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t(language, 'saalabourMp.50units')}</p>
            <p className="font-bold text-sm text-foreground">{agent.currency}{(agent.pricePerUnit * 50 * 0.8).toFixed(2)}</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">{t(language, 'saalabourMp.save20')}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">{t(language, 'saalabourMp.aboutAgent')}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{agent.description[language]}</p>
      </div>

      {/* Capabilities */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">{t(language, 'saalabourMp.capabilities')}</h3>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map(cap => (
            <span key={cap.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${colors.pill}`}>
              <CheckCircle2 className="w-3 h-3" />
              {cap.label[language]}
            </span>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">{t(language, 'saalabourMp.tags')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {agent.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Collaboration Partners */}
      {collaborationAgents.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">{t(language, 'saalabourMp.collaboratesWith')}</h3>
          <div className="space-y-2">
            {agent.collaborations.map((collab, idx) => {
              const partner = getAgentById(collab.agentId)
              if (!partner) return null
              const partnerColors = getAgentColors(partner.color)
              const PartnerIcon = getAgentIcon(partner.icon)
              return (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${partnerColors.bg}`}>
                    <PartnerIcon className={`w-4 h-4 ${partnerColors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{partner.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{collab.reason[language]}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {collab.type}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t(language, 'saalabourMp.recentReviews')}</h3>
          <span className="text-sm text-muted-foreground">{agent.reviewCount} {t(language, 'saalabourMp.total')}</span>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {MOCK_REVIEWS.map((review, i) => (
            <div key={i} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${colors.bg} ${colors.text}`}>
                    {review.author.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{review.author}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{t(language, `saalabourMp.review${i}Time` as 'saalabourMp.review0Time')}</span>
              </div>
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-3 h-3 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t(language, `saalabourMp.review${i}Text` as 'saalabourMp.review0Text')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={() => onToggleFavorite(agent.id)}
        >
          <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          {isFavorite ? t(language, 'saalabourMp.saved') : t(language, 'saalabourMp.saveAgent')}
        </Button>
        <Button
          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg"
          onClick={() => onHire(agent)}
        >
          <Zap className="w-4 h-4 mr-2" />
          {t(language, 'saalabourMp.hireNow').replace('{price}', `${agent.currency}${agent.pricePerUnit.toFixed(2)}`)}
        </Button>
      </div>
    </div>
  )
}