'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Compass, Target, TrendingUp, BookOpen, Award,
  Code, Palette, BarChart3, Megaphone, ArrowRight,
  Map, Sparkles, Loader2, ChevronLeft, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t } from '@/lib/i18n'

type AppStep = 'careerHome' | 'careerAssessment' | 'careerRoadmap' | 'careerSkills'

interface AssessmentRecord {
  id: string
  targetRole: string
  currentLevel: string
  score: number | null
  createdAt: string
}

const CAREER_PATHS = [
  { key: 'careerTech', icon: Code, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
  { key: 'careerMarketing', icon: Megaphone, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50' },
  { key: 'careerFinance', icon: BarChart3, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
  { key: 'careerDesign', icon: Palette, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50' },
  { key: 'careerData', icon: TrendingUp, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50' },
] as const

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

export default function CareerHome() {
  const { language, setStep, stepData, setStepData } = useCVStore()
  const { data: session } = useSession()
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const isRTL = language === 'ar'

  useEffect(() => {
    fetchAssessments()
  }, [])

  async function fetchAssessments() {
    try {
      const res = await fetch('/api/career/assessment')
      if (res.ok) {
        const data = await res.json()
        setAssessments(data.assessments || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function navigateTo(step: AppStep, data?: Record<string, unknown>) {
    if (data) setStepData(data)
    setStep(step)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-rose-50/30 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('landing')}
            className={`mb-4 ${isRTL ? 'mr-auto' : 'ml-auto'}`}
          >
            {isRTL ? <ArrowRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
            {t(language, 'careerBackToHome')}
          </Button>

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t(language, 'careerHomeTitle')}
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              {t(language, 'careerHomeSubtitle')}
            </p>
          </motion.div>
        </div>

        {/* 3 Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: BookOpen, title: t(language, 'careerStep1Title'), desc: t(language, 'careerStep1Desc'), color: 'emerald' },
            { icon: Target, title: t(language, 'careerStep2Title'), desc: t(language, 'careerStep2Desc'), color: 'amber' },
            { icon: Map, title: t(language, 'careerStep3Title'), desc: t(language, 'careerStep3Desc'), color: 'rose' },
          ].map((step, i) => (
            <motion.div key={i} custom={i} variants={cardVariants} initial="hidden" animate="visible">
              <Card className="h-full border-muted/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    step.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                    step.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Career Paths */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            {t(language, 'careerPaths')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {CAREER_PATHS.map((path, i) => (
              <motion.div key={path.key} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Card
                  className="cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
                  onClick={() => navigateTo('careerAssessment', { domain: path.key })}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center shadow-sm`}>
                      <path.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-foreground group-hover:text-rose-600 transition-colors">
                      {t(language, path.key as 'careerTech')}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA to start assessment */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 overflow-hidden">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t(language, 'careerAssessTitle')}</h3>
                  <p className="text-sm text-muted-foreground">{t(language, 'careerAssessSubtitle')}</p>
                </div>
              </div>
              <Button
                onClick={() => navigateTo('careerAssessment')}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md"
              >
                <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t(language, 'careerStartAssessment')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Assessments */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            {t(language, 'careerRecentAssessments')}
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : assessments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t(language, 'careerNoAssessments')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {assessments.map((a) => (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {a.currentLevel || a.targetRole}
                        </Badge>
                        {a.score !== null && (
                          <Badge variant="outline" className="text-xs">
                            {a.score}/100
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {a.roadmap && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => navigateTo('careerRoadmap', { assessmentId: a.id })}
                          className="text-xs"
                        >
                          <Map className={`w-3.5 h-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          {t(language, 'careerViewRoadmap')}
                        </Button>
                      )}
                      {a.skillsGap && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => navigateTo('careerSkills', { assessmentId: a.id })}
                          className="text-xs"
                        >
                          <Target className={`w-3.5 h-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          {t(language, 'careerViewSkills')}
                        </Button>
                      )}
                      {!a.roadmap && (
                        <Button
                          size="sm"
                          onClick={() => navigateTo('careerRoadmap', { assessmentId: a.id })}
                          className="text-xs bg-rose-500 hover:bg-rose-600 text-white"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          {t(language, 'careerGenerateRoadmap')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
