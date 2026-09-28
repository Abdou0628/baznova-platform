'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import ErrorBoundary from '@/components/error-boundary'
import AnalyticsBootstrap from '@/components/analytics-bootstrap'
import { events } from '@/lib/analytics'
import { toast } from 'sonner'
import EarlyAccess from '@/components/cv/early-access'

// Email verification toast handler
function VerificationHandlerInner() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const status = searchParams.get('verify')
    if (!status) return
    // Clean URL immediately
    window.history.replaceState({}, '', '/')
    if (status === 'success') {
      toast.success('✅ Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.')
    } else if (status === 'expired') {
      toast.error('⏰ Le lien de vérification a expiré. Veuillez demander un nouveau lien.')
    } else {
      toast.error('❌ Lien de vérification invalide. Veuillez réessayer.')
    }
  }, [searchParams])
  return null
}

function VerificationHandler() {
  return (
    <Suspense fallback={null}>
      <VerificationHandlerInner />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-emerald-50/30">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )
}

// EarlyAccess imported directly (dynamic import has chunk loading issue in dev mode)
const Landing = dynamic(() => import('@/components/cv/landing'), { ssr: false, loading: () => <Loading /> })
const CVForm = dynamic(() => import('@/components/cv/form'), { ssr: false, loading: () => <Loading /> })
const Generating = dynamic(() => import('@/components/cv/generating'), { ssr: false, loading: () => <Loading /> })
const Preview = dynamic(() => import('@/components/cv/preview'), { ssr: false, loading: () => <Loading /> })
const CoverLetterForm = dynamic(() => import('@/components/cl/cover-letter-form'), { ssr: false, loading: () => <Loading /> })
const CoverLetterGenerating = dynamic(() => import('@/components/cl/cover-letter-generating'), { ssr: false, loading: () => <Loading /> })
const CoverLetterPreview = dynamic(() => import('@/components/cl/cover-letter-preview'), { ssr: false, loading: () => <Loading /> })

// Jobs Marketplace
const JobMarket = dynamic(() => import('@/components/jobs/job-market'), { ssr: false, loading: () => <Loading /> })
const JobDetail = dynamic(() => import('@/components/jobs/job-detail'), { ssr: false, loading: () => <Loading /> })
const JobApply = dynamic(() => import('@/components/jobs/job-apply'), { ssr: false, loading: () => <Loading /> })
const EmployerDashboard = dynamic(() => import('@/components/jobs/employer-dashboard'), { ssr: false, loading: () => <Loading /> })
const EmployerPostJob = dynamic(() => import('@/components/jobs/employer-post-job'), { ssr: false, loading: () => <Loading /> })
const CandidateApplications = dynamic(() => import('@/components/jobs/candidate-applications'), { ssr: false, loading: () => <Loading /> })

// API Portal
const ApiDocs = dynamic(() => import('@/components/api/api-docs'), { ssr: false, loading: () => <Loading /> })
const ApiRegister = dynamic(() => import('@/components/api/api-register'), { ssr: false, loading: () => <Loading /> })
const ApiDashboard = dynamic(() => import('@/components/api/api-dashboard'), { ssr: false, loading: () => <Loading /> })

// HireNova Global — International Recruitment
const GlobalMarket = dynamic(() => import('@/components/global/global-market'), { ssr: false, loading: () => <Loading /> })
const GlobalJobDetail = dynamic(() => import('@/components/global/global-job-detail'), { ssr: false, loading: () => <Loading /> })
const GlobalApply = dynamic(() => import('@/components/global/global-apply'), { ssr: false, loading: () => <Loading /> })
const GlobalEmployerDashboard = dynamic(() => import('@/components/global/global-employer-dashboard'), { ssr: false, loading: () => <Loading /> })
const GlobalPostJob = dynamic(() => import('@/components/global/global-post-job'), { ssr: false, loading: () => <Loading /> })


// Programme Parrainage
const ReferralDashboard = dynamic(() => import('@/components/referral/referral-dashboard'), { ssr: false, loading: () => <Loading /> })
// HireNova Campus
const CampusKit = dynamic(() => import('@/components/campus/campus-kit'), { ssr: false, loading: () => <Loading /> })
// User Dashboard — Mon Espace personnel
const UserDashboard = dynamic(() => import('@/components/dashboard/user-dashboard'), { ssr: false, loading: () => <Loading /> })
// Admin Dashboard (full page)
const AdminDashboardFull = dynamic(() => import('@/components/admin/admin-dashboard-full'), { ssr: false, loading: () => <Loading /> })
// HireNova Mobilité — OCR + NLP Pipeline
const MobilityHome = dynamic(() => import('@/components/mobility/mobility-home'), { ssr: false, loading: () => <Loading /> })
const MobilityUpload = dynamic(() => import('@/components/mobility/mobility-upload'), { ssr: false, loading: () => <Loading /> })
const MobilityProfile = dynamic(() => import('@/components/mobility/mobility-profile'), { ssr: false, loading: () => <Loading /> })
const MobilityResult = dynamic(() => import('@/components/mobility/mobility-result'), { ssr: false, loading: () => <Loading /> })
// Simulateur Entretien IA (wrapper to avoid SWC parse issue with interview-simulator.tsx)
const InterviewSimulator = dynamic(() => import('@/components/interview/interview-wrapper'), { ssr: false, loading: () => <Loading /> })
// HireNova LinkedIn — Profile Optimizer
const LinkedInHome = dynamic(() => import('@/components/linkedin/linkedin-home'), { ssr: false, loading: () => <Loading /> })
const LinkedInAnalyzer = dynamic(() => import('@/components/linkedin/linkedin-analyzer'), { ssr: false, loading: () => <Loading /> })
const LinkedInGenerator = dynamic(() => import('@/components/linkedin/linkedin-generator'), { ssr: false, loading: () => <Loading /> })
// HireNova Recruiter — AI Recruitment Pipeline
const RecruiterHome = dynamic(() => import('@/components/recruiter/recruiter-home'), { ssr: false, loading: () => <Loading /> })
const RecruiterPipeline = dynamic(() => import('@/components/recruiter/recruiter-pipeline'), { ssr: false, loading: () => <Loading /> })
const RecruiterCandidates = dynamic(() => import('@/components/recruiter/recruiter-candidates'), { ssr: false, loading: () => <Loading /> })
const RecruiterMatch = dynamic(() => import('@/components/recruiter/recruiter-match'), { ssr: false, loading: () => <Loading /> })
// HireNova Career — Career Roadmap & Assessment
const CareerHome = dynamic(() => import('@/components/career/career-home'), { ssr: false, loading: () => <Loading /> })
const CareerAssessment = dynamic(() => import('@/components/career/career-assessment'), { ssr: false, loading: () => <Loading /> })
const CareerRoadmap = dynamic(() => import('@/components/career/career-roadmap'), { ssr: false, loading: () => <Loading /> })
const CareerSkills = dynamic(() => import('@/components/career/career-skills'), { ssr: false, loading: () => <Loading /> })
// HireNova Coach — AI Career Coach
const CoachHome = dynamic(() => import('@/components/coach/coach-home'), { ssr: false, loading: () => <Loading /> })
const CoachSession = dynamic(() => import('@/components/coach/coach-session'), { ssr: false, loading: () => <Loading /> })
const CoachGoals = dynamic(() => import('@/components/coach/coach-goals'), { ssr: false, loading: () => <Loading /> })
const CoachHistory = dynamic(() => import('@/components/coach/coach-history'), { ssr: false, loading: () => <Loading /> })
// HireNova Formation — Training & Certification
const FormationHome = dynamic(() => import('@/components/formation/formation-home'), { ssr: false, loading: () => <Loading /> })
const FormationCatalog = dynamic(() => import('@/components/formation/formation-catalog'), { ssr: false, loading: () => <Loading /> })
const FormationCourse = dynamic(() => import('@/components/formation/formation-course'), { ssr: false, loading: () => <Loading /> })
const FormationCert = dynamic(() => import('@/components/formation/formation-cert'), { ssr: false, loading: () => <Loading /> })
// HireNova Freelance — Freelance Marketplace
const FreelanceHome = dynamic(() => import('@/components/freelance/freelance-home'), { ssr: false, loading: () => <Loading /> })
const FreelanceBrowse = dynamic(() => import('@/components/freelance/freelance-browse'), { ssr: false, loading: () => <Loading /> })
const FreelanceMission = dynamic(() => import('@/components/freelance/freelance-mission'), { ssr: false, loading: () => <Loading /> })
const FreelanceDashboard = dynamic(() => import('@/components/freelance/freelance-dashboard'), { ssr: false, loading: () => <Loading /> })
// HireNova IA Marketplace & Community
const MarketplaceHome = dynamic(() => import('@/components/marketplace/marketplace-home'), { ssr: false, loading: () => <Loading /> })
const MarketplaceCommunity = dynamic(() => import('@/components/marketplace/marketplace-community'), { ssr: false, loading: () => <Loading /> })
const MarketplaceEvents = dynamic(() => import('@/components/marketplace/marketplace-events'), { ssr: false, loading: () => <Loading /> })
const MarketplaceProfile = dynamic(() => import('@/components/marketplace/marketplace-profile'), { ssr: false, loading: () => <Loading /> })
// HireNova IA INTELLIGENCE
const IntelligenceHome = dynamic(() => import('@/components/intelligence/intelligence-home'), { ssr: false, loading: () => <Loading /> })
const IntelligenceTrends = dynamic(() => import('@/components/intelligence/intelligence-trends'), { ssr: false, loading: () => <Loading /> })
const IntelligenceSalary = dynamic(() => import('@/components/intelligence/intelligence-salary'), { ssr: false, loading: () => <Loading /> })
const IntelligenceForecast = dynamic(() => import('@/components/intelligence/intelligence-forecast'), { ssr: false, loading: () => <Loading /> })
// HireNova IA WHITE LABEL
const WhiteLabelHome = dynamic(() => import('@/components/white-label/white-label-home'), { ssr: false, loading: () => <Loading /> })
const WhiteLabelSetup = dynamic(() => import('@/components/white-label/white-label-setup'), { ssr: false, loading: () => <Loading /> })
const WhiteLabelDashboard = dynamic(() => import('@/components/white-label/white-label-dashboard'), { ssr: false, loading: () => <Loading /> })
const WhiteLabelPricing = dynamic(() => import('@/components/white-label/white-label-pricing'), { ssr: false, loading: () => <Loading /> })
// HireNova IA LEGAL
const LegalHome = dynamic(() => import('@/components/legal/legal-home'), { ssr: false, loading: () => <Loading /> })
const LegalContracts = dynamic(() => import('@/components/legal/legal-contracts'), { ssr: false, loading: () => <Loading /> })
const LegalCompliance = dynamic(() => import('@/components/legal/legal-compliance'), { ssr: false, loading: () => <Loading /> })
const LegalTemplates = dynamic(() => import('@/components/legal/legal-templates'), { ssr: false, loading: () => <Loading /> })
// HireNova IA Command Center — Orchestration
const OrchestrationHub = dynamic(() => import('@/components/orchestration/orchestration-hub'), { ssr: false, loading: () => <Loading /> })
// HireNova SaaLabour — Software as Labour Mission Control
const SaalabourHub = dynamic(() => import('@/components/saalabour/saalabour-hub'), { ssr: false, loading: () => <Loading /> })
// Job Application — Demande d'emploi
const JobApplicationForm = dynamic(() => import('@/components/cv/job-application-form'), { ssr: false, loading: () => <Loading /> })
const JobApplicationPreview = dynamic(() => import('@/components/cv/job-application-preview'), { ssr: false, loading: () => <Loading /> })
// Payment & Accounting Dashboard
const PaymentDashboard = dynamic(() => import('@/components/payment/payment-dashboard'), { ssr: false, loading: () => <Loading /> })
// Cookie Consent
import { CookieConsent } from '@/components/support/cookie-consent'
// Beta Feedback Widget
import { BetaFeedback } from '@/components/support/beta-feedback'

export default function Home() {
  const { step } = useCVStore()

  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={0}>
      <VerificationHandler />
      <AnalyticsBootstrap />
      <ErrorBoundary stepName="HireNova">
        {step === 'earlyAccess' && <EarlyAccess />}
        {step === 'landing' && <Landing />}
        {step === 'form' && <CVForm />}
        {step === 'generating' && <Generating />}
        {step === 'preview' && <Preview />}
        {step === 'clForm' && <CoverLetterForm />}
        {step === 'clGenerating' && <CoverLetterGenerating />}
        {step === 'clPreview' && <CoverLetterPreview />}

        {/* Jobs Marketplace */}
        {step === 'jobMarket' && <JobMarket />}
        {step === 'jobDetail' && <JobDetail />}
        {step === 'jobApply' && <JobApply />}
        {step === 'employerDashboard' && <EmployerDashboard />}
        {step === 'employerPostJob' && <EmployerPostJob />}
        {step === 'candidateApplications' && <CandidateApplications />}

        {/* API Portal */}
        {step === 'apiDocs' && <ApiDocs />}
        {step === 'apiRegister' && <ApiRegister />}
        {step === 'apiDashboard' && <ApiDashboard />}

        {/* HireNova Global */}
        {step === 'globalMarket' && <GlobalMarket />}
        {step === 'globalJobDetail' && <GlobalJobDetail />}
        {step === 'globalApply' && <GlobalApply />}
        {step === 'globalEmployerDashboard' && <GlobalEmployerDashboard />}
        {step === 'globalPostJob' && <GlobalPostJob />}

        {/* HireNova Mobilité */}
        {step === 'mobilityHome' && <MobilityHome />}
        {step === 'mobilityUpload' && <MobilityUpload />}
        {step === 'mobilityProfile' && <MobilityProfile />}
        {step === 'mobilityResult' && <MobilityResult />}
        {/* Programme Parrainage */}
        {step === 'referral' && <ReferralDashboard />}
        {/* HireNova Campus */}
        {step === 'campus' && <CampusKit />}
        {/* User Dashboard — Mon Espace */}
        {step === 'dashboard' && <UserDashboard />}
        {/* HireNova LinkedIn */}
        {step === 'linkedinHome' && <LinkedInHome />}
        {step === 'linkedinAnalyzer' && <LinkedInAnalyzer />}
        {step === 'linkedinGenerator' && <LinkedInGenerator />}
        {/* HireNova Recruiter */}
        {step === 'recruiterHome' && <RecruiterHome />}
        {step === 'recruiterPipeline' && <RecruiterPipeline />}
        {step === 'recruiterCandidates' && <RecruiterCandidates />}
        {step === 'recruiterMatch' && <RecruiterMatch />}
        {/* HireNova Career */}
        {step === 'careerHome' && <CareerHome />}
        {step === 'careerAssessment' && <CareerAssessment />}
        {step === 'careerRoadmap' && <CareerRoadmap />}
        {step === 'careerSkills' && <CareerSkills />}
        {/* HireNova Coach */}
        {step === 'coachHome' && <CoachHome />}
        {step === 'coachSession' && <CoachSession />}
        {step === 'coachGoals' && <CoachGoals />}
        {step === 'coachHistory' && <CoachHistory />}
        {/* HireNova Formation */}
        {step === 'formationHome' && <FormationHome />}
        {step === 'formationCatalog' && <FormationCatalog />}
        {step === 'formationCourse' && <FormationCourse />}
        {step === 'formationCert' && <FormationCert />}
        {/* HireNova Freelance */}
        {step === 'freelanceHome' && <FreelanceHome />}
        {step === 'freelanceBrowse' && <FreelanceBrowse />}
        {step === 'freelanceMission' && <FreelanceMission />}
        {step === 'freelanceDashboard' && <FreelanceDashboard />}
        {/* HireNova IA Marketplace & Community */}
        {step === 'marketplaceHome' && <MarketplaceHome />}
        {step === 'marketplaceCommunity' && <MarketplaceCommunity />}
        {step === 'marketplaceEvents' && <MarketplaceEvents />}
        {step === 'marketplaceProfile' && <MarketplaceProfile />}
        {/* HireNova IA INTELLIGENCE */}
        {step === 'intelligenceHome' && <IntelligenceHome />}
        {step === 'intelligenceTrends' && <IntelligenceTrends />}
        {step === 'intelligenceSalary' && <IntelligenceSalary />}
        {step === 'intelligenceForecast' && <IntelligenceForecast />}
        {/* HireNova IA WHITE LABEL */}
        {step === 'whiteLabelHome' && <WhiteLabelHome />}
        {step === 'whiteLabelSetup' && <WhiteLabelSetup />}
        {step === 'whiteLabelDashboard' && <WhiteLabelDashboard />}
        {step === 'whiteLabelPricing' && <WhiteLabelPricing />}
        {/* HireNova IA LEGAL */}
        {step === 'legalHome' && <LegalHome />}
        {step === 'legalContracts' && <LegalContracts />}
        {step === 'legalCompliance' && <LegalCompliance />}
        {step === 'legalTemplates' && <LegalTemplates />}
        {/* HireNova IA Command Center — Orchestration */}
        {step === 'orchestrationHub' && <OrchestrationHub />}
        {step === 'orchestrationDispatch' && <OrchestrationHub />}
        {step === 'orchestrationCollab' && <OrchestrationHub />}
        {/* HireNova SaaLabour — Software as Labour */}
        {step === 'saalabourHub' && <SaalabourHub />}
        {/* Job Application — Demande d'emploi */}
        {step === 'jobApplication' && <JobApplicationForm />}
        {step === 'jobApplicationPreview' && <JobApplicationPreview />}
        {/* Admin Dashboard */}
        {step === 'admin' && <AdminDashboardFull />}
        {/* Payment & Accounting Dashboard */}
        {step === 'paymentDashboard' && <PaymentDashboard />}
      </ErrorBoundary>
      <CookieConsent />
      <BetaFeedback />
    </SessionProvider>
  )
}
