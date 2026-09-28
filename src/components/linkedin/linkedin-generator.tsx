'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Linkedin, Loader2, Wand2, Copy, Check, Download,
  ArrowRight, Sparkles, Lightbulb, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface GeneratorResult {
  headlines: string[]
  summaries: string[]
  experienceBullets: string[]
  suggestedSkills: string[]
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

function SectionCard({
  title,
  icon: Icon,
  items,
  language,
  variant = 'default',
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: string[]
  language: string
  variant?: 'default' | 'headlines' | 'bullets' | 'skills'
}) {
  return (
    <Card className="border-sky-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-sky-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group flex items-start gap-2 rounded-lg p-3 transition-colors hover:bg-sky-50 ${
              variant === 'headlines' ? 'border border-sky-100' : ''
            }`}
          >
            {variant === 'bullets' && (
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
            )}
            {variant === 'headlines' && (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {i + 1}
              </span>
            )}
            {variant === 'skills' && (
              <Badge variant="secondary" className="mt-0.5 shrink-0 bg-sky-100 text-sky-700 text-xs">
                #{i + 1}
              </Badge>
            )}
            <p className="flex-1 text-sm text-gray-700">{item}</p>
            <CopyButton text={item} language={language} />
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function LinkedInGenerator() {
  const { setStep, language } = useCVStore()
  const [targetJob, setTargetJob] = useState('')
  const [industry, setIndustry] = useState('')
  const [achievements, setAchievements] = useState('')
  const [currentHeadline, setCurrentHeadline] = useState('')
  const [currentSummary, setCurrentSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GeneratorResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const handleGenerate = async () => {
    if (!targetJob.trim()) return

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetJob,
          industry,
          achievements,
          currentHeadline,
          currentSummary,
          language,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t(language, 'linkedinError'))
      }

      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t(language, 'linkedinError'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    if (!result) return

    const lang = language as 'fr' | 'en' | 'ar' | 'es'
    const lines = [
      `=== ${t(lang, 'linkedinOptimizedHeadlines')} ===`,
      ...result.headlines.map((h, i) => `${i + 1}. ${h}`),
      '',
      `=== ${t(lang, 'linkedinOptimizedSummaries')} ===`,
      ...result.summaries.map((s, i) => `--- ${i + 1} ---\n${s}`),
      '',
      `=== ${t(lang, 'linkedinExperienceBullets')} ===`,
      ...result.experienceBullets.map((b) => `• ${b}`),
      '',
      `=== ${t(lang, 'linkedinSuggestedSkills')} ===`,
      ...result.suggestedSkills.map((s) => `• ${s}`),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `linkedin-optimized-${language}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
            <h1 className="text-xl font-bold text-sky-900">{t(language, 'linkedinGenerate')}</h1>
          </div>
          <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700">
            <Wand2 className={`h-3 w-3 ${language === 'ar' ? 'ml-1 mr-0' : 'mr-1'}`} />
            {t(language, 'linkedinOptimize')}
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Form section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-sky-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-900">
                <Wand2 className="h-5 w-5" />
                {t(language, 'linkedinGenerate')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t(language, 'linkedinTargetJobTitle')} *</label>
                  <Input
                    value={targetJob}
                    onChange={(e) => setTargetJob(e.target.value)}
                    placeholder={t(language, 'linkedinJobTitlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t(language, 'linkedinIndustry')}</label>
                  <Input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder={t(language, 'industry')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t(language, 'linkedinKeyAchievements')}</label>
                <Textarea
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  placeholder={t(language, 'linkedinAchievementsPlaceholder')}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t(language, 'linkedinCurrentHeadline')}</label>
                <Input
                  value={currentHeadline}
                  onChange={(e) => setCurrentHeadline(e.target.value)}
                  placeholder={t(language, 'linkedinHeadlinePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t(language, 'linkedinCurrentSummary')}</label>
                <Textarea
                  value={currentSummary}
                  onChange={(e) => setCurrentSummary(e.target.value)}
                  placeholder={t(language, 'linkedinSummaryPlaceholder')}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={!targetJob.trim() || isGenerating}
                  className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white cursor-pointer"
                >
                  {isGenerating ? (
                    <><Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />{t(language, 'linkedinAnalyzing')}</>
                  ) : (
                    <><Sparkles className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />{t(language, 'linkedinGenerateBtn')}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('linkedinAnalyzer')}
                  className="cursor-pointer"
                >
                  <Lightbulb className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />
                  {t(language, 'linkedinAnalyze')}
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
                <Button variant="outline" size="sm" onClick={handleGenerate} className="cursor-pointer">
                  {t(language, 'linkedinRetry')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <Card className="border-sky-200">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
                <p className="text-sky-700 font-medium">{t(language, 'linkedinAnalyzing')}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {result && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Headlines */}
            <SectionCard
              title={t(language, 'linkedinOptimizedHeadlines')}
              icon={Lightbulb}
              items={result.headlines}
              language={language}
              variant="headlines"
            />

            {/* Summaries */}
            <SectionCard
              title={t(language, 'linkedinOptimizedSummaries')}
              icon={Lightbulb}
              items={result.summaries}
              language={language}
            />

            {/* Experience bullets */}
            <SectionCard
              title={t(language, 'linkedinExperienceBullets')}
              icon={Wand2}
              items={result.experienceBullets}
              language={language}
              variant="bullets"
            />

            {/* Suggested skills */}
            <SectionCard
              title={t(language, 'linkedinSuggestedSkills')}
              icon={Sparkles}
              items={result.suggestedSkills}
              language={language}
              variant="skills"
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white cursor-pointer"
              >
                <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-2 mr-0' : 'mr-2'}`} />
                {t(language, 'linkedinExport')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('linkedinAnalyzer')}
                className="cursor-pointer"
              >
                {t(language, 'linkedinAnalyze')}
                <ArrowRight className={`h-4 w-4 ${language === 'ar' ? 'rotate-180 ml-2 mr-0' : 'ml-2'}`} />
              </Button>
              <Button variant="outline" onClick={() => setStep('linkedinHome')} className="cursor-pointer">
                {t(language, 'linkedinBackToHome')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!result && !isGenerating && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
              <Wand2 className="h-8 w-8 text-sky-600" />
            </div>
            <p className="text-muted-foreground">{t(language, 'linkedinNoResults')}</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
