'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Search, MapPin, Briefcase, DollarSign, Building2, Filter, ChevronLeft, ChevronRight, Plane, Shield, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface GlobalJob {
  id: string; title: string; company: string; location: string; country: string
  region: string; type: string; salaryMin?: number; salaryMax?: number; currency: string
  description: string; requirements: string; skills?: string; language: string
  visaSponsorship: boolean; relocationPackage: boolean; isRemote: boolean
  status: string; viewsCount: number; applicationsCount: number; createdAt: string
}

const regions = ['Monde', 'Europe', 'Asie', 'Afrique', 'Amériques', 'MENA']
const regionKeyMap: Record<string, string> = {
  'Monde': 'gMarketRegionMonde', 'Europe': 'gMarketRegionEurope', 'Asie': 'gMarketRegionAsie',
  'Afrique': 'gMarketRegionAfrique', 'Amériques': 'gMarketRegionAmeriques', 'MENA': 'gMarketRegionMENA',
}
const countryFlags: Record<string, string> = {
  France: '🇫🇷', Germany: '🇩🇪', UK: '🇬🇧', USA: '🇺🇸', Canada: '🇨🇦', UAE: '🇦🇪',
  Switzerland: '🇨🇭', Belgium: '🇧🇪', Spain: '🇪🇸', Italy: '🇮🇹', Japan: '🇯🇵', Australia: '🇦🇺',
  Morocco: '🇲🇦', Tunisia: '🇹🇳', Algeria: '🇩🇿', Senegal: '🇸🇳', Nigeria: '🇳🇬', Kenya: '🇰🇪',
  China: '🇨🇳', India: '🇮🇳', Singapore: '🇸🇬', Brazil: '🇧🇷', Mexico: '🇲🇽', Saudi: '🇸🇦'
}
const countryKeyMap: Record<string, string> = {
  'France': 'gMarketCountryFrance', 'Germany': 'gMarketCountryGermany', 'UK': 'gMarketCountryUK',
  'USA': 'gMarketCountryUSA', 'Canada': 'gMarketCountryCanada', 'UAE': 'gMarketCountryUAE',
  'Switzerland': 'gMarketCountrySwitzerland', 'Belgium': 'gMarketCountryBelgium', 'Spain': 'gMarketCountrySpain',
  'Italy': 'gMarketCountryItaly', 'Japan': 'gMarketCountryJapan', 'Australia': 'gMarketCountryAustralia',
  'Morocco': 'gMarketCountryMorocco', 'Tunisia': 'gMarketCountryTunisia', 'Algeria': 'gMarketCountryAlgeria',
  'Senegal': 'gMarketCountrySenegal', 'Nigeria': 'gMarketCountryNigeria', 'Kenya': 'gMarketCountryKenya',
  'China': 'gMarketCountryChina', 'India': 'gMarketCountryIndia', 'Singapore': 'gMarketCountrySingapore',
  'Brazil': 'gMarketCountryBrazil', 'Mexico': 'gMarketCountryMexico', 'Saudi': 'gMarketCountrySaudi',
}

export default function GlobalMarketView() {
  const { setStep, language } = useCVStore()
  const [jobs, setJobs] = useState<GlobalJob[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('Monde')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 9

  const fetchJobs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (keyword) params.set('keyword', keyword)
    if (country) params.set('country', country)
    if (region !== 'Monde') params.set('region', region)
    fetch(`/api/global-jobs?${params}`)
      .then(r => r.json())
      .then(data => { setJobs(data.jobs || []); setTotal(data.total || 0) })
      .catch(() => { setJobs([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, keyword, country, region, limit])

  useEffect(() => { fetchJobs() }, [fetchJobs]) // eslint-disable-line react-hooks/set-state-in-effect

  const totalPages = Math.ceil(total / limit)
  const tr = (name: string) => t(language, regionKeyMap[name] || name)
  const tc = (name: string) => t(language, countryKeyMap[name] || name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t(language, 'gMarketBack')}
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="text-teal-600 w-7 h-7" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t(language, 'gMarketTitle')}</h1>
              <p className="text-muted-foreground text-sm">{t(language, 'gMarketSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { val: total, label: t(language, 'gMarketStatOffers'), icon: Briefcase },
            { val: '40+', label: t(language, 'gMarketStatCountries'), icon: MapPin },
            { val: '6', label: t(language, 'gMarketStatRegions'), icon: Globe }
          ].map((s, i) => (
            <Card key={i} className="border-teal-100">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-teal-600" />
                <div><p className="text-xl font-bold">{s.val}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Region tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {regions.map(r => (
            <Button key={r} variant={region === r ? 'default' : 'outline'} size="sm"
              onClick={() => { setRegion(r); setPage(1) }}
              className={`cursor-pointer whitespace-nowrap ${region === r ? 'bg-teal-600 hover:bg-teal-700' : ''}`}>
              {tr(r)}
            </Button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t(language, 'gMarketKeywordPlaceholder')} value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t(language, 'gMarketCountryPlaceholder')} value={country} onChange={e => { setCountry(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setKeyword(''); setCountry(''); setRegion('Monde'); setPage(1) }}>
            <Filter className="w-4 h-4 mr-1" /> {t(language, 'gMarketReset')}
          </Button>
        </div>

        {/* Results */}
        {loading && <div className="grid gap-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>}
        {!loading && jobs.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t(language, 'gMarketNoResults')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t(language, 'gMarketNoResultsHint')}</p>
          </motion.div>
        )}
        {!loading && jobs.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">{t(language, (total > 1 ? 'gMarketResultPlural' : 'gMarketResultSingular').replace('{count}', String(total)))}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer h-full border hover:border-teal-200" onClick={() => setStep('globalJobDetail', { jobId: job.id })}>
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-1">{job.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" /> {job.company}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">{tr(job.region)}</Badge>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.location}, {countryFlags[job.country] || '🌍'} {tc(job.country)}
                        </p>
                        {(job.salaryMin || job.salaryMax) && (
                          <p className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {job.salaryMin || '?'} - {job.salaryMax || '?'} {job.currency}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.visaSponsorship && <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Shield className="w-2.5 h-2.5 mr-0.5" /> {t(language, 'gMarketVisa')}</Badge>}
                          {job.relocationPackage && <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100"><Plane className="w-2.5 h-2.5 mr-0.5" /> {t(language, 'gMarketRelocation')}</Badge>}
                          {job.isRemote && <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100"><Wifi className="w-2.5 h-2.5 mr-0.5" /> {t(language, 'gMarketRemote')}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">{job.applicationsCount} {t(language, (job.applicationsCount > 1 ? 'gMarketApplicationPlural' : 'gMarketApplicationSingular'))}</span>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-xs cursor-pointer">{t(language, 'gMarketViewOffer')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground">{t(language, 'gMarketPage')} {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
