'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVStore, type TemplateStyle, type CVLanguage, type PersonaType } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  User,
  Briefcase,
  GraduationCap,
  Code2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Palette,
  Globe,
  Camera,
  X,
  Info,
  CalendarDays,
  MapPinned,
  HeartHandshake,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Building2,
  PenLine,
  Zap,
  UserCircle,
  Upload,
  FileUp,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { countries, findCountryByDial } from '@/lib/countries'
import type { TranslationKey } from '@/lib/i18n'
import { events } from '@/lib/analytics'
const stepIcons = [User, Briefcase, GraduationCap, Code2]
const stepTitles = ['step1Title', 'step2TitleNew', 'step3Title', 'step4Title'] as const

const templates: { id: TemplateStyle; labelKey: 'templateModern' | 'templateClassic' | 'templateCreative' }[] = [
  { id: 'modern', labelKey: 'templateModern' },
  { id: 'classic', labelKey: 'templateClassic' },
  { id: 'creative', labelKey: 'templateCreative' },
]

const personaEmoji: Record<PersonaType, string> = { student: '\uD83C\uDF93', graduate: '\uD83C\uDF1F', professional: '\uD83D\uDCBC', executive: '\uD83D\uDC54', freelance: '\uD83D\uDE80', expat: '\u2708\uFE0F' }
const personaNameKey: Record<PersonaType, TranslationKey> = { student: 'personaStudent', graduate: 'personaGraduate', professional: 'personaProfessional', executive: 'personaExecutive', freelance: 'personaFreelance', expat: 'personaExpat' }
const personaFieldMap: Record<PersonaType, { labelKey: TranslationKey; phKey: TranslationKey }[]> = {
  student: [{ labelKey: 'pfStudentField1', phKey: 'pfStudentField1Ph' }, { labelKey: 'pfStudentField2', phKey: 'pfStudentField2Ph' }, { labelKey: 'pfStudentField3', phKey: 'pfStudentField3Ph' }],
  graduate: [{ labelKey: 'pfGraduateField1', phKey: 'pfGraduateField1Ph' }, { labelKey: 'pfGraduateField2', phKey: 'pfGraduateField2Ph' }, { labelKey: 'pfGraduateField3', phKey: 'pfGraduateField3Ph' }],
  professional: [{ labelKey: 'pfProField1', phKey: 'pfProField1Ph' }, { labelKey: 'pfProField2', phKey: 'pfProField2Ph' }, { labelKey: 'pfProField3', phKey: 'pfProField3Ph' }],
  executive: [{ labelKey: 'pfExecField1', phKey: 'pfExecField1Ph' }, { labelKey: 'pfExecField2', phKey: 'pfExecField2Ph' }, { labelKey: 'pfExecField3', phKey: 'pfExecField3Ph' }, { labelKey: 'pfExecField4', phKey: 'pfExecField4Ph' }],
  freelance: [{ labelKey: 'pfFreeField1', phKey: 'pfFreeField1Ph' }, { labelKey: 'pfFreeField2', phKey: 'pfFreeField2Ph' }, { labelKey: 'pfFreeField3', phKey: 'pfFreeField3Ph' }],
  expat: [{ labelKey: 'pfExpatField1', phKey: 'pfExpatField1Ph' }, { labelKey: 'pfExpatField2', phKey: 'pfExpatField2Ph' }, { labelKey: 'pfExpatField3', phKey: 'pfExpatField3Ph' }, { labelKey: 'pfExpatField4', phKey: 'pfExpatField4Ph' }],
}

const languages: { id: CVLanguage; flag: string }[] = [
  { id: 'fr', flag: '🇫🇷' },
  { id: 'en', flag: '🇬🇧' },
  { id: 'ar', flag: '🇸🇦' },
  { id: 'es', flag: '🇪🇸' },
]

