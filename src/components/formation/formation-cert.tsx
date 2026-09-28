'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Award, ChevronLeft, Download, Loader2, Trophy,
  CheckCircle, XCircle, RotateCcw, BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface Certification {
  id: string
  courseId: string
  courseTitle: string
  score: number
  certId: string
  issuedAt: string
}

interface ExamQuestion {
  question: string
  options: { A: string; B: string; C: string; D: string }
  answer: string
}

interface ExamResult {
  score: number
  passed: boolean
  correct: number
  total: number
  certification: Certification | null
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

export default function FormationCert() {
  const { language, setStep, stepData, setStepData } = useCVStore()
  const isRTL = language === 'ar'
  const { data: session } = useSession()

  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)

  // Exam state
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [examActive, setExamActive] = useState(false)
  const [examLoading, setExamLoading] = useState(false)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Which course to take exam for
  const examCourseId = (stepData?.courseId as string) || ''
  const examCourseTitle = (stepData?.courseTitle as string) || t(language, 'formationGeneralKnowledge')

  function navigateTo(step: 'formationHome' | 'formationCourse', data?: Record<string, unknown>) {
    if (data) setStepData(data)
    setStep(step)
  }

  const fetchCertifications = useCallback(async () => {
    try {
      const res = await fetch('/api/formation/certification')
      if (res.ok) {
        const data = await res.json()
        setCertifications(data.certifications || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCertifications()
  }, [fetchCertifications])

  const startExam = async () => {
    setExamLoading(true)
    try {
      const res = await fetch('/api/formation/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', courseId: examCourseId, courseTitle: examCourseTitle, language }),
      })
      if (res.ok) {
        const data = await res.json()
        setExamQuestions(data.exam?.questions || [])
        setUserAnswers({})
        setExamResult(null)
        setExamActive(true)
      }
    } catch {
      toast.error(t(language, 'formationFailedGenerateExam'))
    } finally {
      setExamLoading(false)
    }
  }

