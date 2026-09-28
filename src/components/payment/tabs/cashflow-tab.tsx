'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp, ArrowDownLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type CashFlowData, formatMAD, t } from '../payment-types'

export function CashFlowTab({ data, loading, language }: { data: CashFlowData | null; loading: boolean; language: string }) {
  if (loading) return <div className="mt-6"><Skeleton className="h-64 rounded-xl" /></div>
  if (!data) return null

  const kpis = [
    { label: t('Entrées ce mois', 'Inflows this month', language), value: formatMAD(data.currentMonth.inflow), icon: ArrowUpRight, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', trend: data.trends.inflowTrend },
    { label: t('Sorties ce mois', 'Outflows this month', language), value: formatMAD(data.currentMonth.outflow), icon: ArrowDownRight, color: 'text-red-600 bg-red-50 dark:bg-red-950/40', trend: data.trends.outflowTrend },
    { label: t('Flux net', 'Net Cash Flow', language), value: formatMAD(data.currentMonth.net), icon: data.currentMonth.net >= 0 ? ArrowUpRight : ArrowDownLeft, color: data.currentMonth.net >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-red-600 bg-red-50 dark:bg-red-950/40' },
    { label: t('Marge profit', 'Profit Margin', language), value: `${data.metrics.profitMargin}%`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
  ]

  const maxVal = Math.max(...data.months.map(x => Math.max(x.inflow, x.outflow)), 1)

  return (
    <div className="mt-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => {
          const Icon = c.icon; const up = (c.trend ?? 0) >= 0
          return (<Card key={c.label} className="py-4"><CardContent className="flex items-center gap-3 p-5">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${c.color}`}><Icon className="size-5" /></div>
            <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-lg font-semibold">{c.value}</p></div>
          </CardContent></Card>)
        })}
      </div>

      {/* Cash Flow Chart */}
      <Card><CardHeader><CardTitle>{t('Flux de Trésorerie — 6 mois', 'Cash Flow — 6 months', language)}</CardTitle></CardHeader><CardContent>
        <div className="space-y-4">
          {data.months.map((m) => {
            const inH = (m.inflow / maxVal) * 100
            const outH = (m.outflow / maxVal) * 100
            return (<div key={m.key} className="flex items-center gap-3">
              <span className="w-10 text-xs text-muted-foreground shrink-0">{m.label}</span>
              <div className="flex-1 flex gap-1 h-7">
                <div className="rounded-l-md bg-emerald-500" style={{ width: `${inH}%` }} title={`${t('Entrées', 'Inflows', language)}: ${formatMAD(m.inflow)}`} />
                <div className="rounded-r-md bg-red-400" style={{ width: `${outH}%` }} title={`${t('Sorties', 'Outflows', language)}: ${formatMAD(m.outflow)}`} />
              </div>
              <span className={`w-20 text-right text-xs font-medium ${m.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{m.net >= 0 ? '+' : ''}{formatMAD(m.net)}</span>
            </div>)
          })}
          <div className="flex gap-4 justify-center pt-2">
            <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-emerald-500" /><span className="text-xs text-muted-foreground">{t('Entrées', 'Inflows', language)}</span></div>
            <div className="flex items-center gap-1.5"><div className="size-3 rounded bg-red-400" /><span className="text-xs text-muted-foreground">{t('Sorties', 'Outflows', language)}</span></div>
          </div>
        </div>
      </CardContent></Card>

      {/* Metrics */}
      <Card><CardHeader><CardTitle>{t('Métriques de Trésorerie', 'Cash Flow Metrics', language)}</CardTitle></CardHeader><CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('Burn Rate moyen', 'Avg Burn Rate', language), value: formatMAD(data.metrics.burnRate) },
            { label: t('Runway (jours)', 'Runway (days)', language), value: `${data.metrics.runwayDays}j` },
            { label: t('Entrées moy./mois', 'Avg Inflow/month', language), value: formatMAD(data.metrics.avgMonthlyInflow) },
            { label: t('Sorties moy./mois', 'Avg Outflow/month', language), value: formatMAD(data.metrics.avgMonthlyOutflow) },
          ].map((m) => (<div key={m.label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{m.label}</p><p className="mt-1 text-lg font-semibold">{m.value}</p></div>))}
        </div>
      </CardContent></Card>
    </div>
  )
}