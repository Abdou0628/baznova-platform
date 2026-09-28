'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { RefreshCw, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Language = 'fr' | 'en' | 'ar' | 'es'

interface SmartCaptchaProps {
  language: Language
  onVerified: (token: string) => void
  onCancel: () => void
}

const labels: Record<Language, { title: string; placeholder: string; verify: string; refresh: string; subtitle: string; error: string; success: string; accessibleLabel: string }> = {
  fr: {
    title: 'Vérification de sécurité',
    placeholder: 'Votre réponse…',
    verify: 'Vérifier',
    refresh: 'Nouveau défi',
    subtitle: 'Résolvez cette opération pour continuer',
    error: 'Réponse incorrecte. Réessayez.',
    success: 'Vérifié avec succès',
    accessibleLabel: 'Défi mathématique CAPTCHA',
  },
  en: {
    title: 'Security Check',
    placeholder: 'Your answer…',
    verify: 'Verify',
    refresh: 'New challenge',
    subtitle: 'Solve this operation to continue',
    error: 'Incorrect answer. Try again.',
    success: 'Verified successfully',
    accessibleLabel: 'CAPTCHA math challenge',
  },
  ar: {
    title: 'التحقق الأمني',
    placeholder: 'إجابتك…',
    verify: 'تحقق',
    refresh: 'تحدي جديد',
    subtitle: 'حل هذه العملية للمتابعة',
    error: 'إجابة خاطئة. حاول مرة أخرى.',
    success: 'تم التحقق بنجاح',
    accessibleLabel: 'تحدي رياضي CAPTCHA',
  },
  es: {
    title: 'Verificación de seguridad',
    placeholder: 'Tu respuesta…',
    verify: 'Verificar',
    refresh: 'Nuevo reto',
    subtitle: 'Resuelve esta operación para continuar',
    error: 'Respuesta incorrecta. Inténtalo de nuevo.',
    success: 'Verificado con éxito',
    accessibleLabel: 'Desafío matemático CAPTCHA',
  },
}

function generateChallenge() {
  const ops = ['+', '-', '×'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1
      b = Math.floor(Math.random() * 50) + 1
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * 50) + 10
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      break
    case '×':
      a = Math.floor(Math.random() * 12) + 2
      b = Math.floor(Math.random() * 12) + 2
      answer = a * b
      break
  }

  return { a, b, op, answer, id: crypto.randomUUID() }
}

function generateToken(answer: number, challengeId: string): string {
  const payload = `${challengeId}:${answer}:${Date.now()}`
  // Simple hash for demo purposes — in production, this would be server-validated
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return `captcha_${Math.abs(hash).toString(36)}_${challengeId}`
}

export function SmartCaptcha({ language, onVerified, onCancel }: SmartCaptchaProps) {
  const [challenge, setChallenge] = useState(() => generateChallenge())
  const [userAnswer, setUserAnswer] = useState('')
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const lbl = labels[language]

  useEffect(() => {
    // Auto-focus the input when a new challenge appears
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [challenge.id])

  const handleRefresh = useCallback(() => {
    setChallenge(generateChallenge())
    setUserAnswer('')
    setError(false)
  }, [])

  const handleVerify = useCallback(() => {
    const parsed = parseInt(userAnswer.trim(), 10)
    if (isNaN(parsed)) {
      setError(true)
      return
    }

    if (parsed === challenge.answer) {
      setVerifying(true)
      // Simulate a brief verification delay for UX
      setTimeout(() => {
        const token = generateToken(challenge.answer, challenge.id)
        setVerified(true)
        onVerified(token)
      }, 400)
    } else {
      setError(true)
      // Auto-refresh after wrong answer
      setTimeout(() => {
        handleRefresh()
      }, 1500)
    }
  }, [userAnswer, challenge, onVerified, handleRefresh])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!verifying && !verified) handleVerify()
    }
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-3 py-6" role="status">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-emerald-700">{lbl.success}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold text-foreground">{lbl.title}</h3>
        <p className="text-xs text-muted-foreground">{lbl.subtitle}</p>
      </div>

      {/* Challenge Card */}
      <div
        className="w-full bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-border rounded-2xl p-5 text-center relative overflow-hidden"
        role="img"
        aria-label={lbl.accessibleLabel}
      >
        {/* Decorative grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px',
        }} />

        <div className="relative">
          <span className="text-3xl sm:text-4xl font-bold tracking-wide text-foreground select-none">
            {challenge.a} {challenge.op} {challenge.b} = ?
          </span>
        </div>
      </div>

      {/* Input + Verify */}
      <div className="w-full flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={userAnswer}
          onChange={(e) => {
            setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ''))
            setError(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder={lbl.placeholder}
          disabled={verifying}
          className={`rounded-xl text-center text-lg font-semibold h-12 border-2 transition-all ${
            error
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400/20'
              : 'border-border focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
          aria-label={lbl.placeholder}
        />
        <Button
          type="button"
          onClick={handleVerify}
          disabled={verifying || !userAnswer.trim()}
          className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer transition-all shrink-0 disabled:opacity-50"
        >
          {verifying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 font-medium animate-in fade-in duration-200">
          {lbl.error}
        </p>
      )}

      {/* Refresh button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={verifying}
        className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {lbl.refresh}
      </button>
    </div>
  )
}

export default SmartCaptcha
