'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  FileText,
  DollarSign,
  Crown,
  TrendingUp,
  RefreshCw,
  Shield,
  Globe,
  ArrowLeft,
  Star,
  MessageSquare,
  GraduationCap,
  Link2,
  Plane,
  KeyRound,
  TicketCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart3,
  Activity,
  Briefcase,
  UserPlus,
  FileCheck2,
  Receipt,
  ArrowUpRight,
  Wifi,
  Gift,
  Building2,
  HeadphonesIcon,
  Zap,
  CircleDollarSign,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import GrowthTab from '@/components/admin/growth-tab'
import type { GrowthDashboardData } from '@/components/admin/growth-tab'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ComprehensiveStats {
  overview: {
    totalUsers: number
    proUsers: number
    annualUsers: number
    freeUsers: number
    employerUsers: number
    totalResumes: number
    totalCoverLetters: number
    totalAtsAnalyses: number
    totalDocuments: number
    avgRating: number
  }
  last30days: {
    newUsers: number
    newResumes: number
    newCoverLetters: number
  }
  planDistribution: {
    free: number
    pro: number
    annual: number
  }
  jobs: {
    totalJobs: number
    activeJobs: number
    totalApplications: number
    totalEmployers: number
  }
  global: {
    totalGlobalJobs: number
    activeGlobalJobs: number
    totalGlobalApplications: number
    visaSponsorshipJobs: number
    supportedCountries: number
    countries: string[]
  }
  mobility: {
    totalMobilityProfiles: number
    completedMobility: number
    mobilityThisMonth: number
  }
  api: {
    totalApiSubscribers: number
    activeApiSubscribers: number
    totalApiCalls: number
    apiCallsThisMonth: number
    apiPlans: Array<{ name: string; subscribers: number; calls: number }>
  }
  referral: {
    totalReferrals: number
    completedReferrals: number
    rewardedReferrals: number
    pendingReferrals: number
  }
  campus: {
    totalTickets: number
    openTickets: number
  }
  support: {
    openTickets: number
    resolvedTickets: number
    totalTickets: number
  }
  security: {
    critical: number
    high: number
    total: number
    recent: number
    recentAlerts: Array<{
      id: string
      type: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      ip: string
      path: string
      method: string
      email: string | null
      details: string | null
      createdAt: string
    }>
  }
  financial: {
    proMonthlyRevenue: number
    annualRevenue: number
    lifetimeRevenue: number
    apiRevenue: number
    totalMonthlyRevenue: number
    totalAnnualRevenue: number
    estimatedLifetimeValue: number
    currency: string
    revenueBreakdown: Array<{
      source: string
      amount: number
      type: 'recurring' | 'annual' | 'one-time'
    }>
  }
  recent: {
    users: Array<{
      id: string
      name: string | null
      email: string
      plan: string
      role: string
      createdAt: string
    }>
    resumes: Array<{
      id: string
      fullName: string
      targetJob: string
      language: string
      createdAt: string
    }>
    applications: Array<{
      id: string
      candidateName: string
      candidateEmail: string
      status: string
      createdAt: string
      job: { title: string; company: string }
    }>
  }
  dailySignups: Record<string, number>
  timestamp: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number): string => new Intl.NumberFormat('fr-FR').format(n)
const fmtEur = (n: number): string => `${new Intl.NumberFormat('fr-FR').format(n)} €`
const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
const fmtDateShort = (d: string): string =>
  new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })

