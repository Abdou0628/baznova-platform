'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVStore, type ATSResult } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Loader2,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Shield,
  BarChart3,
  Sparkles,
  Eye,
  Target,
  BookOpen,
} from 'lucide-react'
import type { CVLanguage } from '@/lib/i18n'
import { toast } from 'sonner'
import { events } from '@/lib/analytics'

const categoryIcons: Record<string, React.ElementType> = {
  keywords_seo: Target,
  structure_format: Shield,
  experience_impact: TrendingUp,
  skills_match: BarChart3,
  readability: Eye,
}

const categoryColorMap: Record<string, string> = {
  keywords_seo: 'emerald',
  structure_format: 'teal',
  experience_impact: 'amber',
  skills_match: 'violet',
  readability: 'sky',
}

const categoryKeyMap: Record<string, { title: string; desc: string }> = {
  keywords_seo: {
    title: 'atsCategoryKeywords',
    desc: 'atsCategoryKeywordsDesc',
  },
  structure_format: {
    title: 'atsCategoryStructure',
    desc: 'atsCategoryStructureDesc',
  },
  experience_impact: {
    title: 'atsCategoryExperience',
    desc: 'atsCategoryExperienceDesc',
  },
  skills_match: {
    title: 'atsCategorySkills',
    desc: 'atsCategorySkillsDesc',
  },
  readability: {
    title: 'atsCategoryReadability',
    desc: 'atsCategoryReadabilityDesc',
  },
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'stroke-emerald-500'
  if (score >= 60) return 'stroke-amber-500'
  return 'stroke-red-500'
}

function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

function getScoreGlowColor(score: number): string {
  if (score >= 80) return 'shadow-emerald-500/30'
  if (score >= 60) return 'shadow-amber-500/30'
  return 'shadow-red-500/30'
}

function ScoreCircle({ score, language }: { score: number; language: CVLanguage }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const startScore = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(startScore + (score - startScore) * eased))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [score])

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        {/* Score arc */}
        <motion.circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={getScoreBgColor(score)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-extrabold ${getScoreColor(score)}`}>
          {animatedScore}%
        </span>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {t(language, 'atsScoreLabel')}
        </span>
      </div>
    </div>
  )
}

function CategoryBar({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const percentage = Math.min((score / maxScore) * 100, 100)
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  )
}

interface ATSAnalysisProps {
  isOpen: boolean
  onClose: () => void
}

export default function ATSAnalysis({ isOpen, onClose }: ATSAnalysisProps) {
  const {
    generatedCV,
    formData,
    language,
    atsResult,
    isATSAnalyzing,
    atsError,
    setATSResult,
    setIsATSAnalyzing,
    setATSError,
  } = useCVStore()

  const analyzeATS = useCallback(async () => {
    if (!generatedCV || !formData) return

    setIsATSAnalyzing(true)
    setATSError(null)
    setATSResult(null)

    try {
      const res = await fetch('/api/analyze-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedCV,
          targetJob: formData.targetJob,
          industry: formData.industry,
          language,
          formData: { softSkills: formData.softSkills },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t(language, 'cvErrorAtsAnalysis'))
      }

      setATSResult(data.result)
      events.atsAnalyzed(data.result?.score ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : t(language, 'cvErrorAtsAnalysis')
      setATSError(message)
      toast.error(message)
    } finally {
      setIsATSAnalyzing(false)
    }
  }, [generatedCV, formData, language, setIsATSAnalyzing, setATSError, setATSResult])

  useEffect(() => {
    if (isOpen && !atsResult && !isATSAnalyzing) {
      analyzeATS()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">
                  {t(language, 'atsOverallScore')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(language, 'atsPoweredBy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {atsResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeATS}
                  disabled={isATSAnalyzing}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isATSAnalyzing ? 'animate-spin' : ''}`} />
                  {t(language, 'atsReAnalyze')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Loading State */}
            {isATSAnalyzing && (
              <motion.div
                className="flex flex-col items-center justify-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="mt-6 font-semibold text-foreground text-lg">
                  {t(language, 'atsAnalyzing')}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(language, 'atsAnalyzingSubtitle')}
                </p>
              </motion.div>
            )}

            {/* Error State */}
            {atsError && !isATSAnalyzing && (
              <motion.div
                className="flex flex-col items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <p className="mt-4 text-sm text-red-600 font-medium">{atsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeATS}
                  className="mt-4 gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t(language, 'atsReAnalyze')}
                </Button>
              </motion.div>
            )}

            {/* Results */}
            {atsResult && !isATSAnalyzing && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Overall Score */}
                <div className="flex flex-col items-center py-4">
                  <div className={`p-4 rounded-full shadow-lg ${getScoreGlowColor(atsResult.overallScore)}`}>
                    <ScoreCircle score={atsResult.overallScore} language={language} />
                  </div>

                  {/* Score badge */}
                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getScoreBadgeColor(atsResult.overallScore)}`}>
                      {atsResult.overallScore >= 80 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t(language, 'atsScoreExcellent')}
                        </>
                      ) : atsResult.overallScore >= 60 ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          {t(language, 'atsScoreGood')}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t(language, 'atsScoreImprove')}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    {t(language, 'atsCategoryDetail')}
                  </h3>
                  <div className="space-y-2">
                    {atsResult.categories.map((cat, index) => {
                      const Icon = categoryIcons[cat.name] || BarChart3
                      const keys = categoryKeyMap[cat.name]
                      const color = categoryColorMap[cat.name] || 'emerald'

                      return (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <Card className="border shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center shrink-0 mt-0.5`}>
                                    <Icon className={`w-4 h-4 text-${color}-600`} />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-medium text-sm text-foreground">
                                      {keys ? t(language, keys.title as Parameters<typeof t>[1]) : cat.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {cat.description}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-lg font-bold shrink-0 ${getScoreColor(cat.score)}`}>
                                  {cat.score}%
                                </span>
                              </div>
                              <CategoryBar score={cat.score} />
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    {t(language, 'atsSuggestions')}
                  </h3>
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        {atsResult.suggestions.map((suggestion, index) => (
                          <motion.li
                            key={index}
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                          >
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-emerald-600">{index + 1}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{suggestion}</p>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Success message for high scores */}
                {atsResult.overallScore >= 80 && (
                  <motion.div
                    className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <p className="text-sm text-emerald-800 font-medium">
                      {t(language, 'atsSuggestionGood')}
                    </p>
                  </motion.div>
                )}

                {/* Bottom actions */}
                <div className="flex items-center justify-center gap-3 pt-2 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={analyzeATS}
                    disabled={isATSAnalyzing}
                    className="gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isATSAnalyzing ? 'animate-spin' : ''}`} />
                    {t(language, 'atsReAnalyze')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={onClose}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                  >
                    {t(language, 'atsClose')}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
