'use client'

import { useState, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { t } from '@/lib/i18n'

interface MathCaptchaProps {
  lang: string
  onVerified: () => void
  onError?: () => void
}

/**
 * Simple math-based CAPTCHA to prevent bot registrations.
 * Generates a random arithmetic question (addition/subtraction).
 */
export default function MathCaptcha({ lang, onVerified, onError }: MathCaptchaProps) {
  const [a, setA] = useState(() => Math.floor(Math.random() * 20) + 1)
  const [b, setB] = useState(() => Math.floor(Math.random() * 10) + 1)
  const [op, setOp] = useState<'+' | '-'>(() => Math.random() > 0.5 ? '+' : '-')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const correctAnswer = op === '+' ? a + b : a - b

  const refresh = useCallback(() => {
    setA(Math.floor(Math.random() * 20) + 1)
    setB(Math.floor(Math.random() * 10) + 1)
    setOp(Math.random() > 0.5 ? '+' : '-')
    setAnswer('')
    setError(false)
    setSuccess(false)
    inputRef.current?.focus()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d-]/g, '')
    setAnswer(val)
    setError(false)

    if (val && parseInt(val) === correctAnswer) {
      setSuccess(true)
      onVerified()
    } else if (val.length >= String(correctAnswer).length) {
      setError(true)
      onError?.()
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {t(lang, 'captchaLabel') || 'Vérification anti-robot'}
      </label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/80 border rounded-xl font-mono text-lg font-bold select-none shrink-0">
          <span>{a}</span>
          <span className="text-emerald-600">{op}</span>
          <span>{b}</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-muted-foreground">?</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={answer}
          onChange={handleChange}
          placeholder="..."
          maxLength={3}
          className={`w-20 text-center rounded-xl border font-mono text-lg font-bold focus:outline-none focus:ring-2 transition-colors ${
            success
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 focus:ring-emerald-500/30'
              : error
                ? 'border-red-400 bg-red-50 text-red-600 focus:ring-red-400/30'
                : 'border-border focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
          aria-label={t(lang, 'captchaAriaLabel') || 'CAPTCHA answer'}
        />
        <button
          type="button"
          onClick={refresh}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          aria-label={t(lang, 'captchaRefresh') || 'Refresh CAPTCHA'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {success && (
        <p className="text-xs text-emerald-600 font-medium">✓ {t(lang, 'captchaSuccess') || 'Vérifié'}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium">✗ {t(lang, 'captchaError') || 'Mauvaise réponse, réessayez'}</p>
      )}
    </div>
  )
}
