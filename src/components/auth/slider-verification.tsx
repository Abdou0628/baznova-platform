'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ArrowRight, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { t } from '@/lib/i18n'

interface SliderVerificationProps {
  lang: string
  onVerified: () => void
  onError?: () => void
}

export default function SliderVerification({ lang, onVerified, onError }: SliderVerificationProps) {
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(false)
  const [targetPos] = useState(() => Math.floor(Math.random() * 50) + 25)

  const trackRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const trackWidthRef = useRef(0)

  const threshold = 8

  const handleStart = useCallback((clientX: number) => {
    if (verified || error) return
    setIsDragging(true)
    const trackWidth = trackRef.current?.offsetWidth || 1
    trackWidthRef.current = trackWidth
    startXRef.current = clientX - (sliderPosition / 100) * trackWidth
    setError(false)
  }, [verified, error, sliderPosition])

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !trackWidthRef.current) return
    const trackWidth = trackWidthRef.current
    const newLeft = clientX - startXRef.current
    const percentage = Math.min(Math.max((newLeft / trackWidth) * 100, 0), 100)
    setSliderPosition(percentage)
  }, [isDragging])

  const handleEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    if (Math.abs(sliderPosition - targetPos) <= threshold) {
      setVerified(true)
      setSliderPosition(targetPos)
      onVerified()
    } else if (sliderPosition > targetPos + threshold) {
      setError(true)
      onError?.()
      setTimeout(() => {
        setSliderPosition(0)
        setError(false)
      }, 800)
    }
  }, [isDragging, sliderPosition, targetPos, threshold, onVerified, onError])

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX)
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX)

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const onMouseUp = () => handleEnd()
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)
    const onTouchEnd = () => handleEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging, handleMove, handleEnd])

  const instruction = t(lang as 'fr' | 'en' | 'ar' | 'es', 'lot3_sliderVerification_instruction')

  const successMsg = t(lang as 'fr' | 'en' | 'ar' | 'es', 'lot3_sliderVerification_success')

  const errorMsg = t(lang as 'fr' | 'en' | 'ar' | 'es', 'lot3_sliderVerification_error')

  const thumbStyle: React.CSSProperties = {
    left: `calc(${sliderPosition}% - 22px)`,
  }

  const targetStyle: React.CSSProperties = {
    left: `${targetPos}%`,
    opacity: verified ? 0 : 0.6,
  }

  const puzzleStyle: React.CSSProperties = {
    left: `calc(${targetPos}% - 20px)`,
    opacity: verified ? 0 : 1,
  }

  const dotBgStyle: React.CSSProperties = {
    backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
    backgroundSize: '12px 12px',
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        {instruction}
      </label>

      <div
        ref={trackRef}
        className={
          'relative w-full h-12 rounded-xl overflow-hidden select-none transition-colors ' +
          (verified
            ? 'bg-emerald-100 border-2 border-emerald-300'
            : error
              ? 'bg-red-50 border-2 border-red-300'
              : 'bg-gradient-to-r from-emerald-100 via-teal-50 to-cyan-100 border-2 border-border')
        }
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="absolute inset-0 opacity-20" style={dotBgStyle} />

        <div
          className="absolute top-0 bottom-0 w-1 bg-emerald-500/40 rounded-full transition-opacity"
          style={targetStyle}
        />

        <div
          className="absolute top-1 bottom-1 w-10 rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-200/30 flex items-center justify-center transition-opacity"
          style={puzzleStyle}
        >
          <div className="w-6 h-6 rounded bg-emerald-400/20 border border-emerald-400/30" />
        </div>

        <div
          className={
            'absolute top-0.5 bottom-0.5 w-11 rounded-lg flex items-center justify-center shadow-md transition-colors z-10 ' +
            (verified
              ? 'bg-emerald-500'
              : error
                ? 'bg-red-400'
                : isDragging
                  ? 'bg-emerald-600'
                  : 'bg-white border-2 border-emerald-300 hover:border-emerald-400') +
            ' cursor-grab active:cursor-grabbing'
          }
          style={thumbStyle}
        >
          {verified ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : error ? (
            <XCircle className="w-5 h-5 text-white" />
          ) : (
            <ArrowRight className={
              'w-5 h-5 transition-colors ' +
              (isDragging ? 'text-white' : 'text-emerald-500')
            } />
          )}
        </div>

        {verified && (
          <div className="absolute inset-0 bg-emerald-400/20" />
        )}
      </div>

      {!verified && sliderPosition > 0 && sliderPosition < 50 && (
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(sliderPosition)}%
        </p>
      )}

      {verified && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
          <XCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}
