'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Map, Sparkles, Loader2, Target,
  CheckCircle2, BookOpen, Award, Clock, ArrowRight, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface TimelinePhase {
  phase: 'short' | 'medium' | 'long'
  title: string
  description: string
  skills: string[]
  certifications: string[]
  milestones: string[]
}

interface RoadmapData {
  phases: TimelinePhase[]
  targetRole: string
  currentLevel: string
  score: number
}

const PHASE_CONFIG = {
  short: { key: 'careerShortTerm' as const, color: 'emerald', border: 'border-emerald-400', bg: 'bg-emerald-50', icon: Zap, gradient: 'from-emerald-500 to-teal-500' },
  medium: { key: 'careerMediumTerm' as const, color: 'amber', border: 'border-amber-400', bg: 'bg-amber-50', icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  long: { key: 'careerLongTerm' as const, color: 'rose', border: 'border-rose-400', bg: 'bg-rose-50', icon: Award, gradient: 'from-rose-500 to-pink-500' },
}

export default function CareerRoadmap() {
  const { language, setStep, stepData } = useCVStore()
  const isRTL = language === 'ar'
  const assessmentId = stepData.assessmentId as string | undefined

  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment()
    } else {
      setLoading(false)
    }
  }, [assessmentId])

  async function fetchAssessment() {
    try {
      const res = await fetch(`/api/career/assessment?id=${assessmentId}`)
      if (res.ok) {
        const data = await res.json()
        const assessment = data.assessment
        if (assessment?.roadmap) {
          setRoadmap(JSON.parse(assessment.roadmap))
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function generateRoadmap() {
    if (!assessmentId) return
    setGenerating(true)
    try {
      const res = await fetch('/api/career/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, language }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRoadmap(data.roadmap)
      toast.success(t(language, 'careerRoadmapGenerated'))
    } catch {
      toast.error(t(language, 'careerRoadmapError'))
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-rose-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-rose-50/30 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost" size="sm"
            onClick={() => setStep('careerHome')}
          >
            {isRTL ? <ArrowRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
            {t(language, 'careerBackToHome')}
          </Button>
          {roadmap && (
            <Button
              variant="outline" size="sm"
              onClick={() => setStep('careerSkills', { assessmentId })}
            >
              <Target className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {t(language, 'careerViewSkills')}
            </Button>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t(language, 'careerRoadmapTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">{t(language, 'careerRoadmapSubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {!roadmap ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Map className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{t(language, 'careerNoData')}</p>
              <Button
                onClick={generateRoadmap}
                disabled={generating || !assessmentId}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                {generating ? t(language, 'careerGeneratingRoadmap') : t(language, 'careerGenerateRoadmap')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Banner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="mb-8 border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 overflow-hidden">
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-100"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${roadmap.score}, 100`} className="text-rose-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-rose-600">{roadmap.score}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{t(language, 'careerOverallScore')}</p>
                      <p className="text-xs text-muted-foreground">
                        {roadmap.currentLevel} → {roadmap.targetRole}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className={`absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-amber-300 to-rose-300 ${isRTL ? 'right-6 sm:right-8' : 'left-6 sm:left-8'}`} />

              <div className="space-y-8">
                {roadmap.phases?.map((phase, i) => {
                  const config = PHASE_CONFIG[phase.phase]
                  const PhaseIcon = config.icon
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.15 }}
                    >
                      <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Timeline dot */}
                        <div className={`relative z-10 flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}>
                          <PhaseIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>

                        {/* Phase Card */}
                        <Card className={`flex-1 ${config.border} border`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm sm:text-base">{phase.title || t(language, config.key)}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {phase.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">{phase.description}</p>
                            )}

                            {/* Skills to Acquire */}
                            {phase.skills?.length > 0 && (
                              <div>
                                <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                                  {t(language, 'careerSkillsToAcquire')}
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {phase.skills.map((skill, si) => (
                                    <Badge key={si} variant="secondary" className="text-xs">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Certifications */}
                            {phase.certifications?.length > 0 && (
                              <div>
                                <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                  {t(language, 'careerCertifications')}
                                </h4>
                                <ul className="space-y-1">
                                  {phase.certifications.map((cert, ci) => (
                                    <li key={ci} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                      {cert}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Milestones */}
                            {phase.milestones?.length > 0 && (
                              <div>
                                <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Award className="w-3.5 h-3.5 text-rose-500" />
                                  {t(language, 'careerMilestones')}
                                </h4>
                                <ul className="space-y-1">
                                  {phase.milestones.map((ms, mi) => (
                                    <li key={mi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-rose-500 mt-0.5 flex-shrink-0" />
                                      {ms}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
