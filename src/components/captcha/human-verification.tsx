'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Shield, Loader2, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

export type VerificationStatus = 'idle' | 'checking' | 'challenge' | 'verified' | 'expired' | 'failed'

interface HumanVerificationProps {
  language: CVLanguage
  onVerified: (token: string) => void
  onStatusChange?: (status: VerificationStatus) => void
  theme?: 'light' | 'dark'
  size?: 'compact' | 'default'
}

// ─── Challenge Types ────────────────────────────────────

interface MathChallenge {
  type: 'math'
  question: string
  answer: number
  options: number[]
}

interface ImageChallenge {
  type: 'image'
  instruction: string
  correctIndex: number
  grid: string[] // emoji representations for sandbox
}

type Challenge = MathChallenge | ImageChallenge

// ─── Challenge Generators ────────────────────────────────

function generateMathChallenge(lang: CVLanguage): MathChallenge {
  const ops = ['+', '-', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 5
      b = Math.floor(Math.random() * 15) + 3
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * 20) + 15
      b = Math.floor(Math.random() * 10) + 3
      answer = a - b
      break
    case '×':
      a = Math.floor(Math.random() * 8) + 2
      b = Math.floor(Math.random() * 8) + 2
      answer = a * b
      break
  }

  const labels: Record<CVLanguage, string> = {
    fr: 'Quelle est la réponse ?',
    en: 'What is the answer?',
    ar: 'ما هو الجواب؟',
    es: '¿Cuál es la respuesta?',
  }

  // Generate wrong options close to the answer
  const options = new Set<number>()
  options.add(answer)
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 5) + 1
    const wrong = Math.random() > 0.5 ? answer + offset : answer - offset
    if (wrong > 0 && wrong !== answer) options.add(wrong)
  }

  return {
    type: 'math',
    question: `${a} ${op} ${b} = ?`,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    instruction: labels[lang],
  }
}

// ─── Token Generation ───────────────────────────────────

function generateToken(challengeAnswer: string, timestamp: number): string {
  const payload = JSON.stringify({
    v: 1,
    ts: timestamp,
    a: challengeAnswer,
    r: Math.random().toString(36).substring(2, 10),
  })
  return btoa(payload)
}

// ─── Main Component ──────────────────────────────────────

