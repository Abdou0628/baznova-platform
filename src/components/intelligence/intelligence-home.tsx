'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, DollarSign, BarChart3, ArrowRight, ArrowLeft, Zap, Activity, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface DashboardMetrics {
  salaryIndex: number
  marketGrowth: number
  topSkills: string[]
  marketHealth: number
}

interface Insight {
  title: string
  description: string
  type: 'growing' | 'salary' | 'forecast'
}

export default function IntelligenceHome() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [trendsRes, salaryRes] = await Promise.all([
          fetch('/api/intelligence/trends'),
          fetch('/api/intelligence/salary'),
        ])
        const trends = await trendsRes.json()
        const salaryData = await salaryRes.json()

        const topSkills = (Array.isArray(trends) ? trends : []).slice(0, 5).map((t: { skill: string }) => t.skill)
        const avgGrowth = (Array.isArray(trends) ? trends : []).length > 0
          ? ((Array.isArray(trends) ? trends : []).reduce((s: number, t: { growthRate: number }) => s + t.growthRate, 0) / (Array.isArray(trends) ? trends : []).length).toFixed(1)
          : 0

        setMetrics({
          salaryIndex: salaryData.avgGlobal || 55000,
          marketGrowth: Number(avgGrowth),
          topSkills,
          marketHealth: Math.min(95, 60 + Number(avgGrowth)),
        })

        // Generate featured insights
        const growingSkills = (Array.isArray(trends) ? trends : []).filter((t: { growthRate: number }) => t.growthRate > 20).slice(0, 2).map((t: { skill: string; growthRate: number }) => `${t.skill} (+${t.growthRate}%)`)
        setInsights([
          { title: t(language, 'lot3_intelligenceHome_growingSkills'), description: growingSkills.join(', ') || 'IA, Green Tech', type: 'growing' },
          { title: t(language, 'lot3_intelligenceHome_avgSalary'), description: `${(salaryData.avgGlobal || 55000).toLocaleString()} EUR`, type: 'salary' },
          { title: t(language, 'lot3_intelligenceHome_marketOutlook'), description: t(language, 'lot3_intelligenceHome_marketOutlookDesc'), type: 'forecast' },
        ])
      } catch {
        setMetrics({ salaryIndex: 55000, marketGrowth: 21.8, topSkills: ['IA', 'Data Science', 'Cybersécurité', 'Green Tech', 'Cloud'], marketHealth: 82 })
        setInsights([
          { title: t(language, 'lot3_intelligenceHome_growingSkills'), description: 'IA (+34%), Green Tech (+31%)', type: 'growing' },
          { title: t(language, 'lot3_intelligenceHome_avgSalary'), description: '55 000 EUR', type: 'salary' },
          { title: t(language, 'lot3_intelligenceHome_marketOutlook'), description: t(language, 'lot3_intelligenceHome_marketOutlookDesc'), type: 'forecast' },
        ])
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [language, isRTL])

  const quickNav: { icon: typeof Brain; labelKey: string; step: AppStep; color: string }[] = [
    { icon: TrendingUp, labelKey: 'intelligenceGoTrends', step: 'intelligenceTrends', color: 'violet' },
    { icon: DollarSign, labelKey: 'intelligenceGoSalary', step: 'intelligenceSalary', color: 'emerald' },
    { icon: Brain, labelKey: 'intelligenceGoForecast', step: 'intelligenceForecast', color: 'amber' },
  ]

  return (
    <div className={`min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-emerald-50/30 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer shrink-0">
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'mr-0 ml-1' : 'mr-1'}`} />
              {t(language, 'orchBack')}
            </Button>
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'intelligenceHomeTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceHomeSubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : metrics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: DollarSign, label: t(language, 'intelligenceSalaryIndex'), value: `${(metrics.salaryIndex / 1000).toFixed(0)}K`, sub: 'EUR', color: 'emerald' },
                { icon: TrendingUp, label: t(language, 'intelligenceMarketGrowth'), value: `+${metrics.marketGrowth}%`, sub: t(language, 'lot3_intelligenceHome_yoy'), color: 'violet' },
                { icon: Target, label: t(language, 'intelligenceTopSkills'), value: String(metrics.topSkills.length), sub: metrics.topSkills.slice(0, 3).join(', '), color: 'amber' },
                { icon: Activity, label: t(language, 'intelligenceMarketHealth'), value: `${metrics.marketHealth}/100`, sub: t(language, 'lot3_intelligenceHome_excellent'), color: 'teal' },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <Card className="border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          metric.color === 'emerald' ? 'bg-emerald-100' : metric.color === 'violet' ? 'bg-violet-100' : metric.color === 'amber' ? 'bg-amber-100' : 'bg-teal-100'
                        }`}>
                          <metric.icon className={`w-4 h-4 ${
                            metric.color === 'emerald' ? 'text-emerald-600' : metric.color === 'violet' ? 'text-violet-600' : metric.color === 'amber' ? 'text-amber-600' : 'text-teal-600'
                          }`} />
                        </div>
                        <Badge variant="secondary" className="text-xs font-medium">{metric.sub}</Badge>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Featured Insights */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">{t(language, 'intelligenceFeaturedInsights')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {insights.map((insight, i) => (
                      <Card key={i} className="border shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className={`w-4 h-4 ${insight.type === 'growing' ? 'text-violet-600' : insight.type === 'salary' ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <h3 className="font-semibold text-sm text-foreground">{insight.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>

            {/* Quick Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">{t(language, 'intelligenceQuickNav')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickNav.map((nav) => (
                  <Card
                    key={nav.step}
                    className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border-2 border-transparent hover:border-violet-400"
                    onClick={() => setStep(nav.step)}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        nav.color === 'violet' ? 'bg-violet-100' : nav.color === 'emerald' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        <nav.icon className={`w-6 h-6 ${
                          nav.color === 'violet' ? 'text-violet-600' : nav.color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm">{t(language, nav.labelKey)}</h3>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}