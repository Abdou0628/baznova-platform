'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Zap, ArrowRight, ArrowLeft, Target, TrendingUp, Users, CreditCard,
  Package, Sparkles, Workflow, ChevronRight, CheckCircle2, Wallet,
  Bot, Lightbulb, BarChart3, Shield, Layers, Route, Gauge,
  CircleDollarSign, Rocket, Clock, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import {
  getAllIntents, getServiceCatalog, getWorkflowTemplates, getNextActions,
  getActionLibrary,
} from '@/lib/orchestration'
import { getOrchestrationTiers } from '@/lib/pricing-policy'
import type { UserIntentCategory, ServiceMode } from '@/lib/orchestration/types'

// ── i18n key maps for backend data ──
const TIER_KEY_MAP: Record<string, string> = {
  self_service: 'orchTier.self_service',
  guided: 'orchTier.guided',
  automated: 'orchTier.automated',
  full_intelligence: 'orchTier.full_intelligence',
  enterprise_orchestration: 'orchTier.enterprise',
}

const NODE_LABEL_MAP: Record<string, string> = {
  generate_cv: 'orchWfNode.generate_cv',
  ats_scan: 'orchWfNode.ats_analysis',
  generate_cl: 'orchWfNode.cover_letter',
  optimize_linkedin: 'orchWfNode.linkedin_boost',
  analyze_offer: 'orchWfNode.analyze_offer',
  match_score: 'orchWfNode.match_score',
  optimize_cv: 'orchWfNode.optimize_cv',
  interview_prep: 'orchWfNode.interview_prep_wf',
  career_advice: 'orchWfNode.career_advice',
  assess: 'orchWfNode.career_assessment',
  create_plan: 'orchWfNode.ai_career_plan',
  recommend: 'orchWfNode.formation_recs',
  coach_session: 'orchWfNode.coaching_session',
  salary_analysis: 'orchWfNode.salary_analysis',
  trend_forecast: 'orchWfNode.ai_trend_forecast',
  opportunities: 'orchWfNode.opportunities',
  post_job: 'orchWfNode.post_job',
  source_candidates: 'orchWfNode.ai_sourcing',
  score_candidates: 'orchWfNode.ai_scoring',
}

// ── Intent → AppStep navigation map ──
const INTENT_STEPS: Record<string, string> = {
  optimize_profile: 'form',
  find_job: 'jobMarket',
  get_hired: 'recruiterHome',
  career_growth: 'careerHome',
  delegate_work: 'saalabourHub',
  analyze_market: 'intelligenceHome',
  manage_team: 'employerDashboard',
  learn_skill: 'formationHome',
  legal_compliance: 'legalHome',
}

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// ── Intent Icons ──
const INTENT_ICONS: Record<string, React.ElementType> = {
  optimize_profile: Target,
  find_job: Route,
  get_hired: Users,
  career_growth: TrendingUp,
  delegate_work: Bot,
  analyze_market: BarChart3,
  manage_team: Layers,
  learn_skill: Lightbulb,
  legal_compliance: Shield,
}

const INTENT_COLORS: Record<string, string> = {
  optimize_profile: 'emerald',
  find_job: 'blue',
  get_hired: 'violet',
  career_growth: 'amber',
  delegate_work: 'rose',
  analyze_market: 'cyan',
  manage_team: 'indigo',
  learn_skill: 'orange',
  legal_compliance: 'slate',
}