export default function HumanVerification({
  language,
  onVerified,
  onStatusChange,
  theme = 'light',
  size = 'default',
}: HumanVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  const clickStartTime = useRef<number>(0)
  const challengeStartTime = useRef<number>(0)
  const tokenRef = useRef<string>('')
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lang = language

  // Clean up expiry timer
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current)
    }
  }, [])

  const updateStatus = useCallback((newStatus: VerificationStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  // Start challenge when checkbox is clicked
  const handleCheckboxClick = useCallback(() => {
    if (status !== 'idle' && status !== 'expired' && status !== 'failed') return
    clickStartTime.current = Date.now()

    updateStatus('checking')

    // Brief delay to simulate verification (prevents instant bot clicks)
    setTimeout(() => {
      const newChallenge = generateMathChallenge(lang)
      setChallenge(newChallenge)
      challengeStartTime.current = Date.now()
      updateStatus('challenge')
    }, 800 + Math.random() * 400)
  }, [status, lang, updateStatus])

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: number) => {
    if (status !== 'challenge' || !challenge || challenge.type !== 'math') return

    setSelectedAnswer(answer)

    // Timing check: if answered too fast (< 1.5s), likely a bot
    const timeTaken = Date.now() - challengeStartTime.current
    if (timeTaken < 1500) {
      setErrorCount((prev) => prev + 1)
      setSelectedAnswer(null)
      if (errorCount + 1 >= 3) {
        updateStatus('failed')
        return
      }
      // Generate new challenge
      setTimeout(() => {
        const newChallenge = generateMathChallenge(lang)
        setChallenge(newChallenge)
        challengeStartTime.current = Date.now()
      }, 300)
      return
    }

    if (answer === challenge.answer) {
      // Correct answer
      const token = generateToken(String(answer), Date.now())
      tokenRef.current = token
      updateStatus('verified')
      onVerified(token)

      // Set expiry timer (5 minutes)
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = setTimeout(() => {
        updateStatus('expired')
        tokenRef.current = ''
      }, 5 * 60 * 1000)
    } else {
      // Wrong answer
      setErrorCount((prev) => prev + 1)
      setSelectedAnswer(null)
      if (errorCount + 1 >= 3) {
        updateStatus('failed')
        return
      }
      // Shake animation handled by AnimatePresence
      setTimeout(() => {
        setSelectedAnswer(null)
        const newChallenge = generateMathChallenge(lang)
        setChallenge(newChallenge)
        challengeStartTime.current = Date.now()
      }, 500)
    }
  }, [status, challenge, errorCount, lang, updateStatus, onVerified])

  // Retry from failed/expired state
  const handleRetry = useCallback(() => {
    setErrorCount(0)
    setSelectedAnswer(null)
    setChallenge(null)
    updateStatus('idle')
  }, [updateStatus])

  const isCompact = size === 'compact'
  const bgClass = theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
  const textClass = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'
  const subtextClass = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'

  return (
    <div className={`relative ${isCompact ? '' : 'w-full max-w-sm mx-auto'}`}>
      {/* Honeypot field - invisible to humans, bots will fill it */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, width: 0, overflow: 'hidden' }}
      >
        <input
          type="text"
          name="hp_website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
          onChange={() => {
            // If honeypot is filled, mark as bot
            if (status !== 'failed') {
              updateStatus('failed')
            }
          }}
        />
      </div>

      {/* Main CAPTCHA Widget */}
      <AnimatePresence mode="wait">
        {/* ─── Idle / Checkbox State ─── */}
        {(status === 'idle' || status === 'expired') && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={handleCheckboxClick}
              className={`
                flex items-center w-full gap-3 px-4 py-3 rounded-xl border-2
                transition-all duration-200 cursor-pointer group
                hover:border-emerald-400 hover:shadow-md
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
                ${bgClass} ${textClass}
                ${status === 'expired' ? 'border-amber-400 bg-amber-50' : 'border-zinc-200'}
              `}
              aria-label={t(lang, 'captchaCheckboxLabel')}
            >
              {/* Checkbox */}
              <div className={`
                flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center
                transition-all duration-200
                ${status === 'expired'
                  ? 'border-amber-400 bg-amber-100'
                  : 'border-zinc-300 group-hover:border-emerald-400'
                }
              `}>
                <Shield className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${status === 'expired' ? 'text-amber-700' : ''}`}>
                  {status === 'expired' ? t(lang, 'captchaExpired') : t(lang, 'captchaCheckbox')}
                </p>
                {status === 'expired' && (
                  <p className="text-xs text-amber-600 mt-0.5">{t(lang, 'captchaExpiredDesc')}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                <svg
                  viewBox="0 0 30 30"
                  className="w-8 h-8"
                  aria-hidden="true"
                >
                  <path
                    d="M15 3L3 27h24L15 3z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="text-emerald-500/20"
                  />
                  <path
                    d="M15 11L7 27h16L15 11z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className="text-emerald-500/40"
                  />
                  <circle
                    cx="15"
                    cy="20"
                    r="2.5"
                    className="text-emerald-500"
                  />
                </svg>
              </div>
            </button>
          </motion.div>
        )}

        {/* ─── Checking State (spinner) ─── */}
        {status === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-emerald-400 ${bgClass}`}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            </div>
            <p className={`text-sm font-medium ${subtextClass}`}>{t(lang, 'captchaVerifying')}</p>
          </motion.div>
        )}

        {/* ─── Challenge State ─── */}
        {status === 'challenge' && challenge && challenge.type === 'math' && (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl border-2 border-emerald-400 overflow-hidden ${bgClass}`}
          >
            {/* Header */}
            <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-400/20">
              <p className="text-sm font-medium text-emerald-700">
                {t(lang, 'captchaChallengeTitle')}
              </p>
            </div>

            {/* Challenge body */}
            <div className="p-4">
              {/* Math question */}
              <div className="text-center mb-4">
                <p className={`text-xs ${subtextClass} mb-1`}>{challenge.instruction}</p>
                <p className={`text-2xl font-bold tracking-wide ${textClass} font-mono`}>
                  {challenge.question}
                </p>
              </div>

              {/* Answer options grid */}
              <div className="grid grid-cols-2 gap-2">
                {challenge.options.map((opt, i) => (
                  <motion.button
                    key={`${opt}-${i}`}
                    type="button"
                    onClick={() => handleAnswerSelect(opt)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      relative px-4 py-3 rounded-lg border-2 font-bold text-lg
                      transition-all duration-150 cursor-pointer
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                      ${selectedAnswer === opt
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : selectedAnswer !== null
                          ? 'border-red-300 bg-red-50 text-red-500'
                          : 'border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-zinc-700'
                      }
                    `}
                    disabled={selectedAnswer !== null}
                    aria-label={`Answer ${opt}`}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>

              {/* Error hint */}
              {errorCount > 0 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  {t(lang, 'captchaRetryHint')}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Verified State ─── */}
        {status === 'verified' && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2
              ${bgClass} border-emerald-500 bg-emerald-50/50
            `}>
              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700">{t(lang, 'captchaVerified')}</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            </div>
          </motion.div>
        )}

        {/* ─── Failed State ─── */}
        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`rounded-xl border-2 border-red-300 ${bgClass} bg-red-50/50 p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700">{t(lang, 'captchaFailed')}</p>
              </div>
              <p className={`text-xs ${subtextClass} mb-3`}>{t(lang, 'captchaFailedDesc')}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {t(lang, 'captchaRetry')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
