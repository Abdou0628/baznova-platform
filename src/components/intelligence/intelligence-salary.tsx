'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Search, ArrowLeft, Globe, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface SalaryResult {
  id: string
  jobTitle: string
  industry: string
  location: string
  salaryMin: number
  salaryAvg: number
  salaryMax: number
  currency: string
}

export default function IntelligenceSalary() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SalaryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function searchSalary() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/intelligence/salary?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      setSearched(true)
      try {
        const res = await fetch('/api/intelligence/salary')
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchSalary()
  }, [query])

  function formatSalary(amount: number, currency: string) {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : language === 'es' ? 'es-ES' : language === 'en' ? 'en-GB' : 'fr-FR', {
      style: 'currency',
      currency: currency === 'MAD' ? 'MAD' : currency === 'AED' ? 'AED' : currency === 'SAR' ? 'SAR' : 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function getBarWidth(avg: number) {
    const maxAvg = Math.max(...results.map(r => r.salaryAvg), 1)
    return Math.max(5, (avg / maxAvg) * 100)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-violet-50/30 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep('intelligenceHome')} className="shrink-0">
              <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'intelligenceSalaryTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceSalarySubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(language, 'intelligenceSearchPlaceholder')}
                className={`w-full rounded-lg border border-input bg-background py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
              />
            </div>
            <Button onClick={searchSalary} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              {t(language, 'intelligenceSearch')}
            </Button>
          </div>
        </motion.div>

        {/* Benefits Card */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm text-emerald-900">{t(language, 'intelligenceBenefits')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t(language, 'intelligenceBenefitsDesc')}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : searched && results.length === 0 ? (
          <Card className="border">
            <CardContent className="p-8 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t(language, 'intelligenceNoResults')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm">{result.jobTitle}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{result.industry}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="w-3 h-3" />{result.location}
                            </span>
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-lg font-bold text-emerald-700">{formatSalary(result.salaryAvg, result.currency)}</p>
                          <p className="text-xs text-muted-foreground">{t(language, 'intelligenceAvgSalary')}</p>
                        </div>
                      </div>
                      {/* Salary Bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">
                          {t(language, 'intelligenceMinSalary')}: {formatSalary(result.salaryMin, result.currency)}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-3 relative">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${getBarWidth(result.salaryAvg)}%` }}
                          />
                          <BarChart3 className="absolute top-1/2 -translate-y-1/2 w-3 h-3 text-foreground -translate-x-1/2" style={{ left: `${getBarWidth(result.salaryAvg)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-24 shrink-0 text-end">
                          {t(language, 'intelligenceMaxSalary')}: {formatSalary(result.salaryMax, result.currency)}
                        </span>
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