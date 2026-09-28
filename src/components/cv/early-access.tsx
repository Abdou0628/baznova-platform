'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, MessageCircle, Star, Mail, ArrowRight, Users, Shield, Clock,
  FileText, PenLine, BarChart3, Linkedin,
  GraduationCap, Award, Briefcase, Crown,
  Building2, Globe, Cpu, Lock, CheckCircle2,
  Rocket, Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import AuthModal from '@/components/auth/auth-modal'

// ── i18n helper using extensions ──
function tx(lang: CVLanguage, key: string): string {
  return t(lang, key as any) || key
}

// ── Animated counter ──
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return <span ref={ref}>{count}</span>
}

// ── Framer-motion variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ── Feature data ──
const features = [
  { icon: FileText, key: 'featCV', color: 'from-emerald-400 to-teal-500' },
  { icon: PenLine, key: 'featCL', color: 'from-teal-400 to-cyan-500' },
  { icon: BarChart3, key: 'featATS', color: 'from-cyan-400 to-emerald-500' },
  { icon: Linkedin, key: 'featLI', color: 'from-emerald-500 to-teal-400' },
] as const

// ── Persona data ──
const personas = [
  { icon: GraduationCap, key: 'personaStudent', color: 'bg-emerald-500/20 text-emerald-300' },
  { icon: Award, key: 'personaGraduate', color: 'bg-teal-500/20 text-teal-300' },
  { icon: Briefcase, key: 'personaPro', color: 'bg-cyan-500/20 text-cyan-300' },
  { icon: Crown, key: 'personaExec', color: 'bg-amber-500/20 text-amber-300' },
] as const

// ── Benefits data ──
const benefitItems = [
  { icon: Zap, emoji: '🎯', key: 'benefitFreeAI' },
  { icon: Sparkles, emoji: '🚀', key: 'benefitAllTools' },
  { icon: MessageCircle, emoji: '💬', key: 'benefitFeedback' },
  { icon: Star, emoji: '⭐', key: 'benefitBadge' },
  { icon: Mail, emoji: '📧', key: 'benefitSupport' },
] as const

// ── Spots API response type ──
interface SpotsData {
  total: number
  taken: number
  remaining: number
  isFull: boolean
}

