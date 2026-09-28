'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Building2, DollarSign, Users, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t } from '@/lib/i18n'

const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', es: 'es-ES' }

interface Job {
  id: string; title: string; company: string; location: string; country: string
  type: string; salaryMin?: number; salaryMax?: number; currency: string
  description: string; requirements: string; skills?: string; language: string
  isRemote: boolean; isPaid: boolean; status: string; viewsCount: number; applicationsCount: number; createdAt: string
}

export default function JobDetailView() {
  const { stepData, setStep, language } = useCVStore()
  const { data: session } = useSession()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const isRTL = language === 'ar'
  const dateLocale = localeMap[language] || 'fr-FR'

  useEffect(() => {
    const jobId = stepData.jobId
    if (jobId) {
      fetch(`/api/jobs/${jobId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setJob(data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [stepData.jobId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" /></div>
  if (!job) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t(language, 'jobDetailNotFound')}</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" size="sm" onClick={() => setStep('jobMarket')} className="mb-6 cursor-pointer">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'mr-0 ml-1' : 'mr-1'}`} /> {t(language, 'jobDetailBackToOffers')}
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{job.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <Building2 className="w-4 h-4" /> {job.company}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge>{job.type}</Badge>
                  {job.isRemote && <Badge variant="outline" className="text-emerald-600 border-emerald-200">{t(language, 'jobMarketRemote')}</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /> {job.location}, {job.country}</div>
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-muted-foreground" /> {job.salaryMin || '?'} - {job.salaryMax || '?'} {job.currency}</div>
                )}
                <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-muted-foreground" /> {job.applicationsCount} {t(language, job.applicationsCount > 1 ? 'jobMarketApplications' : 'jobMarketApplication')}</div>
                <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" /> {new Date(job.createdAt).toLocaleDateString(dateLocale)}</div>
              </div>

              {job.skills && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.skills.split(',').map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">{t(language, 'jobDetailDescription')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t(language, 'jobDetailRequirements')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 cursor-pointer"
                  onClick={() => setStep('jobApply', { jobId: job.id })}
                >
                  <CheckCircle2 className={`w-5 h-5 ${isRTL ? 'mr-0 ml-2' : 'mr-2'}`} /> {t(language, 'jobDetailApplyNow')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
