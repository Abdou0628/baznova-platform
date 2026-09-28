'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Laptop, DollarSign, Star, Send, FileText, Briefcase, ChevronRight, TrendingUp, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Mission {
  id: string; title: string; description: string; category: string
  budgetMin: number; budgetMax: number; currency: string; duration: string
  skills: string; status: string; createdAt: string
  user: { name: string; companyName: string | null; image: string | null }
  _count: { proposals: number }
}

const categoryColors: Record<string, string> = {
  tech: 'bg-emerald-100 text-emerald-700',
  design: 'bg-pink-100 text-pink-700',
  marketing: 'bg-amber-100 text-amber-700',
  writing: 'bg-violet-100 text-violet-700',
  translation: 'bg-sky-100 text-sky-700',
  consulting: 'bg-orange-100 text-orange-700',
  video: 'bg-rose-100 text-rose-700',
  data: 'bg-teal-100 text-teal-700',
}

const categoryKeyMap: Record<string, string> = {
  tech: 'freelanceCategoryTech', design: 'freelanceCategoryDesign',
  marketing: 'freelanceCategoryMarketing', writing: 'freelanceCategoryWriting',
  translation: 'freelanceCategoryTranslation', consulting: 'freelanceCategoryConsulting',
  video: 'freelanceCategoryVideo', data: 'freelanceCategoryData',
}

export default function FreelanceHome() {
  const { language, setStep } = useCVStore()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const isRtl = language === 'ar'

  const stats = [
    { icon: Briefcase, label: t(language, 'freelanceHomeActiveMissions'), value: '3', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: DollarSign, label: t(language, 'freelanceHomeEarnings'), value: '4 250 €', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Star, label: t(language, 'freelanceHomeRating'), value: '4.8', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Send, label: t(language, 'freelanceHomeProposalsSent'), value: '12', color: 'text-sky-600', bg: 'bg-sky-50' },
  ]

  useEffect(() => {
    fetch('/api/freelance/missions?featured=true')
      .then(r => r.json())
      .then(data => { setMissions(data.missions || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline ml-1">{t(language, 'orchBack')}</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t(language, 'freelanceHomeH1')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'freelanceSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 sm:p-8 text-white mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{t(language, 'freelanceHomeWelcome')}</h2>
          <p className="text-orange-100 text-sm sm:text-base mb-4 max-w-2xl">
            {t(language, 'freelanceSubtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setStep('freelanceBrowse' as AppStep)}>
              <FileText className="w-4 h-4 mr-2" />{t(language, 'freelanceHomeBrowseCta')}
            </Button>
            <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30 cursor-pointer" onClick={() => setStep('freelanceDashboard' as AppStep)}>
              <LayoutDashboard className="w-4 h-4 mr-2" />{t(language, 'freelanceHomeGoToDashboard')}
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Featured Missions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              {t(language, 'freelanceHomeFeaturedMissions')}
            </h2>
            <Button variant="ghost" size="sm" className="text-orange-600 cursor-pointer" onClick={() => setStep('freelanceBrowse' as AppStep)}>
              {t(language, 'freelanceHomeViewAll')}
              <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180 ml-0 mr-1' : 'ml-1'}`} />
            </Button>
          </div>

          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
            </div>
          )}

          {!loading && missions.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t(language, 'freelanceHomeNoMissions')}</p>
            </div>
          )}

          {!loading && missions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {missions.slice(0, 4).map((mission, i) => {
                const skills: string[] = JSON.parse(mission.skills || '[]')
                return (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
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
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{mission.description}</p>
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">{skill}</Badge>
                          ))}
                          {skills.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{skills.length - 3}</Badge>}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-sm font-semibold text-orange-600">
                            {mission.budgetMin.toLocaleString()} – {mission.budgetMax.toLocaleString()} {mission.currency}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />{mission.duration}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t(language, 'freelanceHowWorks')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: '1', title: t(language, 'freelanceStep1Title'), desc: t(language, 'freelanceStep1Desc') },
              { step: '2', title: t(language, 'freelanceStep2Title'), desc: t(language, 'freelanceStep2Desc') },
              { step: '3', title: t(language, 'freelanceStep3Title'), desc: t(language, 'freelanceStep3Desc') },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-sm mb-3">{item.step}</div>
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