  const submitExam = async () => {
    setSubmitting(true)
    try {
      const answers = examQuestions.map((q, i) => ({
        questionIndex: i,
        userAnswer: userAnswers[i] || '',
        correctAnswer: q.answer,
      }))

      const res = await fetch('/api/formation/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', courseId: examCourseId, answers, language }),
      })
      if (res.ok) {
        const data = await res.json()
        setExamResult(data)
        setExamActive(false)
        if (data.passed) {
          toast.success(t(language, 'formationPassed'))
          fetchCertifications()
        } else {
          toast.error(t(language, 'formationFailed'))
        }
      }
    } catch {
      toast.error(t(language, 'formationFailedSubmitExam'))
    } finally {
      setSubmitting(false)
    }
  }

  const downloadCert = (cert: Certification) => {
    const dateStr = new Date(cert.issuedAt).toLocaleDateString(isRTL ? 'ar-MA' : language === 'es' ? 'es-ES' : language === 'en' ? 'en-US' : 'fr-FR')
    const html = `<!DOCTYPE html>
<html lang="${language}">
<head><meta charset="UTF-8"><title>${cert.certId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
  .cert { width: 800px; max-width: 100%; background: white; border: 3px solid #0d9488; border-radius: 16px; padding: 48px; text-align: center; position: relative; }
  .cert::before { content: ''; position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; border: 1px solid #99f6e4; border-radius: 8px; pointer-events: none; }
  .logo { font-size: 28px; font-weight: 800; color: #0d9488; margin-bottom: 8px; }
  .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 32px; }
  .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px; }
  .course { font-size: 18px; color: #0d9488; font-weight: 600; margin-bottom: 24px; }
  .name { font-size: 20px; font-weight: 600; color: #374151; margin-bottom: 16px; }
  .score { font-size: 16px; color: #6b7280; margin-bottom: 16px; }
  .date { font-size: 14px; color: #9ca3af; margin-bottom: 24px; }
  .cert-id { font-size: 12px; color: #9ca3af; font-family: monospace; }
  .divider { width: 60px; height: 3px; background: #0d9488; margin: 16px auto; border-radius: 2px; }
</style></head>
<body>
  <div class="cert">
    <div class="logo">HireNova</div>
    <div class="subtitle">E-Society 2050</div>
    <div class="divider"></div>
    <div class="title">${t(language, 'formationCertOfAchievement')}</div>
    <div class="course">${cert.courseTitle}</div>
    <div class="divider"></div>
    <div class="name">${session?.user?.name || t(language, 'formationLearner')}</div>
    <div class="score">${cert.score}/100</div>
    <div class="date">${dateStr}</div>
    <div class="cert-id">${cert.certId}</div>
  </div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `HireNova-Cert-${cert.certId}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('formationHome')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t(language, 'previous')}
          </button>
          <h1 className="text-lg font-semibold text-amber-700">{t(language, 'formationCertTitle')}</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-gray-900">{t(language, 'formationCertTitle')}</h2>
          <p className="text-muted-foreground mt-1">{t(language, 'formationCertSubtitle')}</p>
        </motion.div>

        <Tabs defaultValue="certs">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="certs">{t(language, 'formationMyCertifications')}</TabsTrigger>
            <TabsTrigger value="exam">{t(language, 'formationExamTitle')}</TabsTrigger>
          </TabsList>

          {/* Certifications Tab */}
          <TabsContent value="certs" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>
            ) : certifications.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t(language, 'formationNoCertifications')}</p>
                  <Button className="mt-4 bg-amber-600 hover:bg-amber-700" onClick={() => setStep('formationCatalog')}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t(language, 'formationExploreCatalog')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {certifications.map((cert, i) => (
                  <motion.div key={cert.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-amber-100 flex-shrink-0">
                            <Trophy className="w-8 h-8 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900">{cert.courseTitle}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <Badge className={cert.score >= 90 ? 'bg-emerald-100 text-emerald-700' : cert.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
                                {cert.score}/100
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {t(language, 'formationCertNumber')}: <span className="font-mono">{cert.certId}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t(language, 'formationIssuedOn')}: {new Date(cert.issuedAt).toLocaleDateString(isRTL ? 'ar-MA' : language === 'es' ? 'es-ES' : language === 'en' ? 'en-US' : 'fr-FR')}
                            </p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => downloadCert(cert)}>
                              <Download className="w-4 h-4 mr-2" />
                              {t(language, 'formationDownloadCert')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Exam Tab */}
          <TabsContent value="exam" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {/* Before exam */}
                {!examActive && !examResult && (
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-xl bg-amber-50 inline-block">
                      <Award className="w-12 h-12 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t(language, 'formationExamTitle')}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{t(language, 'formationPassingScore')}</p>
                    <p className="text-sm text-muted-foreground">{examCourseTitle}</p>
                    <Button className="bg-amber-600 hover:bg-amber-700" onClick={startExam} disabled={examLoading}>
                      {examLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {t(language, 'formationStartExam')}
                    </Button>
                  </div>
                )}

                {/* Active exam */}
                {examActive && examQuestions.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{t(language, 'formationExamTitle')}</h3>
                      <Badge variant="outline">{Object.keys(userAnswers).length}/{examQuestions.length}</Badge>
                    </div>

                    {examQuestions.map((q, i) => (
                      <Card key={i} className="border border-gray-200">
                        <CardContent className="p-4">
                          <p className="font-medium text-sm text-gray-900 mb-3">{i + 1}. {q.question}</p>
                          <div className="grid gap-2">
                            {['A', 'B', 'C', 'D'].map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setUserAnswers({ ...userAnswers, [i]: opt })}
                                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                                  userAnswers[i] === opt
                                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-medium'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="font-medium mr-2">{opt}.</span> {q.options[opt as keyof typeof q.options]}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      onClick={submitExam}
                      disabled={Object.keys(userAnswers).length < examQuestions.length || submitting}
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {t(language, 'formationSubmitExam')}
                    </Button>
                  </div>
                )}

                {/* Exam Result */}
                {examResult && (
                  <div className="text-center space-y-6">
                    <div className={`p-6 rounded-2xl ${examResult.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {examResult.passed ? (
                        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                      )}
                      <h3 className={`text-xl font-bold mt-4 ${examResult.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                        {t(language, 'formationExamComplete')}
                      </h3>
                      <p className={`text-lg font-semibold mt-2 ${examResult.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t(language, 'formationYourScore')}: {examResult.score}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {examResult.correct}/{examResult.total} {t(language, 'formationCorrectAnswers')}
                      </p>
                    </div>

                    <div className="flex justify-center gap-4">
                      {examResult.passed && examResult.certification ? (
                        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => downloadCert(examResult.certification!)}>
                          <Download className="w-4 h-4 mr-2" />
                          {t(language, 'formationDownloadCert')}
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={startExam}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {t(language, 'formationRetakeExam')}
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => navigateTo('formationCatalog')}>
                        {t(language, 'formationBackToCatalog')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="pb-8" />
      </main>
    </div>
  )
}
