'use client'

import { motion } from 'framer-motion'
import { Linkedin, ArrowLeft, BarChart3, Wand2, Sparkles, ArrowRight, Search, Target, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const features = [
  {
    step: 1,
    titleKey: 'linkedinStep1Title' as const,
    descKey: 'linkedinStep1Desc' as const,
    icon: Search,
    color: 'from-sky-500 to-blue-500',
  },
  {
    step: 2,
    titleKey: 'linkedinStep2Title' as const,
    descKey: 'linkedinStep2Desc' as const,
    icon: BarChart3,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    step: 3,
    titleKey: 'linkedinStep3Title' as const,
    descKey: 'linkedinStep3Desc' as const,
    icon: Wand2,
    color: 'from-indigo-500 to-purple-500',
  },
]

const subFeatures = [
  {
    icon: BarChart3,
    titleKey: 'linkedinAnalyze' as const,
    desc: 'analysis',
    step: 'linkedinAnalyzer' as const,
    ctaKey: 'linkedinAnalyzerCta' as const,
  },
  {
    icon: Wand2,
    titleKey: 'linkedinGenerate' as const,
    desc: 'generator',
    step: 'linkedinGenerator' as const,
    ctaKey: 'linkedinGeneratorCta' as const,
  },
  {
    icon: Target,
    titleKey: 'linkedinProfileScore' as const,
    desc: 'score',
    step: 'linkedinAnalyzer' as const,
    ctaKey: 'linkedinScoreCta' as const,
  },
]

export default function LinkedInHome() {
  const { setStep, language } = useCVStore()
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const handleSubFeatureClick = (step: 'linkedinAnalyzer' | 'linkedinGenerator') => {
    setStep(step)
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
            onClick={() => setStep('landing')}
            className="text-sky-700 hover:bg-sky-50"
          >
            <ArrowLeft className={`h-5 w-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
              <Linkedin className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-sky-900">{t(language, 'linkedinTitle')}</h1>
          </div>
          <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700">
            <Sparkles className={`mr-1 h-3 w-3 ${language === 'ar' ? 'ml-1 mr-0' : ''}`} />
            LinkedIn
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <motion.section {...fadeUp} className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1.5 text-sm font-medium text-sky-700">
            <Sparkles className="h-4 w-4" />
            {t(language, 'linkedinSubtitle')}
          </div>
        </motion.section>

        {/* 3-step process */}
        <motion.section {...fadeUp} className="mb-12">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.15, duration: 0.5 }}
                >
                  <Card className="border-sky-200 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                            {item.step}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{t(language, item.titleKey)}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{t(language, item.descKey)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Sub-features cards */}
        <motion.section {...fadeUp} className="mb-12">
          <h3 className="mb-6 text-center text-2xl font-bold text-sky-900">
            {t(language, 'lot3_linkedinHome_chooseTool')}
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {subFeatures.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.desc}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                >
                  <Card
                    onClick={() => handleSubFeatureClick(item.step)}
                    className="cursor-pointer border-2 border-gray-200 bg-white hover:border-sky-400 hover:shadow-lg transition-all h-full"
                  >
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100">
                        <Icon className="h-7 w-7 text-sky-600" />
                      </div>
                      <h4 className="mb-2 text-lg font-semibold text-gray-900">{t(language, item.titleKey)}</h4>
                      <p className="mb-4 text-sm text-gray-500">
                        {item.desc === 'analysis'
                          ? t(language, 'lot3_linkedinHome_analysisDesc')
                          : item.desc === 'generator'
                          ? t(language, 'lot3_linkedinHome_generatorDesc')
                          : t(language, 'lot3_linkedinHome_scoreDesc')}
                      </p>
                      <Button
                        className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white cursor-pointer"
                      >
                        {t(language, item.ctaKey)}
                        <ArrowRight className={`ml-2 h-4 w-4 ${language === 'ar' ? 'rotate-180 ml-0 mr-2' : ''}`} />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section {...fadeUp} className="mb-8">
          <h3 className="mb-8 text-center text-2xl font-bold text-sky-900">
            {t(language, 'lot3_linkedinHome_howItWorks')}
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {[Search, FileText, Sparkles].map((Icon, i) => {
              const titles = [
                t(language, 'lot3_linkedinHome_step1Title'),
                t(language, 'lot3_linkedinHome_step2Title'),
                t(language, 'lot3_linkedinHome_step3Title'),
              ]
              const descs = [
                t(language, 'lot3_linkedinHome_step1Desc'),
                t(language, 'lot3_linkedinHome_step2Desc'),
                t(language, 'lot3_linkedinHome_step3Desc'),
              ]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100">
                    <Icon className="h-7 w-7 text-sky-600" />
                  </div>
                  <h4 className="mb-1 font-semibold text-gray-900">{titles[i]}</h4>
                  <p className="text-sm text-gray-500">{descs[i]}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
