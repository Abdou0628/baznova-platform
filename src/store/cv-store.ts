import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppStep =
  // Early Access Landing
  | 'earlyAccess'
  // Core CV
  | 'landing' | 'form' | 'generating' | 'preview'
  // Cover Letter
  | 'clForm' | 'clGenerating' | 'clPreview'
  // Jobs Marketplace
  | 'jobMarket' | 'jobDetail' | 'jobApply'
  | 'employerDashboard' | 'employerPostJob'
  | 'candidateApplications'
  // API Portal
  | 'apiDocs' | 'apiRegister' | 'apiDashboard'
  // HireNova Global — International Recruitment
  | 'globalMarket' | 'globalJobDetail' | 'globalApply'
  | 'globalEmployerDashboard' | 'globalPostJob'
  // HireNova Mobilité — OCR + NLP Pipeline
  | 'mobilityHome' | 'mobilityUpload' | 'mobilityProfile' | 'mobilityResult'
  // Programme Parrainage
  | 'referral'
  // HireNova Campus — Universités Partenaires
  | 'campus'
  // User Dashboard — Mon Espace personnel
  | 'dashboard'
  // Simulateur Entretien IA
  | 'interview'
  // Admin Dashboard — Supervision globale
  | 'admin'
  // HireNova LinkedIn — Profil Optimizer
  | 'linkedinHome' | 'linkedinAnalyzer' | 'linkedinGenerator'
  // HireNova Recruiter — AI Recruitment Pipeline
  | 'recruiterHome' | 'recruiterPipeline' | 'recruiterCandidates' | 'recruiterMatch'
  // HireNova Career — Career Roadmap & Assessment
  | 'careerHome' | 'careerAssessment' | 'careerRoadmap' | 'careerSkills'
  // HireNova Coach — AI Career Coach
  | 'coachHome' | 'coachSession' | 'coachGoals' | 'coachHistory'
  // HireNova Formation — Training & Certification
  | 'formationHome' | 'formationCatalog' | 'formationCourse' | 'formationCert'
  // HireNova Freelance — Freelance Marketplace
  | 'freelanceHome' | 'freelanceBrowse' | 'freelanceMission' | 'freelanceDashboard'
  // HireNova IA COMMUNITY ET MARKETPLACE
  | 'marketplaceHome' | 'marketplaceCommunity' | 'marketplaceEvents' | 'marketplaceProfile'
  // HireNova IA INTELLIGENCE
  | 'intelligenceHome' | 'intelligenceTrends' | 'intelligenceSalary' | 'intelligenceForecast'
  // HireNova IA WHITE LABEL
  | 'whiteLabelHome' | 'whiteLabelSetup' | 'whiteLabelDashboard' | 'whiteLabelPricing'
  // HireNova IA LEGAL
  | 'legalHome' | 'legalContracts' | 'legalCompliance' | 'legalTemplates'
  // HireNova IA COMMAND CENTER — Orchestration
  | 'orchestrationHub' | 'orchestrationDispatch' | 'orchestrationCollab'
  // Job Application — Demande d'emploi adaptative
  | 'jobApplication' | 'jobApplicationPreview'
  // Payment & Accounting Dashboard
  | 'paymentDashboard'
  // HireNova SaaLabour — Software as Labour Mission Control
  | 'saalabourHub'

export type TemplateStyle = 'modern' | 'classic' | 'creative'
export type CVLanguage = 'fr' | 'en' | 'ar' | 'es'
export type PhotoPosition = 'left' | 'center' | 'right'
export type PersonaType = 'student' | 'graduate' | 'professional' | 'executive' | 'freelance' | 'expat'

export interface StepData {
  jobId?: string
  apiKey?: string
  targetCountry?: string
  profileId?: string
  [key: string]: unknown
}

export interface FormData {
  fullName: string
  email: string
  phone: string
  address: string
  location: string
  linkedin: string
  website: string
  targetJob: string
  industry: string
  experience: string
  education: string
  skills: string
  languages: string
  summary: string
  photo: string
  dateOfBirth: string
  birthPlace: string
  birthCountry: string
  softSkills: string
  photoPosition: PhotoPosition
  companyName: string
  hiringManager: string
  clTone: 'formal' | 'semi-formal' | 'dynamic'
}

export interface GeneratedCV {
  summary: string
  experience: Array<{ title: string; company: string; period: string; description: string }>
  education: Array<{ degree: string; school: string; period: string; description: string }>
  skills: string[]
  languages: Array<{ name: string; level: string }>
}

export interface CoverLetterFormData {
  fullName: string
  email: string
  phone: string
  address: string
  country: string
  location: string
  companyName: string
  hiringManager: string
  jobTitle: string
  jobReference: string
  whyCompany: string
  keyStrengths: string
  tone: 'formal' | 'semi-formal' | 'dynamic'
  additionalNotes: string
}

export interface GeneratedCoverLetter {
  subject: string
  greeting: string
  paragraphs: string[]
  signOff: string
}

export interface ATSCategoryScore {
  name: string
  score: number
  description: string
}

export interface ATSResult {
  overallScore: number
  categories: ATSCategoryScore[]
  suggestions: string[]
}

// OCR + NLP Pipeline types
export interface ExtractedProfile {
  fullName: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
  skills: string[]
  languages: Array<{ name: string; level: string }>
  experience: Array<{ title: string; company: string; period: string; description: string }>
  education: Array<{ degree: string; school: string; period: string; description: string }>
  certifications: string[]
  rawText: string
}