// ── Component ──
export default function EarlyAccess() {
  const { language, setStep } = useCVStore()
  const lang = language as CVLanguage
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [spotsData, setSpotsData] = useState<SpotsData | null>(null)
  const [spotsLoading, setSpotsLoading] = useState(true)

  // Fetch real spots data from API
  useEffect(() => {
    let cancelled = false
    async function fetchSpots() {
      try {
        setSpotsLoading(true)
        const res = await fetch('/api/early-access/spots')
        if (!res.ok) throw new Error('Failed to fetch')
        const data: SpotsData = await res.json()
        if (!cancelled) setSpotsData(data)
      } catch {
        // Fallback
        if (!cancelled) setSpotsData({ total: 50, taken: 0, remaining: 50, isFull: false })
      } finally {
        if (!cancelled) setSpotsLoading(false)
      }
    }
    fetchSpots()
    return () => { cancelled = true }
  }, [])

  const spotsRemaining = spotsData?.remaining ?? 50
  const spotsTotal = spotsData?.total ?? 50
  const isFull = spotsData?.isFull ?? false
  const spotsPercentage = (spotsRemaining / spotsTotal) * 100

  const handleAuthSuccess = useCallback(() => {
    setStep('landing')
  }, [setStep])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-800 text-white">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative overflow-hidden flex items-center justify-center py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Animated background blobs */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-teal-400/15 blur-3xl"
            animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-emerald-300/10 blur-2xl"
            animate={{ x: [0, 20, 0], y: [0, 25, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <motion.div
          className="relative z-10 max-w-4xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              {tx(lang, 'ea.badge')}
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white text-center leading-tight tracking-tight mb-4"
          >
            {tx(lang, 'ea.headline')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-emerald-100/80 text-center max-w-2xl mx-auto mb-8"
          >
            {tx(lang, 'ea.subtitle')}
          </motion.p>

          {/* Spots remaining counter card */}
          <motion.div variants={itemVariants} className="flex justify-center mb-10">
            <Card className="bg-white/10 border-emerald-500/20 backdrop-blur-md w-full max-w-md">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                {spotsLoading ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <Skeleton className="h-14 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-full bg-white/10 rounded-full" />
                    <Skeleton className="h-4 w-24 bg-white/10" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {isFull ? (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1 text-sm">
                          {tx(lang, 'ea.complet')}
                        </Badge>
                      ) : (
                        <>
                          <motion.div variants={pulseVariants} animate="pulse">
                            <Users className="w-6 h-6 text-emerald-400" />
                          </motion.div>
                          <span className="text-5xl sm:text-6xl font-black text-white tabular-nums">
                            <AnimatedCounter target={spotsRemaining} />
                          </span>
                          <span className="text-emerald-200/70 text-sm sm:text-base font-medium ml-1">
                            {tx(lang, 'ea.spotsLeft')}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${spotsPercentage}%` }}
                        transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {!isFull && (
                      <p className="text-emerald-200/60 text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {tx(lang, 'ea.urgency')} — {spotsRemaining}/{spotsTotal}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full max-w-md"
            >
              <Button
                onClick={() => setAuthModalOpen(true)}
                disabled={isFull}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white shadow-lg shadow-emerald-500/25 border-0 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shield className="w-5 h-5 mr-2" />
                {isFull ? tx(lang, 'ea.complet') : tx(lang, 'ea.cta')}
                {!isFull && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-emerald-200/50 text-sm text-center flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-400/70" />
              {tx(lang, 'ea.afterEA')}
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ WHAT IS BAZNOVA? SECTION ═══════════════ */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              {tx(lang, 'ea.whatIsTitle')}
            </h2>
            <p className="text-emerald-200/70 text-lg max-w-2xl mx-auto">
              {tx(lang, 'ea.whatIsSubtitle')}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <motion.div key={feat.key} variants={staggerItem}>
                  <Card className="bg-white/5 border-emerald-500/15 backdrop-blur-sm hover:bg-white/10 transition-colors h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {tx(lang, `ea.${feat.key}`)}
                      </h3>
                      <p className="text-emerald-200/60 text-sm leading-relaxed">
                        {tx(lang, `ea.${feat.key}desc`)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ WHO IS THIS FOR? SECTION ═══════════════ */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              {tx(lang, 'ea.whoForTitle')}
            </h2>
            <p className="text-emerald-200/70 text-lg max-w-2xl mx-auto">
              {tx(lang, 'ea.whoForSubtitle')}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {personas.map((persona) => {
              const Icon = persona.icon
              return (
                <motion.div key={persona.key} variants={staggerItem}>
                  <Card className="bg-white/5 border-emerald-500/15 backdrop-blur-sm hover:bg-white/10 transition-colors h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${persona.color} flex items-center justify-center`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {tx(lang, `ea.${persona.key}`)}
                      </h3>
                      <p className="text-emerald-200/60 text-sm leading-relaxed">
                        {tx(lang, `ea.${persona.key}Desc`)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ BENEFITS SECTION ═══════════════ */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <Card className="bg-white/5 border-emerald-500/10 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <ul className="space-y-4">
                  {benefitItems.map((item, idx) => {
                    const Icon = item.icon
                    return (
                      <motion.li
                        key={item.key}
                        variants={itemVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        custom={idx}
                        className="flex items-start gap-4 group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                          <span className="text-lg">{item.emoji}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-emerald-50 text-base sm:text-lg font-medium">
                            {tx(lang, `ea.${item.key}`)}
                          </span>
                        </div>
                      </motion.li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>



      {/* ═══════════════ FINAL CTA — Prêt à créer votre CV ? ═══════════════ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            {/* Decorative icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 100 }}
              className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30"
            >
              <FileText className="w-10 h-10 text-white" />
            </motion.div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
              {tx(lang, 'ea.cvReadyTitle')}
            </h2>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-emerald-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              {tx(lang, 'ea.cvReadySubtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              {/* Primary CTA — Créer mon compte */}
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="w-full sm:w-auto"
              >
                <Button
                  onClick={() => setAuthModalOpen(true)}
                  disabled={isFull}
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white shadow-xl shadow-emerald-500/30 border-0 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  {isFull ? tx(lang, 'ea.complet') : tx(lang, 'ea.cvReadyCTA')}
                  {!isFull && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </motion.div>

              {/* Secondary CTA — Explorer l'écosystème */}
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="w-full sm:w-auto"
              >
                <Button
                  onClick={() => setStep('landing')}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-semibold border-2 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-400/60 hover:text-white bg-transparent rounded-2xl transition-all"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {tx(lang, 'ea.cvReadyExplore')}
                </Button>
              </motion.div>
            </div>

            {/* Trust line */}
            <p className="text-emerald-200/40 text-sm mt-6 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {tx(lang, 'ea.afterEA')}
            </p>
          </motion.div>
        </div>
      </section>



      {/* ═══════════════ AUTH MODAL ═══════════════ */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="register"
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
