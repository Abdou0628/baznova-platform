'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, ArrowUpRight, ArrowDownRight, Brain, Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Trend {
  id: string
  skill: string
  industry: string
  growthRate: number
  demand: string
  region: string
}

const INDUSTRIES = ['all', 'Tech', 'Finance', 'Design', 'Marketing', 'Santé', 'Énergie', 'Commerce', 'Industrie']
const REGIONS = ['all', 'Europe', 'Amériques', 'MENA', 'Asie']

export default function IntelligenceTrends() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState('all')
  const [region, setRegion] = useState('all')
  const [aiAnalysis, setAiAnalysis] = useState<{ summary: string; growing: string; declining: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  async function loadTrends() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (industry !== 'all') params.set('industry', industry)
      if (region !== 'all') params.set('region', region)
      const res = await fetch(`/api/intelligence/trends?${params}`)
      const data = await res.json()
      setTrends(Array.isArray(data) ? data : [])
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTrends() }, [industry, region])

  async function handleAiAnalysis() {
    setAiLoading(true)
    setAiAnalysis(null)
    try {
      const res = await fetch('/api/intelligence/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, region, language }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis || null)
    } catch {
      setAiAnalysis(null)
    } finally {
      setAiLoading(false)
    }
  }

  function getGrowthLabel(rate: number) {
    if (rate > 20) return t(language, 'intelligenceGrowing')
    if (rate < 10) return t(language, 'intelligenceDeclining')
    return t(language, 'intelligenceStable')
  }

  function getDemandBadge(demand: string) {
    const map: Record<string, string> = {
      high: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-red-100 text-red-700',
    }
    const labelMap: Record<string, string> = {
      high: t(language, 'intelligenceDemandHigh'),
      medium: t(language, 'intelligenceDemandMedium'),
      low: t(language, 'intelligenceDemandLow'),
    }
    return <Badge className={map[demand] || ''}>{labelMap[demand] || demand}</Badge>
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-emerald-50/30 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep('intelligenceHome')} className="shrink-0">
              <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'intelligenceTrendsTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceTrendsSubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* Filters + AI Analysis Button */}
        <motion.div className="flex flex-col sm:flex-row gap-3 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label={t(language, 'intelligenceFilterIndustry')}
          >
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind === 'all' ? t(language, 'intelligenceFilterAll') : ind}</option>
            ))}
          </select>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label={t(language, 'intelligenceFilterRegion')}
          >
            {REGIONS.map(reg => (
              <option key={reg} value={reg}>{reg === 'all' ? t(language, 'intelligenceFilterAllRegions') : reg}</option>
            ))}
          </select>
          <Button
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            {t(language, 'intelligenceAiAnalysisBtn')}
          </Button>
        </motion.div>

        {/* AI Analysis Result */}
        {aiAnalysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-violet-600" />
                  <span className="font-semibold text-sm text-violet-900">{t(language, 'intelAiAnalysisLabel')}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{aiAnalysis.summary}</p>
                {aiAnalysis.growing && <p className="text-xs text-emerald-700 mb-1"><ArrowUpRight className="inline w-3 h-3 mr-1" />{aiAnalysis.growing}</p>}
                {aiAnalysis.declining && <p className="text-xs text-red-600"><ArrowDownRight className="inline w-3 h-3 mr-1" />{aiAnalysis.declining}</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {aiLoading && (
          <div className="mb-6 p-4 rounded-lg bg-violet-50 border border-violet-200 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
            <span className="text-sm text-violet-700">{t(language, 'intelligenceAiAnalyzing')}</span>
          </div>
        )}

        {/* Trends List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : trends.length === 0 ? (
          <Card className="border">
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceNoTrends')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {trends.map((trend, i) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm truncate">{trend.skill}</h3>
                          {trend.growthRate > 0
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                            : <ArrowDownRight className="w-4 h-4 text-red-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{trend.industry}</Badge>
                          <Badge variant="outline" className="text-xs">{trend.region}</Badge>
                          <span className="text-xs text-muted-foreground">{getGrowthLabel(trend.growthRate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {getDemandBadge(trend.demand)}
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{t(language, 'intelligenceGrowthRate')}</span>
                            <span className={`text-xs font-bold ${trend.growthRate > 15 ? 'text-emerald-600' : trend.growthRate > 10 ? 'text-amber-600' : 'text-red-500'}`}>
                              +{trend.growthRate}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${trend.growthRate > 20 ? 'bg-emerald-500' : trend.growthRate > 10 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, (trend.growthRate / 40) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}