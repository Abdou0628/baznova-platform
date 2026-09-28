'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plane, ArrowLeft, Upload, Sparkles, Globe, CheckCircle2,
  ChevronRight, FileSearch, ScanEye, Brain, Target, BookOpen,
  Lightbulb, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const countryKeyMap: Record<string, { nameKey: string; normsKey: string; flag: string }> = {
  France:          { nameKey: 'mobShared.france',      normsKey: 'mobShared.franceNorms',      flag: '🇫🇷' },
  Canada:          { nameKey: 'mobShared.canada',      normsKey: 'mobShared.canadaNorms',      flag: '🇨🇦' },
  'Royaume-Uni':   { nameKey: 'mobShared.uk',          normsKey: 'mobShared.ukNorms',          flag: '🇬🇧' },
  'États-Unis':    { nameKey: 'mobShared.usa',         normsKey: 'mobShared.usaNorms',         flag: '🇺🇸' },
  Allemagne:       { nameKey: 'mobShared.germany',     normsKey: 'mobShared.germanyNorms',     flag: '🇩🇪' },
  'Émirats Arabes Unis': { nameKey: 'mobShared.uae',   normsKey: 'mobShared.uaeNorms',        flag: '🇦🇪' },
  Suisse:          { nameKey: 'mobShared.switzerland', normsKey: 'mobShared.switzerlandNorms', flag: '🇨🇭' },
  Australie:       { nameKey: 'mobShared.australia',   normsKey: 'mobShared.australiaNorms',   flag: '🇦🇺' },
  Belgique:        { nameKey: 'mobShared.belgium',     normsKey: 'mobShared.belgiumNorms',     flag: '🇧🇪' },
  Espagne:         { nameKey: 'mobShared.spain',      normsKey: 'mobShared.spainNorms',       flag: '🇪🇸' },
  Italie:          { nameKey: 'mobShared.italy',       normsKey: 'mobShared.italyNorms',       flag: '🇮🇹' },
  Japon:           { nameKey: 'mobShared.japan',       normsKey: 'mobShared.japanNorms',       flag: '🇯🇵' },
}

const countryOrder = Object.keys(countryKeyMap)

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export default function MobilityHome() {
  const setStep = useCVStore((s) => s.setStep)
  const language = useCVStore((s) => s.language)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const handleStart = () => {
    if (!selectedCountry) return
    setStep('mobilityUpload', { targetCountry: selectedCountry })
  }

  const processSteps = [
    {
      step: 1,
      title: t(language, 'mobHome.stepOcrTitle'),
      description: t(language, 'mobHome.stepOcrDesc'),
      icon: ScanEye,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      step: 2,
      title: t(language, 'mobHome.stepAiTitle'),
      description: t(language, 'mobHome.stepAiDesc'),
      icon: Brain,
      color: 'from-teal-500 to-cyan-500',
    },
  ]

  const howItWorks = [
    {
      icon: Upload,
      title: t(language, 'mobHome.hiwUploadTitle'),
      desc: t(language, 'mobHome.hiwUploadDesc'),
    },
    {
      icon: FileSearch,
      title: t(language, 'mobHome.hiwExtractTitle'),
      desc: t(language, 'mobHome.hiwExtractDesc'),
    },
    {
      icon: Target,
      title: t(language, 'mobHome.hiwReformTitle'),
      desc: t(language, 'mobHome.hiwReformDesc'),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 border-b border-emerald-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('landing')}
            className="text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-emerald-900">{t(language, 'mobilityTitle')}</h1>
          </div>
          <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">
            <Globe className="mr-1 h-3 w-3" />
            {t(language, 'mobHome.badgeInternational')}
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <motion.section {...fadeUp} className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <Sparkles className="h-4 w-4" />
            {t(language, 'mobHome.pipeline')}
          </div>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            {t(language, 'mobHome.heroTitle')}{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t(language, 'mobHome.heroHighlight')}
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            {t(language, 'mobHome.heroDesc')}
          </p>
        </motion.section>

        {/* 2-step process */}
        <motion.section {...fadeUp} className="mb-12">
          <div className="grid gap-6 md:grid-cols-2">
            {processSteps.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                >
                  <Card className="border-emerald-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            {item.step}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Country selector */}
        <motion.section {...fadeUp} className="mb-12">
          <h3 className="mb-6 text-center text-2xl font-bold text-emerald-900">
            {t(language, 'mobHome.chooseCountry')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {countryOrder.map((countryId, i) => {
              const info = countryKeyMap[countryId]
              return (
                <motion.div
                  key={countryId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.35 }}
                >
                  <Card
                    onClick={() => setSelectedCountry(countryId)}
                    className={`cursor-pointer border-2 transition-all hover:shadow-md ${
                      selectedCountry === countryId
                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500/30'
                        : 'border-gray-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{info.flag}</span>
                        <span className="font-semibold text-gray-900 text-sm">{t(language, info.nameKey)}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500">{t(language, info.normsKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Start button */}
        <motion.div {...fadeUp} className="mb-16 flex justify-center">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!selectedCountry}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t(language, 'mobHome.start')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* How it works */}
        <motion.section {...fadeUp} className="mb-8">
          <h3 className="mb-8 text-center text-2xl font-bold text-emerald-900">
            {t(language, 'mobHome.howItWorks')}
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {howItWorks.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                    <Icon className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h4 className="mb-1 font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
