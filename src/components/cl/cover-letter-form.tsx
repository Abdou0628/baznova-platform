'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVStore, type CVLanguage } from '@/store/cv-store'
import Image from 'next/image'
import { t } from '@/lib/i18n'
import { countries } from '@/lib/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Building2,
  UserCircle,
  FileText,
  MessageSquare,
  Zap,
  Link2,
  Unlink,
  Briefcase,
  GraduationCap,
  Code2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

const tones = [
  { id: 'formal' as const, icon: UserCircle, labelKey: 'clToneFormal' as const },
  { id: 'semi-formal' as const, icon: MessageSquare, labelKey: 'clToneSemiFormal' as const },
  { id: 'dynamic' as const, icon: Zap, labelKey: 'clToneDynamic' as const },
]

const languages: { id: CVLanguage; flag: string }[] = [
  { id: 'fr', flag: '🇫🇷' },
  { id: 'en', flag: '🇬🇧' },
  { id: 'ar', flag: '🇸🇦' },
  { id: 'es', flag: '🇪🇸' },
]

export default function CoverLetterForm() {
  const {
    language,
    setLanguage,
    formData,
    generatedCV,
    clFormData,
    updateCLFormData,
    setStep,
    setIsCLGenerating,
    setGeneratedCL,
    setCLError,
  } = useCVStore()

  const [formStep, setFormStep] = useState(0)
  const hasCV = !!generatedCV
  const hasCVInput = !!(formData.fullName || formData.experience || formData.skills)
  const { data: session } = useSession()
  const userPlan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free'
  const hasActivePlan = userPlan === 'pro' || userPlan === 'annual' || userPlan === 'lifetime'

  // Auth + plan guard
  useEffect(() => {
    if (!session?.user || !hasActivePlan) {
      toast.warning(t(language, 'subscriptionRequiredDesc'), { duration: 4000 })
      setStep('landing')
    }
  }, [session, hasActivePlan, language, setStep])

  // Auto-prefill from CV data on mount
  useEffect(() => {
    const updates: Partial<typeof clFormData> = {}
    if (formData.fullName && !clFormData.fullName) updates.fullName = formData.fullName
    if (formData.email && !clFormData.email) updates.email = formData.email
    if (formData.phone && !clFormData.phone) updates.phone = formData.phone
    if (formData.location && !clFormData.location) updates.location = formData.location
    if (formData.targetJob && !clFormData.jobTitle) updates.jobTitle = formData.targetJob
    if (formData.address && !clFormData.address) updates.address = formData.address
    if (Object.keys(updates).length > 0) updateCLFormData(updates)
  }, [])

  async function handleGenerate() {
    if (!clFormData.fullName || !clFormData.email || !clFormData.companyName || !clFormData.jobTitle) {
      toast.error(t(language, 'errorFillFields'))
      return
    }

    setStep('clGenerating')
    setIsCLGenerating(true)
    setCLError(null)

    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clFormData,
          language,
          // Raw CV input (always available if user typed it)
          cvExperience: formData.experience || undefined,
          cvEducation: formData.education || undefined,
          cvSkills: formData.skills || undefined,
          cvSoftSkills: formData.softSkills || undefined,
          // Structured generated CV (if AI already generated it)
          generatedCVSummary: generatedCV?.summary || undefined,
          generatedCVExperience: generatedCV?.experience || undefined,
          generatedCVEducation: generatedCV?.education || undefined,
          generatedCVSkills: generatedCV?.skills || undefined,
          generatedCVLanguages: generatedCV?.languages || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t(language, 'clErrorGeneration'))
      }

      setGeneratedCL(data.letter)
      setStep('clPreview')
    } catch (err) {
      const message = err instanceof Error ? err.message : t(language, 'clErrorUnknown')
      setCLError(message)
      setStep('clForm')
      toast.error(message)
    } finally {
      setIsCLGenerating(false)
    }
  }

  function handleNext() {
    if (formStep === 0) {
      if (!clFormData.fullName || !clFormData.email) {
        toast.error(t(language, 'errorFillFields'))
        return
      }
    }
    setFormStep(1)
  }

  function handleBack() {
    if (formStep > 0) {
      setFormStep(0)
    } else {
      setStep('landing')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/30">
      {/* Top bar */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">{t(language, 'poweredByIa')}</span>
            </div>
            <span className="font-semibold text-foreground text-sm">{t(language, 'clTitle')}</span>
          </div>
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
        <div className="max-w-3xl mx-auto">
          {/* CV Link Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-xl p-4 mb-6 flex items-start gap-3 ${
              hasCV
                ? 'bg-emerald-50 border border-emerald-200'
                : hasCVInput
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-stone-50 border border-stone-200'
            }`}
          >
            <div className={`mt-0.5 ${hasCV ? 'text-emerald-600' : hasCVInput ? 'text-amber-600' : 'text-stone-400'}`}>
              {hasCV ? <Link2 className="w-5 h-5" /> : <Unlink className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${hasCV ? 'text-emerald-800' : hasCVInput ? 'text-amber-800' : 'text-stone-600'}`}>
                  {hasCV ? t(language, 'clLinkedToCv') : t(language, 'clNoCvLinked')}
                </span>
                {hasCV && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    CV généré
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${hasCV ? 'text-emerald-700' : hasCVInput ? 'text-amber-700' : 'text-stone-500'}`}>
                {hasCV
                  ? t(language, 'clLinkedToCvDesc')
                  : t(language, 'clNoCvLinkedDesc')}
              </p>
              {!hasCV && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => setStep('landing')}
                    className="text-xs gap-1.5 cursor-pointer border-amber-300 text-amber-700 hover:bg-amber-100">
                    <FileText className="w-3 h-3" />
                    {t(language, 'clNoCvCreateCta')}
                  </Button>
                </div>
              )}
              {hasCV && generatedCV && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {generatedCV.summary && (
                    <span className="inline-flex items-center gap-1 bg-white text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-200">
                      <Sparkles className="w-3 h-3" />
                      {t(language, 'clCvSummaryLabel')}
                    </span>
                  )}
                  {generatedCV.experience.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-white text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-200">
                      <Briefcase className="w-3 h-3" />
                      {generatedCV.experience.length} {t(language, 'clCvExperiencesLabel')}
                    </span>
                  )}
                  {generatedCV.education.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-white text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-200">
                      <GraduationCap className="w-3 h-3" />
                      {generatedCV.education.length} {t(language, 'clCvDegreesLabel')}
                    </span>
                  )}
                  {generatedCV.skills.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-white text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-200">
                      <Code2 className="w-3 h-3" />
                      {generatedCV.skills.length} {t(language, 'clCvSkillsLabel')}
                    </span>
                  )}
                </div>
              )}
              {hasCV && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('preview')}
                    className="text-xs gap-1.5 cursor-pointer border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  >
                    <FileText className="w-3 h-3" />
                    {t(language, 'clViewLinkedCv')}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {(['clStep1', 'clStep2'] as const).map((stepKey, i) => (
              <div key={stepKey} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i <= formStep
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    i <= formStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(language, stepKey)}
                </span>
                {i < 1 && <div className="w-8 h-0.5 bg-muted" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {formStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Personal Info Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-foreground">{t(language, 'clStep1')}</h2>
                      {hasCV && (
                        <p className="text-sm text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t(language, 'clAutoFilled')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-fullName" className="text-sm font-medium">
                        {t(language, 'fullName')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cl-fullName"
                        value={clFormData.fullName}
                        onChange={(e) => updateCLFormData({ fullName: e.target.value })}
                        placeholder={t(language, 'fullName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-email" className="text-sm font-medium">
                        {t(language, 'email')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cl-email"
                        type="email"
                        value={clFormData.email}
                        onChange={(e) => updateCLFormData({ email: e.target.value })}
                        placeholder={t(language, 'email')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-phone" className="text-sm font-medium">
                        {t(language, 'phone')}
                      </Label>
                      <Input
                        id="cl-phone"
                        value={clFormData.phone}
                        onChange={(e) => updateCLFormData({ phone: e.target.value })}
                        placeholder={t(language, 'phone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-location" className="text-sm font-medium">
                        {t(language, 'location')}
                      </Label>
                      <Input
                        id="cl-location"
                        value={clFormData.location}
                        onChange={(e) => updateCLFormData({ location: e.target.value })}
                        placeholder={t(language, 'location')}
                      />
                    </div>
                  </div>

                  {/* Physical Address & Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="cl-address" className="text-sm font-medium">
                        {t(language, 'clAddress')}
                      </Label>
                      <Input
                        id="cl-address"
                        value={clFormData.address}
                        onChange={(e) => updateCLFormData({ address: e.target.value })}
                        placeholder={t(language, 'address')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-country" className="text-sm font-medium">
                        {t(language, 'clCountry')}
                      </Label>
                      <select
                        id="cl-country"
                        value={clFormData.country}
                        onChange={(e) => updateCLFormData({ country: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">{t(language, 'clCountryPlaceholder')}</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {formStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Job Details Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-semibold text-foreground">{t(language, 'clStep2')}</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-companyName" className="text-sm font-medium">
                        {t(language, 'clCompanyName')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cl-companyName"
                        value={clFormData.companyName}
                        onChange={(e) => updateCLFormData({ companyName: e.target.value })}
                        placeholder={t(language, 'clCompanyNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-jobTitle" className="text-sm font-medium">
                        {t(language, 'clJobTitle')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cl-jobTitle"
                        value={clFormData.jobTitle}
                        onChange={(e) => updateCLFormData({ jobTitle: e.target.value })}
                        placeholder={t(language, 'clJobTitlePlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-hiringManager" className="text-sm font-medium">
                        {t(language, 'clHiringManager')}
                      </Label>
                      <Input
                        id="cl-hiringManager"
                        value={clFormData.hiringManager}
                        onChange={(e) => updateCLFormData({ hiringManager: e.target.value })}
                        placeholder={t(language, 'clHiringManagerPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-jobReference" className="text-sm font-medium">
                        {t(language, 'clJobReference')}
                      </Label>
                      <Input
                        id="cl-jobReference"
                        value={clFormData.jobReference}
                        onChange={(e) => updateCLFormData({ jobReference: e.target.value })}
                        placeholder={t(language, 'clJobReferencePlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cl-whyCompany" className="text-sm font-medium">
                      {t(language, 'clWhyCompany')}
                    </Label>
                    <Textarea
                      id="cl-whyCompany"
                      value={clFormData.whyCompany}
                      onChange={(e) => updateCLFormData({ whyCompany: e.target.value })}
                      placeholder={t(language, 'clWhyCompanyPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cl-keyStrengths" className="text-sm font-medium">
                      {t(language, 'clKeyStrengths')}
                    </Label>
                    <Textarea
                      id="cl-keyStrengths"
                      value={clFormData.keyStrengths}
                      onChange={(e) => updateCLFormData({ keyStrengths: e.target.value })}
                      placeholder={t(language, 'clKeyStrengthsPlaceholder')}
                      rows={3}
                    />
                  </div>

                  {/* Tone selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t(language, 'clTone')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {tones.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => updateCLFormData({ tone: tone.id })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            clFormData.tone === tone.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-muted bg-white text-muted-foreground hover:border-emerald-300'
                          }`}
                        >
                          <tone.icon className="w-5 h-5" />
                          <span className="text-sm font-medium">{t(language, tone.labelKey)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cl-additionalNotes" className="text-sm font-medium">
                      {t(language, 'clAdditionalNotes')}
                    </Label>
                    <Textarea
                      id="cl-additionalNotes"
                      value={clFormData.additionalNotes}
                      onChange={(e) => updateCLFormData({ additionalNotes: e.target.value })}
                      placeholder={t(language, 'clAdditionalNotesPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {formStep === 0 ? t(language, 'clBackToCv') : t(language, 'previous')}
            </Button>

            {formStep === 0 ? (
              <Button
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
              >
                {t(language, 'next')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {t(language, 'clGenerate')}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>{t(language, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('open-legal')) }} className="text-xs text-emerald-600 hover:underline cursor-pointer">{t(language, 'footerLegal')}</button>
        </div>
      </footer>
    </div>
  )
}