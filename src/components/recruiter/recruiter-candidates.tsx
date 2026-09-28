'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Search, Filter, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

interface Candidate {
  id: string
  name: string
  email: string
  score: number
  stage: string
  jobTitle?: string
  jobId?: string
  skills?: string
  appliedAt: string
}

export default function RecruiterCandidates() {
  const { language, setStep } = useCVStore()
  const lang = language as CVLanguage
  const isRTL = lang === 'ar'
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (minScore > 0) params.set('minScore', String(minScore))
    fetch(`/api/recruiter/candidates?${params}`)
      .then(r => r.json())
      .then(data => setCandidates(data.candidates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, minScore])

  const filteredCandidates = candidates.filter(c => {
    if (activeFilters.length === 0) return true
    return activeFilters.some(f => c.skills?.toLowerCase().includes(f.toLowerCase()) || c.name.toLowerCase().includes(f.toLowerCase()))
  })

  const sortedCandidates = [...filteredCandidates].sort((a, b) => b.score - a.score)

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  const scoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
    if (score >= 60) return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
    return 'bg-red-100 text-red-700 hover:bg-red-100'
  }

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const clearFilters = () => {
    setSearch('')
    setMinScore(0)
    setActiveFilters([])
  }

  const hasFilters = search || minScore > 0 || activeFilters.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setStep('recruiterHome')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''} ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t(lang, 'recruiterBack')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-amber-600" />
              {t(lang, 'recruiterCandidatesTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">{t(lang, 'recruiterCandidatesSubtitle')}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  placeholder={t(lang, 'recruiterSearchCandidates')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-2 flex-wrap">
                  {[t(lang, 'recruiterStageNew'), t(lang, 'recruiterStageScreening'), t(lang, 'recruiterStageInterview'), t(lang, 'recruiterStageOffer'), t(lang, 'recruiterStageHired')].map(f => (
                    <Badge
                      key={f}
                      variant={activeFilters.includes(f) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleFilter(f)}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{t(lang, 'recruiterFilterScore')}:</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore || ''}
                  onChange={e => setMinScore(Number(e.target.value) || 0)}
                  className="w-20 h-8 text-sm"
                  placeholder="0"
                />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="cursor-pointer text-red-500 h-8">
                  <X className={`w-3.5 h-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {t(lang, 'recruiterClearFilters')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {sortedCandidates.length} {t(lang, 'recruiterCandidate')}{sortedCandidates.length !== 1 ? 's' : ''}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setStep('recruiterMatch')} className="cursor-pointer text-amber-600">
            <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t(lang, 'recruiterAIMatch')}
          </Button>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : sortedCandidates.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">{t(lang, 'recruiterNoResults')}</p>
            <Button className="mt-4 bg-amber-600 hover:bg-amber-700 cursor-pointer" onClick={() => setStep('recruiterMatch')}>
              <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t(lang, 'recruiterAIMatch')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sortedCandidates.map((candidate, i) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{candidate.name}</p>
                          {candidate.jobTitle && (
                            <Badge variant="outline" className="text-xs shrink-0">{candidate.jobTitle}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{candidate.email}</p>
                        {candidate.skills && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {candidate.skills.split(',').slice(0, 4).map((s, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">{s.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`text-right shrink-0 ${isRTL ? 'order-first' : ''}`}>
                        <p className={`text-2xl font-bold ${scoreColor(candidate.score)}`}>{candidate.score}%</p>
                        <Badge className={`text-xs mt-1 ${scoreBadgeColor(candidate.score)}`}>{t(lang, 'recruiterScoreLabel')}</Badge>
                        <Progress value={candidate.score} className="mt-2 h-1.5 w-20" />
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
