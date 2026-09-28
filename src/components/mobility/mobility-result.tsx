'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, FileText, Mail, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, PartyPopper, Plane, Globe, RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const countryFlags: Record<string, string> = {
  France: '🇫🇷', Canada: '🇨🇦', 'Royaume-Uni': '🇬🇧', 'États-Unis': '🇺🇸',
  Allemagne: '🇩🇪', 'Émirats Arabes Unis': '🇦🇪', Suisse: '🇨🇭',
  Australie: '🇦🇺', Belgique: '🇧🇪', Espagne: '🇪🇸', Italie: '🇮🇹', Japon: '🇯🇵',
}

const countryIdToNameKey: Record<string, string> = {
  France: 'mobShared.france', Canada: 'mobShared.canada', 'Royaume-Uni': 'mobShared.uk', 'États-Unis': 'mobShared.usa',
  Allemagne: 'mobShared.germany', 'Émirats Arabes Unis': 'mobShared.uae', Suisse: 'mobShared.switzerland',
  Australie: 'mobShared.australia', Belgique: 'mobShared.belgium', Espagne: 'mobShared.spain', Italie: 'mobShared.italy', Japon: 'mobShared.japan',
}

function buildAdaptationsMap(language: Parameters<typeof t>[0]): Record<string, string[]> {
  return {
    France: [t(language, 'mobResult.adaptFrance1'), t(language, 'mobResult.adaptFrance2'), t(language, 'mobResult.adaptFrance3'), t(language, 'mobResult.adaptFrance4')],
    Canada: [t(language, 'mobResult.adaptCanada1'), t(language, 'mobResult.adaptCanada2'), t(language, 'mobResult.adaptCanada3'), t(language, 'mobResult.adaptCanada4')],
    'Royaume-Uni': [t(language, 'mobResult.adaptUk1'), t(language, 'mobResult.adaptUk2'), t(language, 'mobResult.adaptUk3'), t(language, 'mobResult.adaptUk4')],
    'États-Unis': [t(language, 'mobResult.adaptUsa1'), t(language, 'mobResult.adaptUsa2'), t(language, 'mobResult.adaptUsa3'), t(language, 'mobResult.adaptUsa4')],
    Allemagne: [t(language, 'mobResult.adaptGermany1'), t(language, 'mobResult.adaptGermany2'), t(language, 'mobResult.adaptGermany3'), t(language, 'mobResult.adaptGermany4')],
    'Émirats Arabes Unis': [t(language, 'mobResult.adaptUae1'), t(language, 'mobResult.adaptUae2'), t(language, 'mobResult.adaptUae3'), t(language, 'mobResult.adaptUae4')],
    Suisse: [t(language, 'mobResult.adaptSwitzerland1'), t(language, 'mobResult.adaptSwitzerland2'), t(language, 'mobResult.adaptSwitzerland3'), t(language, 'mobResult.adaptSwitzerland4')],
    Australie: [t(language, 'mobResult.adaptAustralia1'), t(language, 'mobResult.adaptAustralia2'), t(language, 'mobResult.adaptAustralia3'), t(language, 'mobResult.adaptAustralia4')],
    Belgique: [t(language, 'mobResult.adaptBelgium1'), t(language, 'mobResult.adaptBelgium2'), t(language, 'mobResult.adaptBelgium3'), t(language, 'mobResult.adaptBelgium4')],
    Espagne: [t(language, 'mobResult.adaptSpain1'), t(language, 'mobResult.adaptSpain2'), t(language, 'mobResult.adaptSpain3'), t(language, 'mobResult.adaptSpain4')],
    Italie: [t(language, 'mobResult.adaptItaly1'), t(language, 'mobResult.adaptItaly2'), t(language, 'mobResult.adaptItaly3'), t(language, 'mobResult.adaptItaly4')],
    Japon: [t(language, 'mobResult.adaptJapan1'), t(language, 'mobResult.adaptJapan2'), t(language, 'mobResult.adaptJapan3'), t(language, 'mobResult.adaptJapan4')],
  }
}

function getScoreVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'destructive'
}