export interface MobilityResult {
  targetCountry: string
  countryNorms: {
    cvFormat: string
    requiredSections: string[]
    forbiddenSections: string[]
    photoRequired: boolean
    maxPages: number
    language: string
    tips: string[]
  }
  formattedCV: GeneratedCV
  formattedCL: GeneratedCoverLetter
  compatibilityScore: number
  skillsGap: string[]
  recommendations: string[]
}

interface CVStore {
  step: AppStep
  stepData: StepData
  formStep: number
  language: CVLanguage
  template: TemplateStyle
  formData: FormData
  generatedCV: GeneratedCV | null
  isGenerating: boolean
  error: string | null
  selectedPersona: PersonaType | null
  clFormData: CoverLetterFormData
  generatedCL: GeneratedCoverLetter | null
  isCLGenerating: boolean
  clError: string | null
  atsResult: ATSResult | null
  isATSAnalyzing: boolean
  atsError: string | null
  // Mobility state
  extractedProfile: ExtractedProfile | null
  mobilityResult: MobilityResult | null
  isProcessing: boolean

  setStep: (step: AppStep, data?: StepData) => void
  setFormStep: (step: number) => void
  setLanguage: (lang: CVLanguage) => void
  setTemplate: (template: TemplateStyle) => void
  updateFormData: (data: Partial<FormData>) => void
  setGeneratedCV: (cv: GeneratedCV | null) => void
  setIsGenerating: (val: boolean) => void
  setError: (err: string | null) => void
  setSelectedPersona: (persona: PersonaType | null) => void
  updateCLFormData: (data: Partial<CoverLetterFormData>) => void
  setGeneratedCL: (cl: GeneratedCoverLetter | null) => void
  setIsCLGenerating: (val: boolean) => void
  setCLError: (err: string | null) => void
  setATSResult: (result: ATSResult | null) => void
  setIsATSAnalyzing: (val: boolean) => void
  setATSError: (err: string | null) => void
  setExtractedProfile: (profile: ExtractedProfile | null) => void
  setMobilityResult: (result: MobilityResult | null) => void
  setIsProcessing: (val: boolean) => void
  resetCL: () => void
  reset: () => void
}

const initialFormData: FormData = {
  fullName: '', email: '', phone: '', address: '', location: '',
  linkedin: '', website: '', targetJob: '', industry: '',
  experience: '', education: '', skills: '', languages: '',
  summary: '', photo: '', dateOfBirth: '', birthPlace: '',
  birthCountry: '', softSkills: '', photoPosition: 'center',
  companyName: '', hiringManager: '', clTone: 'semi-formal',
}

const initialCLFormData: CoverLetterFormData = {
  fullName: '', email: '', phone: '', address: '', country: '',
  location: '', companyName: '', hiringManager: '', jobTitle: '',
  jobReference: '', whyCompany: '', keyStrengths: '',
  tone: 'semi-formal', additionalNotes: '',
}

export const useCVStore = create<CVStore>()(
  persist(
    (set) => ({
      step: 'earlyAccess' as AppStep,
      stepData: {},
      formStep: 0,
      language: 'fr',
      template: 'modern',
      formData: { ...initialFormData },
      generatedCV: null, isGenerating: false, error: null, selectedPersona: null,
      clFormData: { ...initialCLFormData },
      generatedCL: null, isCLGenerating: false, clError: null,
      atsResult: null, isATSAnalyzing: false, atsError: null,
      extractedProfile: null, mobilityResult: null, isProcessing: false,

      setStep: (step, data) => set({ step, stepData: data ?? {} }),
      setFormStep: (formStep) => set({ formStep }),
      setLanguage: (language) => set({ language }),
      setTemplate: (template) => set({ template }),
      updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
      setGeneratedCV: (generatedCV) => set({ generatedCV }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setError: (error) => set({ error }),
      setSelectedPersona: (selectedPersona) => set({ selectedPersona }),
      updateCLFormData: (data) => set((state) => ({ clFormData: { ...state.clFormData, ...data } })),
      setGeneratedCL: (generatedCL) => set({ generatedCL }),
      setIsCLGenerating: (isCLGenerating) => set({ isCLGenerating }),
      setCLError: (clError) => set({ clError }),
      setATSResult: (atsResult) => set({ atsResult }),
      setIsATSAnalyzing: (isATSAnalyzing) => set({ isATSAnalyzing }),
      setATSError: (atsError) => set({ atsError }),
      setExtractedProfile: (extractedProfile) => set({ extractedProfile }),
      setMobilityResult: (mobilityResult) => set({ mobilityResult }),
      setIsProcessing: (isProcessing) => set({ isProcessing }),
      resetCL: () => set({
        step: 'earlyAccess' as AppStep, stepData: {},
        clFormData: { ...initialCLFormData },
        generatedCL: null, isCLGenerating: false, clError: null,
        atsResult: null, isATSAnalyzing: false, atsError: null,
      }),
      reset: () => set({
        step: 'earlyAccess' as AppStep, stepData: {}, formStep: 0, template: 'modern',
        formData: { ...initialFormData },
        generatedCV: null, isGenerating: false, error: null, selectedPersona: null,
        clFormData: { ...initialCLFormData },
        generatedCL: null, isCLGenerating: false, clError: null,
        atsResult: null, isATSAnalyzing: false, atsError: null,
        extractedProfile: null, mobilityResult: null, isProcessing: false,
      }),
    }),
    {
      name: 'hirenova-step',
      // Persist step, stepData, and language so navigation + language survive reloads
      partialize: (state) => ({ step: state.step, stepData: state.stepData, language: state.language }),
    }
  )
)
