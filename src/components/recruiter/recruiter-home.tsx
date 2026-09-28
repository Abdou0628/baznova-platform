'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Briefcase, Users, Target, BarChart3, Plus, ArrowRight, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

interface RecruiterJobItem {
  id: string
  title: string
  department: string
  location: string
  type: string
  status: string
  candidatesCount: number
  createdAt: string
}

interface Stats {
  openPositions: number
  totalCandidates: number
  matchRate: number
  avgTimeHire: number
}

export default function RecruiterHome() {
  const { language, setStep } = useCVStore()
  const lang = language as CVLanguage
  const [stats, setStats] = useState<Stats>({ openPositions: 0, totalCandidates: 0, matchRate: 0, avgTimeHire: 0 })
  const [jobs, setJobs] = useState<RecruiterJobItem[]>([])
  const [loading, setLoading] = useState(true)
  const isRTL = lang === 'ar'

  useEffect(() => {
    fetch('/api/recruiter/pipeline')
      .then(r => r.json())
      .then(data => {
        const allJobs = data.jobs || []
        const allCandidates = allJobs.flatMap((j: any) => j.candidates || [])
        const openJobs = allJobs.filter((j: any) => j.status === 'open')
        const scored = allCandidates.filter((c: any) => c.score > 0)
        const avgScore = scored.length > 0
          ? Math.round(scored.reduce((sum: number, c: any) => sum + c.score, 0) / scored.length)
          : 0
        setStats({
          openPositions: openJobs.length,
          totalCandidates: allCandidates.length,
          matchRate: avgScore,
          avgTimeHire: allCandidates.length > 0 ? 18 : 0,
        })
        setJobs(allJobs.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { icon: Briefcase, label: t(lang, 'recruiterOpenPositions'), value: stats.openPositions, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Users, label: t(lang, 'recruiterTotalCandidates'), value: stats.totalCandidates, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Target, label: t(lang, 'recruiterMatchRate'), value: `${stats.matchRate}%`, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: Clock, label: t(lang, 'recruiterAvgTimeHire'), value: `${stats.avgTimeHire} ${t(lang, 'recruiterDays')}`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      'full-time': t(lang, 'recruiterFullTime'),
      'part-time': t(lang, 'recruiterPartTime'),
      'contract': t(lang, 'recruiterContract'),
      'internship': t(lang, 'recruiterInternship'),
    }
    return map[type] || type
  }

  const statusVariant = (status: string) => {
    const map: Record<string, string> = {
      'open': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      'paused': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      'closed': 'bg-gray-100 text-gray-600 hover:bg-gray-100',
      'filled': 'bg-teal-100 text-teal-700 hover:bg-teal-100',
    }
    return map[status] || 'bg-gray-100 text-gray-600 hover:bg-gray-100'
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      'open': t(lang, 'recruiterOpen'),
      'paused': t(lang, 'recruiterPaused'),
      'closed': t(lang, 'recruiterClosed'),
      'filled': t(lang, 'recruiterFilled'),
    }
    return map[status] || status
  }

  const quickActions = [
    { icon: Plus, label: t(lang, 'recruiterNewJob'), step: 'recruiterPipeline' as const, color: 'bg-amber-600 hover:bg-amber-700' },
    { icon: BarChart3, label: t(lang, 'recruiterViewPipeline'), step: 'recruiterPipeline' as const, color: 'bg-teal-600 hover:bg-teal-700' },
    { icon: Users, label: t(lang, 'recruiterFindCandidates'), step: 'recruiterCandidates' as const, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { icon: Sparkles, label: t(lang, 'recruiterAIMatch'), step: 'recruiterMatch' as const, color: 'bg-orange-600 hover:bg-orange-700' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''} ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t(lang, 'recruiterBack')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="text-amber-600" />
              {t(lang, 'recruiterHomeTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">{t(lang, 'recruiterHomeSubtitle')}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card><CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent></Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{t(lang, 'recruiterQuickActions')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                <Button
                  className={`w-full h-auto py-4 flex flex-col items-center gap-2 text-white cursor-pointer ${action.color}`}
                  onClick={() => setStep(action.step)}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t(lang, 'recruiterRecentJobs')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep('recruiterPipeline')} className="cursor-pointer text-amber-600">
              {t(lang, 'recruiterViewPipeline')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-1' : 'mr-1'}`} />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : jobs.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-muted-foreground">{t(lang, 'recruiterNoJobs')}</p>
              <Button className="mt-4 bg-amber-600 hover:bg-amber-700 cursor-pointer" onClick={() => setStep('recruiterPipeline')}>
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t(lang, 'recruiterNewJob')}
              </Button>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-medium`}>{t(lang, 'recruiterJobTitle')}</th>
                        <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-medium hidden sm:table-cell`}>{t(lang, 'recruiterJobDept')}</th>
                        <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-medium hidden md:table-cell`}>{t(lang, 'recruiterJobLocation')}</th>
                        <th className="text-center p-3 font-medium hidden lg:table-cell">{t(lang, 'recruiterJobType')}</th>
                        <th className="text-center p-3 font-medium">{t(lang, 'recruiterJobStatus')}</th>
                        <th className="text-center p-3 font-medium">{t(lang, 'recruiterCandidate')}s</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setStep('recruiterPipeline')}>
                          <td className="p-3 font-medium">{job.title}</td>
                          <td className="p-3 text-muted-foreground hidden sm:table-cell">{job.department}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{job.location}</td>
                          <td className="p-3 text-center hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">{typeLabel(job.type)}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`text-xs ${statusVariant(job.status)}`}>{statusLabel(job.status)}</Badge>
                          </td>
                          <td className="p-3 text-center font-medium">{job.candidatesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
