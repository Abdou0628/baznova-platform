'use client'

import { useState, useRef, useMemo } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Mail, RefreshCw, Eye, EyeOff, UserCheck, Lock, AtSign, AlertTriangle, ImageIcon, MoveHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import ImageCaptcha from '@/components/auth/image-captcha'
import SliderVerification from '@/components/auth/slider-verification'

type Mode = 'login' | 'register' | 'register-verify' | 'forgot-email' | 'forgot-code' | 'forgot-new-password' | 'forgot-success'
type RegisterStep = 1 | 2 | 3

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode: Mode
  onAuthSuccess?: () => void
}

// Password strength calculation
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return { score: 1, label: 'passwordStrengthWeak', color: 'bg-red-500' }
  if (score <= 2) return { score: 2, label: 'passwordStrengthFair', color: 'bg-orange-500' }
  if (score <= 3) return { score: 3, label: 'passwordStrengthGood', color: 'bg-yellow-500' }
  return { score: 4, label: 'passwordStrengthStrong', color: 'bg-emerald-500' }
}

// Password strength meter component
function PasswordStrengthMeter({ password, lang }: { password: string; lang: string }) {
  const strength = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              level <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        strength.score <= 1 ? 'text-red-500' :
        strength.score <= 2 ? 'text-orange-500' :
        strength.score <= 3 ? 'text-yellow-600' : 'text-emerald-600'
      }`}>
        {t(lang, 'passwordStrengthLabel')} : {t(lang, strength.label)}
      </p>
    </div>
  )
}

function getPasswordReqs(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  }
}

function PasswordRequirements({ password, lang }: { password: string; lang: string }) {
  const reqs = getPasswordReqs(password)
  const items = [
    { key: 'regReqMinLength' as const, met: reqs.minLength },
    { key: 'regReqUpper' as const, met: reqs.hasUpper },
    { key: 'regReqLower' as const, met: reqs.hasLower },
    { key: 'regReqNumber' as const, met: reqs.hasNumber },
    { key: 'regReqSpecial' as const, met: reqs.hasSpecial },
  ]
  if (!password) return null
  return (
    <div className="space-y-1.5 p-3 bg-muted/50 rounded-xl border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {t(lang, 'regRequirements')}
      </p>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-xs">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            item.met ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            {item.met && <CheckCircle2 className="w-3 h-3" />}
          </div>
          <span className={item.met ? 'text-emerald-700' : 'text-muted-foreground'}>
            {t(lang, item.key)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Password input with eye toggle
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  minLength,
  lang,
  className,
  required,
}: {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  minLength?: number
  lang: string
  className?: string
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        className={`rounded-xl border-border focus:border-emerald-500 focus:ring-emerald-500/20 pr-10 ${className || ''}`}
        placeholder={placeholder}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        tabIndex={-1}
        aria-label={show ? t(lang, 'hidePassword') : t(lang, 'showPassword')}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// 6-digit code input component
function CodeInput({ length = 6, onComplete }: { length?: number; onComplete: (code: string) => void }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newValues = [...values]
    newValues[index] = digit
    setValues(newValues)

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newValues.every((v) => v !== '')) {
      onComplete(newValues.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted.length === length) {
      const newValues = pasted.split('')
      setValues(newValues)
      inputRefs.current[length - 1]?.focus()
      onComplete(pasted)
    }
  }

  return (
    <div className="flex justify-center gap-2 my-2" onPaste={handlePaste}>
      {values.map((value, i) => (
        <Input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-border focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
        />
      ))}
    </div>
  )
}

// Step indicator for registration
function RegisterStepIndicator({ currentStep, lang }: { currentStep: RegisterStep; lang: string }) {
  const steps = [
    { num: 1, label: lang === 'ar' ? 'البيانات' : lang === 'en' ? 'Info' : lang === 'es' ? 'Datos' : 'Informations', icon: UserCheck },
    { num: 2, label: lang === 'ar' ? 'صور' : lang === 'en' ? 'Images' : lang === 'es' ? 'Imágenes' : 'Images', icon: ImageIcon },
    { num: 3, label: lang === 'ar' ? 'تحقق' : lang === 'en' ? 'Verify' : lang === 'es' ? 'Verificar' : 'Vérification', icon: MoveHorizontal },
  ]

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step.num
        const isCurrent = currentStep === step.num
        const Icon = step.icon
        return (
          <div key={step.num} className="flex items-center gap-1 sm:gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-700'
                : isCurrent
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.num}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-4 sm:w-8 h-0.5 rounded-full transition-colors ${
                isCompleted ? 'bg-emerald-400' : 'bg-border'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AuthModal({ isOpen, onClose, initialMode, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetUserName, setResetUserName] = useState<string | null>(null)
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [verifyResendLoading, setVerifyResendLoading] = useState(false)
  const [imageCaptchaVerified, setImageCaptchaVerified] = useState(false)
  const [sliderVerified, setSliderVerified] = useState(false)
  const [imageCaptchaKey, setImageCaptchaKey] = useState(0)
  const [sliderKey, setSliderKey] = useState(0)

  const { language } = useCVStore()
  const lang = language
  const router = useRouter()

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot-email' || mode === 'forgot-code' || mode === 'forgot-new-password' || mode === 'forgot-success'
  const isRegisterVerify = mode === 'register-verify'

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setRegConfirmPassword('')
    setResetEmail('')
    setResetCode('')
    setNewPassword('')
    setConfirmPassword('')
    setResetUserName(null)
    setCodeExpiresIn(0)
    setLoading(false)
    setRegisterStep(1)
    setTermsAccepted(false)
    setHoneypot('')
    setImageCaptchaVerified(false)
    setSliderVerified(false)
    setImageCaptchaKey(k => k + 1)
    setSliderKey(k => k + 1)
  }

  const handleClose = () => {
    resetForm()
    setMode(initialMode)
    onClose()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error(t(lang, 'loginError'))
      } else {
        toast.success(t(lang, 'loginSuccess'))
        handleClose()
        onAuthSuccess?.()
        router.refresh()
        window.dispatchEvent(new Event('focus'))
        setTimeout(() => {
          const avatarBtn = document.querySelector('[aria-label="Menu du profil"]')
          if (!avatarBtn) {
            window.location.reload()
          }
        }, 800)
      }
    } catch {
      toast.error(t(lang, 'loginError'))
    } finally {
      setLoading(false)
    }
  }

  // Validate step 1 form
  const isStep1Valid = name.trim().length >= 2 && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 8 && password === regConfirmPassword && termsAccepted && !honeypot

  // Move to step 2
  const goToStep2 = () => {
    if (!isStep1Valid) return
    setRegisterStep(2)
    setImageCaptchaKey(k => k + 1)
    setImageCaptchaVerified(false)
  }

  // Move to step 3 (after image captcha verified)
  const goToStep3 = () => {
    if (!imageCaptchaVerified) return
    setRegisterStep(3)
    setSliderKey(k => k + 1)
    setSliderVerified(false)
  }

  // Final submit after all verifications
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageCaptchaVerified || !sliderVerified) return
    if (honeypot) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, language: lang }),
      })
      if (res.ok) {
        toast.success(t(lang, 'registerVerifyEmail') || 'Vérifiez votre email', { duration: 6000, description: t(lang, 'registerVerifyEmailDesc') })
        setRegisteredEmail(email)
        setMode('register-verify')
        return
      } else {
        toast.error(t(lang, 'registerError') || "Erreur d'inscription")
      }
    } catch {
      toast.error(t(lang, 'registerError') || "Erreur d'inscription")
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Send code (forgot password)
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setCodeExpiresIn(data.expiresIn)
        setMode('forgot-code')
        if (data.code) {
          toast.success(`${t(lang, 'codeSentTo')} ${resetEmail}`, { duration: 8000, description: `${t(lang, 'codeSentDevNote')} : ${data.code}` })
        }
      } else if (data.code === 'USER_NOT_FOUND') {
        toast.error(t(lang, 'forgotPasswordNoAccount'))
      } else {
        toast.error(data.error || t(lang, 'forgotPasswordError'))
      }
    } catch {
      toast.error(t(lang, 'forgotPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify code (forgot password)
  const handleVerifyCode = async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code }),
      })
      const data = await res.json()
      if (data.success) {
        setResetUserName(data.name)
        setResetCode(code)
        setMode('forgot-new-password')
      } else if (data.code === 'WRONG_CODE') {
        toast.error(t(lang, 'codeWrong'))
      } else if (data.code === 'CODE_EXPIRED') {
        toast.error(t(lang, 'codeExpired'))
        setMode('forgot-email')
      } else if (data.code === 'NO_CODE') {
        toast.error(t(lang, 'codeNoCode'))
        setMode('forgot-email')
      } else {
        toast.error(data.error || t(lang, 'forgotPasswordError'))
      }
    } catch {
      toast.error(t(lang, 'forgotPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      toast.error(t(lang, 'codePasswordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t(lang, 'forgotPasswordNewPasswordPh'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword, code: resetCode }),
      })
      const data = await res.json()
      if (data.success) {
        setMode('forgot-success')
      } else {
        toast.error(data.error || t(lang, 'forgotPasswordError'))
      }
    } catch {
      toast.error(t(lang, 'forgotPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  const goToForgotPassword = () => {
    resetForm()
    setMode('forgot-email')
  }

  const goToLogin = () => {
    resetForm()
    setMode('login')
  }

  const resendCode = async () => {
    if (!resetEmail) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setCodeExpiresIn(data.expiresIn)
        toast.success(t(lang, 'codeResent'), { description: data.code ? `${t(lang, 'codeSentDevNote')} : ${data.code}` : undefined })
      } else {
        toast.error(data.error || t(lang, 'forgotPasswordError'))
      }
    } catch {
      toast.error(t(lang, 'forgotPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setVerifyResendLoading(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, language: lang }),
      })
      if (res.ok) {
        toast.success(t(lang, 'verifyBannerResend') || 'Email renvoyé')
      }
    } catch { /* silent */ }
    setVerifyResendLoading(false)
  }

  const toggleMode = () => {
    resetForm()
    setMode((m) => (m === 'login' ? 'register' : 'login'))
  }

  // Header content
  const headerTitle = isForgot
    ? mode === 'forgot-email'
      ? t(lang, 'forgotPasswordTitle')
      : mode === 'forgot-code'
        ? t(lang, 'codeEnterTitle')
        : mode === 'forgot-new-password'
          ? t(lang, 'forgotPasswordVerify')
          : t(lang, 'forgotPasswordSuccess')
    : isRegister
      ? t(lang, 'registerTitle')
      : t(lang, 'loginTitle')

  const headerDesc = isForgot
    ? mode === 'forgot-email'
      ? t(lang, 'forgotPasswordDesc')
      : mode === 'forgot-code'
        ? t(lang, 'codeEnterDesc')
        : mode === 'forgot-new-password'
          ? t(lang, 'forgotPasswordVerifyDesc')
          : ''
    : isRegister
      ? t(lang, 'registerTitle')
      : t(lang, 'loginEmail')

  const headerIcon = isForgot
    ? mode === 'forgot-success'
      ? <CheckCircle2 className="w-6 h-6 text-white" />
      : mode === 'forgot-code'
        ? <Mail className="w-6 h-6 text-white" />
        : <KeyRound className="w-6 h-6 text-white" />
    : isRegister
      ? <UserCheck className="w-6 h-6 text-white" />
      : <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
        </svg>

  // Password match indicator for registration
  const regPasswordsMatch = regConfirmPassword.length > 0 && password === regConfirmPassword
  const regPasswordsNoMatch = regConfirmPassword.length > 0 && password !== regConfirmPassword

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className={!isLogin ? "sm:max-w-xl md:max-w-2xl rounded-2xl p-0 overflow-hidden" : "sm:max-w-md rounded-2xl p-0 overflow-hidden"}>
        <div className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            {headerIcon}
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {headerTitle}
            </DialogTitle>
            {headerDesc && (
              <DialogDescription className="text-emerald-100 text-sm">
                {headerDesc}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* REGISTER - EMAIL VERIFICATION STEP */}
        {isRegisterVerify && (
          <div className="p-6 space-y-5">
            <div className="text-center py-2">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-foreground font-semibold text-base mb-1">
                {t(lang, 'registerVerifyEmail')}
              </p>
              <p className="text-muted-foreground text-sm mb-3">
                {t(lang, 'registerVerifyEmailDesc')}
              </p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
                <AtSign className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">{registeredEmail}</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{t(lang, 'registerVerifyWarning')}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleResendVerification}
                disabled={verifyResendLoading}
                variant="outline"
                className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all"
              >
                {verifyResendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t(lang, 'verifyBannerResend')}
              </Button>
              <Button
                onClick={() => { handleClose(); onAuthSuccess?.() }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all"
              >
                {t(lang, 'registerVerifyContinue')}
              </Button>
            </div>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={goToLogin}
                className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                {t(lang, 'forgotPasswordBackToLogin')}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD - Step 1: Enter email */}
        {mode === 'forgot-email' && (
          <form onSubmit={handleSendCode} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
                {t(lang, 'forgotPasswordEmail')}
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="rounded-xl border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder={t(lang, 'forgotPasswordEmailPh')}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 text-base font-semibold cursor-pointer transition-all"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(lang, 'codeSendBtn')}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t(lang, 'forgotPasswordBackToLogin')}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD - Step 2: Enter code */}
        {mode === 'forgot-code' && (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t(lang, 'codeSentTo')}</p>
              <p className="text-sm font-semibold text-foreground">{resetEmail}</p>
            </div>

            <CodeInput onComplete={(code) => !loading && handleVerifyCode(code)} />

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t(lang, 'codeVerifying')}
              </div>
            )}

            {codeExpiresIn > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {t(lang, 'codeExpiresIn')} {codeExpiresIn} min
              </p>
            )}

            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="w-full text-sm text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? '' : ''}`} />
              {t(lang, 'codeResend')}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('forgot-email')}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t(lang, 'codeChangeEmail')}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD - Step 3: New password */}
        {mode === 'forgot-new-password' && (
          <form onSubmit={handleResetPassword} className="p-6 space-y-4">
            {resetUserName && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{t(lang, 'forgotPasswordUserFound')} :</span>
                <span className="font-semibold">{resetUserName}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                {t(lang, 'forgotPasswordNewPassword')}
              </Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                lang={lang}
                placeholder={t(lang, 'forgotPasswordNewPasswordPh')}
                minLength={8}
              />
              <PasswordStrengthMeter password={newPassword} lang={lang} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                {t(lang, 'forgotPasswordConfirm')}
              </Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                lang={lang}
                placeholder={t(lang, 'forgotPasswordNewPasswordPh')}
                minLength={8}
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 font-medium">{t(lang, 'passwordsNoMatch')}</p>
              )}
              {confirmPassword.length > 0 && newPassword === confirmPassword && (
                <p className="text-xs text-emerald-600 font-medium">{t(lang, 'passwordsMatch')}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 text-base font-semibold cursor-pointer transition-all"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(lang, 'forgotPasswordButton')}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t(lang, 'forgotPasswordBackToLogin')}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD - Step 4: Success */}
        {mode === 'forgot-success' && (
          <div className="p-6 space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-foreground font-medium text-lg mb-2">
                {t(lang, 'forgotPasswordSuccess')}
              </p>
              <p className="text-muted-foreground text-sm">
                {t(lang, 'codeSuccessDesc')}
              </p>
            </div>
            <Button
              onClick={goToLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 text-base font-semibold cursor-pointer transition-all"
            >
              {t(lang, 'forgotPasswordBackToLogin')}
            </Button>
          </div>
        )}

        {/* ============= REGISTER - MULTI-STEP WIZARD ============= */}
        {isRegister && (
          <div className="p-6 space-y-5">
            {/* Step indicator */}
            <RegisterStepIndicator currentStep={registerStep} lang={lang} />

            {/* Security badge */}
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{t(lang, 'regSecurityBadge')}</span>
            </div>

            {/* ====== STEP 1: Form ====== */}
            {registerStep === 1 && (
              <div className="space-y-4">
                {/* Name + Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auth-name" className="text-sm font-medium text-foreground">
                      <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
                      {t(lang, 'loginName')}
                    </Label>
                    <Input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="rounded-xl border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                      placeholder={t(lang, 'loginName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-email" className="text-sm font-medium text-foreground">
                      {t(lang, 'loginEmail')}
                    </Label>
                    <Input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="rounded-xl border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                {/* Password + Confirm password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auth-password" className="text-sm font-medium text-foreground">
                      <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                      {t(lang, 'loginPassword')}
                    </Label>
                    <PasswordInput
                      id="auth-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      lang={lang}
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <PasswordStrengthMeter password={password} lang={lang} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password" className="text-sm font-medium text-foreground">
                      {t(lang, 'confirmPasswordLabel')}
                    </Label>
                    <PasswordInput
                      id="reg-confirm-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      lang={lang}
                      placeholder={t(lang, 'confirmPasswordPh')}
                      minLength={8}
                    />
                    {regPasswordsMatch && (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t(lang, 'passwordsMatch')}
                      </p>
                    )}
                    {regPasswordsNoMatch && (
                      <p className="text-xs text-red-500 font-medium">{t(lang, 'passwordsNoMatch')}</p>
                    )}
                  </div>
                </div>

                {/* Password requirements */}
                <PasswordRequirements password={password} lang={lang} />

                {/* Honeypot — hidden from real users */}
                <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border">
                  <input
                    type="checkbox"
                    id="terms-accept"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    required
                  />
                  <label htmlFor="terms-accept" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    {t(lang, 'regTermsAccept')}
                  </label>
                </div>

                {/* Step 1 navigation */}
                <Button
                  type="button"
                  onClick={goToStep2}
                  disabled={!isStep1Valid}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 text-base font-semibold cursor-pointer transition-all"
                >
                  {t(lang, 'registerNextStep') || (lang === 'ar' ? 'التالي' : lang === 'en' ? 'Next' : lang === 'es' ? 'Siguiente' : 'Suivant')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ====== STEP 2: Image CAPTCHA ====== */}
            {registerStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {lang === 'ar' ? 'الخطوة 2: تحقق من الصور' : lang === 'en' ? 'Step 2: Image verification' : lang === 'es' ? 'Paso 2: Verificación de imágenes' : 'Étape 2 : Vérification par images'}
                  </h3>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t(lang, 'forgotPasswordBackToLogin')}
                  </button>
                </div>

                <ImageCaptcha
                  key={imageCaptchaKey}
                  lang={lang}
                  onVerified={() => setImageCaptchaVerified(true)}
                  onError={() => setImageCaptchaVerified(false)}
                />

                {/* Step 2 navigation */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisterStep(1)}
                    className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl py-4 text-sm font-semibold cursor-pointer transition-all"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    {t(lang, 'previous') || 'Précédent'}
                  </Button>
                  <Button
                    type="button"
                    onClick={goToStep3}
                    disabled={!imageCaptchaVerified}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 text-sm font-semibold cursor-pointer transition-all"
                  >
                    {t(lang, 'registerNextStep') || (lang === 'ar' ? 'التالي' : lang === 'en' ? 'Next' : lang === 'es' ? 'Siguiente' : 'Suivant')}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ====== STEP 3: Slider Verification ====== */}
            {registerStep === 3 && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {lang === 'ar' ? 'الخطوة 3: تحقق بالسحب' : lang === 'en' ? 'Step 3: Slider verification' : lang === 'es' ? 'Paso 3: Verificación deslizando' : 'Étape 3 : Vérification par glissement'}
                  </h3>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t(lang, 'forgotPasswordBackToLogin')}
                  </button>
                </div>

                <SliderVerification
                  key={sliderKey}
                  lang={lang}
                  onVerified={() => setSliderVerified(true)}
                  onError={() => setSliderVerified(false)}
                />

                {/* Step 3 navigation */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisterStep(2)}
                    className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl py-4 text-sm font-semibold cursor-pointer transition-all"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    {t(lang, 'previous') || 'Précédent'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !sliderVerified}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 text-sm font-semibold cursor-pointer transition-all"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t(lang, 'registerButton')}
                  </Button>
                </div>
              </form>
            )}

            {/* Bottom toggle */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {isRegister ? t(lang, 'registerHasAccount') : t(lang, 'loginNoAccount')}
                <span className="ml-1 font-semibold text-emerald-600">
                  {isRegister ? t(lang, 'loginButton') : t(lang, 'registerButton')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ============= LOGIN ============= */}
        {isLogin && (
          <form
            onSubmit={handleLogin}
            className="p-6 space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-sm font-medium text-foreground">
                {t(lang, 'loginEmail')}
              </Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-sm font-medium text-foreground">
                <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                {t(lang, 'loginPassword')}
              </Label>
              <PasswordInput
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                lang={lang}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 text-base font-semibold cursor-pointer transition-all"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(lang, 'loginButton')}
            </Button>

            <div className="text-center pt-2 space-y-1">
              <button
                type="button"
                onClick={goToForgotPassword}
                className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {t(lang, 'forgotPasswordButton')}
              </button>
              <div>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {t(lang, 'loginNoAccount')}
                  <span className="ml-1 font-semibold text-emerald-600">
                    {t(lang, 'registerButton')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
