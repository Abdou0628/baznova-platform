'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Award, Mail, Users, Globe, TrendingUp,
  CheckCircle2, ArrowRight, Building2, Sparkles, Download,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'
import { events } from '@/lib/analytics'

type TabSetter = (tab: string) => void

interface OverviewProps {
  onSetTab: TabSetter
}

interface CampusStats {
  totalResumes: number
  totalCoverLetters: number
  totalAtsAnalyses: number
  totalJobApplications: number
  totalLocalJobs: number
  totalGlobalJobs: number
  totalUsers: number
  totalCampusTickets: number
  supportedCountries: number
  totalDocuments: number
}

export default function CampusOverview({ onSetTab }: OverviewProps) {
  const { language } = useCVStore()
  const isRtl = language === 'ar'
  const [liveStats, setLiveStats] = useState<CampusStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [campusStats, setCampusStats] = useState({ unis: 0, students: 0, workshops: 0, rate: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/campus/stats')
        const json = await res.json()
        if (!cancelled && json.success) setLiveStats(json.data)
      } catch { /* silent */ } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    // Fetch campus-specific stats
    ;(async () => {
      try {
        const [uRes, wRes, sRes] = await Promise.all([
          fetch('/api/campus/universities'),
          fetch('/api/campus/workshops'),
          fetch('/api/campus/students'),
        ])
        const uJson = await uRes.json()
        const wJson = await wRes.json()
        const sJson = await sRes.json()
        if (!cancelled) {
          const unis: { studentCount: number }[] = uJson.data ?? []
          const workshops: { status: string }[] = wJson.data ?? []
          const students: { atsAvgScore: number }[] = sJson.data ?? []
          const totalStudents = unis.reduce((s, u) => s + (u.studentCount || 0), 0) + students.length
          const completed = workshops.filter(w => w.status === 'completed').length
          const total = workshops.length || 1
          const avgAts = students.length > 0
            ? Math.round(students.reduce((s, st) => s + (st.atsAvgScore || 0), 0) / students.length)
            : 78
          setCampusStats({
            unis: (uJson.data as unknown[])?.length ?? 0,
            students: totalStudents,
            workshops: workshops.length,
            rate: Math.round((completed / total) * 100) || avgAts,
          })
        }
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR').format(n)

  const benefits = [
    { icon: FileText, title: t(language, 'campusBenefitCv'), desc: t(language, 'campusBenefitCvDesc'), color: 'emerald' },
    { icon: Award, title: t(language, 'campusBenefitWorkshops'), desc: t(language, 'campusBenefitWorkshopsDesc'), color: 'sky' },
    { icon: TrendingUp, title: t(language, 'campusBenefitStats'), desc: t(language, 'campusBenefitStatsDesc'), color: 'purple' },
    { icon: Users, title: t(language, 'campusBenefitNetwork'), desc: t(language, 'campusBenefitNetworkDesc'), color: 'amber' },
  ]

  const programSteps = [
    { num: '01', title: t(language, 'campusStep1Title'), desc: t(language, 'campusStep1Desc') },
    { num: '02', title: t(language, 'campusStep2Title'), desc: t(language, 'campusStep2Desc') },
    { num: '03', title: t(language, 'campusStep3Title'), desc: t(language, 'campusStep3Desc') },
    { num: '04', title: t(language, 'campusStep4Title'), desc: t(language, 'campusStep4Desc') },
  ]

  function downloadBrochure() {
    events.track('campus_brochure_downloaded')
    const brochure = `HireNova IA CAMPUS SaaS — ${t(language, 'campusSubtitle')}\n\nE-Society 2050 — HireNova\n© 2026\n`
    const blob = new Blob([brochure], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'HireNova-Campus-Brochure.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(language, 'campusBrochureDownloaded'))
  }

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100', sky: 'bg-sky-100', purple: 'bg-purple-100', amber: 'bg-amber-100',
  }
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-600', sky: 'text-sky-600', purple: 'text-purple-600', amber: 'text-amber-600',
  }

  const overviewStats = [
    { value: String(campusStats.unis), label: t(language, 'campusPartnerUnis') },
    { value: fmt(campusStats.students), label: t(language, 'campusTotalStudents') },
    { value: String(campusStats.workshops), label: t(language, 'campusWorkshopsCount') },
    { value: `${campusStats.rate}%`, label: t(language, 'campusSuccessRate') },
  ]

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4 gap-1">
          <Sparkles className="w-3 h-3" />
          {t(language, 'campusBadgeTitle')}
        </Badge>
        <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
          {t(language, 'campusHeroTitle')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t(language, 'campusHeroDesc')}
        </p>
        <div className={`mt-6 flex flex-wrap justify-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <Button onClick={downloadBrochure} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-2">
            <Download className="w-4 h-4" />
            {t(language, 'campusBrochure')}
          </Button>
          <Button variant="outline" onClick={() => onSetTab('universities')} className="cursor-pointer gap-2">
            {t(language, 'campusExploreUnis')}
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {overviewStats.map((stat) => (
          <Card key={stat.label} className="text-center border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
            <CardContent className="p-4 sm:p-6">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.section>

      {/* Benefits */}
      <section>
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">{t(language, 'campusBenefits')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[b.color]}`}>
                      <b.icon className={`w-5 h-5 ${iconColorMap[b.color]}`} />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <h4 className="font-semibold text-sm mb-1">{b.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">{t(language, 'campusHowToPartner')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {programSteps.map((step, i) => (
            <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full relative overflow-hidden">
                <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} text-4xl font-bold text-emerald-100`}>{step.num}</div>
                <CardContent className="p-5 relative">
                  <h4 className="font-semibold text-sm mb-2">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Platform Counters */}
      <section>
        <Card className="bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200">
          <CardContent className="p-5 sm:p-8">
            <div className={`flex items-start gap-4 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className={isRtl ? 'text-right' : ''}>
                <h3 className="font-semibold text-base mb-1">{t(language, 'campusUseCaseTitle')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(language, 'campusUseCaseDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { icon: FileText, val: liveStats?.totalResumes ?? 0, label: t(language, 'campusCvGenerated') },
                { icon: Award, val: liveStats?.totalAtsAnalyses ?? 0, label: t(language, 'campusAtsAnalyses') },
                { icon: Mail, val: liveStats?.totalCoverLetters ?? 0, label: t(language, 'campusCoverLetters') },
                { icon: Users, val: liveStats?.totalJobApplications ?? 0, label: t(language, 'campusApplicationsSent') },
                { icon: Globe, val: liveStats?.supportedCountries ?? 0, label: t(language, 'campusCountriesGlobal'), suffix: '+' },
                { icon: TrendingUp, val: liveStats?.totalUsers ?? 0, label: t(language, 'campusUsersRegistered') },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-lg border border-emerald-100 p-3 text-center">
                  <item.icon className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-lg sm:text-2xl font-bold text-emerald-700">
                    {statsLoading ? (
                      <span className="inline-block w-8 h-5 bg-emerald-100 rounded animate-pulse align-middle" />
                    ) : (
                      `${fmt(item.val)}${(item as {suffix?:string}).suffix || ''}`
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className={`flex flex-wrap gap-2 mt-5 ${isRtl ? 'justify-end' : ''}`}>
              <Badge variant="outline" className="gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" />{t(language, 'campusBadgeRoi')}</Badge>
              <Badge variant="outline" className="gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" />{t(language, 'campusBadgeFree')}</Badge>
              <Badge variant="outline" className="gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{t(language, 'campusBadgeLive')}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTAs */}
      <div className={`flex flex-wrap gap-3 justify-center ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Button variant="outline" onClick={() => onSetTab('universities')} className="cursor-pointer gap-2">
          {t(language, 'campusExploreUnis')} <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        </Button>
        <Button variant="outline" onClick={() => onSetTab('workshops')} className="cursor-pointer gap-2">
          {t(language, 'campusExploreWorkshops')} <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        </Button>
        <Button variant="outline" onClick={() => onSetTab('students')} className="cursor-pointer gap-2">
          {t(language, 'campusViewStudents')} <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
