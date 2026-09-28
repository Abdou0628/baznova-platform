'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Loader2, ArrowLeft, Zap, Target, TrendingUp, Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Forecast {
  outlook: string
  careerScore: number
  skillDemandLevel: string
  insights: string[]
  emergingRoles: string[]
  salaryTrend: string
  recommendation: string
}

const INDUSTRIES = ['', 'Tech', 'Finance', 'Design', 'Marketing', 'Santé', 'Énergie', 'Commerce', 'Industrie']
const REGIONS = ['', 'Europe', 'Amériques', 'MENA', 'Asie']

function getOutlookColor(outlook: string) {
  if (outlook === 'bullish') return { bg: 'bg-emerald-100', text: 'text-emerald-700', key: 'intelOutlookBullish' }
  if (outlook === 'bearish') return { bg: 'bg-red-100', text: 'text-red-700', key: 'intelOutlookBearish' }
  return { bg: 'bg-amber-100', text: 'text-amber-700', key: 'intelOutlookModerate' }
}

const isRTL = false

export default function IntelligenceForecast() {
  const { language, setStep } = useCVStore()
  const rtl = language === 'ar'

  const [skill, setSkill] = useState('')
  const [industry, setIndustry] = useState('')
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<Forecast | null>(null)

  async function generateForecast() {
    if (!skill.trim()) return
    setLoading(true)
    setForecast(null)
    try {
      const res = await fetch('/api/intelligence/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, industry, region, language }),
      })
      const data = await res.json()
      setForecast(data.forecast || null)
    } catch {
      setForecast(null)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') generateForecast()
  }

  const outlookInfo = forecast ? getOutlookColor(forecast.outlook) : null

  return (
    <div className={`min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-violet-50/30 ${rtl ? 'rtl' : 'ltr'}`} dir={rtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep('intelligenceHome')} className="shrink-0">
              <ArrowLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'intelligenceForecastTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceForecastSubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* Input Form */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t(language, 'intelligenceTargetSkill')}</label>
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t(language, 'intelligenceTargetSkillPlaceholder')}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t(language, 'intelligenceTargetIndustry')}</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">--</option>
                    {INDUSTRIES.filter(Boolean).map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t(language, 'intelligenceTargetRegion')}</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">--</option>
                  {REGIONS.filter(Boolean).map(reg => <option key={reg} value={reg}>{reg}</option>)}
                </select>
              </div>
              <Button
                onClick={generateForecast}
                disabled={loading || !skill.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                {loading ? t(language, 'intelligenceGenerating') : t(language, 'intelligenceGenerateForecast')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm text-amber-700">{t(language, 'intelligenceGenerating')}</p>
          </div>
        )}

        {forecast && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Success Toast */}
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">{t(language, 'intelligenceForecastReady')}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Outlook */}
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <h3 className="font-semibold text-sm text-foreground">{t(language, 'intelligenceOutlook')}</h3>
                  </div>
                  {outlookInfo && (
                    <Badge className={`${outlookInfo.bg} ${outlookInfo.text} text-sm font-bold px-3 py-1`}>{t(language, outlookInfo.key as 'intelOutlookBullish')}</Badge>
                  )}
                  {forecast.salaryTrend && <p className="text-xs text-muted-foreground mt-3">{forecast.salaryTrend}</p>}
                </CardContent>
              </Card>

              {/* Career Score */}
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-violet-600" />
                    <h3 className="font-semibold text-sm text-foreground">{t(language, 'intelligenceCareerScore')}</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-foreground">{forecast.careerScore}</span>
                    <span className="text-sm text-muted-foreground mb-1">/100</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 mt-3">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${forecast.careerScore >= 70 ? 'bg-emerald-500' : forecast.careerScore >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, forecast.careerScore)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Skill Demand */}
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-semibold text-sm text-foreground">{t(language, 'intelligenceSkillDemand')}</h3>
                  </div>
                  <Badge className={
                    forecast.skillDemandLevel === 'very_high' || forecast.skillDemandLevel === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : forecast.skillDemandLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }>
                    {forecast.skillDemandLevel?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                  </Badge>
                  {forecast.emergingRoles && forecast.emergingRoles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {forecast.emergingRoles.map((role, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{role}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <h3 className="font-semibold text-sm text-foreground">{t(language, 'intelligenceKeyInsights')}</h3>
                </div>
                <ul className="space-y-2">
                  {(forecast.insights || []).map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
                {forecast.recommendation && (
                  <div className="mt-4 p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <p className="text-xs font-semibold text-violet-900 mb-1">{t(language, 'intelRecommendationLabel')}</p>
                    <p className="text-sm text-violet-800">{forecast.recommendation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!forecast && !loading && (
          <Card className="border">
            <CardContent className="p-12 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceNoForecast')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}