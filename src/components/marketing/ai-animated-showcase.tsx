'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Mail,
  MessageSquare,
  Linkedin,
  Compass,
  Plane,
  Sparkles,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BrainCircuit,
} from 'lucide-react'
import { useCVStore, type CVLanguage } from '@/store/cv-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Product definitions ───────────────────────────────────────────────────

const PRODUCTS = [
  { slug: 'cv', icon: FileText, color: 'emerald' as const },
  { slug: 'cover-letter', icon: Mail, color: 'blue' as const },
  { slug: 'interview', icon: MessageSquare, color: 'violet' as const },
  { slug: 'linkedin', icon: Linkedin, color: 'sky' as const },
  { slug: 'career', icon: Compass, color: 'amber' as const },
  { slug: 'mobility', icon: Plane, color: 'rose' as const },
]

type ProductColor = 'emerald' | 'blue' | 'violet' | 'sky' | 'amber' | 'rose'

const colorMap: Record<ProductColor, { bg: string; text: string; ring: string; glow: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-400', glow: 'shadow-emerald-400/50' },
  blue:    { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-400', glow: 'shadow-blue-400/50' },
  violet:  { bg: 'bg-violet-100', text: 'text-violet-600', ring: 'ring-violet-400', glow: 'shadow-violet-400/50' },
  sky:     { bg: 'bg-sky-100', text: 'text-sky-600', ring: 'ring-sky-400', glow: 'shadow-sky-400/50' },
  amber:   { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-400', glow: 'shadow-amber-400/50' },
  rose:    { bg: 'bg-rose-100', text: 'text-rose-600', ring: 'ring-rose-400', glow: 'shadow-rose-400/50' },
}

// ─── Static product data ────────────────────────────────────────────────────

const PRODUCT_NAMES: Record<CVLanguage, Record<string, string>> = {
  fr: {
    cv: 'CV IA Professionnel',
    'cover-letter': 'Lettre de Motivation IA',
    interview: 'Simulateur Entretien IA',
    linkedin: 'Optimiseur LinkedIn IA',
    career: 'Plan de Carrière IA',
    mobility: 'Mobilité Internationale',
  },
  en: {
    cv: 'Professional AI Resume',
    'cover-letter': 'AI Cover Letter',
    interview: 'AI Interview Simulator',
    linkedin: 'LinkedIn AI Optimizer',
    career: 'AI Career Roadmap',
    mobility: 'International Mobility',
  },
  ar: {
    cv: 'سيرة ذاتية احترافية IA',
    'cover-letter': 'رسالة تحفيزية IA',
    interview: 'محاكي مقابلة IA',
    linkedin: 'محسّن لينكدإن IA',
    career: 'خطة مسار مهني IA',
    mobility: 'التنقل الدولي',
  },
  es: {
    cv: 'CV Profesional IA',
    'cover-letter': 'Carta de Presentación IA',
    interview: 'Simulador de Entrevista IA',
    linkedin: 'Optimizador LinkedIn IA',
    career: 'Plan de Carrera IA',
    mobility: 'Movilidad Internacional',
  },
}

const DESCRIPTIONS: Record<CVLanguage, Record<string, string>> = {
  fr: {
    cv: 'Découvrez le CV IA Professionnel de HireNova. En quelques clics, notre intelligence artificielle crée pour vous un CV optimisé pour les ATS, moderne et percutant. Votre carrière mérite un CV qui sort du lot.',
    'cover-letter': 'Découvrez la Lettre de Motivation IA de HireNova. Notre IA rédige pour vous des lettres de motivation personnalisées et percutantes, parfaitement adaptées à chaque offre. Marquez les recruteurs dès la première ligne.',
    interview: 'Le Simulateur d\'Entretien IA de HireNova vous permet de pratiquer vos entretiens avec un coach intelligent. Recevez des retours en temps réel et améliorez vos réponses. Soyez prêt le jour J.',
    linkedin: 'L\'Optimiseur LinkedIn IA de HireNova analyse et améliore votre profil pour attirer les recruteurs. Optimisez votre visibilité et décrochez plus d\'opportunités professionnelles.',
    career: 'Le Plan de Carrière IA de HireNova vous trace une feuille de route personnalisée pour atteindre vos objectifs professionnels. Identifiez vos forces et construisez votre avenir.',
    mobility: 'La Mobilité Internationale de HireNova ouvre les portes du monde. Trouvez des opportunités de carrière à l\'international et gérez votre parcours de mobilité simplement.',
  },
  en: {
    cv: 'Discover HireNova Professional AI Resume. Our artificial intelligence creates an ATS-optimized, modern and impactful resume for you in just a few clicks. Your career deserves a resume that stands out.',
    'cover-letter': 'Discover HireNova AI Cover Letter. Our AI writes personalized and compelling cover letters perfectly tailored to each job posting. Impress recruiters from the very first line.',
    interview: 'HireNova AI Interview Simulator lets you practice interviews with an intelligent coach. Get real-time feedback and improve your answers. Be ready on the big day.',
    linkedin: 'HireNova LinkedIn AI Optimizer analyzes and improves your profile to attract recruiters. Boost your visibility and unlock more professional opportunities.',
    career: 'HireNova AI Career Roadmap creates a personalized plan to reach your professional goals. Identify your strengths and build your future with confidence.',
    mobility: 'HireNova International Mobility opens doors to the world. Find global career opportunities and manage your mobility journey with ease.',
  },
  ar: {
    cv: 'اكتشف السيرة الذاتية الاحترافية من HireNova. في نقرات قليلة، تخلق ذكاؤنا الاصطناعي سيرة ذاتية محسنة ومذهلة لمسيرتك المهنية. مسيرتك المهنية تستحق سيرة ذاتية استثنائية.',
    'cover-letter': 'اكتشف رسالة التحفيز من HireNova. يكتب ذكاؤنا الاصطناعي رسائل تحفيزية مخصصة ومؤثرة لكل فرصة عمل. أبهج مسؤولي التوظيف من السطر الأول.',
    interview: 'يتيح لك محاكي المقابلات من HireNova التدرب مع مدرب ذكي وتلقي ملاحظات فورية لتحسين إجاباتك. كن مستعدا في اليوم المحدد.',
    linkedin: 'يحلل محسن لينكدإن من HireNova ويحسن ملفك لجذب أصحاب العمل. عزز ظهورك واحصل على فرص مهنية أكثر.',
    career: 'يضع خطة المسار المهني من HireNova خطة مخصصة لتحقيق أهدافك المهنية. حدد نقاط قوتك وابن مستقبلك بثقة.',
    mobility: 'تفتح التنقل الدولي من HireNova أبواب العالم. اعثر على فرص عمل دولية وأدر رحلتك بسهولة.',
  },
  es: {
    cv: 'Descubre el CV Profesional IA de HireNova. Nuestra IA crea un currículum optimizado y moderno en pocos clics. Tu carrera merece un CV que destaque.',
    'cover-letter': 'Descubre la Carta de Presentación IA de HireNova. Nuestra IA redacta cartas personalizadas y adaptadas a cada oferta. Impresiona desde la primera línea.',
    interview: 'El Simulador de Entrevistas IA de HireNova te permite practicar con un coach inteligente. Recibe retroalimentación en tiempo real y mejora tus respuestas.',
    linkedin: 'El Optimizador LinkedIn IA de HireNova analiza y mejora tu perfil para atraer reclutadores y desbloquear más oportunidades profesionales.',
    career: 'El Plan de Carrera IA de HireNova crea una ruta personalizada para alcanzar tus objetivos profesionales con confianza.',
    mobility: 'La Movilidad Internacional de HireNova abre las puertas del mundo. Encuentra oportunidades globales y gestiona tu trayectoria con facilidad.',
  },
}

// Web Speech API language codes
const SPEECH_LANG: Record<CVLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA',
  es: 'es-ES',
}

// Language-specific image paths: /showcase/images/{lang}/{slug}.png
const getImageSrc = (slug: string, lang: CVLanguage) => `/showcase/images/${lang}/${slug}.png`

// ─── UI Labels ─────────────────────────────────────────────────────────────

const LABELS: Record<CVLanguage, Record<string, string>> = {
  fr: {
    title: 'Découvrez nos produits avec l\'IA',
    subtitle: 'L\'intelligence artificielle vous présente chaque outil en détail',
    playVoice: 'Écouter la présentation',
    stopVoice: 'Arrêter',
    next: 'Suivant',
    prev: 'Précédent',
    autoPlay: 'Lecture auto',
  },
  en: {
    title: 'Discover our products with AI',
    subtitle: 'Artificial intelligence presents each tool in detail',
    playVoice: 'Listen to presentation',
    stopVoice: 'Stop',
    next: 'Next',
    prev: 'Previous',
    autoPlay: 'Auto play',
  },
  ar: {
    title: 'اكتشف منتجاتنا بالذكاء الاصطناعي',
    subtitle: 'الذكاء الاصطناعي يقدم كل أداة بالتفصيل',
    playVoice: 'استمع للعرض',
    stopVoice: 'إيقاف',
    next: 'التالي',
    prev: 'السابق',
    autoPlay: 'تشغيل تلقائي',
  },
  es: {
    title: 'Descubre nuestros productos con IA',
    subtitle: 'La inteligencia artificial presenta cada herramienta en detalle',
    playVoice: 'Escuchar presentación',
    stopVoice: 'Detener',
    next: 'Siguiente',
    prev: 'Anterior',
    autoPlay: 'Reproducción auto',
  },
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AIAnimatedShowcase() {
  const { language } = useCVStore()
  const isRTL = language === 'ar'
  const labels = LABELS[language]

  const [activeIndex, setActiveIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [speechProgress, setSpeechProgress] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [voiceReady, setVoiceReady] = useState(false)
  const [useBackendTTS, setUseBackendTTS] = useState(false)

  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const backendAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCacheRef = useRef<Map<string, string>>(new Map()) // Cache audio URLs by lang+text

  const activeProduct = PRODUCTS[activeIndex]
  const colors = colorMap[activeProduct.color]
  const description = DESCRIPTIONS[language][activeProduct.slug]
  const imageSrc = getImageSrc(activeProduct.slug, language)

  // ─── Check speech support + preload voices ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Always keep speechSupported = true (we have backend TTS fallback)
    if (!window.speechSynthesis) {
      // No browser TTS at all — backend will handle everything
      setUseBackendTTS(true)
      return
    }
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        voicesRef.current = v
        setVoiceReady(true)
      }
    }
    // Try immediately
    loadVoices()
    // Chrome loads voices async — listen for the event
    const onVoicesChanged = () => loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
    }
  }, [])

  // ─── Typing effect ─────────────────────────────────────────────────────

  const clearTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    setDisplayedText('')
  }, [])

  const startTyping = useCallback(
    (text: string) => {
      clearTyping()
      // For Arabic: type word-by-word to avoid broken glyph rendering
      if (language === 'ar') {
        const words = text.split(' ')
        let wordIdx = 0
        typingIntervalRef.current = setInterval(() => {
          wordIdx++
          if (wordIdx <= words.length) {
            setDisplayedText(words.slice(0, wordIdx).join(' '))
          } else {
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
            typingIntervalRef.current = null
          }
        }, 80)
      } else {
        // For LTR languages: character-by-character
        let i = 0
        typingIntervalRef.current = setInterval(() => {
          i++
          if (i <= text.length) {
            setDisplayedText(text.slice(0, i))
          } else {
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
            typingIntervalRef.current = null
          }
        }, 25)
      }
    },
    [clearTyping, language]
  )

  // ─── Speech control (Web Speech API) ────────────────────────────────────

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (backendAudioRef.current) {
      backendAudioRef.current.pause()
      backendAudioRef.current.currentTime = 0
      backendAudioRef.current = null
    }
    setIsSpeaking(false)
    setSpeechProgress(0)
  }, [])

  // ─── Voice matching helper ────────────────────────────────────────

  const findVoice = useCallback((lang: CVLanguage): SpeechSynthesisVoice | undefined => {
    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : [])

    const langCode = SPEECH_LANG[lang].split('-')[0]
    const localeVariants: Record<string, string[]> = {
      ar: ['ar-SA', 'ar-AE', 'ar-EG', 'ar-KW', 'ar-QA', 'ar-BH', 'ar-OM', 'ar-JO', 'ar-LB', 'ar-SY', 'ar-IQ', 'ar-MA', 'ar-DZ', 'ar-TN', 'ar-YE', 'ar'],
      fr: ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr'],
      en: ['en-US', 'en-GB', 'en-AU', 'en-IN', 'en-CA', 'en'],
      es: ['es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es'],
    }
    const variants = localeVariants[langCode] || [langCode]

    // 1. Exact locale + local service
    for (const v of variants) {
      const match = voices.find((voice) => voice.lang === v && voice.localService)
      if (match) return match
    }
    // 2. Prefix + local service
    let match = voices.find((v) => v.lang.startsWith(langCode) && v.localService)
    if (match) return match
    // 3. Exact locale (any service)
    for (const v of variants) {
      match = voices.find((voice) => voice.lang === v)
      if (match) return match
    }
    // 4. Prefix (any service)
    match = voices.find((v) => v.lang.startsWith(langCode))
    return match
  }, [])

  // ─── Speak with browser TTS (with Chrome bug workarounds) ──
  const speakWithBrowser = useCallback(
    (text: string, lang: CVLanguage, retryCount = 0) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return false

      // Chrome workaround: cancel before speaking
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = SPEECH_LANG[lang]
      utterance.rate = lang === 'ar' ? 0.85 : 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voice = findVoice(lang)
      if (voice) {
        utterance.voice = voice
        console.log(`[Speech] Voice: ${voice.name} (${voice.lang})`)
      } else {
        console.warn(`[Speech] No voice for ${SPEECH_LANG[lang]}, letting browser choose`)
      }

      let started = false
      let progressInterval: ReturnType<typeof setInterval> | null = null
      const estimatedDuration = text.length * 60

      utterance.onstart = () => {
        started = true
        setIsSpeaking(true)
        setSpeechProgress(0)
        progressInterval = setInterval(() => {
          setSpeechProgress((prev) => (prev >= 95 ? prev : prev + 2))
        }, estimatedDuration / 50)
      }
      utterance.onend = () => {
        setIsSpeaking(false)
        setSpeechProgress(100)
        if (progressInterval) clearInterval(progressInterval)
      }
      utterance.onerror = (e) => {
        console.warn(`[Speech] onerror for ${SPEECH_LANG[lang]}:`, e.error)
        setIsSpeaking(false)
        setSpeechProgress(0)
        if (progressInterval) clearInterval(progressInterval)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)

      // Chrome workaround: if onstart doesn't fire within 2s, cancel and retry once
      if (retryCount < 1) {
        setTimeout(() => {
          if (!started) {
            console.warn(`[Speech] No onstart after 2s for ${SPEECH_LANG[lang]}, retrying...`)
            window.speechSynthesis.cancel()
            // Small delay before retry
            setTimeout(() => {
              speakWithBrowser(text, lang, retryCount + 1)
            }, 200)
          }
        }, 2000)
      }

      return started
    },
    [findVoice]
  )

  // ─── Speak with backend TTS (with audio cache) ──
  const playCachedAudio = useCallback((audioUrl: string, lang: CVLanguage, text: string) => {
    stopSpeech()
    const audio = new Audio(audioUrl)
    backendAudioRef.current = audio
    const estimatedDuration = text.length * 80
    let progressInterval: ReturnType<typeof setInterval> | null = null

    audio.onplay = () => {
      setIsSpeaking(true)
      setSpeechProgress(0)
      progressInterval = setInterval(() => {
        setSpeechProgress((prev) => (prev >= 95 ? prev : prev + 2))
      }, estimatedDuration / 50)
    }
    audio.onended = () => {
      setIsSpeaking(false)
      setSpeechProgress(100)
      if (progressInterval) clearInterval(progressInterval)
      backendAudioRef.current = null
    }
    audio.onerror = () => {
      console.warn('[Speech] Cached audio play failed')
      setIsSpeaking(false)
      setSpeechProgress(0)
      if (progressInterval) clearInterval(progressInterval)
      backendAudioRef.current = null
    }
    audio.play().catch(() => {
      setIsSpeaking(false)
      backendAudioRef.current = null
    })
  }, [stopSpeech])

  const speakWithBackend = useCallback(
    async (text: string, lang: CVLanguage, attempt = 0) => {
      try {
        // Check cache first
        const cacheKey = `${lang}:${text.slice(0, 80)}`
        const cachedUrl = audioCacheRef.current.get(cacheKey)
        if (cachedUrl) {
          console.log('[Speech] Using cached audio')
          playCachedAudio(cachedUrl, lang, text)
          return
        }

        stopSpeech()
        console.log(`[Speech] Backend TTS for ${lang} (attempt ${attempt + 1})`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        let res: Response
        try {
          res = await fetch('/api/marketing/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language: lang, gender: 'female' }),
            signal: controller.signal,
          })
        } catch (fetchErr) {
          clearTimeout(timeoutId)
          // Network error (server crash) → retry up to 2 times
          if (attempt < 2) {
            console.log(`[Speech] Server unreachable, retrying in ${(attempt + 1) * 2}s...`)
            await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
            speakWithBackend(text, lang, attempt + 1)
            return
          }
          setIsSpeaking(false)
          if (lang === 'ar') {
            toast.error('Audio arabe indisponible — le serveur ne repond pas')
          }
          return
        }
        clearTimeout(timeoutId)

        if (!res.ok) {
          console.warn(`[Speech] Backend error ${res.status}`)
          if (lang === 'ar') {
            toast.error('Audio arabe indisponible — service temporairement surcharge')
            setIsSpeaking(false)
            return
          }
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            setUseBackendTTS(false)
            speakWithBrowser(text, lang)
          }
          return
        }

        const blob = await res.blob()
        if (blob.size < 100) {
          setIsSpeaking(false)
          if (lang === 'ar') {
            toast.error('Audio arabe — reponse vide du serveur')
            return
          }
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            setUseBackendTTS(false)
            speakWithBrowser(text, lang)
          }
          return
        }

        const audioUrl = URL.createObjectURL(blob)
        audioCacheRef.current.set(cacheKey, audioUrl)
        console.log(`[Speech] Audio OK (${blob.size} bytes)`)
        playCachedAudio(audioUrl, lang, text)
      } catch (err) {
        console.error('[Speech] Backend error:', err)
        setIsSpeaking(false)
        if (lang === 'ar') {
          toast.error('Audio arabe indisponible — erreur inattendue')
        }
      }
    },
    [stopSpeech, speakWithBrowser, playCachedAudio]
  )

  const speak = useCallback(
    (text: string, lang: CVLanguage) => {
      stopSpeech()

      // Strategy: try browser TTS FIRST for all languages (instant, no server needed)
      // If browser has no voice for the language, fallback to backend
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voice = findVoice(lang)
        if (voice) {
          console.log(`[Speech] Browser voice found: ${voice.name} (${voice.lang})`)
          setUseBackendTTS(false)
          speakWithBrowser(text, lang)
          return
        }
        console.log(`[Speech] No browser voice for ${lang}, trying backend TTS`)
      }

      // No browser voice → backend TTS
      setUseBackendTTS(true)
      speakWithBackend(text, lang)
    },
    [stopSpeech, speakWithBrowser, speakWithBackend, findVoice]
  )

  const toggleSpeech = useCallback(() => {
    if (isSpeaking) {
      stopSpeech()
    } else {
      console.log(`[Speech] toggleSpeech: lang=${language} descLen=${description.length}`)
      speak(description, language)
    }
  }, [isSpeaking, stopSpeech, speak, description, language])

  // ─── Auto-play timer ──────────────────────────────────────────────────

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
  }, [])

  // ─── Navigation ────────────────────────────────────────────────────────

  const goTo = useCallback(
    (index: number) => {
      const clamped = ((index % PRODUCTS.length) + PRODUCTS.length) % PRODUCTS.length
      setActiveIndex(clamped)
      setImageLoaded(false)
      stopSpeech()
      clearTyping()
      clearAutoPlayTimer()
    },
    [stopSpeech, clearTyping, clearAutoPlayTimer]
  )

  const goNext = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex])
  const goPrev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex])

  const handleProductClick = useCallback(
    (index: number) => goTo(index),
    [goTo]
  )

  // ─── When language changes, reset image loaded state ────────────────
  useEffect(() => {
    setImageLoaded(false)
  }, [language])

  // ─── When activeIndex changes, start typing ────────────────────────────

  useEffect(() => {
    const desc = DESCRIPTIONS[language][PRODUCTS[activeIndex].slug]
    startTyping(desc)
  }, [activeIndex, language, startTyping])

  // ─── Auto-play: after typing finishes + 2s, go next ────────────────────

  useEffect(() => {
    if (!autoPlay || isSpeaking) return

    const desc = DESCRIPTIONS[language][PRODUCTS[activeIndex].slug]
    if (displayedText.length < desc.length) return

    clearAutoPlayTimer()
    autoPlayTimerRef.current = setTimeout(() => {
      goNext()
    }, 2500)

    return clearAutoPlayTimer
  }, [autoPlay, isSpeaking, displayedText.length, activeIndex, language, goNext, clearAutoPlayTimer])

  // ─── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopSpeech()
      clearTyping()
      clearAutoPlayTimer()
    }
  }, [stopSpeech, clearTyping, clearAutoPlayTimer])

  // ─── Render ────────────────────────────────────────────────────────────

  const waveformBars = 24

  return (
    <section
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-10"
      >
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="relative">
            <BrainCircuit className="w-7 h-7 text-emerald-500" />
            <motion.div
              className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-sm"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 px-3 py-1">
            <Sparkles className="w-3 h-3" /> IA
          </Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
          {labels.title}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          {labels.subtitle}
        </p>
      </motion.header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* ── Left: Product Carousel ───────────────────────────────────── */}
        <div className="lg:col-span-4">
          <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {PRODUCTS.map((product, idx) => {
              const isActive = idx === activeIndex
              const c = colorMap[product.color]
              const Icon = product.icon

              return (
                <motion.button
                  key={product.slug}
                  onClick={() => handleProductClick(idx)}
                  className={cn(
                    'relative flex-shrink-0 flex items-center gap-3 p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer w-full min-w-[180px] lg:min-w-0',
                    isActive
                      ? cn('bg-white shadow-lg', c.glow, 'shadow-lg')
                      : 'bg-white/50 hover:bg-white hover:shadow-md'
                  )}
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-showcase-ring"
                      className={cn('absolute inset-0 rounded-xl ring-2', c.ring)}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}

                  <div
                    className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300',
                      c.bg, c.text,
                      isActive && 'scale-110'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {PRODUCT_NAMES[language][product.slug]}
                  </span>

                  {isActive && (
                    <motion.div
                      className={cn('w-2 h-2 rounded-full shrink-0', c.bg.replace('100', '500'))}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ── Right: Presentation Panel ─────────────────────────────────── */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 flex flex-col gap-4">

            {/* Product badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('text-xs font-semibold px-3 py-1', colors.bg, colors.text, 'border-current/10')}
              >
                {PRODUCT_NAMES[language][activeProduct.slug]}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                AI Powered
              </Badge>
            </div>

            {/* Image area */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted/30">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${activeIndex}-${imageSrc}`}
                  src={imageSrc}
                  alt={PRODUCT_NAMES[language][activeProduct.slug]}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </AnimatePresence>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-muted/50 animate-pulse flex items-center justify-center">
                  {React.createElement(activeProduct.icon, {
                    className: cn('w-10 h-10 animate-pulse', colors.text),
                  })}
                </div>
              )}
            </div>

            {/* Description with typing effect */}
            <div className="min-h-[80px] sm:min-h-[100px]">
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {displayedText}
                {displayedText.length < description.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    className={cn(
                      'inline-block w-0.5 h-4 sm:h-5 bg-emerald-500 align-middle',
                      isRTL ? 'mr-0.5' : 'ml-0.5'
                    )}
                  />
                )}
              </p>
            </div>

            {/* Audio player bar — Web Speech API */}
            {speechSupported && (
              <div dir="ltr" className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSpeech}
                  className={cn(
                    'h-9 w-9 rounded-full flex-shrink-0',
                    isSpeaking
                      ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                      : 'hover:bg-muted'
                  )}
                  aria-label={isSpeaking ? labels.stopVoice : labels.playVoice}
                >
                  {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                {/* Waveform visualizer */}
                <div className="flex-1 flex items-center gap-[2px] h-8 overflow-hidden">
                  {Array.from({ length: waveformBars }).map((_, i) => {
                    const barProgress = i / waveformBars
                    const isActiveBar = barProgress <= speechProgress / 100
                    return (
                      <motion.div
                        key={i}
                        className={cn(
                          'flex-1 rounded-full min-w-[2px]',
                          isActiveBar
                            ? 'bg-emerald-500'
                            : 'bg-muted-foreground/20'
                        )}
                        animate={
                          isSpeaking
                            ? { height: ['30%', `${30 + Math.random() * 70}%`] }
                            : { height: '40%' }
                        }
                        transition={
                          isSpeaking
                            ? {
                                duration: 0.3 + (i % 3) * 0.1,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                ease: 'easeInOut',
                              }
                            : { duration: 0.3 }
                        }
                      />
                    )
                  })}
                </div>

                {/* Volume icon */}
                <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                  {isSpeaking ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span className="tabular-nums">{Math.round(speechProgress)}%</span>
                </div>
              </div>
            )}

          </div>

          {/* ── Navigation bar ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              className="gap-1.5 cursor-pointer"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {labels.prev}
            </Button>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {PRODUCTS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={cn(
                    'rounded-full transition-all duration-300 cursor-pointer',
                    idx === activeIndex
                      ? 'w-6 h-2 bg-emerald-500'
                      : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              className="gap-1.5 cursor-pointer"
            >
              {labels.next}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* Auto-play toggle */}
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
                autoPlay
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <motion.div
                className={cn(
                  'w-8 h-4 rounded-full relative transition-colors',
                  autoPlay ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}
              >
                <motion.div
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
                  animate={{ [isRTL ? 'right' : 'left']: autoPlay ? '16px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.div>
              {labels.autoPlay}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
