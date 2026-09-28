'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Upload, FileText, ScanEye, Brain, CheckCircle2,
  Loader2, AlertCircle, User, Mail, Phone, Briefcase, GraduationCap,
  Sparkles, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type ExtractedProfile } from '@/store/cv-store'
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

type ProcessingStage = 'idle' | 'uploading' | 'ocr' | 'analyse' | 'profil' | 'done'

const stageOrder: ProcessingStage[] = ['uploading', 'ocr', 'analyse', 'profil']

function getStageIndex(stage: ProcessingStage): number {
  if (stage === 'idle') return -1
  if (stage === 'done') return 4
  return stageOrder.indexOf(stage)
}

export default function MobilityUpload() {
  const { stepData, setStep, setExtractedProfile, language } = useCVStore()
  const targetCountry = (stepData.targetCountry as string) || 'France'
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stages = useMemo(() => [
    { key: 'uploading' as ProcessingStage, label: t(language, 'mobUpload.stageUpload'), icon: Upload },
    { key: 'ocr' as ProcessingStage, label: t(language, 'mobUpload.stageOcr'), icon: ScanEye },
    { key: 'analyse' as ProcessingStage, label: t(language, 'mobUpload.stageAnalyse'), icon: Brain },
    { key: 'profil' as ProcessingStage, label: t(language, 'mobUpload.stageProfile'), icon: CheckCircle2 },
  ], [language])

  const simulateExtraction = useCallback(() => {
    setStage('uploading')
    setError(null)

    setTimeout(() => setStage('ocr'), 800)
    setTimeout(() => setStage('analyse'), 2200)
    setTimeout(() => {
      setStage('profil')
      const simulated: ExtractedProfile = {
        fullName: t(language, 'mobUpload.demoName'),
        email: 'jean.dupont@email.com',
        phone: '+33 6 12 34 56 78',
        location: t(language, 'mobUpload.demoLocation'),
        linkedin: 'linkedin.com/in/jeandupont',
        summary: t(language, 'mobUpload.demoSummary'),
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Git', 'Agile'],
        languages: [
          { name: t(language, 'mobUpload.demoLangFr'), level: t(language, 'mobUpload.demoLangFrLevel') },
          { name: t(language, 'mobUpload.demoLangEn'), level: t(language, 'mobUpload.demoLangEnLevel') },
          { name: t(language, 'mobUpload.demoLangEs'), level: t(language, 'mobUpload.demoLangEsLevel') },
        ],
        experience: [
          { title: t(language, 'mobUpload.demoExp1Title'), company: t(language, 'mobUpload.demoExp1Company'), period: t(language, 'mobUpload.demoExp1Period'), description: t(language, 'mobUpload.demoExp1Desc') },
          { title: t(language, 'mobUpload.demoExp2Title'), company: t(language, 'mobUpload.demoExp2Company'), period: t(language, 'mobUpload.demoExp2Period'), description: t(language, 'mobUpload.demoExp2Desc') },
        ],
        education: [
          { degree: t(language, 'mobUpload.demoEdu1Degree'), school: t(language, 'mobUpload.demoEdu1School'), period: t(language, 'mobUpload.demoEdu1Period'), description: t(language, 'mobUpload.demoEdu1Desc') },
          { degree: t(language, 'mobUpload.demoEdu2Degree'), school: t(language, 'mobUpload.demoEdu2School'), period: t(language, 'mobUpload.demoEdu2Period'), description: '' },
        ],
        certifications: ['AWS Solutions Architect', 'Scrum Master'],
        rawText: '',
      }
      setProfile(simulated)
      setExtractedProfile(simulated)

      setTimeout(() => setStage('done'), 800)
    }, 3500)
  }, [setExtractedProfile, language])

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/pdf|png|jpe?g/)) {
        setError(t(language, 'mobUpload.errorFormat'))
        return
      }
      setFileName(file.name)
      simulateExtraction()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetCountry', targetCountry)

      fetch('/api/mobility/upload', { method: 'POST', body: formData }).catch(() => {
        // Simulation fallback — data already simulated above
      })
    },
    [targetCountry, simulateExtraction, language],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const stageIdx = getStageIndex(stage)
  const progressPct = stage === 'done' ? 100 : stage === 'idle' ? 0 : Math.max(25, (stageIdx + 1) * 25)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 border-b border-emerald-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('mobilityHome')}
            className="text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{countryFlags[targetCountry] ?? '🌍'}</span>
            <h1 className="text-lg font-semibold text-emerald-900">
              {t(language, 'mobUpload.headerTitle')} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}
            </h1>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <AnimatePresence mode="wait">
          {/* Upload area (visible until processing) */}
          {stage === 'idle' && !profile && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center"
            >
              <h2 className="mb-2 text-2xl font-bold text-emerald-900 text-center">
                {t(language, 'mobUpload.uploadTitle')}
              </h2>
              <p className="mb-8 text-center text-gray-500">
                {t(language, 'mobUpload.formatHint')}
              </p>

              <Card
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl cursor-pointer border-2 border-dashed transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                    <Upload className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="mb-1 text-base font-semibold text-gray-700">
                    {isDragging ? t(language, 'mobUpload.dropHere') : t(language, 'mobUpload.dropOrClick')}
                  </p>
                  <p className="text-sm text-gray-400">{t(language, 'mobUpload.formatSmall')}</p>
                </CardContent>
              </Card>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Processing */}
          {(stage !== 'idle' && stage !== 'done') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center"
            >
              <div className="mb-8 flex items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <h2 className="text-xl font-bold text-emerald-900">
                  {stage === 'uploading' && t(language, 'mobUpload.stageUploading')}
                  {stage === 'ocr' && t(language, 'mobUpload.stageOcrProgress')}
                  {stage === 'analyse' && t(language, 'mobUpload.stageAnalyseProgress')}
                  {stage === 'profil' && t(language, 'mobUpload.stageProfileDone')}
                </h2>
              </div>

              {/* Progress steps */}
              <div className="mb-6 flex w-full max-w-md items-center gap-2">
                {stages.map((s, i) => {
                  const Icon = s.icon
                  const done = i < stageIdx
                  const active = i === stageIdx
                  return (
                    <div key={s.key} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : active
                              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : active ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={`text-xs font-medium ${done || active ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md">
                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {fileName && (
                <p className="mt-4 text-sm text-gray-500">
                  <FileText className="mr-1 inline h-3.5 w-3.5" />
                  {fileName}
                </p>
              )}
            </motion.div>
          )}

          {/* Completion / Profile summary */}
          {stage === 'done' && profile && (
            <motion.div
              key="profile-summary"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="mb-6 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
                <h2 className="text-2xl font-bold text-emerald-900">{t(language, 'mobUpload.profileExtracted')}</h2>
              </div>

              <Card className="w-full max-w-xl border-emerald-200 bg-white shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs text-gray-400">{t(language, 'mobUpload.labelName')}</p>
                        <p className="text-sm font-medium text-gray-800">{profile.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Mail className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs text-gray-400">{t(language, 'mobUpload.labelEmail')}</p>
                        <p className="text-sm font-medium text-gray-800">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs text-gray-400">{t(language, 'mobUpload.labelPhone')}</p>
                        <p className="text-sm font-medium text-gray-800">{profile.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">{t(language, 'mobUpload.extractedSkills')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 text-emerald-600" />
                      <span><strong>{profile.experience.length}</strong> {t(language, 'mobUpload.experienceCount')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4 text-emerald-600" />
                      <span><strong>{profile.education.length}</strong> {t(language, 'mobUpload.educationCount')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <Button
                  size="lg"
                  onClick={() => setStep('mobilityProfile')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {t(language, 'mobUpload.viewProfile')}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