export default function MobilityResult() {
  const { stepData, mobilityResult, setStep, reset, language } = useCVStore()
  const targetCountry = (stepData.targetCountry as string) || 'France'

  const formattedCV = mobilityResult?.formattedCV
  const formattedCL = mobilityResult?.formattedCL
  const score = mobilityResult?.compatibilityScore ?? 72

  const adaptationsMap = useMemo(() => buildAdaptationsMap(language), [language])
  const adaptations = adaptationsMap[targetCountry] ?? adaptationsMap['France']

  useEffect(() => {
    if (!mobilityResult || !formattedCV) {
      // If no result, redirect to upload
      setStep('mobilityUpload', { targetCountry })
    }
  }, [mobilityResult, formattedCV, targetCountry, setStep])

  const handleDownload = (type: 'cv' | 'cl') => {
    const countryName = t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')
    const content = type === 'cv'
      ? `${t(language, 'mobResult.cvAdaptedFor')} ${countryName}\n\n${formattedCV?.summary ?? ''}\n\n${t(language, 'mobResult.experiencesLabel')}\n${formattedCV?.experience.map(e => `- ${e.title} ${t(language, 'mobResult.at')} ${e.company} (${e.period})`).join('\n')}\n\n${t(language, 'mobResult.educationLabel')}\n${formattedCV?.education.map(e => `- ${e.degree} - ${e.school} (${e.period})`).join('\n')}\n\n${t(language, 'mobResult.skillsLabel')} ${formattedCV?.skills.join(', ')}`
      : `${t(language, 'mobResult.clAdaptedFor')} ${countryName}\n\n${formattedCL?.subject ?? ''}\n\n${formattedCL?.greeting ?? ''}\n\n${formattedCL?.paragraphs.join('\n\n') ?? ''}\n\n${formattedCL?.signOff ?? ''}`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = type === 'cv' ? `${t(language, 'mobResult.cvFileName')}${countryName}.txt` : `${t(language, 'mobResult.clFileName')}${countryName}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

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
            onClick={() => setStep('mobilityProfile')}
            className="text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{countryFlags[targetCountry] ?? '🌍'}</span>
            <h1 className="text-lg font-semibold text-emerald-900">{t(language, 'mobResult.title')}</h1>
          </div>
          <Badge
            variant={getScoreVariant(score)}
            className="ml-auto text-sm px-3 py-1"
          >
            {score}% {t(language, 'mobResult.compatible')}
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
            <PartyPopper className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">
            {t(language, 'mobResult.documentsReady')}
          </h2>
          <p className="mt-1 text-gray-500">
            {t(language, 'mobResult.documentsReadySub')} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}
          </p>
        </motion.div>

        {/* Two document cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* CV Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-emerald-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t(language, 'mobResult.cvAdapted')}</h3>
                    <p className="text-xs text-gray-400">{countryFlags[targetCountry]} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1">
                  {formattedCV?.summary && (
                    <p className="text-sm italic text-gray-600">&ldquo;{formattedCV.summary}&rdquo;</p>
                  )}

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">{t(language, 'mobResult.experience')}</p>
                    {formattedCV?.experience.map((exp, i) => (
                      <div key={i} className="mb-2 border-l-2 border-emerald-200 pl-3">
                        <p className="text-sm font-medium text-gray-800">{exp.title}</p>
                        <p className="text-xs text-emerald-600">{exp.company} · {exp.period}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-600">{t(language, 'mobResult.education')}</p>
                    {formattedCV?.education.map((edu, i) => (
                      <div key={i} className="mb-1.5 border-l-2 border-teal-200 pl-3">
                        <p className="text-sm font-medium text-gray-800">{edu.degree}</p>
                        <p className="text-xs text-teal-600">{edu.school} · {edu.period}</p>
                      </div>
                    ))}
                  </div>

                  {formattedCV?.skills && (
                    <div className="flex flex-wrap gap-1">
                      {formattedCV.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleDownload('cv')}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t(language, 'mobResult.downloadCv')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cover Letter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="h-full border-teal-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <Mail className="h-5 w-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t(language, 'mobResult.clAdapted')}</h3>
                    <p className="text-xs text-gray-400">{countryFlags[targetCountry]} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1">
                  {formattedCL?.subject && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-400">{t(language, 'mobResult.subject')}</p>
                      <p className="text-sm font-medium text-gray-800">{formattedCL.subject}</p>
                    </div>
                  )}

                  {formattedCL?.greeting && (
                    <p className="text-sm text-gray-700">{formattedCL.greeting}</p>
                  )}

                  {formattedCL?.paragraphs.map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-gray-600">
                      {para}
                    </p>
                  ))}

                  {formattedCL?.signOff && (
                    <p className="text-sm text-gray-700 mt-2">{formattedCL.signOff}</p>
                  )}
                </div>

                <Button
                  onClick={() => handleDownload('cl')}
                  className="mt-4 w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t(language, 'mobResult.downloadCl')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Adaptations summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mb-8 border-emerald-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                <Sparkles className="mr-2 inline h-5 w-5 text-emerald-600" />
                {t(language, 'mobResult.adaptationPoints')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {adaptations.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compatibility score display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-10 flex justify-center"
        >
          <div className="flex items-center gap-4 rounded-2xl bg-white px-8 py-4 shadow-sm border border-emerald-100">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
              score >= 80 ? 'bg-emerald-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <span className={`text-xl font-bold ${
                score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {score}%
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{t(language, 'mobResult.compatibilityScore')}</p>
              <p className="text-sm text-gray-500">
                {score >= 80 ? t(language, 'mobResult.scoreExcellent') :
                 score >= 60 ? t(language, 'mobResult.scoreGood') :
                 t(language, 'mobResult.scoreFair')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-4 pb-8"
        >
          <Button
            size="lg"
            onClick={() => handleDownload('cv')}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {t(language, 'mobResult.downloadCvBtn')}
          </Button>
          <Button
            size="lg"
            onClick={() => handleDownload('cl')}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 text-white shadow-lg hover:from-teal-700 hover:to-cyan-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {t(language, 'mobResult.downloadClBtn')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => reset()}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t(language, 'mobResult.backHome')}
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
