'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Sparkles, Brain, Globe, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'

interface Slide {
  icon: React.ElementType
  titleKey: string
  textKey: string
  gradient: string
  accent: string
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    titleKey: 'videoSlide1Title',
    textKey: 'videoSlide1Text',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accent: 'emerald',
  },
  {
    icon: Brain,
    titleKey: 'videoSlide2Title',
    textKey: 'videoSlide2Text',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    accent: 'violet',
  },
  {
    icon: Shield,
    titleKey: 'videoSlide3Title',
    textKey: 'videoSlide3Text',
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    accent: 'amber',
  },
  {
    icon: Users,
    titleKey: 'videoSlide4Title',
    textKey: 'videoSlide4Text',
    gradient: 'from-rose-600 via-pink-600 to-violet-600',
    accent: 'rose',
  },
]

const LABELS: Record<string, Record<string, string>> = {
  videoSlide1Title: { fr: 'Découvrez HireNova IA', en: 'Discover HireNova AI', ar: 'اكتشف HireNova الذكي', es: 'Descubre HireNova IA' },
  videoSlide1Text: {
    fr: 'Votre plateforme IA de gestion de carrière et recrutement. Créez des CV professionnels, optimisez votre profil LinkedIn, et préparez-vous aux entretiens.',
    en: 'Your AI-powered career management and recruitment platform. Create professional resumes, optimize your LinkedIn profile, and prepare for interviews.',
    ar: 'منصتك الذكية لإدارة المسار المهني والتوظيف. أنشئ سيرًا ذاتية، حسّن ملفك، واستعد للمقابلات.',
    es: 'Tu plataforma de gestión de carrera y reclutamiento con IA. Crea currículums profesionales y optimiza tu perfil.',
  },
  videoSlide2Title: { fr: '20 Modules Intelligents', en: '20 Intelligent Modules', ar: '٢٠ وحدة ذكية', es: '20 Módulos Inteligentes' },
  videoSlide2Text: {
    fr: 'CV IA, Lettre de Motivation, Analyse ATS, Simulateur d\'entretien, Optimiseur LinkedIn, Plan de Carrière, Coach IA, et bien plus encore.',
    en: 'AI Resume, Cover Letter, ATS Analysis, Interview Simulator, LinkedIn Optimizer, Career Roadmap, AI Coach, and much more.',
    ar: 'سيرة ذاتية ذكية، رسالة تعريف، تحليل ATS، محاكاة مقابلات، تحسين لينكد إن، خارطة طريق مهنية، والمزيد.',
    es: 'CV IA, Carta de Presentación, Análisis ATS, Simulador de Entrevistas, Optimizador de LinkedIn y mucho más.',
  },
  videoSlide3Title: { fr: 'Command Center IA', en: 'AI Command Center', ar: 'مركز القيادة الذكي', es: 'Centro de Mando IA' },
  videoSlide3Text: {
    fr: '19 agents autonomes supervisent la plateforme en temps réel. Classification intelligente, routage automatique et collaboration inter-agents.',
    en: '19 autonomous agents supervise the platform in real time. Intelligent classification, automatic routing and inter-agent collaboration.',
    ar: '١٩ وكيلًا مستقلًا يراقبون المنصة بالوقت الفعلي. تصنيف ذكي وتوجيه تلقائي وتعاون بين الوكلاء.',
    es: '19 agentes autónomos supervisan la plataforma en tiempo real. Clasificación inteligente y colaboración inter-agentes.',
  },
  videoSlide4Title: { fr: 'Rejoignez-nous', en: 'Join Us', ar: 'انضم إلينا', es: 'Únete a Nosotros' },
  videoSlide4Text: {
    fr: 'Des milliers de professionnels font confiance à HireNova. L\'intelligence artificielle au service de votre réussite professionnelle.',
    en: 'Thousands of professionals trust HireNova. Artificial intelligence at the service of your professional success.',
    ar: 'آلاف المحترفين يثقون في HireNova. الذكاء الاصطناعي في خدمة نجاحك المهني.',
    es: 'Miles de profesionales confían en HireNova. Inteligencia artificial al servicio de tu éxito profesional.',
  },
  play: { fr: 'Lecture', en: 'Play', ar: 'تشغيل', es: 'Reproducir' },
  pause: { fr: 'Pause', en: 'Pause', ar: 'إيقاف', es: 'Pausar' },
  mute: { fr: 'Couper le son', en: 'Mute', ar: 'كتم', es: 'Silenciar' },
  unmute: { fr: 'Rétablir le son', en: 'Unmute', ar: 'إلغاء الكتم', es: 'Activar sonido' },
  generating: { fr: 'Génération audio...', en: 'Generating audio...', ar: 'جاري إنشاء الصوت...', es: 'Generando audio...' },
  slideOf: { fr: 'Diapositive', en: 'Slide', ar: 'شريحة', es: 'Diapositiva' },
}

// Pre-generated stable particle positions
const PARTICLES = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  x: ((i * 37 + 13) % 100),
  y0: ((i * 53 + 7) % 100),
  y1: ((i * 71 + 29) % 100),
  duration: 4 + (i % 4) * 1.5,
  delay: (i % 6) * 0.4,
}))

