'use client'

import { useState, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, DollarSign, Clock, Filter, Briefcase, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t, type CVLanguage } from '@/lib/i18n'

interface Mission {
  id: string; title: string; description: string; category: string
  budgetMin: number; budgetMax: number; currency: string; duration: string
  skills: string; status: string; createdAt: string
  user: { name: string; companyName: string | null; image: string | null }
  _count: { proposals: number }
}

const categoryColors: Record<string, string> = {
  tech: 'bg-emerald-100 text-emerald-700', design: 'bg-pink-100 text-pink-700',
  marketing: 'bg-amber-100 text-amber-700', writing: 'bg-violet-100 text-violet-700',
  translation: 'bg-sky-100 text-sky-700', consulting: 'bg-orange-100 text-orange-700',
  video: 'bg-rose-100 text-rose-700', data: 'bg-teal-100 text-teal-700',
}

const categoryKeyMap: Record<string, string> = {
  tech: 'freelanceCategoryTech', design: 'freelanceCategoryDesign',
  marketing: 'freelanceCategoryMarketing', writing: 'freelanceCategoryWriting',
  translation: 'freelanceCategoryTranslation', consulting: 'freelanceCategoryConsulting',
  video: 'freelanceCategoryVideo', data: 'freelanceCategoryData',
}

const categories = ['tech', 'design', 'marketing', 'writing', 'translation', 'consulting', 'video', 'data']
const budgetRanges = ['0-500', '500-2000', '2000-5000', '5000-999999']
const budgetKeys = ['freelanceBudget0to500', 'freelanceBudget500to2000', 'freelanceBudget2000to5000', 'freelanceBudget5000plus']
const durationOptions = ['1 week', '2 weeks', '1 month', '3 months', '3 months +']
const durationKeys = ['freelanceDurationWeek', 'freelanceDuration2Weeks', 'freelanceDurationMonth', 'freelanceDuration3Months', 'freelanceDurationPlus']

export default function FreelanceBrowse() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [budget, setBudget] = useState('')
  const [duration, setDuration] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (category && category !== 'all') params.set('category', category)
    if (budget) params.set('budget', budget)
    if (duration) params.set('duration', duration)
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`/api/freelance/missions?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { if (!cancelled) setMissions(data.missions || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [keyword, category, budget, duration])

  const hasFilters = keyword || category || budget || duration
  const resetFilters = () => { setKeyword(''); setCategory(''); setBudget(''); setDuration('') }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setStep('freelanceHome' as AppStep)} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline ml-1">{t(language, 'orchBack')}</span>
          </Button>
          <div className="flex items-center gap-2">
            <Briefcase className="text-orange-500" />
            <h1 className="text-xl sm:text-2xl font-bold">{t(language, 'freelanceBrowse')}</h1>
          </div>
        </div>

        {/* Search & Filter Toggle */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={t(language, 'freelanceBrowseSearch')}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className={`${isRtl ? 'pr-9' : 'pl-9'}`}
            />
          </div>
          <Button variant="outline" className="shrink-0 cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
            <Filter className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            <span className="hidden sm:inline">{t(language, 'freelanceBrowseCategory')}</span>
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="shrink-0 cursor-pointer text-orange-600" onClick={resetFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t(language, 'freelanceBrowseCategory')}</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">{t(language, 'freelanceBrowseAllCategories')}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{t(language, categoryKeyMap[cat] as any)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Budget */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t(language, 'freelanceBrowseBudget')}</label>
                    <select
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">{t(language, 'freelanceBrowseAllBudgets')}</option>
                      {budgetKeys.map((key, i) => (
                        <option key={key} value={budgetRanges[i]}>{t(language, key as any)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Duration */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t(language, 'freelanceBrowseDuration')}</label>
                    <select
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                    >
                      <option value="">{t(language, 'freelanceBrowseAllDurations')}</option>
                      {durationKeys.map((key, i) => (
                        <option key={key} value={durationOptions[i]}>{t(language, key as any)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results count */}
        {!loading && missions.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {missions.length} {t(language, 'freelanceBrowseResults')}
          </p>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />)}
          </div>
        )}

        {/* Empty State */}
        {!loading && missions.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t(language, 'freelanceBrowseNoMissions')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t(language, 'freelanceBrowseNoMissionsDesc')}</p>
          </motion.div>
        )}

        {/* Mission Cards Grid */}
        {!loading && missions.length > 0 && (
          <Fragment>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {missions.map((mission, i) => {
                const skills: string[] = JSON.parse(mission.skills || '[]')
                return (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="hover:shadow-lg transition-all cursor-pointer h-full border hover:border-orange-200"
                      onClick={() => setStep('freelanceMission' as AppStep, { missionId: mission.id })}
                    >
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className={categoryColors[mission.category] || 'bg-gray-100 text-gray-700'}>
                            {t(language, (categoryKeyMap[mission.category] || 'freelanceCategoryTech') as any)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{mission._count.proposals} {t(language, 'freelanceMissionProposals')}</span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{mission.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{mission.description}</p>
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                          <span>{mission.user?.name}</span>
                        </p>
                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {skills.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">{skill}</Badge>
                            ))}
                            {skills.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{skills.length - 3}</Badge>}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="text-sm font-semibold text-orange-600 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              {mission.budgetMin.toLocaleString()} – {mission.budgetMax.toLocaleString()} {mission.currency}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{mission.duration}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </Fragment>
        )}
      </div>
    </div>
  )
}
