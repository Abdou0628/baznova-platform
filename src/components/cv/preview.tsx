'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import Image from 'next/image'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  RotateCcw,
  FileText,
  CheckCircle2,
  PenLine,
  FileDown,
  ChevronDown,
  Search,
  Lightbulb,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  ShieldCheck,
  Globe,
  Zap,
  Send,
  Users,
} from 'lucide-react'
import CVDocument from './cv-document'
import CoverLetterDocument from '@/components/cl/cover-letter-document'
import SatisfactionPrompt from '@/components/support/satisfaction-prompt'
import ATSAnalysis from '@/components/cv/ats-analysis'
import { events } from '@/lib/analytics'
import { getPersonaConfig } from '@/lib/persona-engine'
import SuggestionCard from './persona-suggestions'

type PreviewTab = 'cv' | 'cl'

// Journey step component
function JourneyStep({ icon: Icon, label, done, active }: { icon: React.ElementType; label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${done ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400' : 'bg-muted text-muted-foreground'}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
      </div>
      <span className={`text-xs font-medium transition-colors ${done ? 'text-emerald-700' : active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      {done && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
    </div>
  )
}

export default function Preview() {
  const {
    formData,
    generatedCV,
    generatedCL,
    template,
    language,
    setStep,
    reset,
    clFormData,
    selectedPersona,
  } = useCVStore()

  const personaConfig = selectedPersona ? getPersonaConfig(selectedPersona) : null
  const personaSuggestions = personaConfig?.suggestions ?? []

  const [activeTab, setActiveTab] = useState<PreviewTab>('cv')
  const cvRef = useRef<HTMLDivElement>(null)
  const clRef = useRef<HTMLDivElement>(null)
  const hasCL = !!generatedCL
  const [showSatisfaction, setShowSatisfaction] = useState(false)
  const [satisfactionType, setSatisfactionType] = useState<'cv' | 'cover_letter'>('cv')
  const [showATS, setShowATS] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSatisfaction(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  function handleDownloadPDF(type: 'cv' | 'cl') {
    const ref = type === 'cv' ? cvRef : clRef
    const title = type === 'cv'
      ? `CV - ${formData.fullName}`
      : `Lettre - ${clFormData.fullName || formData.fullName}`
    if (type === 'cv') { events.cvDownloaded('pdf', language) } else { events.clDownloaded('pdf') }

    const printWindow = window.open('', '_blank')
    if (!printWindow || !ref.current) return

    const html = ref.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          @media print {
            @page { margin: ${type === 'cl' ? '15mm' : '0'}; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          ${type === 'cv' ? `
          <script src="https://cdn.tailwindcss.com"><\/script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['Inter', 'system-ui', 'sans-serif'],
                  },
                },
              },
            }
          <\/script>` : ''}
        </style>
      </head>
      <body>
        <div style="max-width: 210mm; margin: 0 auto;">
          ${html}
        </div>
        <script>
          setTimeout(() => { window.print(); }, 800);
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownloadWord(type: 'cv' | 'cl') {
    const ref = type === 'cv' ? cvRef : clRef
    const filename = type === 'cv'
      ? `${t(lang, 'cvDownloadCvPrefix')}${formData.fullName.replace(/\s+/g, '_')}.doc`
      : `${t(lang, 'cvDownloadClPrefix')}${(clFormData.fullName || formData.fullName).replace(/\s+/g, '_')}.doc`
    if (type === 'cv') { events.cvDownloaded('word', language) } else { events.clDownloaded('word') }

    if (!ref.current) return
    const html = ref.current.innerHTML
    const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        @page { margin: ${type === 'cl' ? '15mm' : '0'}; size: A4; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        ${type === 'cv' ? 'img { max-width: 100%; }' : ''}
      </style>
    </head>
    <body>${html}</body>
    </html>`
    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!generatedCV) return null

  const lang = language as CVLanguage
  // Journey steps
  const journeySteps = [
    { icon: FileText, label: t(lang, 'previewStepCv'), done: true, active: !hasCL },
    { icon: PenLine, label: t(lang, 'previewStepCl'), done: hasCL, active: !hasCL && !hasCL },
    { icon: Search, label: t(lang, 'previewStepAts'), done: false, active: false },
    { icon: Send, label: t(lang, 'previewStepApplication'), done: false, active: false },
  ]

  // Determine next recommended step
  const nextStep = !hasCL ? 'cl' : 'app'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">{t(lang, 'poweredByIa')}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground text-sm">{t(lang, 'siteTitle')}</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium">{t(lang, 'previewTitle')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowATS(true)}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm border-emerald-600/40 text-emerald-700 hover:bg-emerald-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(lang, 'atsAnalyzeBtn')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reset()}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(lang, 'startOver')}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer text-xs sm:text-sm" size="sm">
                  <Download className="w-3.5 h-3.5" />
                  <span>{t(lang, 'downloadFormat')}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownloadPDF('cv')} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                  {t(lang, 'tabCv')} - {t(lang, 'downloadPdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadWord('cv')} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                  {t(lang, 'tabCv')} - {t(lang, 'downloadWord')}
                </DropdownMenuItem>
                {hasCL && (
                  <>
                    <div className="h-px my-1 bg-muted" />
                    <DropdownMenuItem onClick={() => handleDownloadPDF('cl')} className="gap-2 cursor-pointer">
                      <FileDown className="w-4 h-4" />
                      {t(lang, 'tabCoverLetter')} - {t(lang, 'downloadPdf')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadWord('cl')} className="gap-2 cursor-pointer">
                      <FileDown className="w-4 h-4" />
                      {t(lang, 'tabCoverLetter')} - {t(lang, 'downloadWord')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6">
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* ========== PERSONA MARKETING BANNER ========== */}
          {personaConfig && (
            <motion.div
              className="mb-6 rounded-xl overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-5 sm:p-6 text-white"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{personaConfig.emoji}</span>
                  <div>
                    <h2 className="font-bold text-base sm:text-lg">{personaConfig.tagline[lang] ?? personaConfig.tagline.fr}</h2>
                    <p className="text-emerald-100 text-xs mt-0.5 max-w-lg">{personaConfig.valueProp[lang] ?? personaConfig.valueProp.fr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">{personaConfig.socialProof[lang] ?? personaConfig.socialProof.fr}</span>
                </div>
              </div>

              {/* Journey Progress */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{t(lang, 'previewYourJourney')}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {journeySteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <JourneyStep icon={s.icon} label={s.label} done={s.done} active={s.active} />
                      {i < journeySteps.length - 1 && <div className={`w-6 h-px ${i === 0 ? 'bg-emerald-300' : 'bg-white/30'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== NEXT STEP RECOMMENDATION ========== */}
          {personaConfig && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">{t(lang, 'previewNextStep')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Generate Cover Letter CTA */}
                {personaConfig.autoGenerateCL && !hasCL && (
                  <button
                    onClick={() => setStep('clForm')}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:from-blue-100 hover:to-indigo-100 transition-all cursor-pointer group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                      <PenLine className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-blue-800 text-sm group-hover:text-blue-700">{t(lang, 'previewAutoCL')}</h4>
                      <p className="text-[11px] text-blue-600/70 mt-0.5">{personaConfig.clToneOverride ?? 'semi-formal'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* ATS Analysis CTA */}
                {personaConfig.autoProposeATS && (
                  <button
                    onClick={() => setShowATS(true)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 rounded-xl hover:border-emerald-500 hover:from-emerald-100 hover:to-teal-100 transition-all cursor-pointer group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-emerald-800 text-sm group-hover:text-emerald-700">{t(lang, 'previewAutoATS')}</h4>
                      <p className="text-[11px] text-emerald-600/70 mt-0.5">{t(lang, 'atsPoweredBy')}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* Job Application CTA */}
                <button
                  onClick={() => setStep('jobApplication')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-xl hover:border-amber-500 hover:from-amber-100 hover:to-orange-100 transition-all cursor-pointer group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-600/30 shrink-0">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-amber-800 text-sm group-hover:text-amber-700">{t(lang, 'previewGenerateApp')}</h4>
                    <p className="text-[11px] text-amber-600/70 mt-0.5">{t(lang, 'previewGenerateAppDesc')}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========== DOCUMENT PREVIEW ========== */}
          {/* Tab Navigation */}
          {hasCL && (
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm mb-4 max-w-md mx-auto">
              <button
                onClick={() => setActiveTab('cv')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'cv'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="w-4 h-4" />
                {t(lang, 'tabCv')}
              </button>
              <button
                onClick={() => setActiveTab('cl')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'cl'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <PenLine className="w-4 h-4" />
                {t(lang, 'tabCoverLetter')}
              </button>
            </div>
          )}

          {/* Document Container */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'cv' && (
                <motion.div
                  key="cv-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div ref={cvRef}>
                    <CVDocument
                      formData={formData}
                      generatedCV={generatedCV}
                      template={template}
                      lang={lang}
                    />
                  </div>
                </motion.div>
              )}
              {activeTab === 'cl' && hasCL && (
                <motion.div
                  key="cl-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div ref={clRef}>
                    <CoverLetterDocument
                      clFormData={{
                        fullName: clFormData.fullName || formData.fullName,
                        email: clFormData.email || formData.email,
                        phone: clFormData.phone || formData.phone,
                        address: clFormData.address || formData.address,
                        country: clFormData.country || '',
                        location: clFormData.location || formData.location,
                        companyName: clFormData.companyName || formData.companyName,
                        hiringManager: clFormData.hiringManager || formData.hiringManager,
                      }}
                      generatedCL={generatedCL}
                      lang={language}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========== PERSONA SUGGESTIONS ========== */}
          {personaSuggestions.length > 0 && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">{t(lang, 'previewSuggestTitle')}</h3>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t(lang, 'previewSuggestDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personaSuggestions.map(sug => (
                  <SuggestionCard key={sug.key} suggestion={sug} language={lang} onATS={() => setShowATS(true)} onCareer={() => setStep('careerHome')} onInterview={() => setStep('interview')} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ========== BOTTOM ACTION BUTTONS ========== */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <Button
              onClick={() => handleDownloadPDF(activeTab)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <Download className="w-5 h-5" />
              {activeTab === 'cv' ? t(lang, 'tabCv') : t(lang, 'tabCoverLetter')} - {t(lang, 'downloadPdf')}
            </Button>
            <Button
              onClick={() => handleDownloadWord(activeTab)}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <FileDown className="w-5 h-5" />
              {activeTab === 'cv' ? t(lang, 'tabCv') : t(lang, 'tabCoverLetter')} - {t(lang, 'downloadWord')}
            </Button>
            {hasCL && (
              <Button
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'cv' ? 'cl' : 'cv')}
                className="gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
                size="lg"
              >
                {activeTab === 'cv' ? <PenLine className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                {activeTab === 'cv' ? t(lang, 'tabCoverLetter') : t(lang, 'tabCv')}
              </Button>
            )}
            <Button
              onClick={() => setStep('jobApplication')}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50 gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <Send className="w-5 h-5" />
              {t(lang, 'previewGenerateApp')}
            </Button>
            <Button
              variant="outline"
              onClick={() => reset()}
              className="gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <RotateCcw className="w-5 h-5" />
              {t(lang, 'startOver')}
            </Button>
          </div>
        </motion.div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="border-t py-5 px-4 sm:px-6 mt-auto bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <Globe className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">{t(lang, 'previewEqualOpportunity')}</span>
          </div>
          <p>{t(lang, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('open-legal')) }} className="text-xs text-emerald-600 hover:underline cursor-pointer">{t(lang, 'footerLegal')}</button>
        </div>
      </footer>

      <SatisfactionPrompt
        open={showSatisfaction}
        onClose={() => setShowSatisfaction(false)}
        type={satisfactionType}
      />

      <ATSAnalysis
        isOpen={showATS}
        onClose={() => setShowATS(false)}
      />
    </div>
  )
}