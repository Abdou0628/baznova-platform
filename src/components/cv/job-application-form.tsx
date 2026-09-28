'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { getPersonaConfig } from '@/lib/persona-engine'
import type { TranslationKey, CVLanguage } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Send,
  Building2,
  UserCircle,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react'

function safeT(lang: CVLanguage, key: string): string {
  try {
    return t(lang, key as TranslationKey)
  } catch {
    return key
  }
}

export default function JobApplicationForm() {
  const { selectedPersona, formData, generatedCV, language, setStep } = useCVStore()
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const [isGenerating, setIsGenerating] = useState(false)

  // Common fields
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState(formData.targetJob || '')
  const [hiringManager, setHiringManager] = useState('')
  const [appType, setAppType] = useState('')
  const [availability, setAvailability] = useState('')
  const [salary, setSalary] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  // Persona-specific fields
  const [personaFields, setPersonaFields] = useState<Record<string, string>>({})

  const personaConfig = selectedPersona ? getPersonaConfig(selectedPersona) : null

  const handlePersonaFieldChange = useCallback((key: string, value: string) => {
    setPersonaFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = async () => {
    if (!selectedPersona || !personaConfig) {
      toast.error(t(language, 'jaNoPersona'))
      return
    }

    if (!company.trim() || !position.trim()) {
      toast.error(t(language, 'errorFillFields'))
      return
    }

    // Check required persona fields
    for (const field of personaConfig.applicationFields) {
      if (field.required && !personaFields[field.key]?.trim()) {
        toast.error(`${safeT(language, field.labelKey)} *`)
        return
      }
    }

    setIsGenerating(true)

    try {
      const cvContent = generatedCV
        ? JSON.stringify(generatedCV, null, 2)
        : ''

      const response = await fetch('/api/job-application/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: selectedPersona,
          formData: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            location: formData.location,
            targetJob: formData.targetJob,
            industry: formData.industry,
            skills: formData.skills,
            languages: formData.languages,
          },
          appFormData: {
            company,
            position,
            hiringManager,
            appType,
            availability,
            salary,
            additionalInfo,
            personaFields,
          },
          language,
          generatedCVContent: cvContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || t(language, 'jaErrorGenerate'))
        return
      }

      setStep('jobApplicationPreview', {
        application: data.application,
        company,
        position,
      })
    } catch {
      toast.error(t(language, 'jaNetworkError'))
    } finally {
      setIsGenerating(false)
    }
  }

  if (!selectedPersona || !personaConfig) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir={dir}>
        <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('preview')}
              className="gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {t(language, 'jaBackPreview')}
            </Button>
            <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <UserCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t(language, 'jaNoPersona')}</h2>
            <p className="text-sm text-muted-foreground max-w-md">{t(language, 'jaNoPersonaDesc')}</p>
            <Button onClick={() => setStep('preview')} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
              {t(language, 'jaBackPreview')}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const animUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40" dir={dir}>
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('preview')}
              className="gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t(language, 'jaBackPreview')}</span>
            </Button>
            <div className="flex items-center gap-2">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <span className="font-semibold text-foreground text-sm">{t(language, 'siteTitle')}</span>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            {personaConfig.emoji} {personaConfig.id.charAt(0).toUpperCase() + personaConfig.id.slice(1)}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <motion.div {...animUp} transition={{ duration: 0.4 }} className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t(language, 'jaTitle')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t(language, 'jaSubtitle')}
            </p>
          </motion.div>

          {/* Persona Intro Banner */}
          <motion.div
            {...animUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-600/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{personaConfig.emoji}</span>
                <div>
                  <h2 className="font-bold text-base">{personaConfig.tagline[language]}</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">{personaConfig.applicationIntro[language]}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Application Type Selector */}
          {personaConfig.applicationTypes.length > 0 && (
            <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.15 }} className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                {t(language, 'jaAppType')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {personaConfig.applicationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setAppType(type.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-2 ${
                      appType === type.value
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-white text-foreground border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    {safeT(language, type.labelKey)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Persona-specific extra fields */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-emerald-600" />
                {personaConfig.emoji} {personaConfig.id.charAt(0).toUpperCase() + personaConfig.id.slice(1)} {t(language, 'jaProfile')}
              </h3>

              {personaConfig.applicationFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    {safeT(language, field.labelKey)}
                    {field.required && <span className="text-red-500 ms-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={personaFields[field.key] || ''}
                      onChange={(e) => handlePersonaFieldChange(field.key, e.target.value)}
                      placeholder={safeT(language, field.placeholderKey)}
                      className="min-h-[80px] resize-y"
                    />
                  ) : field.type === 'select' && field.options ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handlePersonaFieldChange(field.key, opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            personaFields[field.key] === opt.value
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-muted-foreground border-muted-foreground/30 hover:border-emerald-400'
                          }`}
                        >
                          {safeT(language, opt.labelKey)}
                        </button>
                      ))}
                    </div>
                  ) : field.type === 'date' ? (
                    <Input
                      type="month"
                      value={personaFields[field.key] || ''}
                      onChange={(e) => handlePersonaFieldChange(field.key, e.target.value)}
                      placeholder={safeT(language, field.placeholderKey)}
                      className="max-w-xs"
                    />
                  ) : (
                    <Input
                      value={personaFields[field.key] || ''}
                      onChange={(e) => handlePersonaFieldChange(field.key, e.target.value)}
                      placeholder={safeT(language, field.placeholderKey)}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Common fields */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.25 }} className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                {t(language, 'jaTargetCompany')} & {t(language, 'jaTargetPosition')}
              </h3>

              {/* Target company */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  {t(language, 'jaTargetCompany')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t(language, 'jaCompanyPh')}
                />
              </div>

              {/* Target position */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  {t(language, 'jaTargetPosition')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={t(language, 'jaPositionPh')}
                />
              </div>

              {/* Hiring manager */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  {t(language, 'jaHiringManager')}
                </Label>
                <Input
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  placeholder={t(language, 'jaHiringManagerPh')}
                />
              </div>

              {/* Availability (only for personas without it in their fields) */}
              {!personaConfig.applicationFields.some(f => f.key === 'availability') && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {t(language, 'jaAvailability')}
                  </Label>
                  <Input
                    type="text"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder={t(language, 'jaAvailabilityPh')}
                  />
                </div>
              )}

              {/* Salary expectations (only for personas without it in their fields) */}
              {!personaConfig.applicationFields.some(f => f.key === 'salaryExpectation' || f.key === 'hourlyRate') && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {t(language, 'jaSalaryExpectation')}
                  </Label>
                  <Input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder={t(language, 'jaSalaryPh')}
                  />
                </div>
              )}

              {/* Additional info */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  {t(language, 'jaAdditionalInfo')}
                </Label>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t(language, 'jaAdditionalInfoPh')}
                  className="min-h-[80px] resize-y"
                />
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.3 }}>
            <Button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t(language, 'jaGenerating')}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t(language, 'jaSubmit')}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-4 sm:px-6 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 mt-auto">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          <p className="text-center">{t(language, 'previewEqualOpportunity')}</p>
          <p>{t(language, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
        </div>
      </footer>
    </div>
  )
}
