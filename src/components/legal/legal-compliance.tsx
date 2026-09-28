'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertTriangle, ClipboardList, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const jurisdictions = [
  { value: 'ma', labelKey: 'legalJurisdictionMa' as TranslationKey },
  { value: 'fr', labelKey: 'legalJurisdictionFr' as TranslationKey },
  { value: 'eu', labelKey: 'legalJurisdictionEu' as TranslationKey },
  { value: 'sa', labelKey: 'legalJurisdictionSa' as TranslationKey },
  { value: 'ae', labelKey: 'legalJurisdictionAe' as TranslationKey },
]

interface CheckItem {
  item: string
  checked: boolean
  required: boolean
}

export default function LegalCompliance() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const [jurisdiction, setJurisdiction] = useState('ma')
  const [analyzing, setAnalyzing] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [checklist, setChecklist] = useState<CheckItem[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [error, setError] = useState('')

  async function handleCheck() {
    setAnalyzing(true)
    setError('')
    setScore(null)
    setChecklist([])
    setRecommendations([])
    try {
      const res = await fetch('/api/legal/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jurisdiction, language }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setScore(data.score ?? 0)
        setChecklist(Array.isArray(data.checklist) ? data.checklist : [])
        setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : [])
      }
    } catch {
      setError(t(language, 'legalFailedComplianceCheck'))
    } finally {
      setAnalyzing(false)
    }
  }

  function getScoreColor(s: number) {
    if (s >= 80) return 'text-emerald-600'
    if (s >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  function getScoreBg(s: number) {
    if (s >= 80) return 'bg-emerald-50 border-emerald-200'
    if (s >= 50) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  function getScoreRing(s: number) {
    if (s >= 80) return 'stroke-emerald-500'
    if (s >= 50) return 'stroke-amber-500'
    return 'stroke-red-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/40 via-white to-slate-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-red-100 hover:bg-red-800/50 mb-4" onClick={() => setStep('legalHome' as AppStep)}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-0 ml-2' : 'mr-2'}`} />
            {t(language, 'legalBackToHome')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t(language, 'legalComplianceTitle')}</h1>
              <p className="text-red-200 text-sm">{t(language, 'legalComplianceSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Jurisdiction Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-red-200 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t(language, 'legalJurisdiction')}</h3>
                  <p className="text-sm text-muted-foreground">{t(language, 'legalComplianceSubtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jurisdictions.map((j) => (
                    <Badge
                      key={j.value}
                      variant={jurisdiction === j.value ? 'default' : 'outline'}
                      className={`cursor-pointer px-3 py-1.5 text-xs ${
                        jurisdiction === j.value
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border-red-300 text-red-700 hover:bg-red-50'
                      }`}
                      onClick={() => setJurisdiction(j.value)}
                    >
                      {t(language, j.labelKey)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
                  onClick={handleCheck}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t(language, 'legalAnalyzing')}</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" />{t(language, 'legalRunCheck')}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">{t(language, 'legalAnalyzing')}</p>
          </motion.div>
        )}

        {score !== null && !analyzing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score Card */}
            <Card className={`border-2 mb-8 ${getScoreBg(score)}`}>
              <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
                    <circle
                      cx="60" cy="60" r="50" fill="none" strokeWidth="8" strokeLinecap="round"
                      className={getScoreRing(score)}
                      strokeDasharray={`${(score / 100) * 314} 314`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
                  </div>
                </div>
                <div className="text-center sm:text-start">
                  <h3 className={`text-2xl font-bold ${getScoreColor(score)}`}>{t(language, 'legalScoreLabel')}</h3>
                  <p className="text-muted-foreground mt-1">
                    {t(language, score >= 80 ? 'legalExcellentCompliance' : score >= 50 ? 'legalNeedsImprovement' : 'legalCriticalIssues')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Checklist */}
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-foreground">{t(language, 'legalChecklist')}</h3>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {checklist.map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.checked ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {item.checked ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.item}</p>
                          {item.required && (
                            <Badge className="mt-1 text-[10px] bg-red-100 text-red-700">{t(language, 'legalRequiredBadge')}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-foreground">{t(language, 'legalRecommendations')}</h3>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ArrowRight className={`w-4 h-4 text-red-500 shrink-0 mt-0.5 ${isRTL ? 'rotate-180' : ''}`} />
                          <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                        </div>
                      </div>
                    ))}
                    {recommendations.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">{t(language, 'legalNoRecommendations')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
