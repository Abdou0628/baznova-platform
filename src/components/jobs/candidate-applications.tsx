'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', es: 'es-ES' }

export default function CandidateApplicationsView() {
  const { setStep, language } = useCVStore()
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isRTL = language === 'ar'
  const dateLocale = localeMap[language] || 'fr-FR'

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t(language, 'candidateAppsStatusPending'), color: 'bg-amber-100 text-amber-700' },
    viewed: { label: t(language, 'candidateAppsStatusViewed'), color: 'bg-blue-100 text-blue-700' },
    shortlisted: { label: t(language, 'candidateAppsStatusShortlisted'), color: 'bg-purple-100 text-purple-700' },
    accepted: { label: t(language, 'candidateAppsStatusAccepted'), color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: t(language, 'candidateAppsStatusRejected'), color: 'bg-red-100 text-red-700' },
  }

  useEffect(() => {
    fetch('/api/candidate/applications')
      .then(r => r.json())
      .then(d => setApps(Array.isArray(d) ? d : d.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'mr-0 ml-1' : 'mr-1'}`} /> {t(language, 'orchBack')}
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-emerald-600" /> {t(language, 'candidateAppsTitle')}
          </h1>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : apps.length === 0 ? (
          <Card className="text-center p-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t(language, 'candidateAppsNoApps')}</p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 cursor-pointer" onClick={() => setStep('jobMarket')}>{t(language, 'candidateAppsSeeOffers')}</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {apps.map((app, i) => (
              <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => app.jobId && setStep('jobDetail', { jobId: app.jobId })}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      {app.matchScore ? <span className="text-sm font-bold text-emerald-600">{app.matchScore}%</span> : <FileText className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{app.job?.title || `${t(language, 'candidateAppsApplication')} #${i + 1}`}</h3>
                      <p className="text-xs text-muted-foreground">{app.job?.company || ''}</p>
                    </div>
                    <Badge className={statusConfig[app.status]?.color || 'bg-gray-100 text-gray-700'}>
                      {statusConfig[app.status]?.label || app.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground hidden sm:block">{new Date(app.createdAt).toLocaleDateString(dateLocale)}</p>
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