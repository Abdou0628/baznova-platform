'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  DollarSign, Users, TrendingUp, AlertTriangle, CreditCard, FileText,
  Receipt, ArrowUpRight, ArrowDownRight, Calculator, Building2, Shield,
  Check, X, Loader2, Settings, ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Transaction {
  id: string; date: string; client: string; plan: string
  montant: number; statut: 'succeeded' | 'failed' | 'pending'; provider: string
}
interface MonthlyRevenue { month: string; amount: number }
interface Invoice {
  id: string; client: string; amount: number; status: string; dueDate: string
}
interface DashboardData {
  totalRevenue: number; activeSubscriptions: number; mrr: number
  pendingInvoices: number; revenueTrend: number; subscriptionTrend: number
  transactions: Transaction[]; monthlyRevenue: MonthlyRevenue[]
  starterCount: number; proCount: number; careerCount: number
  employerCount: number; annualCount: number
  invoices: Invoice[]; taxIsRate: number; taxTvaCollected: number; taxTotalLiability: number
}
interface TaxResult { isAmount: number; isRate: number; tvaNet: number; totalLiability: number }

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const mockData: DashboardData = {
  totalRevenue: 124750, activeSubscriptions: 287, mrr: 38450, pendingInvoices: 12,
  revenueTrend: 12.5, subscriptionTrend: 8.3,
  transactions: [
    { id: 'TXN-001', date: '2025-06-28', client: 'Yasmine B.', plan: 'Career+', montant: 399, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-002', date: '2025-06-27', client: 'Omar T.', plan: 'Pro', montant: 190, statut: 'succeeded', provider: 'PayMob' },
    { id: 'TXN-003', date: '2025-06-27', client: 'Fatima Z.', plan: 'Employer', montant: 490, statut: 'pending', provider: 'Stripe' },
    { id: 'TXN-004', date: '2025-06-26', client: 'Karim M.', plan: 'Starter', montant: 90, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-005', date: '2025-06-25', client: 'Amina R.', plan: 'Annual', montant: 700, statut: 'failed', provider: 'LemonSqueezy' },
    { id: 'TXN-006', date: '2025-06-24', client: 'Hassan L.', plan: 'Pro', montant: 190, statut: 'succeeded', provider: 'PayMob' },
    { id: 'TXN-007', date: '2025-06-23', client: 'Sara K.', plan: 'Career+', montant: 399, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-008', date: '2025-06-22', client: 'Rachid D.', plan: 'Starter', montant: 90, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-009', date: '2025-06-21', client: 'Nadia F.', plan: 'Employer', montant: 490, statut: 'pending', provider: 'PayMob' },
    { id: 'TXN-010', date: '2025-06-20', client: 'Mehdi A.', plan: 'Annual', montant: 700, statut: 'succeeded', provider: 'LemonSqueezy' },
  ],
  monthlyRevenue: [
    { month: 'Jan', amount: 14200 }, { month: 'Fév', amount: 18600 },
    { month: 'Mar', amount: 22400 }, { month: 'Avr', amount: 19800 },
    { month: 'Mai', amount: 25100 }, { month: 'Juin', amount: 24650 },
  ],
  starterCount: 42, proCount: 105, careerCount: 78, employerCount: 34, annualCount: 28,
  invoices: [
    { id: 'INV-001', client: 'Société Atlas', amount: 4900, status: 'pending', dueDate: '2025-07-15' },
    { id: 'INV-002', client: 'Groupe Sahara', amount: 7200, status: 'draft', dueDate: '2025-07-20' },
    { id: 'INV-003', client: 'TechMa Solutions', amount: 1400, status: 'paid', dueDate: '2025-06-30' },
    { id: 'INV-004', client: 'Oasis RH', amount: 3500, status: 'cancelled', dueDate: '2025-06-10' },
    { id: 'INV-005', client: 'Digital Maroc', amount: 2800, status: 'pending', dueDate: '2025-07-25' },
  ],
  taxIsRate: 17.5, taxTvaCollected: 7690, taxTotalLiability: 19015,
}

/* ------------------------------------------------------------------ */
/*  Plans (NO free tier)                                               */
/* ------------------------------------------------------------------ */

const plans = [
  { key: 'starter', price: 9, features: ['CV Generator', 'ATS Analysis', '5 CV/month'] },
  { key: 'pro', price: 19, features: ['All Starter + Jobs', 'LinkedIn', '20 CV/month', 'Interview Sim'] },
  { key: 'career_plus', price: 39, features: ['All Pro + Coach', 'Formation', 'Freelance', '50 CV/month', 'Intelligence'] },
  { key: 'employer', price: 49, features: ['Recruiter Pipeline', 'Candidate Matching', 'Job Postings', 'API Access'] },
  { key: 'annual', price: 70, features: ['All Career+ features', '17% savings', 'Priority support'] },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMAD(amount: number): string {
  return new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' MAD'
}

function statusBadge(status: string, language: string) {
  const map: Record<string, { cls: string; key: string }> = {
    succeeded: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', key: 'payDashSucceeded' },
    pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', key: 'payDashPending' },
    failed: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', key: 'payDashFailed' },
    draft: { cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', key: 'payDashDraft' },
    paid: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', key: 'payDashPaid' },
    cancelled: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', key: 'payDashCancelled' },
  }
  const s = map[status] || map.draft
  return <Badge className={s.cls}>{t(language as 'fr' | 'en' | 'ar' | 'es', s.key as any)}</Badge>
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PaymentDashboard() {
  const { language, setStep } = useCVStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ client: '', description: '', amount: '', dueDate: '' })
  const [taxRevenue, setTaxRevenue] = useState('')
  const [taxExpenses, setTaxExpenses] = useState('')
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null)
  const [taxLoading, setTaxLoading] = useState(false)

  useEffect(() => {
    fetch('/api/payments/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((api) => {
        if (api) {
          const mapped: DashboardData = {
            totalRevenue: api.totalRevenueMAD ?? mockData.totalRevenue,
            activeSubscriptions: api.activeSubscriptionsCount ?? mockData.activeSubscriptions,
            mrr: api.mrrMAD ?? mockData.mrr,
            pendingInvoices: api.pendingInvoicesCount ?? mockData.pendingInvoices,
            revenueTrend: api.revenueTrendPercent ?? mockData.revenueTrend,
            subscriptionTrend: api.subscriptionTrendPercent ?? mockData.subscriptionTrend,
            transactions: (api.recentTransactions ?? []).map((tx: { clientName: string; plan: string; amountMAD: number; status: string; provider: string; createdAt: string }) => ({
              id: tx.clientName, date: tx.createdAt?.slice(0, 10) ?? '', client: tx.clientName,
              plan: tx.plan || '-', montant: tx.amountMAD, statut: tx.status as Transaction['statut'], provider: tx.provider,
            })),
            monthlyRevenue: (api.monthlyRevenue ?? mockData.monthlyRevenue).map((m: { month: string; amount: number }) => ({ month: m.month, amount: m.amount })),
            starterCount: api.subBreakdown?.find((s: { planName: string }) => s.planName?.toLowerCase().includes('starter'))?.count ?? mockData.starterCount,
            proCount: api.subBreakdown?.find((s: { planName: string }) => s.planName?.toLowerCase().includes('pro'))?.count ?? mockData.proCount,
            careerCount: api.subBreakdown?.find((s: { planName: string }) => s.planName?.toLowerCase().includes('career'))?.count ?? mockData.careerCount,
            employerCount: api.subBreakdown?.find((s: { planName: string }) => s.planName?.toLowerCase().includes('employer'))?.count ?? mockData.employerCount,
            annualCount: api.subBreakdown?.find((s: { planName: string }) => s.planName?.toLowerCase().includes('annual'))?.count ?? mockData.annualCount,
            invoices: (api.pendingInvoices ?? mockData.invoices).map((inv: { clientName: string; amountMAD: number; status: string; dueDate: string | null; invoiceNumber: string }) => ({
              id: inv.invoiceNumber ?? inv.clientName, client: inv.clientName, amount: inv.amountMAD,
              status: inv.status, dueDate: inv.dueDate?.slice(0, 10) ?? '-',
            })),
            taxIsRate: api.taxSummary?.taxReport?.isRate ?? mockData.taxIsRate,
            taxTvaCollected: api.taxSummary?.taxReport?.tvaCollected ?? mockData.taxTvaCollected,
            taxTotalLiability: api.taxSummary?.taxReport?.totalTax ?? mockData.taxTotalLiability,
          }
          setData(mapped)
        } else { setData(mockData) }
        setLoading(false)
      })
      .catch(() => { setData(mockData); setLoading(false) })
  }, [])

  const d = data || mockData
  const maxRev = Math.max(...d.monthlyRevenue.map((r) => r.amount))
  const planCounts = [d.starterCount, d.proCount, d.careerCount, d.employerCount, d.annualCount]
  const totalSubs = planCounts.reduce((a, b) => a + b, 0)
  const planColors = ['#059669', '#8b5cf6', '#d97706', '#dc2626', '#0ea5e9']

  let cumPct = 0
  const donutStops = planCounts.map((c, i) => {
    const start = cumPct
    const pct = totalSubs > 0 ? (c / totalSubs) * 100 : 20
    cumPct += pct
    return `${planColors[i]} ${start}% ${cumPct}%`
  })
  const donutBg = `conic-gradient(${donutStops.join(', ')})`

  /* ---------- Handlers ---------- */
  const handleSubscribe = useCallback(async (planKey: string) => {
    setSubscribing(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planKey, currency: 'eur' }),
      })
      if (!res.ok) throw new Error('Stripe not configured')
      const { url } = await res.json()
      if (url) window.location.href = url
      else toast.success(t(language, 'payDashStripeRedirect'))
    } catch {
      toast.error(t(language, 'payDashStripeNotConfigured'))
    } finally { setSubscribing(null) }
  }, [language])

  const handlePortal = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current' }),
      })
      if (res.ok) { const { url } = await res.json(); if (url) window.location.href = url }
      else toast.error(t(language, 'payDashPortalUnavailable'))
    } catch { toast.error(t(language, 'payDashPortalError')) }
  }, [language])

  const handleCreateInvoice = useCallback(async () => {
    if (!invoiceForm.client || !invoiceForm.amount) {
      toast.error(t(language, 'payDashRequiredFields')); return
    }
    try {
      await fetch('/api/payments/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm),
      })
      toast.success(t(language, 'payDashInvoiceCreated'))
      setInvoiceForm({ client: '', description: '', amount: '', dueDate: '' })
      setInvoiceOpen(false)
    } catch { toast.error(t(language, 'payDashInvoiceError')) }
  }, [invoiceForm, language])

  const handleTaxCalc = useCallback(async () => {
    const rev = parseFloat(taxRevenue); const exp = parseFloat(taxExpenses)
    if (isNaN(rev) || isNaN(exp)) {
      toast.error(t(language, 'payDashInvalidValues')); return
    }
    setTaxLoading(true)
    try {
      const tvaCollected = rev * 0.20 // TVA 20% sur le CA
      const res = await fetch('/api/payments/tax/calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenue: rev, expenses: exp, tvaCollected, tvaDeductible: 0 }),
      })
      if (res.ok) {
        const data = await res.json()
        const r = data.rapport
        setTaxResult({
          isAmount: r.impotSurSocietes.montant,
          isRate: r.impotSurSocietes.tauxEffectif,
          tvaNet: r.tva.tvaNette,
          totalLiability: r.chargeFiscaleTotale,
        })
      }
      else setTaxResult({ isAmount: 0, isRate: 0, tvaNet: 0, totalLiability: 0 })
    } catch { setTaxResult({ isAmount: 0, isRate: 0, tvaNet: 0, totalLiability: 0 }) }
    finally { setTaxLoading(false) }
  }, [taxRevenue, taxExpenses, language])

  /* ---------- KPI Cards ---------- */
  const kpiCards = [
    { label: t(language, 'payDashTotalRevenue'), value: formatMAD(d.totalRevenue), icon: DollarSign, trend: d.revenueTrend, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: t(language, 'payDashActiveSubs'), value: String(d.activeSubscriptions), icon: Users, trend: d.subscriptionTrend, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
    { label: t(language, 'payDashMRR'), value: formatMAD(d.mrr), icon: TrendingUp, trend: 5.2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { label: t(language, 'payDashPendingInvoices'), value: String(d.pendingInvoices), icon: AlertTriangle, trend: -3.1, color: 'text-red-600 bg-red-50 dark:bg-red-950/40' },
  ]

  /* ================================================================ */
  /*  RENDER                                                            */
  /* ================================================================ */
  return (
    <motion.div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(language, 'payDashTitle')}</h1>
          <p className="mt-1 text-muted-foreground">{t(language, 'payDashSubtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="w-fit gap-2" onClick={() => setStep('landing')}>
          <ArrowLeft className="size-4" /> {t(language, 'payDashBack')}
        </Button>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">{t(language, 'payDashTabOverview')}</TabsTrigger>
            <TabsTrigger value="subscriptions" className="text-xs sm:text-sm">{t(language, 'payDashTabSubs')}</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">{t(language, 'payDashTabInvoices')}</TabsTrigger>
            <TabsTrigger value="tax" className="text-xs sm:text-sm">{t(language, 'payDashTabTax')}</TabsTrigger>
            <TabsTrigger value="methods" className="text-xs sm:text-sm">{t(language, 'payDashTabPayment')}</TabsTrigger>
          </TabsList>

          {/* ====================================================== TAB 1 ====================================================== */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div> : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map((c) => {
                  const Icon = c.icon; const up = c.trend >= 0
                  return (
                    <motion.div key={c.label} variants={itemVariants}>
                      <Card className="py-5"><CardContent className="flex items-center gap-4 p-6">
                        <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${c.color}`}><Icon className="size-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-muted-foreground">{c.label}</p>
                          <p className="mt-1 text-xl font-semibold tracking-tight">{c.value}</p>
                        </div>
                        <div className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(c.trend)}%
                        </div>
                      </CardContent></Card>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3">
              {loading ? <Skeleton className="h-64 lg:col-span-2 rounded-xl" /> : (
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <Card><CardHeader><CardTitle>{t(language, 'payDashMonthlyRevenue')}</CardTitle><CardDescription>{t(language, 'payDashLast6Months')}</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex h-52 items-end gap-3 sm:gap-5">
                      {d.monthlyRevenue.map((b) => {
                        const h = maxRev > 0 ? (b.amount / maxRev) * 100 : 0
                        return (<div key={b.month} className="flex flex-1 flex-col items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{(b.amount / 1000).toFixed(1)}k</span>
                          <div className="w-full min-h-[8px] rounded-t-md bg-emerald-500 transition-all duration-500 hover:bg-emerald-600" style={{ height: `${h}%` }} />
                          <span className="text-xs text-muted-foreground">{b.month}</span>
                        </div>)
                      })}
                    </div>
                  </CardContent></Card>
                </motion.div>
              )}
              {loading ? <Skeleton className="h-64 rounded-xl" /> : (
                <motion.div variants={itemVariants}>
                  <Card className="h-full"><CardHeader><CardTitle>{t(language, 'payDashSubscriptionMix')}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="size-40 rounded-full" style={{ background: donutBg }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex size-24 items-center justify-center rounded-full bg-background"><span className="text-lg font-bold">{totalSubs}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {plans.map((p, i) => (<div key={p.key} className="flex items-center gap-1.5"><div className="size-3 rounded-full" style={{ background: planColors[i] }} /><span className="text-xs">{p.key === 'career_plus' ? 'Career+' : p.key.charAt(0).toUpperCase() + p.key.slice(1)} ({planCounts[i]})</span></div>))}
                    </div>
                  </CardContent></Card>
                </motion.div>
              )}
            </div>

            {/* Transactions Table */}
            {loading ? <Skeleton className="h-80 rounded-xl" /> : (
              <motion.div variants={itemVariants}>
                <Card><CardHeader><CardTitle>{t(language, 'payDashRecentTx')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table><TableHeader><TableRow>
                      <TableHead>{t(language, 'payDashDate')}</TableHead><TableHead>{t(language, 'payDashClient')}</TableHead>
                      <TableHead>Plan</TableHead><TableHead>{t(language, 'payDashAmount')}</TableHead>
                      <TableHead>{t(language, 'payDashStatus')}</TableHead><TableHead>Provider</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {d.transactions.slice(0, 10).map((tx) => (<TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                        <TableCell className="font-medium">{tx.client}</TableCell>
                        <TableCell>{tx.plan}</TableCell><TableCell>{formatMAD(tx.montant)}</TableCell>
                        <TableCell>{statusBadge(tx.statut, language)}</TableCell><TableCell className="text-xs text-muted-foreground">{tx.provider}</TableCell>
                      </TableRow>))}
                    </TableBody></Table>
                  </div>
                </CardContent></Card>
              </motion.div>
            )}
          </TabsContent>

          {/* ====================================================== TAB 2 ====================================================== */}
          <TabsContent value="subscriptions" className="mt-6 space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-medium text-violet-900 dark:text-violet-200">{t(language, 'payDashManageSub')}</p><p className="text-sm text-muted-foreground">{t(language, 'payDashPortalDesc')}</p></div>
                  <Button variant="outline" className="gap-2 w-fit" onClick={handlePortal}><CreditCard className="size-4" />{t(language, 'payDashPortal')}</Button>
                </CardContent>
              </Card>
            </motion.div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isSubscribing = subscribing === plan.key
                return (
                  <motion.div key={plan.key} variants={itemVariants}>
                    <Card className="relative flex h-full flex-col">
                      {plan.key === 'annual' && <Badge className="absolute -top-2 right-4 bg-amber-500 text-white">{t(language, 'payDashPopular')}</Badge>}
                      <CardHeader><CardTitle className="flex items-center justify-between">{plan.key === 'career_plus' ? 'Career+' : plan.key.charAt(0).toUpperCase() + plan.key.slice(1)}<Badge variant="secondary" className="ml-2">{plan.price}€</Badge></CardTitle></CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3">
                        <ul className="flex-1 space-y-2">{plan.features.map((f) => (<li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /><span>{f}</span></li>))}</ul>
                        <Button className="w-full gap-2" disabled={isSubscribing} onClick={() => handleSubscribe(plan.key)}>
                          {isSubscribing && <Loader2 className="size-4 animate-spin" />}{t(language, 'payDashSubscribe')}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>

          {/* ====================================================== TAB 3 ====================================================== */}
          <TabsContent value="invoices" className="mt-6 space-y-6">
            <motion.div variants={itemVariants} className="flex justify-end">
              <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
                <DialogTrigger asChild><Button className="gap-2"><FileText className="size-4" />{t(language, 'payDashCreateInvoice')}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t(language, 'payDashNewInvoice')}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>{t(language, 'payDashClient')} *</Label><Input value={invoiceForm.client} onChange={(e) => setInvoiceForm((p) => ({ ...p, client: e.target.value }))} placeholder={t(language, 'payDashClientName')} /></div>
                    <div className="space-y-2"><Label>{t(language, 'payDashDescription')}</Label><Input value={invoiceForm.description} onChange={(e) => setInvoiceForm((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>{t(language, 'payDashAmountMAD')} *</Label><Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>{t(language, 'payDashDueDate')}</Label><Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
                    </div>
                    <Button className="w-full gap-2" onClick={handleCreateInvoice}><Receipt className="size-4" />{t(language, 'payDashCreate')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card><CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <Table><TableHeader><TableRow>
                    <TableHead>#</TableHead><TableHead>{t(language, 'payDashClient')}</TableHead>
                    <TableHead>{t(language, 'payDashAmount')}</TableHead><TableHead>{t(language, 'payDashStatus')}</TableHead>
                    <TableHead>{t(language, 'payDashDueDate')}</TableHead>
                  </TableRow></TableHeader><TableBody>
                    {d.invoices.map((inv) => (<TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                      <TableCell className="font-medium">{inv.client}</TableCell>
                      <TableCell>{formatMAD(inv.amount)}</TableCell>
                      <TableCell>{statusBadge(inv.status, language)}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                    </TableRow>))}
                  </TableBody></Table>
                </div>
              </CardContent></Card>
            </motion.div>
          </TabsContent>

          {/* ====================================================== TAB 4 ====================================================== */}
          <TabsContent value="tax" className="mt-6 space-y-6">
            {/* IS Brackets */}
            <motion.div variants={itemVariants}>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5" />IS {t(language, 'payDashCorporateTax')}</CardTitle><CardDescription>{t(language, 'payDashProgressiveBrackets')}</CardDescription></CardHeader>
                <CardContent><div className="max-h-96 overflow-y-auto">
                  <Table><TableHeader><TableRow><TableHead>{t(language, 'payDashBracket')}</TableHead><TableHead>{t(language, 'payDashRate')}</TableHead></TableRow></TableHeader><TableBody>
                    {[['0 – 300 000 MAD', '0%'], ['300 001 – 1 000 000 MAD', '10%'], ['1 000 001 – 5 000 000 MAD', '17.5%'], [t(language, 'payDashOver5M'), '30%']].map(([br, rt]) => (
                      <TableRow key={br}><TableCell className="font-medium">{br}</TableCell><TableCell><Badge variant="outline">{rt}</Badge></TableCell></TableRow>
                    ))}
                  </TableBody></Table>
                </div></CardContent>
              </Card>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* TVA Rates */}
              <motion.div variants={itemVariants}>
                <Card><CardHeader><CardTitle>{t(language, 'payDashVatRates')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[{ label: t(language, 'payDashVatStandard'), rate: '20%' }, { label: t(language, 'payDashVatReduced'), rate: '14%' }, { label: t(language, 'payDashVatHospitality'), rate: '10%' }, { label: t(language, 'payDashVatEssential'), rate: '7%' }].map((v) => (
                      <div key={v.rate} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{v.label}</span><Badge variant="secondary">{v.rate}</Badge></div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tax Calculator */}
              <motion.div variants={itemVariants}>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-5" />{t(language, 'payDashTaxCalc')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>{t(language, 'payDashRevenueMAD')}</Label><Input type="number" value={taxRevenue} onChange={(e) => setTaxRevenue(e.target.value)} placeholder="150000" /></div>
                    <div className="space-y-2"><Label>{t(language, 'payDashExpensesMAD')}</Label><Input type="number" value={taxExpenses} onChange={(e) => setTaxExpenses(e.target.value)} placeholder="60000" /></div>
                    <Button className="w-full gap-2" onClick={handleTaxCalc} disabled={taxLoading}>{taxLoading && <Loader2 className="size-4 animate-spin" />}{t(language, 'payDashCalculate')}</Button>
                    {taxResult && (<div className="space-y-3 rounded-lg border p-4">
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">IS ({taxResult.isRate}%)</span><span className="font-semibold">{formatMAD(taxResult.isAmount)}</span></div>
                      <Separator />
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">TVA {t(language, 'payDashNet')}</span><span className="font-semibold">{formatMAD(taxResult.tvaNet)}</span></div>
                      <Separator />
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span className="font-semibold">{t(language, 'payDashTotalLiabilityShort')}</span><span className="font-bold">{formatMAD(taxResult.totalLiability)}</span></div>
                    </div>)}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Current month summary + effective rate bar */}
            <motion.div variants={itemVariants}>
              <Card><CardHeader><CardTitle>{t(language, 'payDashMonthTaxSummary')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">IS ({d.taxIsRate}%)</p><p className="mt-1 text-lg font-semibold">{formatMAD(d.taxTotalLiability - d.taxTvaCollected)}</p></div>
                    <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">TVA {t(language, 'payDashCollected')}</p><p className="mt-1 text-lg font-semibold">{formatMAD(d.taxTvaCollected)}</p></div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t(language, 'payDashTotal')}</p><p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatMAD(d.taxTotalLiability)}</p></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>{t(language, 'payDashEffectiveISRate')}</span><span className="font-medium">{d.taxIsRate}% / 30%</span></div>
                    <Progress value={(d.taxIsRate / 30) * 100} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ====================================================== TAB 5 ====================================================== */}
          <TabsContent value="methods" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Stripe', currencies: 'EUR, USD, MAD', status: 'active' as const, icon: CreditCard, desc: t(language, 'payDashStripeDesc') },
                { name: 'PayMob', currencies: 'MAD, Mobile Money', status: 'configured' as const, icon: Shield, desc: t(language, 'payDashPayMobDesc') },
                { name: 'LemonSqueezy', currencies: 'USD, EUR', status: 'not_configured' as const, icon: Receipt, desc: t(language, 'payDashLemonSqueezyDesc') },
              ].map((p) => {
                const Icon = p.icon
                const statusMap = { active: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: t(language, 'payDashActive') }, configured: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', label: t(language, 'payDashConfigured') }, not_configured: { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: t(language, 'payDashNotConfigured') } }
                const s = statusMap[p.status]
                return (
                  <motion.div key={p.name} variants={itemVariants}>
                    <Card className="flex h-full flex-col"><CardHeader className="flex-1">
                      <div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Icon className="size-5" />{p.name}</CardTitle><Badge className={s.cls}>{s.label}</Badge></div>
                      <CardDescription>{p.desc}</CardDescription>
                    </CardHeader><CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t(language, 'payDashCurrencies')}</span><span className="font-medium">{p.currencies}</span></div>
                      <Button variant="outline" className="w-full gap-2" disabled={p.status === 'not_configured'}><ArrowLeft className="size-4" />{t(language, 'payDashConfigure')}</Button>
                    </CardContent></Card>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )
}