const planColor = (plan: string) => {
  switch (plan) {
    case 'pro':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'annual':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const severityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
}

const revenueTypeLabel = (type: string, lang: CVLanguage) => {
  switch (type) {
    case 'recurring':
      return t(lang, 'adminFull.revenueTypeRecurring')
    case 'annual':
      return t(lang, 'adminFull.revenueTypeAnnual')
    case 'one-time':
      return t(lang, 'adminFull.revenueTypeOneTime')
    default:
      return type
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'emerald',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'emerald' | 'amber' | 'rose' | 'sky'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    sky: 'bg-sky-50 text-sky-600 border-sky-200',
  }
  const iconBg = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
  }

  return (
    <Card className={`border ${colorMap[color]} transition-all hover:shadow-md`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const { language } = useCVStore()

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="p-4 rounded-full bg-rose-100">
        <AlertTriangle className="w-8 h-8 text-rose-600" />
      </div>
      <p className="text-muted-foreground text-center max-w-md">
        {message}
      </p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      >
        <RefreshCw className="w-4 h-4" />
        {t(language, 'adminFull.retry')}
      </Button>
    </div>
  )
}

// ─── Tab Content Components ──────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: ComprehensiveStats }) {
  const { overview, last30days, dailySignups } = stats
  const { language } = useCVStore()

  const today = new Date()
  const barData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().split('T')[0]
    return {
      date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      count: dailySignups[key] ?? 0,
    }
  })
  const maxBar = Math.max(...barData.map((b) => b.count), 1)

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t(language, 'adminFull.totalUsers')}
          value={fmt(overview.totalUsers)}
          sub={`${fmt(overview.proUsers)} ${t(language, 'adminFull.planPro')} · ${fmt(overview.annualUsers)} ${t(language, 'adminFull.planAnnual')}`}
          color="emerald"
        />
        <StatCard
          icon={FileText}
          label={t(language, 'adminFull.cvCreated')}
          value={fmt(overview.totalResumes)}
          sub={`${fmt(overview.totalCoverLetters)} ${t(language, 'adminFull.coverLetters')}`}
          color="amber"
        />
        <StatCard
          icon={FileCheck2}
          label={t(language, 'adminFull.totalDocuments')}
          value={fmt(overview.totalDocuments)}
          sub={`${fmt(overview.totalAtsAnalyses)} ${t(language, 'adminFull.atsAnalyses')}`}
          color="sky"
        />
        <StatCard
          icon={DollarSign}
          label={t(language, 'adminFull.monthlyRevenue')}
          value={fmtEur(stats.financial.totalMonthlyRevenue)}
          sub={`${fmt(overview.totalUsers)} ${t(language, 'adminFull.users')}`}
          color="emerald"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Crown}
          label={t(language, 'adminFull.proUsers')}
          value={fmt(overview.proUsers)}
          sub={`${((overview.proUsers / Math.max(overview.totalUsers, 1)) * 100).toFixed(1)}% ${t(language, 'adminFull.ofTotal')}`}
          color="amber"
        />
        <StatCard
          icon={Zap}
          label={t(language, 'adminFull.annualSubs')}
          value={fmt(overview.annualUsers)}
          sub={`${((overview.annualUsers / Math.max(overview.totalUsers, 1)) * 100).toFixed(1)}% ${t(language, 'adminFull.ofTotal')}`}
          color="emerald"
        />
        <StatCard
          icon={BarChart3}
          label={t(language, 'adminFull.atsAnalysesLabel')}
          value={fmt(overview.totalAtsAnalyses)}
          sub={t(language, 'adminFull.atsAnalysesSub')}
          color="sky"
        />
        <StatCard
          icon={Star}
          label={t(language, 'adminFull.avgRating')}
          value={overview.avgRating.toFixed(1)}
          sub={t(language, 'adminFull.avgRatingSub')}
          color="amber"
        />
      </div>

      {/* Last 30 days + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t(language, 'adminFull.last30days')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.newUsers')}</span>
              <span className="font-semibold">{fmt(last30days.newUsers)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.newCvs')}</span>
              <span className="font-semibold">{fmt(last30days.newResumes)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.newLetters')}</span>
              <span className="font-semibold">{fmt(last30days.newCoverLetters)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t(language, 'adminFull.dailySignups14')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-40">
              {barData.map((bar, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {bar.count > 0 ? bar.count : ''}
                  </span>
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm transition-all duration-500 min-h-[2px]"
                    style={{
                      height: `${Math.max((bar.count / maxBar) * 100, 2)}%`,
                      opacity: bar.count > 0 ? 1 : 0.15,
                    }}
                  />\n                  <span className="text-[9px] text-muted-foreground leading-tight text-center">
                    {bar.date}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UsersTab({ stats }: { stats: ComprehensiveStats }) {
  const { overview, planDistribution, recent } = stats
  const { language } = useCVStore()
  const totalUsers = Math.max(overview.totalUsers, 1)

  return (
    <div className="space-y-6">
      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.planDistribution')}
          </CardTitle>
          <CardDescription>{t(language, 'adminFull.planDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400" />
                {t(language, 'adminFull.planFree')}
              </span>
              <span className="font-medium">
                {fmt(planDistribution.free)} ({((planDistribution.free / totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={(planDistribution.free / totalUsers) * 100}
              className="h-2.5 [&>div]:bg-gray-400"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                {t(language, 'adminFull.planPro')}
              </span>
              <span className="font-medium">
                {fmt(planDistribution.pro)} ({((planDistribution.pro / totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={(planDistribution.pro / totalUsers) * 100}
              className="h-2.5 [&>div]:bg-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                {t(language, 'adminFull.planAnnual')}
              </span>
              <span className="font-medium">
                {fmt(planDistribution.annual)} ({((planDistribution.annual / totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={(planDistribution.annual / totalUsers) * 100}
              className="h-2.5 [&>div]:bg-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t(language, 'adminFull.totalUsersLabel')} value={fmt(overview.totalUsers)} color="emerald" />
        <StatCard icon={Crown} label={t(language, 'adminFull.proUsers')} value={fmt(overview.proUsers)} color="amber" />
        <StatCard icon={Zap} label={t(language, 'adminFull.annualSubs')} value={fmt(overview.annualUsers)} color="emerald" />
        <StatCard icon={Building2} label={t(language, 'adminFull.employers')} value={fmt(overview.employerUsers)} color="sky" />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.recentUsers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(language, 'adminFull.thName')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thEmail')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thPlan')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thRole')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t(language, 'adminFull.noRecentUsers')}
                    </TableCell>
                  </TableRow>
                )}
                {recent.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={planColor(u.plan)}>
                        {u.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{u.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateShort(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function FinancesTab({ stats }: { stats: ComprehensiveStats }) {
  const { financial } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CircleDollarSign}
          label={t(language, 'adminFull.monthlyRecurringRevenue')}
          value={fmtEur(financial.totalMonthlyRevenue)}
          sub={t(language, 'adminFull.mrrSub')}
          color="emerald"
        />
        <StatCard
          icon={Receipt}
          label={t(language, 'adminFull.annualRevenue')}
          value={fmtEur(financial.totalAnnualRevenue)}
          sub={t(language, 'adminFull.annualProjections')}
          color="amber"
        />
        <StatCard
          icon={KeyRound}
          label={t(language, 'adminFull.apiRevenue')}
          value={fmtEur(financial.apiRevenue)}
          sub={t(language, 'adminFull.apiSubscriptions')}
          color="sky"
        />
        <StatCard
          icon={TrendingUp}
          label={t(language, 'adminFull.estimatedLifetimeValue')}
          value={fmtEur(financial.estimatedLifetimeValue)}
          sub={t(language, 'adminFull.ltvSub')}
          color="emerald"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.financialSummary')}
          </CardTitle>
          <CardDescription>{t(language, 'adminFull.financialSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.totalMonthlyRevenue')}
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {fmtEur(financial.totalMonthlyRevenue)}
              </p>
              <p className="text-xs text-emerald-600/70 mt-1">
                {t(language, 'adminFull.planPro')} : {fmtEur(financial.proMonthlyRevenue)} · API : {fmtEur(financial.apiRevenue)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.projectedAnnualRevenue')}
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {fmtEur(financial.totalAnnualRevenue)}
              </p>
              <p className="text-xs text-amber-600/70 mt-1">
                {t(language, 'adminFull.basedOnActiveSubs')}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.lifetimeRevenue')}
              </p>
              <p className="text-2xl font-bold text-gray-700">
                {fmtEur(financial.lifetimeRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t(language, 'adminFull.sinceLaunch')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.revenueDetails')}
          </CardTitle>
          <CardDescription>{t(language, 'adminFull.revenueDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(language, 'adminFull.thSource')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thAmount')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thType')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financial.revenueBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      {t(language, 'adminFull.noFinancialData')}
                    </TableCell>
                  </TableRow>
                )}
                {financial.revenueBreakdown.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.source}</TableCell>
                    <TableCell className="font-semibold text-emerald-700">
                      {fmtEur(row.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.type === 'recurring'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.type === 'annual'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                        }
                      >
                        {revenueTypeLabel(row.type, language)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function JobsTab({ stats }: { stats: ComprehensiveStats }) {
  const { jobs, global, recent } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label={t(language, 'adminFull.activeJobs')}
          value={fmt(jobs.activeJobs)}
          sub={`${t(language, 'adminFull.outOf')} ${fmt(jobs.totalJobs)} ${t(language, 'adminFull.inTotal')}`}
          color="emerald"
        />
        <StatCard
          icon={FileCheck2}
          label={t(language, 'adminFull.totalApplications')}
          value={fmt(jobs.totalApplications)}
          sub={`${fmt(jobs.totalEmployers)} ${t(language, 'adminFull.employers')}`}
          color="amber"
        />
        <StatCard
          icon={Globe}
          label={t(language, 'adminFull.activeGlobalJobs')}
          value={fmt(global.activeGlobalJobs)}
          sub={`${fmt(global.totalGlobalJobs)} ${t(language, 'adminFull.inTotal')}`}
          color="emerald"
        />
        <StatCard
          icon={Plane}
          label={t(language, 'adminFull.visaJobs')}
          value={fmt(global.visaSponsorshipJobs)}
          sub={t(language, 'adminFull.visaSponsorship')}
          color="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              {t(language, 'adminFull.internationalRecruitment')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.globalApplications')}</span>
              <span className="font-semibold">{fmt(global.totalGlobalApplications)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.supportedCountries')}</span>
              <span className="font-semibold">{global.supportedCountries}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t(language, 'adminFull.relocationJobs')}</span>
              <span className="font-semibold">{fmt(global.visaSponsorshipJobs)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              {t(language, 'adminFull.coveredCountries')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {global.countries.length === 0 && (
                <p className="text-sm text-muted-foreground">{t(language, 'adminFull.noCountriesConfigured')}</p>
              )}
              {global.countries.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.recentApplications')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(language, 'adminFull.thCandidate')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thJob')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thStatus')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t(language, 'adminFull.noRecentApplications')}
                    </TableCell>
                  </TableRow>
                )}
                {recent.applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{a.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{a.candidateEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{a.job.title}</p>
                        <p className="text-xs text-muted-foreground">{a.job.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          a.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : a.status === 'interview'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                        }
                      >
                        {a.status === 'accepted'
                          ? t(language, 'adminFull.statusAccepted')
                          : a.status === 'rejected'
                            ? t(language, 'adminFull.statusRejected')
                            : a.status === 'interview'
                              ? t(language, 'adminFull.statusInterview')
                              : a.status === 'pending'
                                ? t(language, 'adminFull.statusPending')
                                : a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateShort(a.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function MobilityTab({ stats }: { stats: ComprehensiveStats }) {
  const { mobility } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Plane}
          label={t(language, 'adminFull.mobilityProfiles')}
          value={fmt(mobility.totalMobilityProfiles)}
          sub={t(language, 'adminFull.ocrNlpProfiles')}
          color="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          label={t(language, 'adminFull.completedProfiles')}
          value={fmt(mobility.completedMobility)}
          sub={
            mobility.totalMobilityProfiles > 0
              ? `${((mobility.completedMobility / mobility.totalMobilityProfiles) * 100).toFixed(1)}% ${t(language, 'adminFull.completionPct')}`
              : undefined
          }
          color="amber"
        />
        <StatCard
          icon={Activity}
          label={t(language, 'adminFull.thisMonth')}
          value={fmt(mobility.mobilityThisMonth)}
          sub={t(language, 'adminFull.newProfilesThisMonth')}
          color="emerald"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plane className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.ocrNlpPipeline')}
          </CardTitle>
          <CardDescription>
            {t(language, 'adminFull.mobilityModuleStats')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t(language, 'adminFull.completionRateLabel')}</p>
                <p className="text-xs text-emerald-600/70 mt-1">
                  {t(language, 'adminFull.fullyProcessedProfiles')}
                </p>
              </div>
              <span className="text-2xl font-bold text-emerald-700">
                {mobility.totalMobilityProfiles > 0
                  ? `${((mobility.completedMobility / mobility.totalMobilityProfiles) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <Progress
              value={
                mobility.totalMobilityProfiles > 0
                  ? (mobility.completedMobility / mobility.totalMobilityProfiles) * 100
                  : 0
              }
              className="h-2.5 mt-3 [&>div]:bg-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.inProgress')}
              </p>
              <p className="text-xl font-bold text-amber-700">
                {fmt(mobility.totalMobilityProfiles - mobility.completedMobility)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.monthlyGrowth')}
              </p>
              <p className="text-xl font-bold text-emerald-700">
                +{fmt(mobility.mobilityThisMonth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ApiTab({ stats }: { stats: ComprehensiveStats }) {
  const { api } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={KeyRound}
          label={t(language, 'adminFull.apiSubscribers')}
          value={fmt(api.totalApiSubscribers)}
          sub={`${fmt(api.activeApiSubscribers)} ${t(language, 'adminFull.active')}`}
          color="emerald"
        />
        <StatCard
          icon={Wifi}
          label={t(language, 'adminFull.totalApiCalls')}
          value={fmt(api.totalApiCalls)}
          sub={`${fmt(api.apiCallsThisMonth)} ${t(language, 'adminFull.callsThisMonth')}`}
          color="amber"
        />
        <StatCard
          icon={Activity}
          label={t(language, 'adminFull.callsThisMonthLabel')}
          value={fmt(api.apiCallsThisMonth)}
          sub={t(language, 'adminFull.monthlyVolume')}
          color="emerald"
        />
        <StatCard
          icon={DollarSign}
          label={t(language, 'adminFull.apiRevenue')}
          value={fmtEur(stats.financial.apiRevenue)}
          sub={t(language, 'adminFull.apiSubscriptions')}
          color="sky"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.apiPlans')}
          </CardTitle>
          <CardDescription>{t(language, 'adminFull.apiPlansDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(language, 'adminFull.thPlan')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thSubscribers')}</TableHead>
                  <TableHead>{t(language, 'adminFull.thCalls')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {api.apiPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      {t(language, 'adminFull.noApiPlans')}
                    </TableCell>
                  </TableRow>
                )}
                {api.apiPlans.map((plan, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{fmt(plan.subscribers)}</TableCell>
                    <TableCell>{fmt(plan.calls)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function ReferralTab({ stats }: { stats: ComprehensiveStats }) {
  const { referral } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Link2}
          label={t(language, 'adminFull.totalReferrals')}
          value={fmt(referral.totalReferrals)}
          sub={t(language, 'adminFull.allInvitations')}
          color="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          label={t(language, 'adminFull.completedReferrals')}
          value={fmt(referral.completedReferrals)}
          sub={t(language, 'adminFull.confirmedSignups')}
          color="emerald"
        />
        <StatCard
          icon={Gift}
          label={t(language, 'adminFull.rewardedReferrals')}
          value={fmt(referral.rewardedReferrals)}
          sub={t(language, 'adminFull.rewardsDistributed')}
          color="amber"
        />
        <StatCard
          icon={Clock}
          label={t(language, 'adminFull.pendingReferrals')}
          value={fmt(referral.pendingReferrals)}
          sub={t(language, 'adminFull.inValidation')}
          color="sky"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.referralProgram')}
          </CardTitle>
          <CardDescription>{t(language, 'adminFull.referralProgramPerf')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.conversionRate')}
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {referral.totalReferrals > 0
                  ? `${((referral.completedReferrals / referral.totalReferrals) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.rewardRate')}
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {referral.completedReferrals > 0
                  ? `${((referral.rewardedReferrals / referral.completedReferrals) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.pending')}
              </p>
              <p className="text-2xl font-bold text-gray-700">
                {referral.pendingReferrals}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CampusTab({ stats }: { stats: ComprehensiveStats }) {
  const { campus } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 max-w-2xl">
        <StatCard
          icon={GraduationCap}
          label={t(language, 'adminFull.campusTotalRequests')}
          value={fmt(campus.totalTickets)}
          sub={t(language, 'adminFull.universityApplications')}
          color="emerald"
        />
        <StatCard
          icon={TicketCheck}
          label={t(language, 'adminFull.openRequests')}
          value={fmt(campus.openTickets)}
          sub={t(language, 'adminFull.awaitingProcessing')}
          color="amber"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            HireNova IA CAMPUS SaaS
          </CardTitle>
          <CardDescription>
            {t(language, 'adminFull.campusPartnerships')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t(language, 'adminFull.resolutionRate')}</p>
                <p className="text-xs text-emerald-600/70 mt-1">
                  {t(language, 'adminFull.processedRequests')}
                </p>
              </div>
              <span className="text-2xl font-bold text-emerald-700">
                {campus.totalTickets > 0
                  ? `${(((campus.totalTickets - campus.openTickets) / campus.totalTickets) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <Progress
              value={
                campus.totalTickets > 0
                  ? ((campus.totalTickets - campus.openTickets) / campus.totalTickets) * 100
                  : 0
              }
              className="h-2.5 mt-3 [&>div]:bg-emerald-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SupportTab({ stats }: { stats: ComprehensiveStats }) {
  const { support } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={MessageSquare}
          label={t(language, 'adminFull.openTickets')}
          value={fmt(support.openTickets)}
          sub={t(language, 'adminFull.awaitingResponse')}
          color="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label={t(language, 'adminFull.resolvedTickets')}
          value={fmt(support.resolvedTickets)}
          sub={t(language, 'adminFull.supportCompleted')}
          color="emerald"
        />
        <StatCard
          icon={HeadphonesIcon}
          label={t(language, 'adminFull.totalTickets')}
          value={fmt(support.totalTickets)}
          sub={t(language, 'adminFull.allRequests')}
          color="sky"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.supportPerformance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t(language, 'adminFull.resolutionRate')}</p>
                <p className="text-xs text-emerald-600/70 mt-1">
                  {t(language, 'adminFull.resolvedOverTotal')}
                </p>
              </div>
              <span className="text-2xl font-bold text-emerald-700">
                {support.totalTickets > 0
                  ? `${((support.resolvedTickets / support.totalTickets) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <Progress
              value={
                support.totalTickets > 0
                  ? (support.resolvedTickets / support.totalTickets) * 100
                  : 0
              }
              className="h-2.5 mt-3 [&>div]:bg-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.pending')}
              </p>
              <p className="text-xl font-bold text-amber-700">{fmt(support.openTickets)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
                {t(language, 'adminFull.openRate')}
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {support.totalTickets > 0
                  ? `${((support.openTickets / support.totalTickets) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SecurityTab({ stats }: { stats: ComprehensiveStats }) {
  const { security } = stats
  const { language } = useCVStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={AlertTriangle}
          label={t(language, 'adminFull.criticalAlerts')}
          value={fmt(security.critical)}
          sub={t(language, 'adminFull.requiresImmediateAction')}
          color="rose"
        />
        <StatCard
          icon={Shield}
          label={t(language, 'adminFull.highAlerts')}
          value={fmt(security.high)}
          sub={t(language, 'adminFull.toMonitor')}
          color="amber"
        />
        <StatCard
          icon={Shield}
          label={t(language, 'adminFull.totalAlerts')}
          value={fmt(security.total)}
          sub={t(language, 'adminFull.allLevels')}
          color="sky"
        />
      </div>

      <Card className="border border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            {t(language, 'adminFull.recentSecurityAlerts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            {security.recentAlerts.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  {t(language, 'adminFull.noSecurityAlerts')}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {security.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 ${severityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase ${severityColor(alert.severity)}`}
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs font-medium">{alert.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.method} {alert.path} · IP: {alert.ip}
                        {alert.email && ` · ${alert.email}`}
                      </p>
                    </div>
                    <span className="text-[11px] whitespace-nowrap">
                      {fmtDate(alert.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboardFull() {
  const { setStep, language } = useCVStore()
  const [stats, setStats] = useState<ComprehensiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [growthData, setGrowthData] = useState<GrowthDashboardData | null>(null)
  const [growthLoading, setGrowthLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/comprehensive-stats')
      if (!res.ok) {
        throw new Error(`${t(language, 'adminFull.serverError')} (${res.status})`)
      }
      const data: ComprehensiveStats = await res.json()
      setStats(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(language, 'adminFull.loadError')
      )
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Fetch growth dashboard data when growth tab is active
  const fetchGrowthData = useCallback(async () => {
    try {
      setGrowthLoading(true)
      const res = await fetch('/api/admin/growth-dashboard')
      if (!res.ok) throw new Error(`${t(language, 'adminFull.serverError')} (${res.status})`)
      const data = await res.json()
      setGrowthData(data)
    } catch {
      // Silent fail — growth tab shows error state
    } finally {
      setGrowthLoading(false)
    }
  }, [language])

  useEffect(() => {
    if (activeTab === 'growth') {
      fetchGrowthData()
    }
  }, [activeTab, fetchGrowthData])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats()
    }, 60_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-50 bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('landing')}
                className="gap-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t(language, 'adminFull.backToHome')}</span>
              </Button>
              <div className="h-6 w-px bg-emerald-200" />
              <div>
                <h1 className="text-lg font-bold text-emerald-800 leading-tight">
                  {t(language, 'adminFull.dashboardAdmin')}
                </h1>
                <p className="text-xs text-muted-foreground leading-tight">
                  HireNova — E-Society 2050
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden md:inline">
                {currentTime.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t(language, 'adminFull.refresh')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-h-[calc(100vh-80px)] overflow-y-auto pr-1">
          {error && !stats ? (
            <ErrorState
              message={error}
              onRetry={fetchStats}
            />
          ) : loading && !stats ? (
            <div className="space-y-6">
              <LoadingGrid count={8} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border">
                    <CardHeader>
                      <Skeleton className="h-4 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : stats ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-6 border-b border-emerald-100 rounded-none">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabOverview')}
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabUsers')}
                </TabsTrigger>
                <TabsTrigger
                  value="finances"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabFinances')}
                </TabsTrigger>
                <TabsTrigger
                  value="jobs"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabJobsGlobal')}
                </TabsTrigger>
                <TabsTrigger
                  value="mobility"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabMobility')}
                </TabsTrigger>
                <TabsTrigger
                  value="api"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabApi')}
                </TabsTrigger>
                <TabsTrigger
                  value="referral"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabReferral')}
                </TabsTrigger>
                <TabsTrigger
                  value="campus"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabCampus')}
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabSupport')}
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabSecurity')}
                </TabsTrigger>
                <TabsTrigger
                  value="growth"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-600 text-sm"
                >
                  {t(language, 'adminFull.tabGrowth')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab stats={stats} />
              </TabsContent>
              <TabsContent value="users">
                <UsersTab stats={stats} />
              </TabsContent>
              <TabsContent value="finances">
                <FinancesTab stats={stats} />
              </TabsContent>
              <TabsContent value="jobs">
                <JobsTab stats={stats} />
              </TabsContent>
              <TabsContent value="mobility">
                <MobilityTab stats={stats} />
              </TabsContent>
              <TabsContent value="api">
                <ApiTab stats={stats} />
              </TabsContent>
              <TabsContent value="referral">
                <ReferralTab stats={stats} />
              </TabsContent>
              <TabsContent value="campus">
                <CampusTab stats={stats} />
              </TabsContent>
              <TabsContent value="support">
                <SupportTab stats={stats} />
              </TabsContent>
              <TabsContent value="security">
                <SecurityTab stats={stats} />
              </TabsContent>
              <TabsContent value="growth">
                {growthLoading && !growthData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : growthData ? (
                  <GrowthTab data={growthData} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">{t(language, 'adminFull.loadingGrowth')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : null}

          {/* Data timestamp */}
          {stats && (
            <div className="mt-8 pb-4 text-center">
              <p className="text-xs text-muted-foreground">
                {t(language, 'adminFull.lastUpdate')}{fmtDate(stats.timestamp)}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
