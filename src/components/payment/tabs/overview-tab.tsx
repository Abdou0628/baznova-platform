'use client'

import { DollarSign, Users, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type DashboardData, type LucideIcon, formatMAD, t, statusBadge, plans } from '../payment-types'

export function OverviewTab({ d, loading, language }: { d: DashboardData; loading: boolean; language: string }) {
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

  const kpiCards = [
    { label: t("Chiffre d'affaires total", 'Total Revenue', language), value: formatMAD(d.totalRevenue), icon: DollarSign, trend: d.revenueTrend, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: t('Abonnements actifs', 'Active Subscriptions', language), value: String(d.activeSubscriptions), icon: Users, trend: d.subscriptionTrend, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
    { label: t('Revenu récurrent mensuel', 'MRR', language), value: formatMAD(d.mrr), icon: TrendingUp, trend: 5.2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { label: t('Factures en attente', 'Pending Invoices', language), value: String(d.pendingInvoices), icon: AlertTriangle, trend: -3.1, color: 'text-red-600 bg-red-50 dark:bg-red-950/40' },
  ]

  return (
    <div className="mt-6 space-y-6">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((c) => {
            const Icon = c.icon; const up = c.trend >= 0
            return (
              <Card key={c.label} className="py-5"><CardContent className="flex items-center gap-4 p-6">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${c.color}`}><Icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{c.value}</p>
                </div>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(c.trend)}%
                </div>
              </CardContent></Card>
            )
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {loading ? <Skeleton className="h-64 lg:col-span-2 rounded-xl" /> : (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>{t('Revenus mensuels', 'Monthly Revenue', language)}</CardTitle><CardDescription>{t('6 derniers mois', 'Last 6 months', language)}</CardDescription></CardHeader>
            <CardContent>
              <div className="flex h-52 items-end gap-3 sm:gap-5">
                {d.monthlyRevenue.map((b) => {
                  const h = maxRev > 0 ? (b.amount / maxRev) * 100 : 0
                  return (<div key={b.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{(b.amount / 1000).toFixed(1)}k</span>
                    <div className="w-full min-h-[8px] rounded-t-md bg-emerald-500 hover:bg-emerald-600" style={{ height: `${h}%` }} />
                    <span className="text-xs text-muted-foreground">{b.month}</span>
                  </div>)
                })}
              </div>
            </CardContent>
          </Card>
        )}
        {loading ? <Skeleton className="h-64 rounded-xl" /> : (
          <Card className="h-full"><CardHeader><CardTitle>{t('Répartition abonnements', 'Subscription Mix', language)}</CardTitle></CardHeader>
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
        )}
      </div>

      {/* Transactions Table */}
      {loading ? <Skeleton className="h-80 rounded-xl" /> : (
        <Card><CardHeader><CardTitle>{t('Transactions récentes', 'Recent Transactions', language)}</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table><TableHeader><TableRow>
                <TableHead>{t('Date', 'Date', language)}</TableHead><TableHead>{t('Client', 'Client', language)}</TableHead>
                <TableHead>Plan</TableHead><TableHead>{t('Montant', 'Amount', language)}</TableHead>
                <TableHead>{t('Statut', 'Status', language)}</TableHead><TableHead>Provider</TableHead>
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
      )}
    </div>
  )
}