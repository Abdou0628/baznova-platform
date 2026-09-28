'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Globe, Shield, PenLine, ArrowRight, FileText, Star, Languages, Check, X, Crown, Zap, Loader2, LayoutTemplate, Download, GraduationCap, Briefcase, Rocket, Plane, UserCheck, Award, Bot, MessageCircle, MessageSquare, Linkedin, Search, Compass, BookOpen, Laptop, ChevronDown, HelpCircle, Users, ThumbsUp, Lock, Code2, BarChart3, PlusCircle, CheckCircle2, Copy, Gift, Building2, Mail, Wand2, Store, Brain, Scale, Network, HeartHandshake, UserPlus, Receipt, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type PersonaType, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage, TranslationKey } from '@/lib/i18n'
import ProfileButton from '@/components/auth/profile-button'
import AuthModal from '@/components/auth/auth-modal'
import EnterpriseContactForm from '@/components/enterprise/enterprise-contact-form'
import { events } from '@/lib/analytics'
import AdminDashboard from '@/components/admin/admin-dashboard'
import ChatbotWidget from '@/components/chatbot/chatbot-widget'
import PricingSection from '@/components/pricing-section'
import AIProductShowcase from '@/components/marketing/ai-product-showcase'
import AIAnimatedShowcase from '@/components/marketing/ai-animated-showcase'
import VideoPresentation from '@/components/marketing/video-presentation'
import AIMarketingHub from '@/components/marketing/ai-marketing-hub'
import JobCopilotWidget from '@/components/copilot/job-copilot-widget'
import { useSession } from 'next-auth/react'
import { BazNovaMusic } from '@/lib/ambient-music'

const flagEmoji: Record<CVLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇸🇦',
  es: '🇪🇸',
}

const features = [
  { icon: Sparkles, titleKey: 'feature1Title' as const, descKey: 'feature1Desc' as const },
  { icon: Globe, titleKey: 'feature2Title' as const, descKey: 'feature2Desc' as const },
  { icon: Shield, titleKey: 'feature3Title' as const, descKey: 'feature3Desc' as const },
  { icon: PenLine, titleKey: 'clFeatureTitle' as const, descKey: 'clFeatureDesc' as const },
]

interface PublicStats {
  documents: number
  users: number
  satisfiedUsers: number
  avgRating: number
}

