'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Coins, ArrowUpRight, ArrowDownLeft, Clock, CreditCard,
  Receipt, TrendingUp, Zap, Plus, History, Gift, Shield, ChevronRight,
  CheckCircle2, Package, ArrowLeft, Rocket,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'

// --- Locale Map ---
const LOCALE_MAP: Record<CVLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA',
  es: 'es-ES',
}

// --- Types ---
interface WalletTabProps {
  onBack: () => void
}

type TransactionType = 'mission' | 'topup'
type TransactionStatus = 'completed' | 'running' | 'failed'

interface Transaction {
  id: string
  type: TransactionType
  desc: string
  date: string
  amount: number
  status: TransactionStatus
}

interface PricingTier {
  name: string
  units: number
  price: number
  perUnit: number
  savings: number
  popular?: boolean
  color: string
  iconBg: string
}

// --- Mock Data ---
const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'mission', desc: 'Optimisation CV Développeur Full-Stack', date: '2025-01-15', amount: -12, status: 'completed' },
  { id: 't2', type: 'mission', desc: 'Sourcing 10 candidats Data Engineer', date: '2025-01-14', amount: -35, status: 'completed' },
  { id: 't3', type: 'topup', desc: 'Recharge Pro Pack', date: '2025-01-13', amount: 500, status: 'completed' },
  { id: 't4', type: 'mission', desc: 'Planification carrière UX Designer', date: '2025-01-15', amount: -18, status: 'running' },
  { id: 't5', type: 'mission', desc: 'Simulation entretien Commercial', date: '2025-01-12', amount: -8, status: 'completed' },
  { id: 't6', type: 'topup', desc: 'Recharge Starter Pack', date: '2025-01-10', amount: 100, status: 'completed' },
  { id: 't7', type: 'mission', desc: 'Analyse marché DevOps France', date: '2025-01-11', amount: -22, status: 'failed' },
]

const PRICING_TIERS: PricingTier[] = [
  { name: 'Starter', units: 100, price: 5.0, perUnit: 0.05, savings: 0, color: 'border-slate-300 dark:border-slate-600', iconBg: 'bg-slate-100 dark:bg-slate-800' },
  { name: 'Pro', units: 500, price: 22.5, perUnit: 0.045, savings: 10, color: 'border-emerald-400 dark:border-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  { name: 'Business', units: 2000, price: 80.0, perUnit: 0.04, savings: 20, popular: true, color: 'border-emerald-400 dark:border-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  { name: 'Enterprise', units: 10000, price: 350.0, perUnit: 0.035, savings: 30, color: 'border-amber-400 dark:border-amber-600', iconBg: 'bg-amber-100 dark:bg-amber-900/50' },
]

const WU_RATE = 0.05
const BALANCE = 1247
const EUR_VALUE = +(BALANCE * WU_RATE).toFixed(2)

// --- Animated Number Hook ---
function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

// --- Status Helpers ---
function statusBadge(status: TransactionStatus, language: CVLanguage) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />{t(language, 'saalabourWallet.statusCompleted')}</Badge>
    case 'running':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs"><Clock className="w-3 h-3 mr-1" />{t(language, 'saalabourWallet.statusRunning')}</Badge>
    case 'failed':
      return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-300 dark:border-red-700 text-xs">{t(language, 'saalabourWallet.statusFailed')}</Badge>
  }
}

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

