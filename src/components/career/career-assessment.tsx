'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Loader2, Compass, CheckCircle2, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t, type TranslationKey } from '@/lib/i18n'
import { toast } from 'sonner'

type AppStep = 'careerHome' | 'careerAssessment' | 'careerRoadmap' | 'careerSkills'

const TOTAL_QUESTIONS = 12

function getQuestionKey(index: number): TranslationKey {
  return `careerQ${index + 1}` as TranslationKey
}

function getOptionKey(qIndex: number, oIndex: number): TranslationKey {
  return `careerQ${qIndex + 1}O${oIndex + 1}` as TranslationKey
}

export default function CareerAssessment() {
  const { language, setStep, stepData } = useCVStore()
  const { data: session } = useSession()
  const isRTL = language === 'ar'

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)

  const progress = ((currentQ + 1) / TOTAL_QUESTIONS) * 100
  const canGoNext = answers[currentQ] !== undefined
  const isLastQuestion = currentQ === TOTAL_QUESTIONS - 1
  const allAnswered = Object.keys(answers).length === TOTAL_QUESTIONS

  function handleSelect(value: string) {
    setAnswers(prev => ({ ...prev, [currentQ]: parseInt(value) }))
  }

  function goNext() {
    if (isLastQuestion) return
    setCurrentQ(prev => prev + 1)
  }

  function goPrev() {
    if (currentQ > 0) setCurrentQ(prev => prev - 1)
  }

  const handleSubmit = useCallback(async () => {
    if (!allAnswered) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/career/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, language }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      toast.success(t(language, 'careerAssessmentSaved'))
      setStep('careerRoadmap', { assessmentId: data.assessment.id })
    } catch {
      toast.error(t(language, 'careerAssessmentError'))
    } finally {
      setSubmitting(false)
    }
  }, [allAnswered, answers, language, setStep])

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-rose-50/30 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <Button
          variant="ghost" size="sm"
          onClick={() => setStep('careerHome')}
          className={`mb-4 ${isRTL ? 'mr-auto' : 'ml-auto'}`}
        >
          {isRTL ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
          {t(language, 'careerBackToHome')}
        </Button>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t(language, 'careerAssessTitle')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">{t(language, 'careerAssessSubtitle')}</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-muted-foreground">
              {t(language, 'careerQuestion')} {currentQ + 1} {t(language, 'careerOf')} {TOTAL_QUESTIONS}
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Question dots */}
          <div className="flex gap-1.5 mt-3 justify-center">
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentQ
                    ? 'bg-rose-500 scale-125'
                    : answers[i] !== undefined
                      ? 'bg-rose-300'
                      : 'bg-muted-foreground/20'
                }`}
                aria-label={t(language, 'careerQuestion').replace('{n}', String(i + 1))}
              />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -30 : 30 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-rose-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg leading-relaxed">
                  {t(language, getQuestionKey(currentQ))}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[currentQ]?.toString() ?? ''}
                  onValueChange={handleSelect}
                  className="space-y-2"
                >
                  {[0, 1, 2, 3].map((oIdx) => (
                    <Label
                      key={oIdx}
                      htmlFor={`q-${currentQ}-o-${oIdx}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-rose-50/50 ${
                        answers[currentQ] === oIdx
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-muted'
                      }`}
                    >
                      <RadioGroupItem
                        value={oIdx.toString()}
                        id={`q-${currentQ}-o-${oIdx}`}
                      />
                      <span className="text-sm leading-relaxed">
                        {t(language, getOptionKey(currentQ, oIdx))}
                      </span>
                      {answers[currentQ] === oIdx && (
                        <CheckCircle2 className={`w-4 h-4 text-rose-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className={`flex justify-between mt-6 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentQ === 0}
          >
            {isRTL ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
            {t(language, 'previous')}
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              )}
              {submitting ? t(language, 'careerSubmitting') : t(language, 'careerSubmit')}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t(language, 'next')}
              {isRTL ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
