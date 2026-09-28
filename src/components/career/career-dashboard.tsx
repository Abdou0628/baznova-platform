'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, Target, TrendingUp, AlertCircle, CheckCircle2, ArrowRight,
  Loader2, RefreshCw, Briefcase, FileText, GraduationCap, Globe,
  Languages, Star, Lightbulb, ChevronRight, Zap, Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t, type CVLanguage } from '@/lib/i18n'

// ─── Types ──────────────────────────────────────────────

interface CareerProfile {
  id: string
  skills: string[]
  experience: string
  education: string
  targetJob: string
  industry: string
  languages: string[]
  certifications: string[]
  softSkills: string[]
  summary: string
}

interface DimensionScore {
  name: string
  key: string
  score: number
  maxScore: number
  description: string
}

interface CareerScoreResponse {
  overallScore: number
  level: string
  dimensions: DimensionScore[]
  recommendations: Recommendation[]
  recentActivity: ActivityItem[]
}

interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
}

interface ActivityItem {
  id: string
  type: 'cv_created' | 'cl_generated' | 'ats_analyzed' | 'interview_completed' | 'skill_added' | 'application_sent'
  title: string
  description: string
  date: string
}

// ─── Helper Functions ───────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

function getBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function getLevelLabel(level: string, lang: CVLanguage): string {
  const keyMap: Record<string, any> = {
    'expert': 'careerLevelExpert',
    'avance': 'careerLevelAdvanced',
    'intermediaire': 'careerLevelIntermediate',
    'debutant': 'careerLevelBeginner',
  }
  return t(lang, keyMap[level] ?? 'careerLevelBeginner')
}

function getLevelBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (level === 'expert') return 'default'
  if (level === 'avance') return 'secondary'
  return 'outline'
}

function formatDate(dateStr: string, lang: CVLanguage): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t(lang, 'careerToday')
  if (diffDays === 1) return t(lang, 'careerYesterday')
  if (diffDays < 7) return t(lang, 'careerDaysAgo').replace('{0}', String(diffDays))
  if (diffDays < 30) return t(lang, 'careerWeeksAgo').replace('{0}', String(Math.floor(diffDays / 7)))
  return t(lang, 'careerMonthsAgo').replace('{0}', String(Math.floor(diffDays / 30)))
}