export default function CVForm() {
  const {
    formStep,
    setFormStep,
    language,
    setLanguage,
    template,
    setTemplate,
    formData,
    updateFormData,
    setStep,
    setIsGenerating,
    setGeneratedCV,
    setError,
    setSelectedPersona,
    selectedPersona,
    updateCLFormData,
    setGeneratedCL,
    setIsCLGenerating,
    setCLError,
  } = useCVStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('')
  const [personaFields, setPersonaFields] = useState<Record<string, string>>({})
  const [applicationType, setApplicationType] = useState<'internship' | 'job' | null>(null)
  const [isImportingCv, setIsImportingCv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const userPlan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free'
  const hasActivePlan = userPlan === 'pro' || userPlan === 'annual' || userPlan === 'lifetime'

  useEffect(() => {
    if (!session?.user || !hasActivePlan) {
      toast.warning(t(language, 'subscriptionRequiredDesc'), { duration: 4000 })
      setStep('landing')
    }
  }, [session, hasActivePlan, language, setStep])

  async function handleImportCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImportingCv(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)
      const res = await fetch('/api/import-cv', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t(language, 'cvErrorImport'))
      // Auto-fill form fields from parsed CV
      if (data.fullName) updateFormData({ fullName: data.fullName })
      if (data.email) updateFormData({ email: data.email })
      if (data.phone) updateFormData({ phone: data.phone })
      if (data.location) updateFormData({ location: data.location })
      if (data.targetJob) updateFormData({ targetJob: data.targetJob })
      if (data.industry) updateFormData({ industry: data.industry })
      if (data.experience) updateFormData({ experience: data.experience })
      if (data.education) updateFormData({ education: data.education })
      if (data.skills) updateFormData({ skills: data.skills })
      if (data.languages) updateFormData({ languages: data.languages })
      if (data.summary) updateFormData({ summary: data.summary })
      if (data.linkedin) updateFormData({ linkedin: data.linkedin })
      if (data.website) updateFormData({ website: data.website })
      toast.success(t(language, 'importCvSuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t(language, 'cvErrorUnknown')
      toast.error(message)
    } finally {
      setIsImportingCv(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handlePhoneCountryChange(code: string) {
    setPhoneCountryCode(code)
    const country = countries.find((c) => c.code === code)
    if (country) {
      // Remove any existing dial code from phone, prepend new one
      const currentNumber = formData.phone.replace(/^[+\d\s\-()]+/, '').trim()
      updateFormData({ phone: currentNumber ? `${country.dial} ${currentNumber}` : country.dial })
    }
  }

  function handlePhoneNumberChange(number: string) {
    const country = countries.find((c) => c.code === phoneCountryCode)
    const dial = country?.dial || ''
    const cleaned = number.replace(/[^\d\s]/g, '').trim()
    updateFormData({ phone: dial ? `${dial} ${cleaned}` : cleaned })
  }

  function getPhoneNumberOnly(): string {
    const country = countries.find((c) => c.code === phoneCountryCode)
    const dial = country?.dial || ''
    return formData.phone.startsWith(dial) ? formData.phone.slice(dial.length).trim() : formData.phone.replace(/^[+\d\s\-()]+/, '').trim()
  }

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  }

  function validateStep(step: number): boolean {
    if (step === 0) {
      if (!formData.fullName.trim() || !formData.email.trim()) {
        toast.error(t(language, 'errorFillFields'))
        return false
      }
    }
    if (step === 1) {
      if (!formData.targetJob.trim()) {
        toast.error(t(language, 'errorFillFields'))
        return false
      }
    }
    return true
  }

  function handleNext() {
    if (!validateStep(formStep)) return
    if (formStep < 3) setFormStep(formStep + 1)
  }

  function handlePrevious() {
    if (formStep > 0) setFormStep(formStep - 1)
  }

  async function handleGenerate() {
    if (!validateStep(formStep)) return
    setIsSubmitting(true)
    setStep('generating')
    setIsGenerating(true)
    setError(null)
    setIsCLGenerating(formData.companyName.trim().length > 0)
    setCLError(null)

    const hasCompany = formData.companyName.trim().length > 0

    try {
      // Generate CV
      const res = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          language,
          persona: selectedPersona || undefined,
          personaFields: Object.keys(personaFields).length > 0 ? personaFields : undefined,
          internshipRequest: applicationType === 'internship' || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setStep('landing')
          toast.error(data.error, { duration: 6000 })
          return
        }
        throw new Error(data.error || t(language, 'cvErrorGeneration'))
      }

      const generatedCV = data.cv
      setGeneratedCV(generatedCV)
      events.cvGenerated(formData.language || 'fr', template)

      // If company name provided, auto-generate cover letter simultaneously
      if (hasCompany) {
        try {
          // Auto-sync personal info to CL form data
          updateCLFormData({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            location: formData.location,
            companyName: formData.companyName,
            hiringManager: formData.hiringManager,
            jobTitle: formData.targetJob,
            tone: formData.clTone,
          })

          const clRes = await fetch('/api/generate-cover-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              address: formData.address,
              location: formData.location,
              companyName: formData.companyName,
              hiringManager: formData.hiringManager,
              jobTitle: formData.targetJob,
              tone: formData.clTone,
              language,
              generatedCVSummary: generatedCV.summary,
              generatedCVExperience: generatedCV.experience,
              generatedCVEducation: generatedCV.education,
              generatedCVSkills: generatedCV.skills,
              generatedCVLanguages: generatedCV.languages,
            }),
          })

          const clData = await clRes.json()
          if (clRes.ok && clData.letter) {
            setGeneratedCL(clData.letter)
          }
        } catch {
          // CL generation failed silently - CV is still valid
          setIsCLGenerating(false)
        }
      }

      setTimeout(() => {
        setStep('preview')
        setIsGenerating(false)
        setIsCLGenerating(false)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t(language, 'cvErrorUnknown'))
      setIsGenerating(false)
      setIsCLGenerating(false)
      setStep('form')
      toast.error(err instanceof Error ? err.message : t(language, 'cvErrorUnknown'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLastStep = formStep === 3

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/50 via-white to-amber-50/20">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => { setStep('landing'); setSelectedPersona(null) }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex flex-col items-center">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">{t(language, 'poweredByIa')}</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">{t(language, 'siteTitle')}</span>
          </button>
          {selectedPersona && (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              <span>{personaEmoji[selectedPersona]}</span>
              <span>{t(language, personaNameKey[selectedPersona])}</span>
            </span>
          )}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === lang.id
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="mr-1">{lang.flag}</span>
                <span className="hidden sm:inline">{lang.id.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {stepTitles.map((titleKey, i) => {
                const Icon = stepIcons[i]
                const isActive = i === formStep
                const isCompleted = i < formStep
                return (
                  <button
                    key={titleKey}
                    onClick={() => {
                      if (isCompleted || i === formStep) setFormStep(i)
                    }}
                    className={`flex flex-col items-center gap-1.5 flex-1 cursor-pointer group ${
                      !isCompleted && i !== formStep ? 'opacity-40' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                          : isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs font-medium text-center hidden sm:block ${
                        isActive ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      {t(language, titleKey)}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                animate={{ width: `${((formStep + 1) / 4) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8 min-h-[400px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={1}>
              <motion.div
                key={formStep}
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  {(() => {
                    const Icon = stepIcons[formStep]
                    return <Icon className="w-5 h-5 text-emerald-600" />
                  })()}
                  {t(language, stepTitles[formStep])}
                </h2>

                {/* Step 1: Personal Info */}
                {formStep === 0 && (
                  <div className="space-y-4">
                    {/* Import Existing CV Banner */}
                    <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <Upload className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-emerald-800 mb-1">{t(language, 'importCvTitle')}</h3>
                          <p className="text-xs text-emerald-700/80 mb-3 leading-relaxed">{t(language, 'importCvDesc')}</p>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isImportingCv}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 gap-2 cursor-pointer text-xs font-medium"
                            >
                              {isImportingCv ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileUp className="w-3.5 h-3.5" />
                              )}
                              {isImportingCv ? t(language, 'importCvParsing') : t(language, 'importCvBtn')}
                            </Button>
                            <span className="text-[10px] text-muted-foreground">PDF · DOCX · TXT</span>
                          </div>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleImportCv}
                      />
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <Label>{t(language, 'photo')}</Label>
                      <div className="mt-1.5">
                        {formData.photo ? (
                          <div className="relative inline-block">
                            <img
                              src={formData.photo}
                              alt="Photo"
                              className="w-24 h-24 rounded-full object-cover border-2 border-emerald-200"
                            />
                            <button
                              type="button"
                              onClick={() => updateFormData({ photo: '' })}
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error(t(language, 'cvImageTooLarge'))
                                  return
                                }
                                const reader = new FileReader()
                                reader.onload = () => {
                                  updateFormData({ photo: reader.result as string })
                                }
                                reader.readAsDataURL(file)
                              }}
                            />
                            <Camera className="w-8 h-8 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-xs text-muted-foreground/60 mt-1.5 group-hover:text-emerald-600 transition-colors">
                              {t(language, 'photoPlaceholder')}
                            </span>
                          </label>
                        )}
                      </div>
                      <div className="flex items-start gap-1.5 mt-2">
                        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{t(language, 'photoNote')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label htmlFor="fullName">{t(language, 'fullName')} *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => updateFormData({ fullName: e.target.value })}
                          placeholder={t(language, 'cvFullNamePh')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">{t(language, 'email')} *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData({ email: e.target.value })}
                          placeholder={t(language, 'cvEmailPh')}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>{t(language, 'phone')}</Label>
                        <div className="mt-1.5 flex gap-2">
                          <select
                            value={phoneCountryCode}
                            onChange={(e) => handlePhoneCountryChange(e.target.value)}
                            className="h-9 w-[180px] shrink-0 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 appearance-none cursor-pointer"
                            aria-label={t(language, 'phoneCountry')}
                          >
                            <option value="">{t(language, 'phoneCountryPlaceholder')}</option>
                            {countries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.dial} {c.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="tel"
                            value={getPhoneNumberOnly()}
                            onChange={(e) => handlePhoneNumberChange(e.target.value)}
                            placeholder={t(language, 'cvPhonePh')}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">{t(language, 'address')}</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => updateFormData({ address: e.target.value })}
                          placeholder={t(language, 'cvAddressPh')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">{t(language, 'location')}</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => updateFormData({ location: e.target.value })}
                          placeholder={t(language, 'cvLocationPh')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          value={formData.linkedin}
                          onChange={(e) => updateFormData({ linkedin: e.target.value })}
                          placeholder="linkedin.com/in/jean-dupont"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="website">{t(language, 'website')}</Label>
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => updateFormData({ website: e.target.value })}
                          placeholder="www.monsite.com"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* Birth Information */}
                    <div className="mt-6 pt-5 border-t border-stone-100">
                      <Label className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-3">
                        <CalendarDays className="w-4 h-4 text-emerald-600" />
                        {t(language, 'personalInfo')}
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dateOfBirth">{t(language, 'dateOfBirth')}</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="birthPlace">{t(language, 'birthPlace')}</Label>
                          <Input
                            id="birthPlace"
                            value={formData.birthPlace}
                            onChange={(e) => updateFormData({ birthPlace: e.target.value })}
                            placeholder={t(language, 'cvCityPh')}
                            className="mt-1.5"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="birthCountry">{t(language, 'birthCountry')}</Label>
                          <div className="relative mt-1.5">
                            <select
                              id="birthCountry"
                              value={formData.birthCountry}
                              onChange={(e) => updateFormData({ birthCountry: e.target.value })}
                              className="flex h-9 w-full rounded-md border border-stone-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                            >
                              <option value="">{t(language, 'birthCountryPlaceholder')}</option>
                              {countries.map((c) => (
                                <option key={c.code} value={c.name}>
                                  {c.flag} {c.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Career Goals, Cover Letter & Persona Fields */}
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="targetJob">{t(language, 'targetJob')} *</Label>
                      <Input
                        id="targetJob"
                        value={formData.targetJob}
                        onChange={(e) => updateFormData({ targetJob: e.target.value })}
                        placeholder={t(language, 'cvTargetJobPh')}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">{t(language, 'industry')}</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => updateFormData({ industry: e.target.value })}
                        placeholder={t(language, 'cvIndustryPh')}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Persona-specific fields */}
                    {selectedPersona && personaFieldMap[selectedPersona] && (
                      <div className="mt-6 pt-5 border-t border-stone-100">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                          <span>{personaEmoji[selectedPersona]}</span>
                          {t(language, 'personaFieldsTitle')}
                        </Label>
                        <div className="space-y-3">
                          {personaFieldMap[selectedPersona].map((field, i) => (
                            <div key={i}>
                              <Label>{t(language, field.labelKey)}</Label>
                              <Input
                                value={personaFields[field.labelKey] || ''}
                                onChange={(e) => setPersonaFields(prev => ({ ...prev, [field.labelKey]: e.target.value }))}
                                placeholder={t(language, field.phKey)}
                                className="mt-1.5"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Application Type Toggle — student/graduate only */}
                    {(selectedPersona === 'student' || selectedPersona === 'graduate') && (
                      <div className="mt-5">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                          <span>{personaEmoji[selectedPersona]}</span>
                          {t(language, 'applicationType')}
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Internship Request */}
                          <button
                            type="button"
                            onClick={() => setApplicationType(applicationType === 'internship' ? null : 'internship')}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                              applicationType === 'internship'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                                : 'border-stone-200 bg-white text-muted-foreground hover:border-emerald-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              applicationType === 'internship'
                                ? 'border-emerald-500'
                                : 'border-stone-300'
                            }`}>
                              {applicationType === 'internship' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className={`text-sm font-semibold block ${applicationType === 'internship' ? 'text-emerald-800' : 'text-foreground'}`}>
                                {t(language, 'internshipRequest')}
                              </span>
                              <p className="text-xs mt-0.5">{t(language, 'internshipRequestDesc')}</p>
                            </div>
                          </button>
                          {/* Job Request */}
                          <button
                            type="button"
                            onClick={() => setApplicationType(applicationType === 'job' ? null : 'job')}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                              applicationType === 'job'
                                ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                                : 'border-stone-200 bg-white text-muted-foreground hover:border-blue-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              applicationType === 'job'
                                ? 'border-blue-500'
                                : 'border-stone-300'
                            }`}>
                              {applicationType === 'job' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className={`text-sm font-semibold block ${applicationType === 'job' ? 'text-blue-800' : 'text-foreground'}`}>
                                {t(language, 'jobRequest')}
                              </span>
                              <p className="text-xs mt-0.5">{t(language, 'jobRequestDesc')}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cover Letter section */}
                    <div className="relative mt-6">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
                      <div className="flex items-center gap-2 mt-4 mb-4">
                        <PenLine className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700">
                          {t(language, 'tabCoverLetter')}
                        </span>
                        <span className="text-xs text-muted-foreground bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {t(language, 'optional')}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="companyName" className="text-sm font-medium">
                            {t(language, 'companyNameForCl')}
                          </Label>
                          <Input
                            id="companyName"
                            value={formData.companyName}
                            onChange={(e) => updateFormData({ companyName: e.target.value })}
                            placeholder={t(language, 'companyNameForClPlaceholder')}
                            className="mt-1.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t(language, 'clCompanyNameHint')}
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="hiringManager" className="text-sm font-medium">
                            {t(language, 'hiringManagerForCl')}
                          </Label>
                          <Input
                            id="hiringManager"
                            value={formData.hiringManager}
                            onChange={(e) => updateFormData({ hiringManager: e.target.value })}
                            placeholder={t(language, 'hiringManagerForClPlaceholder')}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">{t(language, 'clToneForCl')}</Label>
                          <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {([
                              { id: 'formal' as const, icon: UserCircle, labelKey: 'clToneFormal' as const },
                              { id: 'semi-formal' as const, icon: Building2, labelKey: 'clToneSemiFormal' as const },
                              { id: 'dynamic' as const, icon: Zap, labelKey: 'clToneDynamic' as const },
                            ]).map((tone) => (
                              <button
                                key={tone.id}
                                type="button"
                                onClick={() => updateFormData({ clTone: tone.id })}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                  formData.clTone === tone.id
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                    : 'border-muted bg-white text-muted-foreground hover:border-emerald-300'
                                }`}
                              >
                                <tone.icon className="w-4 h-4" />
                                <span className="text-xs font-medium">{t(language, tone.labelKey)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Experience & Education */}
                {formStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="experience">{t(language, 'experience')}</Label>
                      <Textarea
                        id="experience"
                        value={formData.experience}
                        onChange={(e) => updateFormData({ experience: e.target.value })}
                        placeholder={t(language, 'experiencePlaceholder')}
                        className="mt-1.5 min-h-[120px] resize-y"
                      />
                    </div>
                    <div>
                      <Label htmlFor="education">{t(language, 'education')}</Label>
                      <Textarea
                        id="education"
                        value={formData.education}
                        onChange={(e) => updateFormData({ education: e.target.value })}
                        placeholder={t(language, 'educationPlaceholder')}
                        className="mt-1.5 min-h-[120px] resize-y"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Skills, Languages, Template */}
                {formStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="skills">{t(language, 'skills')}</Label>
                      <Textarea
                        id="skills"
                        value={formData.skills}
                        onChange={(e) => updateFormData({ skills: e.target.value })}
                        placeholder={t(language, 'skillsPlaceholder')}
                        className="mt-1.5 min-h-[80px] resize-y"
                      />
                    </div>
                    <div>
                      <Label htmlFor="languages">{t(language, 'languages')}</Label>
                      <Textarea
                        id="languages"
                        value={formData.languages}
                        onChange={(e) => updateFormData({ languages: e.target.value })}
                        placeholder={t(language, 'languagesPlaceholder')}
                        className="mt-1.5 min-h-[80px] resize-y"
                      />
                    </div>
                    <div>
                      <Label htmlFor="softSkills">{t(language, 'softSkills')}</Label>
                      <Textarea
                        id="softSkills"
                        value={formData.softSkills}
                        onChange={(e) => updateFormData({ softSkills: e.target.value })}
                        placeholder={t(language, 'softSkillsPlaceholder')}
                        className="mt-1.5 min-h-[80px] resize-y"
                      />
                    </div>
                    <div>
                      <Label htmlFor="summary">{t(language, 'summary')}</Label>
                      <Textarea
                        id="summary"
                        value={formData.summary}
                        onChange={(e) => updateFormData({ summary: e.target.value })}
                        placeholder={t(language, 'summaryPlaceholder')}
                        className="mt-1.5 min-h-[80px] resize-y"
                      />
                    </div>

                    {/* Template Selector */}
                    <div>
                      <Label className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-emerald-600" />
                        {t(language, 'templateLabel')}
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        {templates.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            onClick={() => setTemplate(tmpl.id)}
                            className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                              template === tmpl.id
                                ? 'border-emerald-600 bg-emerald-50'
                                : 'border-muted hover:border-emerald-300 bg-white'
                            }`}
                          >
                            {template === tmpl.id && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${template === tmpl.id ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                              {t(language, tmpl.labelKey)}
                            </div>
                            {/* Mini template preview */}
                            {tmpl.id === 'modern' && (
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5 h-8">
                                  <div className="w-1/3 bg-emerald-800 rounded-sm" />
                                  <div className="flex-1 bg-stone-100 rounded-sm" />
                                </div>
                                <div className="flex gap-1.5 h-4">
                                  <div className="w-1/3 bg-emerald-800 rounded-sm" />
                                  <div className="flex-1 bg-stone-100 rounded-sm" />
                                </div>
                              </div>
                            )}
                            {tmpl.id === 'classic' && (
                              <div className="space-y-1.5">
                                <div className="h-2 w-1/2 bg-stone-800 rounded-sm mx-auto" />
                                <div className="h-1 w-3/4 bg-stone-200 rounded-sm mx-auto" />
                                <div className="h-4 bg-stone-100 rounded-sm" />
                              </div>
                            )}
                            {tmpl.id === 'creative' && (
                              <div className="space-y-1.5">
                                <div className="h-4 bg-gradient-to-r from-emerald-700 to-teal-600 rounded-sm" />
                                <div className="flex gap-1.5 h-6">
                                  <div className="flex-1 bg-stone-100 rounded-sm" />
                                  <div className="w-1/3 bg-stone-200 rounded-sm" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Photo Position Selector - only show if user has a photo */}
                    {formData.photo && (
                      <div className="mt-6">
                        <Label className="flex items-center gap-2 mb-3">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          {t(language, 'photoPosition')}
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['left', 'center', 'right'] as const).map((pos) => {
                            const key = pos === 'left' ? 'photoPositionLeft' : pos === 'center' ? 'photoPositionCenter' : 'photoPositionRight'
                            const PosIcon = pos === 'left' ? AlignLeft : pos === 'center' ? AlignCenter : AlignRight
                            return (
                              <button
                                key={pos}
                                onClick={() => updateFormData({ photoPosition: pos })}
                                className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                                  formData.photoPosition === pos
                                    ? 'border-emerald-600 bg-emerald-50'
                                    : 'border-muted hover:border-emerald-300 bg-white'
                                }`}
                              >
                                {formData.photoPosition === pos && (
                                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                <PosIcon className={`w-5 h-5 mx-auto mb-2 ${formData.photoPosition === pos ? 'text-emerald-700' : 'text-muted-foreground'}`} />
                                <div className={`text-xs font-bold uppercase tracking-wider ${formData.photoPosition === pos ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                                  {t(language, key)}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={formStep === 0}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {t(language, 'previous')}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleGenerate}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {t(language, 'generate')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
              >
                {t(language, 'next')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>{t(language, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('open-legal')) }} className="text-xs text-emerald-600 hover:underline cursor-pointer">{t(language, 'footerLegal')}</button>
        </div>
      </footer>
    </div>
  )
}