function usePublicStats() {
  const [stats, setStats] = useState<PublicStats>({ documents: 0, users: 0, satisfiedUsers: 0, avgRating: 0 })
  useEffect(() => {
    fetch('/api/public-stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
  }, [])
  return stats
}

const staticStats = [
  { value: '4', icon: Languages, label: { fr: 'Langues', en: 'Languages', ar: 'لغات', es: 'Idiomas' } },
  { value: '3', icon: LayoutTemplate, label: { fr: 'Templates', en: 'Templates', ar: 'قوالب', es: 'Plantillas' } },
  { value: '2', icon: Download, label: { fr: 'Formats (PDF, Word)', en: 'Formats (PDF, Word)', ar: 'صيغ (PDF, Word)', es: 'Formatos (PDF, Word)' } },
]

// FAQ Accordion Item Component
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer group"
          aria-expanded={isOpen}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              {index + 1}
            </span>
            <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{question}</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0 ml-10">
                <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default function Landing() {
  const { setStep, language, setLanguage, setSelectedPersona } = useCVStore()
  const isRTL = language === 'ar'
  const liveStats = usePublicStats()

  // ── Ambient Music Player ──
  const [musicPlaying, setMusicPlaying] = useState(false)
  const musicRef = useRef<BazNovaMusic | null>(null)

  const toggleMusic = async () => {
    if (!musicRef.current) {
      musicRef.current = new BazNovaMusic()
    }
    if (musicPlaying) {
      await musicRef.current.stop()
      setMusicPlaying(false)
    } else {
      await musicRef.current.start(0.35)
      setMusicPlaying(true)
    }
  }

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.stop()
      }
    }
  }, [])

  // Update html lang and dir attributes when language changes
  useEffect(() => {
    const html = document.documentElement
    const langMap: Record<string, string> = { fr: 'fr', en: 'en', ar: 'ar', es: 'es' }
    html.lang = langMap[language] || 'fr'
    html.dir = isRTL ? 'rtl' : 'ltr'
  }, [language, isRTL])
  const personasRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const ecosystemRef = useRef<HTMLDivElement>(null)

  function scrollToPersonas() {
    personasRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  function scrollToPricing() {
    events.pricingViewed()
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  function scrollToEcosystem() {
    ecosystemRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const { data: session } = useSession()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [enterpriseFormOpen, setEnterpriseFormOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<{
    plan: string
    amount: number
    currency: string
    invoice: { number: string; downloadUrl: string }
    receipt: { number: string; downloadUrl: string }
  } | null>(null)
  const [currency, setCurrency] = useState<'eur' | 'usd' | 'gbp' | 'mad'>('eur')
  const [pendingAction, setPendingAction] = useState<AppStep | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [isAdminOpen, setIsAdminOpen] = useState(false)

  const userPlan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free'
  const isLoggedIn = !!session?.user
  const paidPlans = ['starter', 'pro', 'career_plus', 'employer', 'annual', 'lifetime']
  const hasActivePlan = paidPlans.includes(userPlan)

  function requireAuthAndPlan(step: AppStep) {
    if (!isLoggedIn) {
      setPendingAction(step)
      setAuthMode('register')
      setAuthModalOpen(true)
      return
    }
    if (!hasActivePlan) {
      toast.warning(t(language, 'subscriptionRequiredDesc'), { duration: 4000 })
      scrollToPricing()
      return
    }
    setStep(step)
  }

  function handleAuthSuccess() {
    // After login/register, check plan and execute pending action
    if (pendingAction && hasActivePlan) {
      setStep(pendingAction)
      setPendingAction(null)
    } else if (pendingAction && !hasActivePlan) {
      // User logged in but no paid plan yet
      setTimeout(() => {
        toast.warning(t(language, 'subscriptionRequiredDesc'), { duration: 4000 })
        scrollToPricing()
      }, 500)
      setPendingAction(null)
    }
  }

  // Listen for scroll-to-pricing custom event from profile button
  useEffect(() => {
    const handler = () => {
      setStep('landing')
      setTimeout(scrollToPricing, 100)
    }
    document.addEventListener('scroll-to-pricing', handler)
    return () => document.removeEventListener('scroll-to-pricing', handler)
  }, [setStep])

  // Fetch admin email config
  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.adminEmail) setAdminEmail(data.adminEmail)
      })
      .catch(() => {})
  }, [])

  const isAdmin = !!adminEmail && session?.user?.email === adminEmail
  const [paymobPolling, setPaymobPolling] = useState(false)

  // Handle ?verify=success|error|expired from email verification redirect
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const v = params.get('verify')
    if (v) {
      setVerifyStatus(v)
      window.history.replaceState({}, '', window.location.pathname)
      if (v === 'success') {
        toast.success(t(language, 'verifySuccessBanner'), { duration: 6000 })
      } else if (v === 'error') {
        toast.error(t(language, 'verifyErrorBanner'), { duration: 5000 })
      } else if (v === 'expired') {
        toast.warning(t(language, 'verifyExpiredBanner'), { duration: 5000 })
      }
    }
  }, [])

  // Email verification banner for logged-in unverified users
  const userEmailVerified = (session?.user as any)?.emailVerified !== false
  const [verifyBannerVisible, setVerifyBannerVisible] = useState(true)
  const [verifyResendLoading, setVerifyResendLoading] = useState(false)

  const handleResendVerification = async () => {
    setVerifyResendLoading(true)
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(t(language, 'registerVerifyEmail'), { description: t(language, 'registerVerifyEmailDesc') })
      } else {
        toast.error(data.error || 'Error')
      }
    } catch {
      toast.error('Error')
    } finally {
      setVerifyResendLoading(false)
    }
  }

  // Handle checkout success/cancel redirect from Stripe/LemonSqueezy/PayMob
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    const provider = params.get('provider')

    if (checkoutStatus === 'success') {
      const plan = params.get('plan') || 'pro'
      if (provider === 'paymob') {
        // PayMob: poll status endpoint until payment is confirmed
        setPaymobPolling(true)
        toast.info(t(language, 'lot5_landing_paymentVerifying'), { duration: 3000 })
        let attempts = 0
        const maxAttempts = 20
        const interval = setInterval(async () => {
          attempts++
          try {
            const res = await fetch('/api/paymob/status')
            const data = await res.json()
            if (data.status === 'paid') {
              clearInterval(interval)
              setPaymobPolling(false)
              toast.success(`🎉 ${t(language, 'lot5_landing_paymentSuccess')} ${data.plan}`, { duration: 6000 })
              if (data.invoice && data.receipt) {
                setPaymentSuccess({
                  plan: data.plan,
                  amount: 0,
                  currency: 'MAD',
                  invoice: data.invoice,
                  receipt: data.receipt,
                })
              }
              window.history.replaceState({}, '', window.location.pathname)
            } else if (data.status === 'expired') {
              clearInterval(interval)
              setPaymobPolling(false)
              toast.error(t(language, 'lot5_landing_paymentExpired'), { duration: 5000 })
              window.history.replaceState({}, '', window.location.pathname)
            } else if (attempts >= maxAttempts) {
              clearInterval(interval)
              setPaymobPolling(false)
              toast.info(t(language, 'lot5_landing_paymentPending'), { duration: 6000 })
            }
          } catch {
            // Silently retry
          }
        }, 3000) // poll every 3 seconds
      } else {
        toast.success(`🎉 ${t(language, 'lot5_landing_paymentSuccess')} ${plan}`, { duration: 5000 })
        window.history.replaceState({}, '', window.location.pathname)
      }
    } else if (checkoutStatus === 'canceled') {
      toast.info(t(language, 'lot5_landing_paymentCancelled'), { duration: 4000 })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Download a document PDF (invoice/receipt) from the payment success modal
  async function downloadDocument(downloadUrl: string, filename: string) {
    try {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t(language, 'lot5_landing_downloadError'))
    }
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <Image src="/baznova-logo-new.png?v=3" alt="BazNova" width={36} height={36} className="rounded-lg" />
              <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">POWERED BY IA</span>
            </div>
            <span className="text-lg font-bold text-foreground">{t(language, 'siteTitle')}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Music Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              onClick={toggleMusic}
              aria-label={musicPlaying ? 'Stop music' : 'Play ambient music'}
            >
              {musicPlaying ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(Object.keys(flagEmoji) as CVLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { events.languageChanged(language, lang); setLanguage(lang) }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    language === lang
                      ? 'bg-white shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="mr-1">{flagEmoji[lang]}</span>
                  <span className="hidden sm:inline">{lang.toUpperCase()}</span>
                </button>
              ))}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all"
                onClick={() => setIsAdminOpen(true)}
                aria-label="Admin Dashboard"
              >
                <Shield className="w-4 h-4" />
              </Button>
            )}
            <ProfileButton />
          </div>
        </div>
      </header>

      {/* Email verification banner for unverified users */}
      {isLoggedIn && !userEmailVerified && verifyBannerVisible && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{t(language, 'verifyBannerTitle')} — </span>
                {t(language, 'verifyBannerDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResendVerification}
                disabled={verifyResendLoading}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 underline cursor-pointer disabled:opacity-50 transition-colors"
              >
                {verifyResendLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t(language, 'verifyBannerResend')}
              </button>
              <button
                onClick={() => setVerifyBannerVisible(false)}
                className="text-sm text-amber-600 hover:text-amber-800 cursor-pointer transition-colors ml-1"
                aria-label={t(language, 'verifyBannerClose')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50/30 to-amber-50/20">
          {/* Background image + overlay */}
          <div className="absolute inset-0 -z-10">
            <Image src="/images/hero-career.jpg" alt="" fill className="object-cover opacity-[0.38]" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/15 to-white/45" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-emerald-200/20 via-teal-100/15 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-amber-200/15 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-200">
                  <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  <span>SaaS + SaaS Labour</span>
                  <span className="w-px h-4 bg-emerald-300" />
                  <span>{t(language, 'freeNoSignup')}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="mb-6"
              >
                <div className="inline-flex items-center gap-2 bg-white text-muted-foreground px-4 py-1.5 rounded-full text-xs font-medium border border-emerald-200 shadow-sm">
                  <Languages className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🇫🇷 🇬🇧 🇪🇸 🇸🇦</span>
                  <span className="text-emerald-700">{t(language, 'availableLangs')}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="mb-6"
              >
                <div className="flex flex-col items-center">
                  <Image src="/baznova-logo-new.png?v=3" alt="BazNova" width={96} height={96} className="rounded-2xl shadow-lg shadow-emerald-600/20 mx-auto ring-2 ring-emerald-200/50" />
                  <Badge className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-3 py-0.5 text-[10px] font-bold tracking-wider">SaaS + SaaS LABOUR</Badge>
                </div>
              </motion.div>

              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {/* Animated BazNova title with letter-by-letter animation */}
                <span className="inline-flex">
                  {'BazNova'.split('').map((letter, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className={i < 3 ? 'text-emerald-600' : 'text-foreground'}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
                <span className="block text-emerald-600 mt-2">{t(language, 'siteSubtitle')}</span>
              </motion.h1>

              <motion.p
                className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {t(language, 'siteDescription')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all cursor-pointer"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setAuthMode('register')
                      setAuthModalOpen(true)
                      return
                    }
                    scrollToEcosystem()
                  }}
                >
                  <UserPlus className="mr-2 w-5 h-5" />
                  {t(language, 'ctaChooseProfile')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-8 py-6 text-lg rounded-xl transition-all cursor-pointer"
                  onClick={scrollToEcosystem}
                >
                  <Compass className="mr-2 w-5 h-5" />
                  {t(language, 'clCta')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </div>

            {/* Stats */}
            <motion.div
              className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{liveStats.documents}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{t(language, 'lot5_landing_documentsGenerated')}</div>
              </div>
              {staticStats.map((stat) => (
                <div key={stat.value} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label[language]}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Persona Selection Section — Marketing Expert Grade */}
        <section ref={personasRef} className="relative py-16 sm:py-20 bg-gradient-to-b from-white to-emerald-50/50">
          <div className="absolute inset-0 -z-10">
            <Image src="/images/hero-coaching.jpg" alt="" fill className="object-cover opacity-[0.22]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/75 to-emerald-50/50" />
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t(language, 'personaSectionTitle')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-2">{t(language, 'personaSectionSubtitle')}</p>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <HeartHandshake className="w-3 h-3 mr-1" />
                {t(language, 'personaEqualChance')}
              </Badge>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([{
                type: 'student' as PersonaType,
                emoji: '\uD83C\uDF93',
                icon: GraduationCap,
                nameKey: 'personaStudent' as TranslationKey,
                descKey: 'personaStudentDesc' as TranslationKey,
                color: 'emerald',
              }, {
                type: 'graduate' as PersonaType,
                emoji: '\uD83C\uDF1F',
                icon: Award,
                nameKey: 'personaGraduate' as TranslationKey,
                descKey: 'personaGraduateDesc' as TranslationKey,
                color: 'blue',
              }, {
                type: 'professional' as PersonaType,
                emoji: '\uD83D\uDCBC',
                icon: Briefcase,
                nameKey: 'personaProfessional' as TranslationKey,
                descKey: 'personaProfessionalDesc' as TranslationKey,
                color: 'violet',
              }, {
                type: 'executive' as PersonaType,
                emoji: '\uD83D\uDC54',
                icon: UserCheck,
                nameKey: 'personaExecutive' as TranslationKey,
                descKey: 'personaExecutiveDesc' as TranslationKey,
                color: 'amber',
              }, {
                type: 'freelance' as PersonaType,
                emoji: '\uD83D\uDE80',
                icon: Rocket,
                nameKey: 'personaFreelance' as TranslationKey,
                descKey: 'personaFreelanceDesc' as TranslationKey,
                color: 'rose',
              }, {
                type: 'expat' as PersonaType,
                emoji: '\u2708\uFE0F',
                icon: Plane,
                nameKey: 'personaExpat' as TranslationKey,
                descKey: 'personaExpatDesc' as TranslationKey,
                color: 'sky',
              }]).map((persona, index) => (
                <motion.div
                  key={persona.type}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                >
                  <Card
                    className="h-full cursor-pointer hover:shadow-lg transition-all border-2 hover:border-emerald-400 group min-w-0 overflow-hidden"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setPendingAction('form')
                        setAuthMode('register')
                        setAuthModalOpen(true)
                        return
                      }
                      if (!hasActivePlan) {
                        toast.warning(t(language, 'subscriptionRequiredDesc'), { duration: 4000 })
                        scrollToPricing()
                        return
                      }
                      setSelectedPersona(persona.type)
                      events.personaSelected(persona.type)
                      events.cvFormStarted(persona.type)
                      setStep('form')
                    }}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-${persona.color}-100 flex items-center justify-center shrink-0`}
                        >
                          <span className="text-xl">{persona.emoji}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground text-sm">{t(language, persona.nameKey)}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2"><span className="truncate block max-w-full">{t(language, persona.descKey)}</span></p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-200">CV+LM+ATS</Badge>
                          <ArrowRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            {/* Social proof */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-sm text-muted-foreground">{t(language, 'personaSocialProof')}</p>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">
                        {t(language, feature.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(language, feature.descKey)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Job Copilot Section */}
        <section id="job-copilot" className="py-16 sm:py-20 bg-gradient-to-b from-white via-emerald-50/20 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-200">
                <Brain className="w-4 h-4" />
                <span>{t(language, 'lot5_landing_advancedAI')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                {t(language, 'copilotTitle')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                {t(language, 'copilotDesc')}
              </p>
            </motion.div>
            <JobCopilotWidget />
          </div>
        </section>

        {/* AI Animated Showcase — Voice + Image Product Presentation */}
        <AIAnimatedShowcase />

        {/* AI Video Presentation — Marketing Video with TTS */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-1.5 text-sm font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {t(language, 'videoSectionBadge')}
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t(language, 'videoSectionTitle')}</h2>
              <p className="text-slate-400 max-w-xl mx-auto">{t(language, 'videoSectionDesc')}</p>
            </div>
            <VideoPresentation />
          </div>
        </section>

        {/* AI Product Showcase — Modern Marketing */}
        <AIProductShowcase onTryProduct={requireAuthAndPlan} />

        {/* Pricing Section */}
        <div ref={pricingRef}>
        <PricingSection
          language={language}
          currency={currency}
          onCurrencyChange={setCurrency}
          session={session}
          setAuthMode={setAuthMode}
          setAuthModalOpen={setAuthModalOpen}
          setStep={setStep}
          requireAuthAndPlan={requireAuthAndPlan}
          checkoutLoading={checkoutLoading}
          setCheckoutLoading={setCheckoutLoading}
          setPaymentSuccess={setPaymentSuccess}
          onRequestQuote={() => setEnterpriseFormOpen(true)}
        />
        </div>

        {/* AI Marketing Hub — Personalized Product Discovery */}
        <AIMarketingHub onScrollToPricing={scrollToPricing} />

        {/* BazNova Ecosystem — Future Products Roadmap */}
        <section ref={ecosystemRef} className="relative py-16 sm:py-24 bg-gradient-to-b from-teal-50/40 via-white to-emerald-50/30">
          <div className="absolute inset-0 -z-10">
            <Image src="/images/bg-pattern.jpg" alt="" fill className="object-cover opacity-8" />
            <div className="absolute inset-0 bg-white/85" />
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-200">
                <Rocket className="w-4 h-4" />
                <span>{t(language, 'roadmapTitle')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t(language, 'ecosystemTitle')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t(language, 'ecosystemDesc')}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { icon: FileText, name: 'BazNova IA CV', desc: t(language, 'ecosystemCv'), active: true, accent: 'emerald', step: 'form' as AppStep | null },
                { icon: Search, name: 'BazNova IA ATS', desc: t(language, 'ecosystemAts'), active: true, accent: 'emerald', step: 'form' as AppStep | null },
                { icon: Briefcase, name: 'BazNova IA JOBS', desc: t(language, 'ecosystemJobs'), active: true, accent: 'emerald', step: 'jobMarket' as AppStep | null },
                { icon: Globe, name: 'BazNova IA GLOBAL', desc: t(language, 'ecosystemGlobal'), active: true, accent: 'teal', step: 'globalMarket' as AppStep | null },
                { icon: Plane, name: 'BazNova IA MOBILITY', desc: t(language, 'ecosystemMobility'), active: true, accent: 'purple', step: 'mobilityHome' as AppStep | null },
                { icon: Code2, name: 'BazNova IA API', desc: t(language, 'ecosystemApi'), active: true, accent: 'sky', step: 'apiDocs' as AppStep | null },
                { icon: Brain, name: 'BazNova IA INTELLIGENCE', desc: t(language, 'ecosystemIntelligence'), active: true, accent: 'violet', step: 'intelligenceHome' as AppStep | null },
                { icon: MessageCircle, name: 'BazNova IA INTERVIEW', desc: t(language, 'ecosystemInterview'), active: true, accent: 'violet', step: 'interview' as AppStep | null },
                { icon: Linkedin, name: 'BazNova IA LINKEDIN', desc: t(language, 'ecosystemLinkedin'), active: true, accent: 'sky', step: 'linkedinHome' as AppStep | null },
                { icon: UserCheck, name: 'BazNova IA RECRUITER', desc: t(language, 'ecosystemRecruiter'), active: true, accent: 'amber', step: 'recruiterHome' as AppStep | null },
                { icon: Compass, name: 'BazNova IA CAREER', desc: t(language, 'ecosystemCareer'), active: true, accent: 'rose', step: 'careerHome' as AppStep | null },
                { icon: Bot, name: 'BazNova IA COACH', desc: t(language, 'ecosystemCoach'), active: true, accent: 'emerald', step: 'coachHome' as AppStep | null },
                { icon: BookOpen, name: 'BazNova IA FORMATION', desc: t(language, 'ecosystemFormation'), active: true, accent: 'teal', step: 'formationHome' as AppStep | null },
                { icon: Laptop, name: 'BazNova IA FREELANCE', desc: t(language, 'ecosystemFreelance'), active: true, accent: 'orange', step: 'freelanceHome' as AppStep | null },
                { icon: MessageSquare, name: 'BazNova IA CHAT BOT ADVANCED', desc: t(language, 'ecosystemChatbot'), active: true, accent: 'violet', step: null },
                { icon: GraduationCap, name: 'BazNova IA CAMPUS SaaS', desc: t(language, 'ecosystemCampus'), active: true, accent: 'teal', step: 'campus' as AppStep | null },
                { icon: Store, name: 'BazNova IA COMMUNITY ET MARKETPLACE', desc: t(language, 'ecosystemMarketplace'), active: true, accent: 'emerald', step: 'marketplaceHome' as AppStep | null },
                { icon: Building2, name: 'BazNova IA WHITE LABEL', desc: t(language, 'ecosystemWhiteLabel'), active: true, accent: 'slate', step: 'whiteLabelHome' as AppStep | null },
                { icon: Scale, name: 'BazNova IA LEGAL', desc: t(language, 'ecosystemLegal'), active: true, accent: 'red', step: 'legalHome' as AppStep | null },
                { icon: Receipt, name: 'BazNova IA PAIEMENT', desc: t(language, 'ecosystemPayment'), active: true, accent: 'emerald', step: 'paymentDashboard' as AppStep | null },
                { icon: Network, name: 'BazNova IA COMMAND CENTER', desc: t(language, 'orchSubtitle'), active: true, accent: 'emerald', step: 'orchestrationHub' as AppStep | null },
                { icon: Bot, name: 'SaaLabour — Software as Labour', desc: 'Marketplace IA · Wallet WU · Templates · Mission Control', active: true, accent: 'violet', step: 'saalabourHub' as AppStep | null },
              ].map((product, index) => {
                const isClickable = Boolean(product.active)
                const handleNav = () => {
                  if (!product.step) { toast.info('Bientot disponible - Coming soon', {duration:3000}); return; }
                  // Track ecosystem card click
                  events.ecosystemCardClicked(product.name)
                  // CV and ATS require auth + active plan (premium features)
                  if (product.step === 'form') {
                    requireAuthAndPlan('form')
                  } else {
                    setStep(product.step as AppStep)
                  }
                }
                return (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <Card
                    onClick={isClickable ? handleNav : undefined}
                    onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav() } } : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isClickable ? 'cursor-pointer' : ''} ${
                      product.active
                        ? product.accent === 'teal'
                          ? 'border-teal-500 shadow-md bg-gradient-to-br from-teal-50/50 to-white'
                          : product.accent === 'purple'
                            ? 'border-purple-500 shadow-md bg-gradient-to-br from-purple-50/50 to-white'
                            : product.accent === 'sky'
                              ? 'border-sky-500 shadow-md bg-gradient-to-br from-sky-50/50 to-white'
                              : product.accent === 'violet'
                                ? 'border-violet-500 shadow-md bg-gradient-to-br from-violet-50/50 to-white'
                                : product.accent === 'red'
                                  ? 'border-red-500 shadow-md bg-gradient-to-br from-red-50/50 to-white'
                                  : 'border-emerald-500 shadow-md bg-gradient-to-br from-emerald-50/50 to-white'
                        : 'border-muted/50 bg-white'
                    }`}
                  >
                    {product.active && (
                      <div className="absolute top-3 right-3">
                        <Badge className={`px-2 py-0.5 text-[10px] font-semibold rounded-full text-white ${
                          product.accent === 'teal' ? 'bg-teal-600'
                            : product.accent === 'purple' ? 'bg-purple-600'
                            : product.accent === 'sky' ? 'bg-sky-600'
                            : product.accent === 'violet' ? 'bg-violet-600'
                            : product.accent === 'red' ? 'bg-red-600'
                            : 'bg-emerald-600'
                        }`}>{t(language, 'badgeActive')}</Badge>
                      </div>
                    )}
                    {!product.active && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold rounded-full">{t(language, 'badgeComingSoon')}</Badge>
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                        product.active
                          ? product.accent === 'teal' ? 'bg-teal-100'
                            : product.accent === 'purple' ? 'bg-purple-100'
                            : product.accent === 'sky' ? 'bg-sky-100'
                            : product.accent === 'violet' ? 'bg-violet-100'
                            : product.accent === 'red' ? 'bg-red-100'
                            : 'bg-emerald-100'
                          : 'bg-muted'
                      }`}>
                        <product.icon className={`w-5 h-5 ${
                          product.active
                            ? product.accent === 'teal' ? 'text-teal-600'
                              : product.accent === 'purple' ? 'text-purple-600'
                              : product.accent === 'sky' ? 'text-sky-600'
                              : product.accent === 'violet' ? 'text-violet-600'
                              : product.accent === 'red' ? 'text-red-600'
                              : 'text-emerald-600'
                            : 'text-muted-foreground'
                        }`} />
                      </div>
                      <h3 className={`font-semibold text-sm mb-1.5 ${product.active ? 'text-foreground' : 'text-foreground'}`}>{product.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{product.desc}</p>
                      {isClickable && (
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <span>{product.step ? t(language, 'openLabel') : t(language, 'comingSoonLabel')}</span>
                          {product.step && <ArrowRight className="w-3 h-3" />}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section — SEO Rich Content */}
        <section className="relative py-16 sm:py-24 bg-white" id="faq">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-200">
                <HelpCircle className="w-4 h-4" />
                <span>FAQ</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t(language, 'faqTitle')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t(language, 'faqSubtitle')}</p>
            </motion.div>

            <div className="space-y-4">
              {([
                { q: 'faqQ1' as const, a: 'faqA1' as const },
                { q: 'faqQ2' as const, a: 'faqA2' as const },
                { q: 'faqQ3' as const, a: 'faqA3' as const },
                { q: 'faqQ4' as const, a: 'faqA4' as const },
                { q: 'faqQ5' as const, a: 'faqA5' as const },
                { q: 'faqQ6' as const, a: 'faqA6' as const },
                { q: 'faqQ7' as const, a: 'faqA7' as const },
                { q: 'faqQ8' as const, a: 'faqA8' as const },
              ]).map((item, index) => (
                <FAQItem key={item.q} question={t(language, item.q)} answer={t(language, item.a)} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust / Social Proof Section — SEO */}
        <section className="relative py-16 sm:py-20 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t(language, 'trustTitle')}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{t(language, 'trustSubtitle')}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {([
                { icon: Users, value: liveStats.satisfiedUsers > 0 ? String(liveStats.satisfiedUsers) : '—', label: t(language, 'trustStats'), color: 'emerald' },
                { icon: ThumbsUp, value: liveStats.avgRating > 0 ? `${liveStats.avgRating}/5` : '—', label: t(language, 'trustAvgRating'), color: 'amber' },
                { icon: Lock, value: '100%', label: t(language, 'trustDataSecured'), color: 'teal' },
              ]).map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-sm bg-white text-center">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center mx-auto mb-3`}>
                        <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                      </div>
                      <div className="text-2xl font-extrabold text-foreground mb-1">{item.value}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{t(language, 'trustGuarantee')}</p>
            </motion.div>
          </div>
        </section>

        {/* BazNova Jobs Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-emerald-50/50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
              <Badge className="mb-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Briefcase className="w-3 h-3 mr-1" /> Marketplace</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{t(language, 'jobsTitle')}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{t(language, 'jobsSubtitle')}</p>
            </motion.div>
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              <div className="text-center"><p className="text-2xl font-bold text-emerald-600">0</p><p className="text-xs text-muted-foreground">{t(language, 'jobsActiveOffers')}</p></div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center"><p className="text-2xl font-bold text-teal-600">0</p><p className="text-xs text-muted-foreground">{t(language, 'jobsCompanies')}</p></div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center"><p className="text-2xl font-bold text-amber-600">0</p><p className="text-xs text-muted-foreground">{t(language, 'jobsApplications')}</p></div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">{t(language, 'jobsComingSoon')}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => setStep('jobMarket')} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"><Briefcase className="w-4 h-4 mr-2" /> {t(language, 'jobsViewAll')}</Button>
                <Button variant="outline" onClick={() => setStep('employerPostJob')} className="cursor-pointer"><PlusCircle className="w-4 h-4 mr-2" /> {t(language, 'jobsPostOffer')}</Button>
              </div>
            </div>
          </div>
        </section>

        {/* BazNova API Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
              <Badge className="mb-3 bg-amber-100 text-amber-700 hover:bg-amber-100"><Code2 className="w-3 h-3 mr-1" /> {t(language, 'apiB2BBadge')}</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{t(language, 'apiTitle')}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{t(language, 'apiSubtitle')}</p>
            </motion.div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {[
                { icon: FileText, title: t(language, 'apiGenCV'), desc: t(language, 'apiGenCVDesc') },
                { icon: PenLine, title: t(language, 'apiCoverLetter'), desc: t(language, 'apiCoverLetterDesc') },
                { icon: Shield, title: t(language, 'apiAtsAnalysis'), desc: t(language, 'apiAtsAnalysisDesc') },
                { icon: BarChart3, title: t(language, 'apiTracking'), desc: t(language, 'apiTrackingDesc') }
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="text-center p-4 hover:shadow-md transition-shadow"><f.icon className="w-8 h-8 mx-auto text-emerald-600 mb-2" /><h3 className="text-sm font-semibold">{f.title}</h3><p className="text-xs text-muted-foreground mt-1">{f.desc}</p></Card>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { name: 'Starter', price: '49€', credits: '100', plan: 'starter_api' },
                { name: 'Business', price: '149€', credits: '500', plan: 'business_api' },
                { name: 'Enterprise', price: '399€', credits: '∞', plan: 'enterprise' }
              ].map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card
                    onClick={() => {
                      if (p.plan === 'enterprise') {
                        setEnterpriseFormOpen(true)
                      } else {
                        requireAuthAndPlan('apiRegister')
                      }
                    }}
                    className={`text-center p-6 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${i === 1 ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'hover:border-emerald-200'}`}
                  >
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <div className="text-3xl font-bold text-emerald-600 my-2">{p.price}<span className="text-sm font-normal text-muted-foreground">{t(language, 'apiPerMonth')}</span></div>
                    <p className="text-sm text-muted-foreground">{p.credits === '∞' ? t(language, 'apiUnlimited') : `${p.credits} ${t(language, 'apiCredits')}`}{t(language, 'apiPerMonth')}</p>
                    <Button size="sm" className={`mt-4 ${i === 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-foreground hover:bg-foreground/90'} text-white cursor-pointer`}>
                      {p.plan === 'enterprise' ? t(language, 'apiContactSales') : t(language, 'apiGetKey')}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mb-6">{t(language, 'apiClientsLine')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setStep('apiDocs')} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"><Code2 className="w-4 h-4 mr-2" /> {t(language, 'apiDocumentation')}</Button>
              <Button variant="outline" onClick={() => setStep('apiRegister')} className="cursor-pointer"><Rocket className="w-4 h-4 mr-2" /> {t(language, 'apiGetKey')}</Button>
            </div>
          </div>
        </section>

        {/* BazNova Global Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}>
              <Badge className="mb-3 bg-teal-100 text-teal-700 hover:bg-teal-100"><Globe className="w-3 h-3 mr-1" /> {t(language, 'intlBadge')}</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{t(language, 'intlTitle')}</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl">{t(language, 'intlSubtitle')}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Globe, title: t(language, 'intlCountries'), desc: t(language, 'intlWorldOffers') },
                { icon: Shield, title: t(language, 'intlVisaSponsorship'), desc: t(language, 'intlVisaDesc') },
                { icon: Plane, title: t(language, 'intlRelocation'), desc: t(language, 'intlRelocationDesc') },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="border-teal-100 hover:border-teal-200 transition-colors">
                    <CardContent className="p-5 text-center">
                      <f.icon className="w-8 h-8 mx-auto text-teal-600 mb-3" />
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button onClick={() => setStep('globalMarket')} className="bg-teal-600 hover:bg-teal-700 cursor-pointer"><Globe className="w-4 h-4 mr-2" /> {t(language, 'intlExplore')}</Button>
              <Button variant="outline" onClick={() => setStep('globalEmployerDashboard')} className="cursor-pointer"><PlusCircle className="w-4 h-4 mr-2" /> {t(language, 'intlEmployerDashboard')}</Button>
            </div>
          </div>
        </section>

        {/* BazNova Mobilité Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-teal-50/30 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}>
              <Badge className="mb-3 bg-purple-100 text-purple-700 hover:bg-purple-100"><Plane className="w-3 h-3 mr-1" /> {t(language, 'mobilityBadge')}</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{t(language, 'mobilityTitle')}</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl">{t(language, 'mobilitySubtitle')}</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Card className="h-full border-purple-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Search className="w-5 h-5 text-purple-600" /></div>
                      <h3 className="font-semibold">{t(language, 'mobilityStep1')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'mobilityStep1Desc')}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Card className="h-full border-purple-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Bot className="w-5 h-5 text-purple-600" /></div>
                      <h3 className="font-semibold">{t(language, 'mobilityStep2')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'mobilityStep2Desc')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {([['🇫🇷', 'mobilityCountryFr' as TranslationKey], ['🇬🇧', 'mobilityCountryUk' as TranslationKey], ['🇺🇸', 'mobilityCountryUs' as TranslationKey], ['🇨🇦', 'mobilityCountryCa' as TranslationKey], ['🇩🇪', 'mobilityCountryDe' as TranslationKey], ['🇦🇪', 'mobilityCountryAe' as TranslationKey], ['🇨🇭', 'mobilityCountryCh' as TranslationKey], ['🇧🇪', 'mobilityCountryBe' as TranslationKey], ['🇪🇸', 'mobilityCountryEs' as TranslationKey], ['🇮🇹', 'mobilityCountryIt' as TranslationKey], ['🇯🇵', 'mobilityCountryJp' as TranslationKey], ['🇦🇺', 'mobilityCountryAu' as TranslationKey]]).map(([flag, key]) => (
                <Badge key={key} variant="outline" className="text-xs px-3 py-1.5">{flag} {t(language, key)}</Badge>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setStep('mobilityHome')} className="bg-purple-600 hover:bg-purple-700 cursor-pointer"><Plane className="w-4 h-4 mr-2" /> {t(language, 'mobilityAdaptCv')}</Button>
            </div>
          </div>
        </section>

        {/* BazNova LinkedIn Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-sky-50/30 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}>
              <Badge className="mb-3 bg-sky-100 text-sky-700 hover:bg-sky-100"><Linkedin className="w-3 h-3 mr-1" /> {t(language, 'linkedinBadge')}</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{t(language, 'linkedinSectionTitle')}</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl">{t(language, 'landingLinkedinDesc')}</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Card className="h-full border-sky-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-sky-600" /></div>
                      <h3 className="font-semibold">{t(language, 'linkedinAnalyze')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'linkedinStep2Desc')}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="h-full border-sky-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center"><Wand2 className="w-5 h-5 text-sky-600" /></div>
                      <h3 className="font-semibold">{t(language, 'linkedinGenerate')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'linkedinStep3Desc')}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Card className="h-full border-sky-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-sky-600" /></div>
                      <h3 className="font-semibold">{t(language, 'linkedinProfileScore')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'linkedinScoreExplanation')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setStep('linkedinHome')} className="bg-sky-600 hover:bg-sky-700 cursor-pointer"><Linkedin className="w-4 h-4 mr-2" /> {t(language, 'linkedinOptimizeProfile')}</Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="relative text-center bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute inset-0">
                <Image src="/images/gradient-emerald.jpg" alt="" fill className="object-cover opacity-20" />
              </div>
              <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                {t(language, 'ctaReadyTitle')}
              </h2>
              <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
                {t(language, 'ctaReadyDesc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-6 text-lg rounded-xl font-semibold shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setAuthMode('register')
                      setAuthModalOpen(true)
                      return
                    }
                    scrollToEcosystem()
                  }}
                >
                  <UserPlus className="mr-2 w-5 h-5" />
                  {t(language, 'ctaChooseProfile')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl font-semibold transition-all cursor-pointer"
                  onClick={scrollToEcosystem}
                >
                  <Compass className="mr-2 w-5 h-5" />
                  {t(language, 'clCta')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Enterprise Contact Form Modal */}
      <EnterpriseContactForm
        isOpen={enterpriseFormOpen}
        onClose={() => setEnterpriseFormOpen(false)}
      />

      {/* Payment Success Modal — shows auto-generated invoice + receipt */}
      <AnimatePresence>
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setPaymentSuccess(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{t(language, 'paymentSuccess')}</h3>
                <p className="text-emerald-100 text-sm mt-1">
                  {t(language, 'paymentPlanActivated').replace('{plan}', paymentSuccess.plan).replace('{amount}', paymentSuccess.amount.toFixed(2)).replace('{currency}', paymentSuccess.currency)}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t(language, 'paymentAutoGenerated')}
                  </p>
                </div>

                {/* Invoice */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t(language, 'paymentInvoice')}</p>
                      <p className="text-sm font-semibold font-mono">{paymentSuccess.invoice.number}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => downloadDocument(paymentSuccess.invoice.downloadUrl, `facture-${paymentSuccess.invoice.number}.pdf`)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>
                </div>

                {/* Receipt */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t(language, 'paymentReceipt')}</p>
                      <p className="text-sm font-semibold font-mono">{paymentSuccess.receipt.number}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => downloadDocument(paymentSuccess.receipt.downloadUrl, `recu-${paymentSuccess.receipt.number}.pdf`)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>
                </div>

                <div className="text-[10px] text-muted-foreground bg-slate-50 rounded-md p-2 border">
                  {t(language, 'paymentLegal')}
                </div>

                <Button
                  className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setPaymentSuccess(null)}
                >
                  {t(language, 'paymentContinue')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminDashboard isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      {/* Chatbot Widget - always visible */}
      <ChatbotWidget />

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <p>{t(language, 'footerText')} &copy; 2026 BazNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
          <div className="flex items-center flex-wrap justify-center gap-2 text-xs">
            <span className="text-emerald-600 font-medium">{t(language, 'footerSecuredBy')}</span>
            <span>🇫🇷 FR</span><span>🇧🇪 BE</span><span>🇨🇭 CH</span><span>🇱🇺 LU</span><span>🇲🇨 MC</span><span>🇪🇸 ES</span><span>🇬🇧 UK</span><span>🇺🇸 US</span><span>🇨🇦 CA</span><span>🇦🇺 AU</span><span>🇸🇦 SA</span><span>🇦🇪 AE</span><span>🇶🇦 QA</span><span>🇰🇼 KW</span><span>🇧🇭 BH</span><span>🇴🇲 OM</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-4 text-xs">
            <button onClick={() => { document.dispatchEvent(new CustomEvent('open-legal')) }} className="text-emerald-600 hover:underline cursor-pointer">{t(language, 'footerLegal')}</button>
            <button onClick={() => setStep('campus')} className="text-emerald-600 hover:underline cursor-pointer flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {t(language, 'footerCampus')}
            </button>
            <button onClick={() => setStep('referral')} className="text-emerald-600 hover:underline cursor-pointer flex items-center gap-1">
              <Gift className="w-3 h-3" />
              {t(language, 'footerReferral')}
            </button>
            {isAdmin && (
              <button onClick={() => setStep('admin')} className="text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                <Shield className="w-3 h-3" />
                {t(language, 'footerAdmin')}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