function getFallbackScore(lang: CVLanguage): CareerScoreResponse {
  return {
    overallScore: 62,
    level: 'intermediaire',
    dimensions: [
      { name: t(lang, 'careerDimTech'), key: 'skills', score: 75, maxScore: 100, description: t(lang, 'careerDimTechDesc') },
      { name: t(lang, 'careerDimExperience'), key: 'experience', score: 60, maxScore: 100, description: t(lang, 'careerDimExperienceDesc') },
      { name: t(lang, 'careerDimFormation'), key: 'education', score: 80, maxScore: 100, description: t(lang, 'careerDimFormationDesc') },
      { name: t(lang, 'careerDimLanguages'), key: 'languages', score: 55, maxScore: 100, description: t(lang, 'careerDimLanguagesDesc') },
      { name: t(lang, 'careerDimSoftSkills'), key: 'softSkills', score: 45, maxScore: 100, description: t(lang, 'careerDimSoftSkillsDesc') },
      { name: t(lang, 'careerDimVisibility'), key: 'visibility', score: 40, maxScore: 100, description: t(lang, 'careerDimVisibilityDesc') },
    ],
    recommendations: [
      {
        id: '1',
        title: t(lang, 'careerRec1Title'),
        description: t(lang, 'careerRec1Desc'),
        priority: 'high',
        category: 'visibilité',
      },
      {
        id: '2',
        title: t(lang, 'careerRec2Title'),
        description: t(lang, 'careerRec2Desc'),
        priority: 'medium',
        category: 'formation',
      },
      {
        id: '3',
        title: t(lang, 'careerRec3Title'),
        description: t(lang, 'careerRec3Desc'),
        priority: 'medium',
        category: 'langues',
      },
      {
        id: '4',
        title: t(lang, 'careerRec4Title'),
        description: t(lang, 'careerRec4Desc'),
        priority: 'low',
        category: 'expérience',
      },
    ],
    recentActivity: [
      { id: '1', type: 'cv_created', title: t(lang, 'careerActCvTitle'), description: t(lang, 'careerActCvDesc'), date: new Date().toISOString() },
      { id: '2', type: 'ats_analyzed', title: t(lang, 'careerActAtsTitle'), description: t(lang, 'careerActAtsDesc'), date: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', type: 'skill_added', title: t(lang, 'careerActSkillTitle'), description: t(lang, 'careerActSkillDesc'), date: new Date(Date.now() - 172800000).toISOString() },
    ],
  }
}

// ─── Sub-Components ─────────────────────────────────────

function ScoreRing({ score, level, animate }: { score: number; level: string; animate: boolean }) {
  const { language } = useCVStore()
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
            className="dark:stroke-gray-700"
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? offset : circumference}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-4xl font-bold ${getScoreColor(score)}`}
          >
            {animate ? score : 0}
          </motion.span>
        </div>
      </div>
      <Badge variant={getLevelBadgeVariant(level)} className="text-xs px-3 py-1">
        {getLevelLabel(level, language)}
      </Badge>
      <p className="text-sm text-muted-foreground">{t(language, 'careerScoreLabel')}</p>
    </motion.div>
  )
}

function CompletenessBar({ dimension, index }: { dimension: DimensionScore; index: number }) {
  const percentage = Math.round((dimension.score / dimension.maxScore) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{dimension.name}</span>
        <span className={`font-semibold tabular-nums ${getScoreColor(percentage)}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: 0.2 * index, duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${getBarColor(percentage)}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{dimension.description}</p>
    </motion.div>
  )
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  switch (type) {
    case 'cv_created':
      return <FileText className="w-4 h-4 text-emerald-600" />
    case 'cl_generated':
      return <Briefcase className="w-4 h-4 text-emerald-600" />
    case 'ats_analyzed':
      return <Target className="w-4 h-4 text-emerald-600" />
    case 'interview_completed':
      return <Star className="w-4 h-4 text-emerald-600" />
    case 'skill_added':
      return <Zap className="w-4 h-4 text-emerald-600" />
    case 'application_sent':
      return <Globe className="w-4 h-4 text-emerald-600" />
    default:
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
  }
}

