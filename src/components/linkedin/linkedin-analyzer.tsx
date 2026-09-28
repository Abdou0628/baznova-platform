'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Linkedin, Loader2, BarChart3, Sparkles, Copy, Check, ArrowRight,
  Eye, FileText, TrendingUp, AlertCircle, Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface AnalysisResult {
  headlineAnalysis: string
  summaryReview: string
  experienceCritique: string
  skillsGap: string
  overallScore: number
  visibility: number
  keywordOptimization: number
  completeness: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function CopyButton({ text, language }: { text: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(t(language as 'fr' | 'en' | 'ar' | 'es', 'linkedinCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 w-8 p-0 cursor-pointer"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
    </Button>
  )
}

export default function LinkedInAnalyzer() {
  const { setStep, language } = useCVStore()
  const [profileText, setProfileText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const handleAnalyze = async () => {
    if (!profileText.trim()) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/linkedin/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileText, language }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t(language, 'linkedinError'))
      }

      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t(language, 'linkedinError'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50" dir={dir}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 border-b border-sky-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('linkedinHome')}
            className="text-sky-700 hover:bg-sky-50"
          >
            <ArrowLeft className={`h-5 w-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
              <Linkedin className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-sky-900">{t(language, 'linkedinHeadlineAnalysis')}</h1>
          </div>
          <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700">
            <BarChart3 className={`h-3 w-3 ${language === 'ar' ? 'ml-1 mr-0' : 'mr-1'}`} />
            {t(language, 'linkedinOptimize')}
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Input section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-sky-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-900">
                <FileText className="h-5 w-5" />
                {t(language, 'linkedinProfileText')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t(language, 'linkedinPasteUrlOrText')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                placeholder={t(language, 'linkedinProfileTextPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={!profileText.trim() || isAnalyzing}
                  className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white cursor-pointer"
                >
                  {isAnalyzing ? (
                    <><Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />{t(language, 'linkedinAnalyzing')}</>
                  ) : (
                    <><BarChart3 className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />{t(language, 'linkedinAnalyzeBtn')}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('linkedinGenerator')}
                  className="cursor-pointer"
                >
                  <Sparkles className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />
                  {t(language, 'linkedinTryGenerator')}
                  <ArrowRight className={`h-4 w-4 ${language === 'ar' ? 'rotate-180 ml-2 mr-0' : 'ml-2'}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 flex-1">{error}</p>
                <Button variant="outline" size="sm" onClick={handleAnalyze} className="cursor-pointer">
                  {t(language, 'linkedinRetry')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <Card className="border-sky-200">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
                <p className="text-sky-700 font-medium">{t(language, 'linkedinAnalyzing')}</p>
                <div className="w-full max-w-xs">
                  <Progress value={60} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {result && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score overview */}
            <Card className="border-sky-200 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-600 to-blue-600 p-6 text-white">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className={`text-5xl font-extrabold ${getScoreColor(result.overallScore)}`}
                    style={{ color: 'white' }}>
                    {result.overallScore}<span className="text-2xl">/100</span>
                  </div>
                  <div className="text-center sm:text-start">
                    <h3 className="text-xl font-bold">{t(language, 'linkedinOverallScore')}</h3>
                    <p className="text-sky-100 text-sm">{t(language, 'linkedinScoreExplanation')}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: t(language, 'linkedinVisibility'), score: result.visibility, icon: Eye },
                    { label: t(language, 'linkedinKeywordOptimization'), score: result.keywordOptimization, icon: TrendingUp },
                    { label: t(language, 'linkedinCompleteness'), score: result.completeness, icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-gray-600">
                            <Icon className="h-4 w-4" />{item.label}
                          </span>
                          <span className={`font-semibold ${getScoreColor(item.score)}`}>{item.score}%</span>
                        </div>
                        <Progress value={item.score} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Analysis sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Headline */}
              <Card className="border-sky-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-sky-600" />
                    {t(language, 'linkedinHeadlineAnalysis')}
                    <CopyButton text={result.headlineAnalysis} language={language} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.headlineAnalysis}</p>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-sky-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-600" />
                    {t(language, 'linkedinSummaryReview')}
                    <CopyButton text={result.summaryReview} language={language} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.summaryReview}</p>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card className="border-sky-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-sky-600" />
                    {t(language, 'linkedinExperienceCritique')}
                    <CopyButton text={result.experienceCritique} language={language} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.experienceCritique}</p>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="border-sky-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-sky-600" />
                    {t(language, 'linkedinSkillsGap')}
                    <CopyButton text={result.skillsGap} language={language} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.skillsGap}</p>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-emerald-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-emerald-700">{t(language, 'linkedinStrengths')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-amber-700">{t(language, 'linkedinWeaknesses')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="border-sky-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sky-900">
                  <Lightbulb className="h-5 w-5" />
                  {t(language, 'linkedinRecommendations')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                        {i + 1}
                      </span>
                      <span className="text-gray-700">{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => setStep('linkedinGenerator')}
                className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white cursor-pointer"
              >
                <Sparkles className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />
                {t(language, 'linkedinTryGenerator')}
                <ArrowRight className={`h-4 w-4 ${language === 'ar' ? 'rotate-180 ml-2 mr-0' : 'ml-2'}`} />
              </Button>
              <Button variant="outline" onClick={() => setStep('linkedinHome')} className="cursor-pointer">
                {t(language, 'linkedinBackToHome')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!result && !isAnalyzing && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
              <BarChart3 className="h-8 w-8 text-sky-600" />
            </div>
            <p className="text-muted-foreground">{t(language, 'linkedinNoResults')}</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
