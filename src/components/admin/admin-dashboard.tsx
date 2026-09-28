'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  FileText,
  PenLine,
  DollarSign,
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  UserX,
  Globe,
  ArrowUpRight,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  Receipt,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Separator } from '@/components/ui/separator'
import DocumentsTab from '@/components/admin/documents-tab'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
}

interface AdminStats {
  overview: {
    totalUsers: number
    proUsers: number
    lifetimeUsers: number
    totalCVs: number
    totalCLs: number
    totalDocuments: number
    monthlyRevenuePro: number
    totalRevenueLifetime: number
    estimatedMonthlyRevenue: number
  }
  last30days: {
    newUsers: number
    newCVs: number
    newCLs: number
  }
  dailySignups: Record<string, number>
  planDistribution: {
    free: number
    pro: number
    lifetime: number
  }
  recentUsers: Array<{
    name: string | null
    email: string
    plan: string
    createdAt: string
    cvCountThisMonth: number
    clCountThisMonth: number
  }>
  recentCVs: Array<{
    fullName: string
    targetJob: string
    language: string
    createdAt: string
    templateStyle: string
  }>
  recentCLs: Array<{
    fullName: string
    jobTitle: string
    companyName: string
    language: string
    createdAt: string
  }>
}

interface AdminUser {
  id: string
  email: string
  name: string | null
  plan: string
  cvCountThisMonth: number
  clCountThisMonth: number
  lsCustomerId: string | null
  lsVariantId: string | null
  lsSubId: string | null
  createdAt: string
  updatedAt: string
  _count: {
    resumes: number
    coverLetters: number
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color = 'emerald',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  trend?: string
  color?: 'emerald' | 'amber' | 'blue' | 'rose'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    blue: 'bg-sky-50 text-sky-600 border-sky-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
  }
  const iconBg = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <Card className={`border ${colorMap[color]} transition-all hover:shadow-md`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="w-3 h-3" />
                {trend}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return (
      <Badge className="bg-emerald-600 text-white border-0 gap-1">
        <Crown className="w-3 h-3" />
        Pro
      </Badge>
    )
  }
  if (plan === 'lifetime') {
    return (
      <Badge className="bg-amber-500 text-white border-0 gap-1">
        <Zap className="w-3 h-3" />
        Lifetime
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <UserX className="w-3 h-3" />
      Free
    </Badge>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const { language } = useCVStore()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([])
  interface SatData {
  avgRating: number
  totalRatings: number
  recentCount: number
  recentAvg: number
  cvCount: number
  clCount: number
  ratingCounts: Record<number, number>
  ratings: Array<Record<string, unknown>>
}

const [satData, setSatData] = useState<SatData | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    }
  }, [])

  const fetchUsers = useCallback(async (p: number, s: string, pf: string) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '15' })
      if (s) params.set('search', s)
      if (pf) params.set('plan', pf)
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotalUsers(data.pagination.total)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      Promise.all([
        fetchStats(),
        fetchUsers(1, '', ''),
        fetch('/api/admin/support').then(r => r.ok ? r.json().then(d => setTickets(d.tickets || [])) : null),
        fetch('/api/admin/satisfaction').then(r => r.ok ? r.json().then(d => setSatData(d)) : null),
      ]).finally(() => setLoading(false))
    }
  }, [isOpen, fetchStats, fetchUsers])

  const handleRefresh = async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchUsers(page, search, planFilter),
      fetch('/api/admin/support').then(r => r.ok ? r.json().then(d => setTickets(d.tickets || [])) : null),
      fetch('/api/admin/satisfaction').then(r => r.ok ? r.json().then(d => setSatData(d)) : null),
    ])
    setLoading(false)
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
    fetchUsers(1, val, planFilter)
  }

  const handlePlanFilter = (pf: string) => {
    setPlanFilter(pf === planFilter ? '' : pf)
    setPage(1)
    fetchUsers(1, search, pf === planFilter ? '' : pf)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchUsers(newPage, search, planFilter)
  }

  const totalPages = Math.ceil(totalUsers / 15)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{t(language, 'adminDashTitle')}</DialogTitle>
              <p className="text-xs text-muted-foreground">{t(language, 'adminDashSubtitle')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t(language, 'adminDashRefresh')}
          </Button>
        </DialogHeader>

        {loading && !stats ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : stats ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-6 pt-4">
              <TabsList className="w-full justify-start bg-muted/50 rounded-lg">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabOverview')}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabUsers')}
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabActivity')}
                </TabsTrigger>
                <TabsTrigger value="revenue" className="gap-1.5 text-xs sm:text-sm">
                  <DollarSign className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabRevenue')}
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-1.5 text-xs sm:text-sm">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabSupport')}
                </TabsTrigger>
                <TabsTrigger value="satisfaction" className="gap-1.5 text-xs sm:text-sm">
                  <Star className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabSatisfaction')}
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
                  <Receipt className="w-3.5 h-3.5" />
                  {t(language, 'adminDashTabDocuments')}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
              <div className="p-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={Users}
                      label={t(language, 'adminDashStatUsers')}
                      value={stats.overview.totalUsers}
                      sub={`${stats.overview.proUsers} Pro · ${stats.overview.lifetimeUsers} Lifetime`}
                      trend={stats.last30days.newUsers > 0 ? `+${stats.last30days.newUsers} ${t(language, 'adminDashThisMonth')}` : undefined}
                      color="emerald"
                    />
                    <StatCard
                      icon={FileText}
                      label={t(language, 'adminDashStatCVs')}
                      value={stats.overview.totalCVs}
                      sub={stats.last30days.newCVs > 0 ? `+${stats.last30days.newCVs} ${t(language, 'adminDashThisMonth')}` : undefined}
                      color="blue"
                    />
                    <StatCard
                      icon={PenLine}
                      label={t(language, 'adminDashStatCoverLetters')}
                      value={stats.overview.totalCLs}
                      sub={stats.last30days.newCLs > 0 ? `+${stats.last30days.newCLs} ${t(language, 'adminDashThisMonth')}` : undefined}
                      color="amber"
                    />
                    <StatCard
                      icon={DollarSign}
                      label={t(language, 'adminDashStatRevenueMonth')}
                      value={`${stats.overview.estimatedMonthlyRevenue.toFixed(2)} €`}
                      sub={`${t(language, 'adminDashLifetimeTotal')} ${stats.overview.totalRevenueLifetime.toFixed(2)} €`}
                      color="emerald"
                    />
                  </div>

                  {/* Plan Distribution + Daily Signups */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Plan Distribution */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">{t(language, 'adminDashPlanDistribution')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stats.overview.totalUsers === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">{t(language, 'adminDashNoUsers')}</p>
                        ) : (
                          <>
                            {/* Free */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Free</Badge>
                                  <span className="text-muted-foreground">{stats.planDistribution.free} {t(language, 'adminDashUsersCount')}</span>
                                </div>
                                <span className="font-medium">
                                  {stats.overview.totalUsers > 0
                                    ? Math.round((stats.planDistribution.free / stats.overview.totalUsers) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-stone-400 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${stats.overview.totalUsers > 0 ? (stats.planDistribution.free / stats.overview.totalUsers) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Pro */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-emerald-600 text-white border-0">Pro</Badge>
                                  <span className="text-muted-foreground">{stats.planDistribution.pro} {t(language, 'adminDashUsersCount')}</span>
                                </div>
                                <span className="font-medium">
                                  {stats.overview.totalUsers > 0
                                    ? Math.round((stats.planDistribution.pro / stats.overview.totalUsers) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${stats.overview.totalUsers > 0 ? (stats.planDistribution.pro / stats.overview.totalUsers) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Lifetime */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-amber-500 text-white border-0">Lifetime</Badge>
                                  <span className="text-muted-foreground">{stats.planDistribution.lifetime} {t(language, 'adminDashUsersCount')}</span>
                                </div>
                                <span className="font-medium">
                                  {stats.overview.totalUsers > 0
                                    ? Math.round((stats.planDistribution.lifetime / stats.overview.totalUsers) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${stats.overview.totalUsers > 0 ? (stats.planDistribution.lifetime / stats.overview.totalUsers) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Daily Signups Chart (Simple) */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">{t(language, 'adminDashSignupsTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Object.keys(stats.dailySignups).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">{t(language, 'adminDashNoRecentSignups')}</p>
                        ) : (
                          <div className="flex items-end gap-1 h-32">
                            {Object.entries(stats.dailySignups)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([date, count]) => {
                                const maxCount = Math.max(...Object.values(stats.dailySignups), 1)
                                const height = Math.max((count / maxCount) * 100, 4)
                                return (
                                  <div
                                    key={date}
                                    className="flex-1 flex flex-col items-center gap-1 group relative"
                                  >
                                    <div className="absolute -top-8 bg-foreground text-background text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                      {count} · {formatShortDate(date)}
                                    </div>
                                    <div
                                      className="w-full bg-emerald-500 rounded-t-sm transition-all duration-300 hover:bg-emerald-600 min-h-[4px]"
                                      style={{ height: `${height}%` }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                      {date.split('-')[2]}
                                    </span>
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Last 30 Days Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">{t(language, 'adminDashLast30Title')}</CardTitle>
                      <CardDescription>{t(language, 'adminDashLast30Desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-xl bg-emerald-50">
                          <p className="text-2xl font-bold text-emerald-700">{stats.last30days.newUsers}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t(language, 'adminDashNewUsers')}</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-sky-50">
                          <p className="text-2xl font-bold text-sky-700">{stats.last30days.newCVs}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t(language, 'adminDashNewCVs')}</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-amber-50">
                          <p className="text-2xl font-bold text-amber-700">{stats.last30days.newCLs}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t(language, 'adminDashNewCLs')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="mt-0 space-y-4">
                  {/* Search & Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t(language, 'adminDashSearchPlaceholder')}
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      {[{ key: '', label: t(language, 'adminDashFilterAll') }, { key: 'free', label: 'Free' }, { key: 'pro', label: 'Pro' }, { key: 'lifetime', label: 'Lifetime' }].map(
                        (f) => (
                          <Button
                            key={f.key}
                            variant={planFilter === f.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePlanFilter(f.key)}
                            className={`text-xs ${planFilter === f.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                          >
                            {f.label}
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Users Table */}
                  <Card className="overflow-hidden">
                    <ScrollArea className="max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableUser')}</TableHead>
                            <TableHead className="text-xs font-semibold">{t(language, 'adminDashTablePlan')}</TableHead>
                            <TableHead className="text-xs font-semibold text-center">{t(language, 'adminDashTableCVs')}</TableHead>
                            <TableHead className="text-xs font-semibold text-center">{t(language, 'adminDashTableCL')}</TableHead>
                            <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableSignup')}</TableHead>
                            <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableLSStatus')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                {Array.from({ length: 6 }).map((_, j) => (
                                  <TableCell key={j}>
                                    <Skeleton className="h-4 w-20" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : users.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">{t(language, 'adminDashNoUserFound')}</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div>
                                    <p className="text-sm font-medium truncate max-w-[150px]">{user.name || '—'}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <PlanBadge plan={user.plan} />
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium">{user._count.resumes}</TableCell>
                                <TableCell className="text-center text-sm font-medium">{user._count.coverLetters}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                                <TableCell>
                                  {user.lsCustomerId ? (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">
                                      {t(language, 'adminDashStatusActive')}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          {totalUsers} {t(language, 'adminDashUsersCount')} · {t(language, 'adminDashPage')} {page}/{totalPages}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={page >= totalPages}
                            onClick={() => handlePageChange(page + 1)}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 space-y-6">
                  {/* Recent CVs */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        {t(language, 'adminDashRecentCVsTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.recentCVs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t(language, 'adminDashNoCVsYet')}</p>
                      ) : (
                        <ScrollArea className="max-h-[250px]">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableName')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableTargetJob')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableLanguage')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableTemplate')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableDate')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.recentCVs.map((cv, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm font-medium">{cv.fullName}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{cv.targetJob}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Globe className="w-3 h-3" />
                                      {cv.language.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground capitalize">{cv.templateStyle}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{formatDate(cv.createdAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Cover Letters */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-amber-600" />
                        {t(language, 'adminDashRecentCLsTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.recentCLs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t(language, 'adminDashNoCLsYet')}</p>
                      ) : (
                        <ScrollArea className="max-h-[250px]">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableName')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableJob')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableCompany')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableLanguage')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableDate')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.recentCLs.map((cl, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm font-medium">{cl.fullName}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{cl.jobTitle}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{cl.companyName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Globe className="w-3 h-3" />
                                      {cl.language.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{formatDate(cl.createdAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Signups */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        {t(language, 'adminDashRecentSignupsTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.recentUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t(language, 'adminDashNoUsers')}</p>
                      ) : (
                        <ScrollArea className="max-h-[250px]">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableName')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableEmail')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTablePlan')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t(language, 'adminDashTableDate')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.recentUsers.map((u, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm font-medium">{u.name || '—'}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                  <TableCell><PlanBadge plan={u.plan} /></TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Revenue Tab */}
                <TabsContent value="revenue" className="mt-0 space-y-6">
                  {/* Revenue Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-emerald-600">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">{t(language, 'adminDashRevenueProTitle')}</p>
                            <p className="text-3xl font-bold text-emerald-700">
                              {stats.overview.monthlyRevenuePro.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashProSubscribers')}</span>
                            <span className="font-medium">{stats.overview.proUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashPricePerUnit')}</span>
                            <span className="font-medium">{t(language, 'adminDashProPriceEur')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashPricePerUnitUSD')}</span>
                            <span className="font-medium">{t(language, 'adminDashProPriceUsd')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-amber-500">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">{t(language, 'adminDashLifetimeRevenueTitle')}</p>
                            <p className="text-3xl font-bold text-amber-700">
                              {stats.overview.totalRevenueLifetime.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashLifetimeBuyers')}</span>
                            <span className="font-medium">{stats.overview.lifetimeUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashPricePerUnit')}</span>
                            <span className="font-medium">{t(language, 'adminDashLifetimePriceEur')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t(language, 'adminDashPricePerUnitUSD')}</span>
                            <span className="font-medium">{t(language, 'adminDashLifetimePriceUsd')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">{t(language, 'adminDashFinancialSummary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                          <span className="text-sm font-medium">{t(language, 'adminDashMonthlyRevPro')}</span>
                          <span className="text-lg font-bold text-emerald-700">{stats.overview.monthlyRevenuePro.toFixed(2)} €</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                          <span className="text-sm font-medium">{t(language, 'adminDashTotalLifetimeSales')}</span>
                          <span className="text-lg font-bold text-amber-700">{stats.overview.totalRevenueLifetime.toFixed(2)} €</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-sm font-semibold">{t(language, 'adminDashEstimatedTotal')}</span>
                          <span className="text-xl font-bold text-emerald-700">
                            {(stats.overview.monthlyRevenuePro + stats.overview.totalRevenueLifetime).toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-muted/30 border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">{t(language, 'adminDashNote')}</strong> {t(language, 'adminDashRevenueDisclaimer')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Structure Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">{t(language, 'adminDashPricingStructure')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Crown className="w-4 h-4 text-emerald-600" />
                            {t(language, 'adminDashPlanProMonthly')}
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-1 ml-6">
                            <p>EUR: {t(language, 'adminDashProPriceEur')}</p>
                            <p>USD: {t(language, 'adminDashProPriceUsd')}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {t(language, 'adminDashPlanLifetimeOneTime')}
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-1 ml-6">
                            <p>EUR: {t(language, 'adminDashLifetimePriceEur')}</p>
                            <p>USD: {t(language, 'adminDashLifetimePriceUsd')}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        {t(language, 'adminDashSupportTickets')} ({tickets.length})
                      </CardTitle>
                      <CardDescription>{t(language, 'adminDashSupportDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t(language, 'adminDashNoTickets')}</p>
                      ) : (
                        <ScrollArea className="max-h-[400px]">
                          <div className="space-y-3">
                            {tickets.map((ticket: any) => (
                              <div key={ticket.id} className="p-3 rounded-xl border space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{ticket.name}</span>
                                    <Badge
                              variant={ticket.status === 'open' ? 'destructive' : ticket.status === 'resolved' ? 'default' : 'secondary'}
                              className="text-xs gap-1"
                            >
                              {ticket.status === 'open' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              {ticket.status === 'open' ? t(language, 'adminDashTicketOpen') : ticket.status === 'resolved' ? t(language, 'adminDashTicketResolved') : t(language, 'adminDashTicketClosed')}
                            </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</span>
                                </div>
                                <p className="text-sm font-medium">{ticket.subject}</p>
                                <p className="text-xs text-muted-foreground">{ticket.email}</p>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">{ticket.message}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Satisfaction Tab */}
                <TabsContent value="satisfaction" className="mt-0 space-y-6">
                  {satData ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard icon={Star} label={t(language, 'adminDashAvgRating')} value={`${satData.avgRating}/5`} color="amber" />
                        <StatCard icon={Users} label={t(language, 'adminDashTotalReviews')} value={satData.totalRatings as number} color="emerald" />
                        <StatCard icon={Calendar} label={t(language, 'adminDashReviews30d')} value={satData.recentCount as number} sub={`${t(language, 'adminDashAvg')} ${satData.recentAvg}/5`} color="blue" />
                        <StatCard icon={FileText} label={t(language, 'adminDashCVReviews')} value={satData.cvCount as number} sub={`${t(language, 'adminDashCLsLabel')} ${satData.clCount}`} color="emerald" />
                      </div>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">{t(language, 'adminDashRatingDistribution')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {([5, 4, 3, 2, 1] as const).map((star) => {
                              const count = (satData.ratingCounts as Record<number, number>)[star] || 0
                              const maxCount = Math.max(...Object.values(satData.ratingCounts as Record<number, number>), 1)
                              const pct = (satData.totalRatings as number) > 0 ? (count / (satData.totalRatings as number)) * 100 : 0
                              return (
                                <div key={star} className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 w-16 justify-end">
                                    <span className="text-sm font-medium">{star}</span>
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  </div>
                                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                      style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-16 text-right">{pct.toFixed(0)}% ({count})</span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {satData.ratings.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">{t(language, 'adminDashRecentReviews')}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="max-h-[250px]">
                              <div className="space-y-2">
                                {satData.ratings.slice(0, 20).map((r: any) => (
                                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                      <div className="flex">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                                        ))}
                                      </div>
                                      <Badge variant="outline" className="text-xs">{r.type === 'cv' ? t(language, 'adminDashReviewCV') : t(language, 'adminDashReviewCL')}</Badge>
                                    </div>
                                    <div className="text-right">
                                      {r.comment && <p className="text-xs text-muted-foreground max-w-[200px] truncate">{r.comment}</p>}
                                      <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">{t(language, 'adminDashNoReviews')}</p>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