// ── Component ──
export default function IntelligentOrchestration() {
  const [activeSection, setActiveSection] = useState<'vision' | 'workflows' | 'pricing' | 'actions'>('vision')
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutTier, setCheckoutTier] = useState<string>('')
  const { language, setStep } = useCVStore()

  const intents = getAllIntents()
  const workflowTemplates = getWorkflowTemplates()
  const orchestrationTiers = getOrchestrationTiers()
  const nextActions = getNextActions({ hasCV: false, hasCoverLetter: false }, 6)
  const actionLibrary = getActionLibrary()

  const simpleActions = actionLibrary.filter(a => a.mode === 'saas_simple')
  const labourActions = actionLibrary.filter(a => a.mode === 'saas_labour')

  const handleIntentClick = (intent: string) => {
    const step = INTENT_STEPS[intent]
    if (step) setStep(step as Parameters<typeof setStep>[0])
  }

  const handleChooseTier = (tierId: string) => {
    setSelectedTier(tierId)
    setCheckoutTier(tierId)
    setCheckoutOpen(true)
  }

  const handleGoToPayment = () => {
    setCheckoutOpen(false)
    setStep('paymentDashboard')
  }

  return (
    <motion.div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Back Button ── */}
      <motion.div variants={itemVariants} className="mb-4 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          {t(language, 'orchVision.backToHome')}
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
          onClick={() => setStep('autonomousDashboard')}
        >
          <Brain className="w-3.5 h-3.5" />
          Entreprise Autonome
        </Button>
      </motion.div>

      {/* ── Hero: The Vision ── */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/20"
          >
            <Brain className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            {t(language, 'orchVision.title')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {t(language, 'orchVision.subtitle')}
          </p>
        </div>

        {/* ── The Equation ── */}
        <Card className="border-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{t(language, 'orchVision.equation')}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { icon: Brain, label: t(language, 'orchVision.understand'), color: 'emerald' },
                { icon: Target, label: t(language, 'orchVision.select'), color: 'teal' },
                { icon: Workflow, label: t(language, 'orchVision.orchestrate'), color: 'cyan' },
                { icon: BarChart3, label: t(language, 'orchVision.measure'), color: 'blue' },
                { icon: Lightbulb, label: t(language, 'orchVision.propose'), color: 'violet' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border"
                  >
                    <step.icon className={`w-4 h-4 text-${step.color}-600 dark:text-${step.color}-400 shrink-0`} />
                    <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{step.label}</span>
                  </motion.div>
                  {i < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0 hidden sm:block" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Commercial Flow Model ── */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card className="border-0 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-fuchsia-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{t(language, 'orchVision.commercialModel')}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { icon: Users, label: '1 ' + t(language, 'orchVision.user'), color: 'violet' },
                { icon: CreditCard, label: '1 ' + t(language, 'orchVision.subscription'), color: 'purple' },
                { icon: Package, label: 'N ' + t(language, 'orchVision.services'), color: 'fuchsia' },
                { icon: Zap, label: 'N ' + t(language, 'orchVision.usages'), color: 'pink' },
                { icon: TrendingUp, label: t(language, 'orchVision.moreValue'), color: 'emerald' },
                { icon: Shield, label: t(language, 'orchVision.betterRetention'), color: 'teal' },
                { icon: CircleDollarSign, label: t(language, 'orchVision.betterProfitability'), color: 'emerald' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm border ${
                      i >= 4
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <step.icon className={`w-4 h-4 shrink-0 ${i >= 4 ? 'text-emerald-600 dark:text-emerald-400' : `text-${step.color}-600 dark:text-${step.color}-400`}`} />
                    <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${i >= 4 ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{step.label}</span>
                  </motion.div>
                  {i < 6 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0 hidden sm:block" />}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 max-w-lg mx-auto">
              {t(language, 'orchVision.commercialDesc')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section Tabs ── */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
        {([
          { key: 'vision' as const, icon: Eye, label: t(language, 'orchVision.tabVision') },
          { key: 'workflows' as const, icon: Workflow, label: t(language, 'orchVision.tabWorkflows') },
          { key: 'pricing' as const, icon: CircleDollarSign, label: t(language, 'orchVision.tabPricing') },
          { key: 'actions' as const, icon: Lightbulb, label: t(language, 'orchVision.tabActions') },
        ]).map(tab => (
          <Button
            key={tab.key}
            variant={activeSection === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection(tab.key)}
            className={`gap-1.5 ${activeSection === tab.key ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {/* ── Section Content ── */}
      <AnimatePresence mode="wait">
        {/* ── VISION TAB ── */}
        {activeSection === 'vision' && (
          <motion.div key="vision" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SaaS Simple */}
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-lg p-2">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {t(language, 'orchVision.saasSimple')}
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-[10px] ml-auto">
                      {simpleActions.length} {t(language, 'orchVision.actions')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">{t(language, 'orchVision.saasSimpleDesc')}</p>
                  {simpleActions.slice(0, 5).map(action => (
                    <div key={action.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium flex-1">{t(language, `orchAction.${action.id}_title` as Parameters<typeof t>[1])}</span>
                      <span className="text-[10px] text-muted-foreground">{action.impact}%</span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {t(language, 'orchVision.includedInPlan')}
                  </div>
                </CardContent>
              </Card>

              {/* SaaS Labour */}
              <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="bg-violet-100 dark:bg-violet-900/50 rounded-lg p-2">
                      <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    {t(language, 'orchVision.saasLabour')}
                    <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 text-[10px] ml-auto">
                      {labourActions.length} {t(language, 'orchVision.missions')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">{t(language, 'orchVision.saasLabourDesc')}</p>
                  {labourActions.slice(0, 5).map(action => (
                    <div key={action.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Rocket className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-medium flex-1">{t(language, `orchAction.${action.id}_title` as Parameters<typeof t>[1])}</span>
                      <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700 dark:text-violet-300">
                        {action.labourCost} WU
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-violet-600 dark:text-violet-400 font-medium">
                    {t(language, 'orchVision.billedPerWU')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Intent Coverage — CLICKABLE */}
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  {t(language, 'orchVision.intentCoverage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                  {intents.map(intent => {
                    const Icon = INTENT_ICONS[intent] ?? Target
                    const color = INTENT_COLORS[intent] ?? 'emerald'
                    return (
                      <motion.button
                        key={intent}
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleIntentClick(intent)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800 cursor-pointer hover:shadow-md transition-all`}
                      >
                        <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                        <span className="text-[10px] font-medium text-center leading-tight">
                          {t(language, `orchVision.intent_${intent}` as Parameters<typeof t>[1])}
                        </span>
                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                      </motion.button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── WORKFLOWS TAB ── */}
        {activeSection === 'workflows' && (
          <motion.div key="workflows" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div className="space-y-4">
              {workflowTemplates.map((wf, i) => {
                const intentColor = INTENT_COLORS[wf.intent] ?? 'emerald'
                const IntentIcon = INTENT_ICONS[wf.intent] ?? Target
                const labourNodes = wf.nodes.filter(n => n.mode === 'saas_labour').length
                const simpleNodes = wf.nodes.filter(n => n.mode === 'saas_simple').length

                return (
                  <motion.div
                    key={wf.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`bg-${intentColor}-100 dark:bg-${intentColor}-900/50 rounded-lg p-2`}>
                            <IntentIcon className={`w-4 h-4 text-${intentColor}-600 dark:text-${intentColor}-400`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold">{t(language, `orchWf.${wf.intent}_label` as Parameters<typeof t>[1])}</h3>
                            <p className="text-xs text-muted-foreground">{t(language, `orchWf.${wf.intent}_desc` as Parameters<typeof t>[1])}</p>
                          </div>
                          <div className="flex gap-1.5">
                            {simpleNodes > 0 && (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-[10px]">
                                <Zap className="w-3 h-3 mr-0.5" />{simpleNodes}
                              </Badge>
                            )}
                            {labourNodes > 0 && (
                              <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 text-[10px]">
                                <Bot className="w-3 h-3 mr-0.5" />{labourNodes}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {wf.nodes.map((node, ni) => (
                            <div key={node.id} className="flex items-center gap-1.5">
                              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                                node.mode === 'saas_labour'
                                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {node.mode === 'saas_labour' ? <Bot className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                {t(language, (NODE_LABEL_MAP[node.action] ?? 'orchWfNode.generate_cv') as Parameters<typeof t>[1])}
                              </div>
                              {ni < wf.nodes.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Launch Workflow Button */}
                        <div className="mt-4">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleIntentClick(wf.intent)}
                          >
                            <Rocket className="w-3.5 h-3.5" />
                            {t(language, 'orchVision.launchWorkflow')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── PRICING TAB ── */}
        {activeSection === 'pricing' && (
          <motion.div key="pricing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orchestrationTiers.map((tier, i) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`h-full flex flex-col transition-all hover:shadow-lg ${
                    selectedTier === tier.id
                      ? 'ring-2 ring-emerald-500 border-emerald-300'
                      : ''
                  } ${tier.id === 'automated' ? 'border-2 border-emerald-400' : ''}`}>
                    <CardContent className="p-5 flex flex-col flex-1">
                      {tier.id === 'automated' && (
                        <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-semibold self-start mb-2">
                          <Sparkles className="w-3 h-3 mr-0.5" />{t(language, 'orchVision.popular')}
                        </Badge>
                      )}
                      <h3 className="text-base font-bold mb-1">{t(language, `${TIER_KEY_MAP[tier.id] ?? tier.id}_name` as Parameters<typeof t>[1])}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{t(language, `${TIER_KEY_MAP[tier.id] ?? tier.id}_desc` as Parameters<typeof t>[1])}</p>

                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-extrabold tabular-nums">{tier.monthlyPrice}</span>
                        <span className="text-sm text-muted-foreground">{t(language, 'orchVision.eurMonth')}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Workflow className="w-3 h-3" />
                          {tier.includedWorkflows === -1 ? '∞' : tier.includedWorkflows} {t(language, 'orchVision.workflowsLabel')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Bot className="w-3 h-3" />
                          {tier.maxConcurrentMissions === -1 ? '∞' : tier.maxConcurrentMissions} {t(language, 'orchVision.missionsLabel')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Wallet className="w-3 h-3" />
                          {tier.labourCreditsIncluded === -1 ? '∞' : tier.labourCreditsIncluded} WU
                        </Badge>
                      </div>

                      <div className="space-y-1.5 flex-1 mb-4">
                        {tier.features.map((_, fi) => (
                          <div key={fi} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="text-xs">{t(language, `${TIER_KEY_MAP[tier.id] ?? tier.id}_feat${fi}` as Parameters<typeof t>[1])}</span>
                          </div>
                        ))}
                      </div>

                      {/* Choose / Subscribe button — opens checkout dialog */}
                      <Dialog open={checkoutOpen && checkoutTier === tier.id} onOpenChange={(open) => { if (!open) setCheckoutOpen(false) }}>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleChooseTier(tier.id)}
                          >
                            <CreditCard className="w-4 h-4" />
                            {t(language, 'orchVision.subscribe')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-emerald-600" />
                              {t(language, `${TIER_KEY_MAP[tier.id] ?? tier.id}_name` as Parameters<typeof t>[1])} — {tier.monthlyPrice}€/{t(language, 'orchVision.month')}
                            </DialogTitle>
                            <DialogDescription>
                              {t(language, 'orchVision.checkoutDesc')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {/* Order summary */}
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 space-y-2">
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t(language, 'orchVision.orderSummary')}</p>
                              <div className="flex justify-between text-sm">
                                <span>{t(language, `${TIER_KEY_MAP[tier.id] ?? tier.id}_name` as Parameters<typeof t>[1])}</span>
                                <span className="font-bold">{tier.monthlyPrice}{t(language, 'orch.perMonth')}</span>
                              </div>
                              {tier.labourCreditsIncluded > 0 && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{t(language, 'orchVision.creditsIncluded')}</span>
                                  <span>{tier.labourCreditsIncluded} WU</span>
                                </div>
                              )}
                              {tier.includedWorkflows > 0 && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{t(language, 'orchVision.workflowsIncluded')}</span>
                                  <span>{tier.includedWorkflows}</span>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <Button
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-5"
                              onClick={handleGoToPayment}
                            >
                              <CreditCard className="w-4 h-4" />
                              {t(language, 'orchVision.goToPayment')}
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => setCheckoutOpen(false)}
                            >
                              {t(language, 'orchVision.cancel')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── NEXT ACTIONS TAB ── */}
        {activeSection === 'actions' && (
          <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div className="space-y-3">
              {nextActions.map((action, i) => {
                const IntentIcon = INTENT_ICONS[action.category] ?? Target
                const intentColor = INTENT_COLORS[action.category] ?? 'emerald'

                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleIntentClick(action.category)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 rounded-lg p-2 bg-${intentColor}-100 dark:bg-${intentColor}-900/50`}>
                            <IntentIcon className={`w-4 h-4 text-${intentColor}-600 dark:text-${intentColor}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold">{t(language, `orchAction.${action.id}_title` as Parameters<typeof t>[1])}</h3>
                              <Badge variant="outline" className={`text-[10px] ${
                                action.mode === 'saas_labour'
                                  ? 'border-violet-300 text-violet-700 dark:text-violet-300'
                                  : 'border-emerald-300 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {action.mode === 'saas_labour' ? `🤖 ${action.labourCost} WU` : `⚡ ${t(language, 'orch.free')}`}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{t(language, `orchAction.${action.id}_desc` as Parameters<typeof t>[1])}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1">
                                <Gauge className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{t(language, 'orchVision.impact')}: {action.impact}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{t(language, 'orchVision.effort')}: {action.effort}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{t(language, 'orchVision.confidence')}: {Math.round(action.confidence * 100)}%</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