// --- Component ---
export default function WalletTab({ onBack }: WalletTabProps) {
  const [buyDialogOpen, setBuyDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const historyRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef(false)
  const { language } = useCVStore()
  const locale = LOCALE_MAP[language]

  const animatedBalance = useAnimatedNumber(BALANCE)
  const animatedEur = useAnimatedNumber(EUR_VALUE, 1000)
  const animatedMonthWu = useAnimatedNumber(234, 800)
  const animatedMonthEur = useAnimatedNumber(12, 800)
  const animatedSavings = useAnimatedNumber(47, 1000)

  useEffect(() => {
    if (pendingScrollRef.current && historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      pendingScrollRef.current = false
    }
  })

  const handleScrollToHistory = () => {
    pendingScrollRef.current = true
    setActiveTab('all')
  }

  const filteredTransactions = TRANSACTIONS.filter((tx) => {
    if (activeTab === 'all') return true
    if (activeTab === 'missions') return tx.type === 'mission'
    if (activeTab === 'topups') return tx.type === 'topup'
    return true
  })

  const handleBuy = (tier: PricingTier) => {
    setBuyDialogOpen(false)
    toast.success(t(language, 'saalabourWallet.toastPurchaseSuccess'), {
      description: t(language, 'saalabourWallet.toastPurchaseDesc')
        .replace('{units}', String(tier.units))
        .replace('{name}', tier.name)
        .replace('{price}', tier.price.toFixed(2)),
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  }

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
          <span className="sr-only">{t(language, 'saalabourWallet.back')}</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t(language, 'saalabourWallet.title')}</h1>
          <p className="text-sm text-muted-foreground">{t(language, 'saalabourWallet.subtitle')}</p>
        </div>
      </motion.div>

      {/* ── Balance Hero Card ── */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <CardContent className="relative z-10 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-emerald-100 text-sm font-medium">{t(language, 'saalabourWallet.availableBalance')}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white tabular-nums">
                    {animatedBalance.toLocaleString(locale)}
                  </span>
                  <span className="text-emerald-100 text-lg font-semibold">WU</span>
                </div>
                <p className="text-emerald-100/80 text-sm mt-1">
                  {t(language, 'saalabourWallet.approxEur').replace('{amount}', `${animatedEur},35`)}{' '}
                  <span className="text-emerald-200/60">{t(language, 'saalabourWallet.wuRate').replace('{rate}', WU_RATE.toFixed(2))}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg shadow-emerald-900/20 gap-2">
                      <Plus className="w-4 h-4" />
                      {t(language, 'saalabourWallet.buyWu')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-600" />
                        {t(language, 'saalabourWallet.buyWuTitle')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {PRICING_TIERS.map((tier) => (
                        <motion.div
                          key={tier.name}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className={`relative h-full transition-shadow hover:shadow-lg ${tier.popular ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20' : 'border'} ${tier.color}`}
                          >
                            {tier.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge className="bg-emerald-500 text-white border-0 text-xs font-semibold shadow-md">
                                  <Zap className="w-3 h-3 mr-1" />{t(language, 'saalabourWallet.popular')}
                                </Badge>
                              </div>
                            )}
                            <CardContent className="p-4 pt-5 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-base">{tier.name}</span>
                                <div className={`${tier.iconBg} rounded-lg p-1.5`}>
                                  <Package className="w-4 h-4 text-emerald-600" />
                                </div>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold tabular-nums">{tier.units.toLocaleString(locale)}</span>
                                <span className="text-sm text-muted-foreground font-medium">WU</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">{tier.price.toFixed(2)} EUR</span>
                                <span className="text-xs text-muted-foreground">({tier.perUnit.toFixed(3)}/WU)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {tier.savings > 0 && (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs">
                                    -{tier.savings}%
                                  </Badge>
                                )}
                                {tier.savings === 0 && (
                                  <span className="text-xs text-muted-foreground">{t(language, 'saalabourWallet.standardPrice')}</span>
                                )}
                              </div>
                              <Button
                                className={
                                  tier.popular
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white w-full mt-auto'
                                    : 'w-full mt-auto'
                                }
                                variant={tier.popular ? 'default' : 'outline'}
                                onClick={() => handleBuy(tier)}
                              >
                                {t(language, 'saalabourWallet.buy')}
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm gap-2"
                  onClick={handleScrollToHistory}
                >
                  <History className="w-4 h-4" />
                  {t(language, 'saalabourWallet.history')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Quick Stats Row ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {/* Ce mois */}
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-100 dark:bg-orange-900/40 rounded-lg p-2">
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t(language, 'saalabourWallet.thisMonth')}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{animatedMonthWu}</span>
              <span className="text-sm text-muted-foreground">{t(language, 'saalabourWallet.wuConsumed')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t(language, 'saalabourWallet.monthEurValue').replace('{amount}', `${animatedMonthEur},70`)}</p>
          </CardContent>
        </Card>

        {/* Missions actives */}
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
                <Rocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t(language, 'saalabourWallet.activeMissions')}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">3</span>
              <span className="text-sm text-muted-foreground">{t(language, 'saalabourWallet.inProgress')}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={23} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums">{t(language, 'saalabourWallet.estWu').replace('{amount}', '45')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Économie réalisée */}
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{t(language, 'saalabourWallet.savingsRealized')}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">-{animatedSavings}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t(language, 'saalabourWallet.vsTraditional')}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Consumption History ── */}
      <motion.div ref={historyRef} variants={itemVariants} className="mt-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              {t(language, 'saalabourWallet.transactionHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {t(language, 'saalabourWallet.all')}
                </TabsTrigger>
                <TabsTrigger value="missions" className="gap-1.5 text-sm">
                  <Rocket className="w-3.5 h-3.5" />
                  {t(language, 'saalabourWallet.missions')}
                </TabsTrigger>
                <TabsTrigger value="topups" className="gap-1.5 text-sm">
                  <CreditCard className="w-3.5 h-3.5" />
                  {t(language, 'saalabourWallet.topups')}
                </TabsTrigger>
              </TabsList>

              {['all', 'missions', 'topups'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.map((tx) => (
                        <motion.div
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-default group">
                            {/* Icon */}
                            <div
                              className={`shrink-0 rounded-lg p-2 ${
                                tx.type === 'mission'
                                  ? 'bg-violet-100 dark:bg-violet-900/40'
                                  : 'bg-emerald-100 dark:bg-emerald-900/40'
                              }`}
                            >
                              {tx.type === 'mission' ? (
                                <Rocket className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tx.desc}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.date, locale)}</p>
                            </div>

                            {/* Status + Amount */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {statusBadge(tx.status, language)}
                              <span
                                className={`text-sm font-bold tabular-nums flex items-center gap-1 ${
                                  tx.amount > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {tx.amount > 0 ? (
                                  <ArrowDownLeft className="w-3 h-3" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3" />
                                )}
                                {tx.amount > 0 ? '+' : ''}{tx.amount} WU
                              </span>
                            </div>

                            {/* Chevron (desktop) */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Cost Comparison ── */}
      <motion.div variants={itemVariants} className="mt-6">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-emerald-600" />
                {t(language, 'saalabourWallet.whySaaLabour')}
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                {t(language, 'saalabourWallet.upTo95Savings')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Traditional */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-lg p-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{t(language, 'saalabourWallet.traditionalRecruitment')}</span>
                </div>
                <div className="flex items-center gap-4 text-sm sm:text-right">
                  <span className="text-muted-foreground">{t(language, 'saalabourWallet.traditionalCost')}</span>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">{t(language, 'saalabourWallet.traditionalTime')}</Badge>
                </div>
              </div>

              {/* Agency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-lg p-2">
                    <Receipt className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{t(language, 'saalabourWallet.tempAgency')}</span>
                </div>
                <div className="flex items-center gap-4 text-sm sm:text-right">
                  <span className="text-muted-foreground">{t(language, 'saalabourWallet.agencyCost')}</span>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">{t(language, 'saalabourWallet.agencyCommitment')}</Badge>
                </div>
              </div>

              {/* SaaLabour — highlighted */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 rounded-lg p-2 shadow-md shadow-emerald-500/20">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      SaaLabour IA
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm sm:text-right">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">{t(language, 'saalabourWallet.saalabourCost')}</span>
                    <Badge className="bg-emerald-600 text-white border-0 text-xs whitespace-nowrap">
                      {t(language, 'saalabourWallet.instantDelivery')}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}