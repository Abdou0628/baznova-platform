'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCVStore, type PersonaType } from '@/store/cv-store'
import { t, type CVLanguage, type TranslationKey } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Sparkles, UserCircle, MessageSquare, Zap, GraduationCap, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

// ── Persona metadata ──────────────────────────────────────────────

const personaEmoji: Record<PersonaType, string> = {
  student: '🎓',
  graduate: '🌟',
  professional: '💼',
  executive: '👔',
  freelance: '🚀',
  expat: '✈️',
}

const personaNameKey: Record<PersonaType, TranslationKey> = {
  student: 'personaStudent',
  graduate: 'personaGraduate',
  professional: 'personaProfessional',
  executive: 'personaExecutive',
  freelance: 'personaFreelance',
  expat: 'personaExpat',
}

// ── Persona-specific field mapping ────────────────────────────────

const personaFieldMap: Record<
  PersonaType,
  { labelKey: TranslationKey; phKey: TranslationKey }[]
> = {
  student: [
    { labelKey: 'pfStudentField1', phKey: 'pfStudentField1Ph' },
    { labelKey: 'pfStudentField2', phKey: 'pfStudentField2Ph' },
    { labelKey: 'pfStudentField3', phKey: 'pfStudentField3Ph' },
  ],
  graduate: [
    { labelKey: 'pfGraduateField1', phKey: 'pfGraduateField1Ph' },
    { labelKey: 'pfGraduateField2', phKey: 'pfGraduateField2Ph' },
    { labelKey: 'pfGraduateField3', phKey: 'pfGraduateField3Ph' },
  ],
  professional: [
    { labelKey: 'pfProField1', phKey: 'pfProField1Ph' },
    { labelKey: 'pfProField2', phKey: 'pfProField2Ph' },
    { labelKey: 'pfProField3', phKey: 'pfProField3Ph' },
  ],
  executive: [
    { labelKey: 'pfExecField1', phKey: 'pfExecField1Ph' },
    { labelKey: 'pfExecField2', phKey: 'pfExecField2Ph' },
    { labelKey: 'pfExecField3', phKey: 'pfExecField3Ph' },
    { labelKey: 'pfExecField4', phKey: 'pfExecField4Ph' },
  ],
  freelance: [
    { labelKey: 'pfFreeField1', phKey: 'pfFreeField1Ph' },
    { labelKey: 'pfFreeField2', phKey: 'pfFreeField2Ph' },
    { labelKey: 'pfFreeField3', phKey: 'pfFreeField3Ph' },
  ],
  expat: [
    { labelKey: 'pfExpatField1', phKey: 'pfExpatField1Ph' },
    { labelKey: 'pfExpatField2', phKey: 'pfExpatField2Ph' },
    { labelKey: 'pfExpatField3', phKey: 'pfExpatField3Ph' },
    { labelKey: 'pfExpatField4', phKey: 'pfExpatField4Ph' },
  ],
}

// ── Tone options ──────────────────────────────────────────────────

const tones = [
  { id: 'formal' as const, icon: UserCircle, labelKey: 'clToneFormal' as const },
  { id: 'semi-formal' as const, icon: MessageSquare, labelKey: 'clToneSemiFormal' as const },
  { id: 'dynamic' as const, icon: Zap, labelKey: 'clToneDynamic' as const },
]

// Student and graduate can also request an internship
const internshipPersonas: PersonaType[] = ['student', 'graduate']

// ── Component ─────────────────────────────────────────────────────