function ActivityCard({ activity, index }: { activity: ActivityItem; index: number }) {
  const { language } = useCVStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.3 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
    >
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
        <ActivityIcon type={activity.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{formatDate(activity.date, language)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
    </motion.div>
  )
}

function AIRecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const { language } = useCVStore()
  const topRecommendation = recommendations[0]

  return (
    <div className="space-y-3">
      {/* Top recommendation with CTA */}
      {topRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                      {t(language, 'careerPriorityHigh')}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{topRecommendation.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {topRecommendation.description}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                  >
                    {t(language, 'careerStartBtn')}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Other recommendations */}
      {recommendations.slice(1).map((rec, index) => (
        <motion.div
          key={rec.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
        >
          <Card className="border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`flex-shrink-0 text-[10px] px-1.5 py-0 ${
                    rec.priority === 'high'
                      ? 'border-red-200 text-red-600'
                      : rec.priority === 'medium'
                        ? 'border-amber-200 text-amber-600'
                        : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {rec.priority === 'high' ? t(language, 'careerPriorityHigh') : rec.priority === 'medium' ? t(language, 'careerPriorityMedium') : t(language, 'careerPriorityLow')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="h-48 w-48 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { language } = useCVStore()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{t(language, 'careerError')}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-2"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        {t(language, 'careerRetry')}
      </Button>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────

export default function CareerDashboard() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [profile, setProfile] = useState<CareerProfile | null>(null)
  const [scoreData, setScoreData] = useState<CareerScoreResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animateScore, setAnimateScore] = useState(false)

  const fallbackScore = useMemo(() => getFallbackScore(language), [language])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [profileRes, scoreRes] = await Promise.allSettled([
        fetch('/api/career-intel/profile'),
        fetch('/api/career-intel/score'),
      ])

      // Process profile data
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const data = await profileRes.value.json()
        setProfile(data)
      }

      // Process score data
      if (scoreRes.status === 'fulfilled' && scoreRes.value.ok) {
        const data = await scoreRes.value.json()
        setScoreData(data)
      } else {
        setScoreData(fallbackScore)
      }

      // Trigger score animation after data loads
      setTimeout(() => setAnimateScore(true), 300)
    } catch {
      setScoreData(fallbackScore)
      setTimeout(() => setAnimateScore(true), 300)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950" dir={isRtl ? 'rtl' : undefined}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  if (error && !scoreData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950" dir={isRtl ? 'rtl' : undefined}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <ErrorState
            message={error}
            onRetry={fetchData}
          />
        </div>
      </div>
    )
  }

  const score = scoreData ?? fallbackScore
  const currentProfile = profile

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" dir={isRtl ? 'rtl' : undefined}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep('dashboard')}
              className="h-9 w-9"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t(language, 'careerTitle')}</h1>
                <p className="text-xs text-muted-foreground">{t(language, 'careerSubtitle')}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            {t(language, 'careerRefresh')}
          </Button>
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ── Left Column: Score Ring + Dimensions ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Score Ring Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <ScoreRing
                    score={score.overallScore}
                    level={score.level}
                    animate={animateScore}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dimension Bars Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  {t(language, 'careerDimensions')}
                </h2>
                <div className="space-y-4">
                  {score.dimensions.map((dim, index) => (
                    <CompletenessBar key={dim.key} dimension={dim} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Profile Card */}
            {currentProfile && (
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    {t(language, 'careerQuickProfile')}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t(language, 'careerTargetJob')}</span>
                      <span className="font-medium text-foreground">{currentProfile.targetJob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t(language, 'careerSector')}</span>
                      <span className="font-medium text-foreground">{currentProfile.industry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t(language, 'careerExperienceLabel')}</span>
                      <span className="font-medium text-foreground">{currentProfile.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t(language, 'careerEducationLabel')}</span>
                      <span className="font-medium text-foreground">{currentProfile.education}</span>
                    </div>
                  </div>
                  {currentProfile.skills.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">{t(language, 'careerMainSkills')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentProfile.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-[11px] px-2 py-0.5">
                            {skill}
                          </Badge>
                        ))}
                        {currentProfile.skills.length > 6 && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                            +{currentProfile.skills.length - 6}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* ── Middle Column: AI Recommendations ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Recommendations Header */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                    {t(language, 'careerRecommendations')}
                  </h2>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-600">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    {score.recommendations.length} {t(language, 'careerSuggestionsCount')}
                  </Badge>
                </div>
                <AIRecommendationsPanel recommendations={score.recommendations} />
              </CardContent>
            </Card>

            {/* Insights Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {t(language, 'careerTrends')}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{t(language, 'careerHighDemand').replace('{0}', currentProfile?.targetJob ?? '')}</p>
                      <p className="text-[11px] text-muted-foreground">{t(language, 'careerOffersIncrease')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/10">
                    <GraduationCap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{t(language, 'careerEmergingSkills')}</p>
                      <p className="text-[11px] text-muted-foreground">{t(language, 'careerEmergingSkillsDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/10">
                    <Globe className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{t(language, 'careerInternationalOpps')}</p>
                      <p className="text-[11px] text-muted-foreground">{t(language, 'careerInternationalOppsDesc')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Right Column: Activity Timeline + Languages ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Activity Timeline */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-emerald-500" />
                  {t(language, 'careerRecentActivity')}
                </h2>
                <div className="space-y-1">
                  {score.recentActivity.map((activity, index) => (
                    <ActivityCard key={activity.id} activity={activity} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Languages Card */}
            {currentProfile && currentProfile.languages.length > 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-emerald-500" />
                    {t(language, 'careerLanguages')}
                  </h2>
                  <div className="space-y-2">
                    {currentProfile.languages.map((lang) => (
                      <div
                        key={lang}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                      >
                        <span className="text-sm text-foreground">{lang}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-2 h-2 rounded-full ${
                                level <= 3
                                  ? 'bg-emerald-500'
                                  : level <= 4
                                    ? 'bg-emerald-300'
                                    : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Card */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <CardContent className="p-5">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(language, 'careerReadyToImprove')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(language, 'careerReadyToImproveDesc')}
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    {t(language, 'careerSeeActionPlan')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
