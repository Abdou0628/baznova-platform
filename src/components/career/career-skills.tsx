'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Target, Loader2, Sparkles,
  ArrowRight, BookOpen, AlertTriangle, CheckCircle2, BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface SkillItem {
  name: string
  current: number  // 0-100
  required: number // 0-100
}

interface CourseItem {
  name: string
  platform: string
  level: string
  link?: string
}

interface SkillsData {
  skills: SkillItem[]
  courses: CourseItem[]
  overallScore: number
  targetRole: string
}

// CSS Radar chart using a simple polygon approach
function RadarChart({ skills, isRTL }: { skills: SkillItem[]; isRTL: boolean }) {
  if (!skills.length) return null

  const size = 220
  const center = size / 2
  const radius = 80
  const n = skills.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function getPoint(index: number, value: number) {
    const angle = startAngle + index * angleStep
    const r = (value / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Grid rings
  const rings = [20, 40, 60, 80, 100]

  // Current skills polygon
  const currentPoints = skills
    .map((s, i) => getPoint(i, s.current))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  // Required skills polygon
  const requiredPoints = skills
    .map((s, i) => getPoint(i, s.required))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  // Label positions
  const labels = skills.map((s, i) => {
    const angle = startAngle + i * angleStep
    const r = radius + 24
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      name: s.name,
    }
  })

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px]">
        {/* Grid rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={Array.from({ length: n })
              .map((_, i) => {
                const p = getPoint(i, ring)
                return `${p.x},${p.y}`
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/20"
          />
        ))}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const p = getPoint(i, 100)
          return (
            <line
              key={i}
              x1={center} y1={center}
              x2={p.x} y2={p.y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/15"
            />
          )
        })}

        {/* Required polygon (background) */}
        <polygon
          points={requiredPoints}
          fill="rgba(244, 63, 94, 0.1)"
          stroke="#f43f5e"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Current polygon (foreground) */}
        <polygon
          points={currentPoints}
          fill="rgba(16, 185, 129, 0.15)"
          stroke="#10b981"
          strokeWidth="2"
        />

        {/* Current points */}
        {skills.map((s, i) => {
          const p = getPoint(i, s.current)
          return (
            <circle
              key={i}
              cx={p.x} cy={p.y} r={4}
              fill="#10b981"
              stroke="white"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-[8px] font-medium"
          >
            {l.name}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className={`flex gap-6 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-muted-foreground">{t(language, 'careerCurrentSkills')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-500/40 border border-dashed border-rose-500" />
          <span className="text-xs text-muted-foreground">{t(language, 'careerTargetSkills')}</span>
        </div>
      </div>
    </div>
  )
}

export default function CareerSkills() {
  const { language, setStep, stepData } = useCVStore()
  const isRTL = language === 'ar'
  const assessmentId = stepData.assessmentId as string | undefined

  const [skillsData, setSkillsData] = useState<SkillsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

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
        if (data.assessment?.skillsGap) {
          setSkillsData(JSON.parse(data.assessment.skillsGap))
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function analyzeSkills() {
    if (!assessmentId) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/career/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, language }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSkillsData(data.skillsAnalysis)
      toast.success(t(language, 'careerSkillsAnalyzed'))
    } catch {
      toast.error(t(language, 'careerSkillsError'))
    } finally {
      setAnalyzing(false)
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
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="ghost" size="sm"
            onClick={() => setStep('careerRoadmap', { assessmentId })}
          >
            {isRTL ? <ArrowRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
            {t(language, 'careerBackToRoadmap')}
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t(language, 'careerSkillsTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">{t(language, 'careerSkillsSubtitle')}</p>
            </div>
          </div>
        </motion.div>

        {!skillsData ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{t(language, 'careerNoData')}</p>
              <Button
                onClick={analyzeSkills}
                disabled={analyzing || !assessmentId}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                {analyzing ? t(language, 'careerGeneratingRoadmap') : t(language, 'careerViewSkills')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Score */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50">
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-100" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${skillsData.overallScore}, 100`} className="text-rose-500" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-rose-600">{skillsData.overallScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{t(language, 'careerReadinessScore')}</p>
                      <p className="text-xs text-muted-foreground">{skillsData.targetRole}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <motion.div initial={{ opacity: 0, x: isRTL ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t(language, 'careerGapSkills')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center py-4">
                    <RadarChart skills={skillsData.skills} isRTL={isRTL} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Skills Detail List */}
              <motion.div initial={{ opacity: 0, x: isRTL ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t(language, 'careerCurrentSkills')} vs {t(language, 'careerTargetSkills')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                    {skillsData.skills.map((skill, i) => {
                      const gap = skill.required - skill.current
                      const gapColor = gap > 30 ? 'text-rose-500' : gap > 15 ? 'text-amber-500' : 'text-emerald-500'
                      const gapIcon = gap <= 15 ? CheckCircle2 : AlertTriangle
                      const GapIcon = gapIcon
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="font-medium">{skill.name}</span>
                            <span className={`flex items-center gap-1 ${gapColor}`}>
                              <GapIcon className="w-3 h-3" />
                              {gap > 0 ? `+${gap}%` : '✓'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Progress value={skill.current} className={`h-1.5 flex-1 ${isRTL ? 'order-2' : ''}`} />
                            <div className={`w-16 ${isRTL ? 'order-1' : ''}`}>
                              <Progress value={skill.required} className="h-1.5 opacity-40" />
                            </div>
                          </div>
                          <div className={`flex justify-between text-[10px] text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span>{t(language, 'careerCurrentSkills')}: {skill.current}%</span>
                            <span>{t(language, 'careerTargetSkills')}: {skill.required}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recommended Courses */}
            {skillsData.courses?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-rose-500" />
                      {t(language, 'careerRecommendedCourses')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {skillsData.courses.map((course, i) => (
                        <div key={i} className="p-3 rounded-lg border border-muted hover:border-rose-200 hover:bg-rose-50/50 transition-colors">
                          <p className="text-sm font-medium mb-1">{course.name}</p>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Badge variant="outline" className="text-[10px]">{course.platform}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{course.level}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