export default function PersonaForm() {
  const {
    language,
    selectedPersona,
    setStep,
    setGeneratedCL,
    setCLError,
    resetPersona,
  } = useCVStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [tone, setTone] = useState<'formal' | 'semi-formal' | 'dynamic'>('semi-formal')
  const [personaFields, setPersonaFields] = useState<Record<string, string>>({})
  const [docType, setDocType] = useState<'cover_letter' | 'internship'>('cover_letter')

  if (!selectedPersona) return null

  const fields = personaFieldMap[selectedPersona]
  const emoji = personaEmoji[selectedPersona]
  const nameKey = personaNameKey[selectedPersona]
  const isInternshipEligible = internshipPersonas.includes(selectedPersona)

  function handlePersonaFieldChange(key: string, value: string) {
    setPersonaFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate all fields
    const allPersonaFilled = fields.every((_, i) => personaFields[`field${i + 1}`]?.trim())
    if (!fullName.trim() || !email.trim() || !phone.trim() || !companyName.trim() || !allPersonaFilled) {
      toast.error(t(language, 'pfFillRequired'))
      return
    }

    setStep('personaGenerating')
    setCLError(null)

    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          tone,
          companyName,
          fullName,
          email,
          phone,
          jobTitle: t(language, personaNameKey[selectedPersona]),
          persona: selectedPersona,
          personaFields,
          letterType: isInternshipEligible ? docType : 'cover_letter',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error generating cover letter')
      }

      setGeneratedCL(data.letter)
      setStep('clPreview')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setCLError(message)
      setStep('personaForm')
      toast.error(message)
    }
  }

  const isRtl = language === 'ar'

  return (
    <div className="min-h-screen flex flex-col bg-stone-100" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="w-full px-4 sm:px-6 py-4 bg-white border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={resetPersona}
              className="w-9 h-9 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
              aria-label={t(language, 'pfBackToLanding')}
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-hidden="true">{emoji}</span>
              <span className="font-semibold text-foreground text-sm">
                {t(language, nameKey)}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-stone-100 px-2.5 py-1 rounded-full font-medium">
            {t(language, 'poweredBy')}
          </span>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
          {/* Document type selector — student / graduate only */}
          {isInternshipEligible && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-sm p-4 sm:p-6"
            >
              <Label className="text-sm font-medium mb-3 block">{t(language, 'pfDocTypeLabel')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDocType('cover_letter')}
                  className={[
                    'flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-xl border-2 transition-all cursor-pointer',
                    docType === 'cover_letter'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-muted bg-white text-muted-foreground hover:border-emerald-300',
                  ].join(' ')}
                >
                  <Briefcase className="w-6 h-6" />
                  <span className="text-sm font-semibold text-center leading-snug">{t(language, 'pfDocTypeCoverLetter')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('internship')}
                  className={[
                    'flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-xl border-2 transition-all cursor-pointer',
                    docType === 'internship'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-muted bg-white text-muted-foreground hover:border-emerald-300',
                  ].join(' ')}
                >
                  <GraduationCap className="w-6 h-6" />
                  <span className="text-sm font-semibold text-center leading-snug">{t(language, 'pfDocTypeInternship')}</span>
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5"
          >
            {/* Common fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf-fullName" className="text-sm font-medium">
                  {t(language, 'fullName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t(language, 'fullName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-email" className="text-sm font-medium">
                  {t(language, 'email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(language, 'email')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf-phone" className="text-sm font-medium">
                  {t(language, 'phone')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t(language, 'phone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-companyName" className="text-sm font-medium">
                  {t(language, 'clCompanyName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t(language, 'clCompanyNamePlaceholder')}
                />
              </div>
            </div>

            {/* Tone selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t(language, 'clTone')}</Label>
              <div className="grid grid-cols-3 gap-3">
                {tones.map((toneOption) => (
                  <button
                    type="button"
                    key={toneOption.id}
                    onClick={() => setTone(toneOption.id)}
                    className={[
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                      tone === toneOption.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-muted bg-white text-muted-foreground hover:border-emerald-300',
                    ].join(' ')}
                  >
                    <toneOption.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{t(language, toneOption.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Persona-specific fields */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5"
          >
            {fields.map((field, i) => (
              <div key={i} className="space-y-2">
                <Label htmlFor={`pf-field${i + 1}`} className="text-sm font-medium">
                  {t(language, field.labelKey)} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id={`pf-field${i + 1}`}
                  value={personaFields[`field${i + 1}`] || ''}
                  onChange={(e) => handlePersonaFieldChange(`field${i + 1}`, e.target.value)}
                  placeholder={t(language, field.phKey)}
                  rows={3}
                />
              </div>
            ))}
          </motion.div>

          {/* Submit button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-base font-semibold cursor-pointer rounded-xl"
            >
              <Sparkles className="w-5 h-5" />
              {docType === 'internship'
                ? t(language, 'pfGenerateInternship')
                : t(language, 'pfGenerateCl')
              }
            </Button>
          </motion.div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6 bg-white mt-auto">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>
            {t(language, 'footerText')} &copy; 2026 HireNova —{' '}
            <span className="font-medium text-foreground">Abdellah Bazhani</span>
          </p>
          <button
            onClick={() => {
              document.dispatchEvent(new CustomEvent('open-legal'))
            }}
            className="text-xs text-emerald-600 hover:underline cursor-pointer"
          >
            Mentions Légales
          </button>
        </div>
      </footer>
    </div>
  )
}
