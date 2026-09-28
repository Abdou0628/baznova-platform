'use client'

import { Brain, Sparkles, Activity, AlertTriangle, TrendingUp, Check, X, ArrowUpRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { type DashboardData, type AiInsight, formatMAD, t } from '../payment-types'

export function AiFinanceTab({ d, language, insights, loading, onAnalyze }: {
  d: DashboardData; language: string
  insights: AiInsight | null; loading: boolean
  onAnalyze: () => void
}) {
  return (
    <div className="mt-6 space-y-6">
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-950/20 dark:to-emerald-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50"><Brain className="size-5 text-violet-600" /></div>
            <div><p className="font-medium">{t('Agent IA Financier', 'AI Financial Agent', language)}</p><p className="text-sm text-muted-foreground">{t('Analyse intelligente de vos donnees financieres', 'Intelligent analysis of your financial data', language)}</p></div>
          </div>
          <Button className="gap-2 w-fit bg-violet-600 hover:bg-violet-700" disabled={loading} onClick={onAnalyze}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{t("Lancer l'analyse", 'Run Analysis', language)}
          </Button>
        </CardContent>
      </Card>

      {insights && (<>
        {/* Health Score */}
        <Card><CardHeader><CardTitle>{t('Score de Santé Financière', 'Financial Health Score', language)}</CardTitle></CardHeader><CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <div className="relative">
              <div className="size-32 rounded-full border-8" style={{ borderColor: insights.healthScore >= 70 ? '#059669' : insights.healthScore >= 40 ? '#d97706' : '#dc2626' }} />
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold">{insights.healthScore}</span></div>
            </div>
            <div className="max-w-md text-center sm:text-left"><p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p></div>
          </div>
        </CardContent></Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Forecast */}
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5" />{t('Prévisions', 'Forecast', language)}</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t('Revenu prochain mois', 'Next month revenue', language)}</span><span className="font-semibold text-emerald-600">{formatMAD(insights.forecast.nextMonthRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">MRR {t('projeté', 'projected', language)}</span><span className="font-semibold">{formatMAD(insights.forecast.projectedMRR)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t('Confiance', 'Confidence', language)}</span><Badge variant={insights.forecast.confidence >= 70 ? 'default' : 'secondary'}>{insights.forecast.confidence}%</Badge></div>
            <Progress value={insights.forecast.confidence} className="h-2" />
          </CardContent></Card>

          {/* Risks */}
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="size-5" />{t('Alertes & Risques', 'Alerts & Risks', language)}</CardTitle></CardHeader><CardContent>
            <ul className="space-y-2">{insights.risks.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm"><X className="mt-0.5 size-4 shrink-0 text-red-500" /><span>{r}</span></li>))}</ul>
          </CardContent></Card>

          {/* Insights */}
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-emerald-600"><TrendingUp className="size-5" />{t('Insights', 'Insights', language)}</CardTitle></CardHeader><CardContent>
            <ul className="space-y-2">{insights.insights.map((ins, i) => (<li key={i} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /><span>{ins}</span></li>))}</ul>
          </CardContent></Card>

          {/* Recommendations */}
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-violet-600"><Sparkles className="size-5" />{t('Recommandations IA', 'AI Recommendations', language)}</CardTitle></CardHeader><CardContent>
            <ul className="space-y-2">{insights.recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2 text-sm"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-violet-500" /><span>{rec}</span></li>))}</ul>
          </CardContent></Card>
        </div>
      </>)}
    </div>
  )
}