// Pre-generated stable waveform heights
const WAVE_HEIGHTS = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  maxHeight: 8 + ((i * 17 + 5) % 40),
  duration: 0.5 + ((i * 7) % 5) * 0.1,
  delay: (i % 10) * 0.04,
}))

export default function VideoPresentation() {
  const { language } = useCVStore()
  const lang = language as 'fr' | 'en' | 'ar' | 'es'
  const isRTL = lang === 'ar'
  const l = (key: string) => LABELS[key]?.[lang] ?? LABELS[key]?.fr ?? key

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const isPlayingRef = useRef(false)
  const slideInterval = 8000

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const slide = SLIDES[currentSlide]
  const SlideIcon = slide.icon

  // Get the full text for TTS for the current slide
  const slideText = useMemo(() => {
    const title = LABELS[slide.titleKey]?.[lang] ?? ''
    const text = LABELS[slide.textKey]?.[lang] ?? ''
    return `${title}. ${text}`
  }, [slide.titleKey, slide.textKey, lang])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, SLIDES.length - 1)))
    setProgress(0)
  }, [])

  const nextSlide = useCallback(() => goToSlide((currentSlide + 1) % SLIDES.length), [currentSlide, goToSlide])
  const prevSlide = useCallback(() => goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length), [currentSlide, goToSlide])

  const stopPlayback = useCallback(() => {
    clearTimer()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }, [clearTimer])

  const startProgressTimer = useCallback(() => {
    clearTimer()
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / slideInterval) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        setCurrentSlide(prev => (prev + 1) % SLIDES.length)
        setProgress(0)
      }
    }, 100)
  }, [clearTimer, slideInterval])

  // TTS using the correct /api/marketing/speech endpoint
  const generateAndPlayAudio = useCallback(async (slideIdx: number) => {
    setIsGenerating(true)
    try {
      const s = SLIDES[slideIdx]
      const title = LABELS[s.titleKey]?.[lang] ?? ''
      const text = LABELS[s.textKey]?.[lang] ?? ''
      const fullText = `${title}. ${text}`

      const res = await fetch('/api/marketing/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, language: lang, gender: 'female' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = url
        if (audioRef.current && isPlayingRef.current) {
          audioRef.current.src = url
          audioRef.current.currentTime = 0
          audioRef.current.volume = 1
          audioRef.current.play().catch(() => {})
        }
      }
    } catch {
      // Audio is optional — fail silently
    } finally {
      setIsGenerating(false)
    }
  }, [lang])

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback()
      return
    }
    setIsPlaying(true)
    setProgress(0)
    startProgressTimer()
    await generateAndPlayAudio(currentSlide)
  }, [isPlaying, currentSlide, stopPlayback, startProgressTimer, generateAndPlayAudio])

  // Play audio when slide changes during playback
  useEffect(() => {
    if (isPlayingRef.current) {
      generateAndPlayAudio(currentSlide)
    }
  }, [currentSlide, generateAndPlayAudio])

  // Apply mute state
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted
  }, [isMuted])

  // Auto-advance when audio ends
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      if (isPlayingRef.current) {
        setCurrentSlide(prev => (prev + 1) % SLIDES.length)
        setProgress(0)
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimer()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [clearTimer])

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Video Slide Area */}
        <div className={`relative aspect-video bg-gradient-to-br ${slide.gradient} flex items-center justify-center overflow-hidden`}>
          {/* Stable floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full bg-white/10"
                style={{ left: `${p.x}%` }}
                initial={{ y: `${p.y0}%`, scale: 0, opacity: 0 }}
                animate={{
                  y: [`${p.y0}%`, `${p.y1}%`, `${p.y0}%`],
                  scale: [0, 1.5, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -30 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative z-10 text-center px-8 sm:px-16 max-w-3xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-2xl"
              >
                <SlideIcon className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-4xl font-bold text-white mb-4 tracking-tight"
              >
                {l(slide.titleKey)}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-base sm:text-lg text-white/85 leading-relaxed"
              >
                {l(slide.textKey)}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Stable waveform visualizer */}
          {isPlaying && (
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 h-12 px-8 pointer-events-none">
              {WAVE_HEIGHTS.map((w) => (
                <motion.div
                  key={w.id}
                  className="w-1 bg-white/40 rounded-full"
                  animate={{
                    height: [4, w.maxHeight, 4],
                  }}
                  transition={{ duration: w.duration, repeat: Infinity, delay: w.delay, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="px-4 py-3 bg-slate-800/95 backdrop-blur-sm">
          <div className="mb-3">
            <Progress value={progress} className="h-1 bg-slate-700 [&>div]:bg-emerald-500" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? 'bg-emerald-400 w-6' : 'bg-slate-600 hover:bg-slate-500'}`}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={prevSlide}>
              <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              size="sm"
              className={`h-9 px-4 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-1.5`}
              onClick={handlePlay}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Globe className="w-4 h-4" />
                </motion.div>
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="text-xs hidden sm:inline">
                {isGenerating ? l('generating') : isPlaying ? l('pause') : l('play')}
              </span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={nextSlide}>
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <div className="flex-1" />
            <span className="text-xs text-slate-500">
              {currentSlide + 1}/{SLIDES.length}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => setIsMuted(prev => !prev)}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            {isPlaying && (
              <Badge className="bg-red-600 text-white text-[10px] px-2 py-0 animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
        </div>
      </Card>
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}
