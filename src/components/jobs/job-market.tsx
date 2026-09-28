'use client'

import { useState, useEffect, useCallback } from 'react'
import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, MapPin, Briefcase, DollarSign, Building2, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Job {
  id: string; title: string; company: string; location: string; country: string
  type: string; salaryMin?: number; salaryMax?: number; currency: string
  description: string; requirements: string; skills?: string; language: string
  isRemote: boolean; isPaid: boolean; status: string; viewsCount: number; applicationsCount: number; createdAt: string
}

export default function JobMarketView() {
  const { setStep, language } = useCVStore()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [remote, setRemote] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 9

  const fetchJobs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (keyword) params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (type) params.set('type', type)
    if (remote) params.set('remote', 'true')
    fetch(`/api/jobs?${params}`)
      .then(r => r.json())
      .then(data => { setJobs(data.jobs || []); setTotal(data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, keyword, location, type, remote, limit])

  useEffect(() => { fetchJobs() }, [fetchJobs]) // eslint-disable-line react-hooks/set-state-in-effect

  const totalPages = Math.ceil(total / limit)
  const isRTL = language === 'ar'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'mr-0 ml-1' : 'mr-1'}`} /> {t(language, 'orchBack')}
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Briefcase className="text-emerald-600" /> {t(language, 'jobMarketTitle')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t(language, 'jobMarketSubtitle')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t(language, 'jobMarketKeyword')} value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t(language, 'jobMarketCity')} value={location} onChange={e => { setLocation(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <select
            value={type} onChange={e => { setType(e.target.value); setPage(1) }}
            className="h-9 rounded-md border bg-white px-3 text-sm"
          >
            <option value="">{t(language, 'jobMarketAllTypes')}</option>
            <option value="CDI">{t(language, 'jobMarketTypeCDI')}</option>
            <option value="CDD">{t(language, 'jobMarketTypeCDD')}</option>
            <option value="Freelance">{t(language, 'jobMarketTypeFreelance')}</option>
            <option value="Stage">{t(language, 'jobMarketTypeInternship')}</option>
            <option value="Alternance">{t(language, 'jobMarketTypeAlternance')}</option>
          </select>
          <label className="flex items-center gap-2 h-9 cursor-pointer text-sm">
            <input type="checkbox" checked={remote} onChange={e => { setRemote(e.target.checked); setPage(1) }} className="rounded" />
            <span className="text-muted-foreground">{t(language, 'jobMarketRemote')}</span>
          </label>
          <Button variant="outline" size="sm" onClick={() => { setKeyword(''); setLocation(''); setType(''); setRemote(false); setPage(1) }}>
            <Filter className={`w-4 h-4 ${isRTL ? 'mr-0 ml-1' : 'mr-1'}`} /> {t(language, 'jobMarketReset')}
          </Button>
        </div>

        {/* Results */}
        {loading && (
          <div className="grid gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
          </div>
        )}
        {!loading && jobs.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t(language, 'jobMarketNoResults')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t(language, 'jobMarketNoResultsHint')}</p>
          </motion.div>
        )}
        {!loading && jobs.length > 0 && (
          <Fragment>
            <p className="text-sm text-muted-foreground mb-4">{total} {t(language, total > 1 ? 'jobMarketResultsFound' : 'jobMarketResultFound')}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer h-full border hover:border-emerald-200" onClick={() => setStep('jobDetail', { jobId: job.id })}>
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-1">{job.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" /> {job.company}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">{job.type}</Badge>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                        <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}, {job.country}</p>
                        {(job.salaryMin || job.salaryMax) && (
                          <p className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salaryMin || '?'} - {job.salaryMax || '?'} {job.currency}</p>
                        )}
                        {job.skills && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills.split(',').slice(0, 4).map((s, si) => (
                              <Badge key={si} variant="outline" className="text-xs px-2 py-0">{s.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">{job.applicationsCount} {t(language, job.applicationsCount > 1 ? 'jobMarketApplications' : 'jobMarketApplication')}</span>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs cursor-pointer">{t(language, 'jobMarketApply')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{t(language, 'jobMarketPage')} {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Fragment>
        )}
      </div>
    </div>
  )
}
