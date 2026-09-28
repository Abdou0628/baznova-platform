'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, ChevronLeft, Play, FileText, HelpCircle,
  CheckCircle, Circle, Clock, Loader2, GraduationCap,
  ArrowRight, Sparkles, Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface Module {
  title: string
  type: 'video' | 'text' | 'quiz'
  content: string
}

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  duration: number
  language: string
  rating: number
  enrollCount: number
  featured: boolean
  modules: string
}

interface Enrollment {
  id: string
  progress: number
  completed: boolean
}

const MODULE_ICONS: Record<string, typeof Play> = {
  video: Play,
  text: FileText,
  quiz: HelpCircle,
}

const MODULE_COLORS: Record<string, string> = {
  video: 'text-red-500 bg-red-50',
  text: 'text-blue-500 bg-blue-50',
  quiz: 'text-amber-500 bg-amber-50',
}

export default function FormationCourse() {
  const { language, setStep, stepData, setStepData } = useCVStore()
  const isRTL = language === 'ar'
  const { data: session } = useSession()
  const courseId = (stepData?.courseId as string) || ''

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [activeModule, setActiveModule] = useState(0)
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [recommendation, setRecommendation] = useState<string>('')
  const [loadingRec, setLoadingRec] = useState(false)

  function navigateTo(step: 'formationHome' | 'formationCatalog' | 'formationCert', data?: Record<string, unknown>) {
    if (data) setStepData(data)
    setStep(step)
  }

  const fetchCourse = useCallback(async () => {
    if (!courseId) return
    try {
      const res = await fetch(`/api/formation/courses?search=${encodeURIComponent(courseId)}`)
      if (res.ok) {
        const data = await res.json()
        const c = (data.courses || []).find((c: Course) => c.id === courseId)
        if (c) {
          setCourse(c)
          try {
            setModules(JSON.parse(c.modules || '[]'))
          } catch {
            setModules([])
          }
        }
      }
    } catch {
      // silent
    }
  }, [courseId])

  const fetchEnrollment = useCallback(async () => {
    if (!courseId || !session?.user) return
    try {
      const res = await fetch('/api/formation/enroll')
      if (res.ok) {
        const data = await res.json()
        const e = (data.enrollments || []).find((e: Enrollment & { courseId: string }) => e.courseId === courseId)
        if (e) {
          setEnrollment(e)
          // Restore completed modules from progress
          const modCount = modules.length || 1
          const completedCount = Math.floor((e.progress / 100) * modCount)
          const completed = new Set<number>()
          for (let i = 0; i < completedCount; i++) completed.add(i)
          setCompletedModules(completed)
        }
      }
    } catch {
      // silent
    }
  }, [courseId, session?.user, modules.length])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchCourse()
      setLoading(false)
    }
    init()
  }, [fetchCourse])

  useEffect(() => {
    fetchEnrollment()
  }, [fetchEnrollment])

  const enroll = async () => {
    setEnrolling(true)
    try {
      const res = await fetch('/api/formation/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      if (res.ok) {
        const data = await res.json()
        setEnrollment(data.enrollment)
        toast.success(t(language, 'formationEnrolledSuccess'))
      }
    } catch {
      toast.error(t(language, 'formationFailedEnroll'))
    } finally {
      setEnrolling(false)
    }
  }

  const markModuleComplete = async (index: number) => {
    const newCompleted = new Set(completedModules)
    newCompleted.add(index)
    setCompletedModules(newCompleted)

    // Calculate progress
    const total = modules.length
    const completed = newCompleted.size
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    // Update enrollment
    if (enrollment) {
      try {
        await fetch('/api/formation/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, progress, completed: progress >= 100 }),
        })
        setEnrollment({ ...enrollment, progress, completed: progress >= 100 })
      } catch {
        // silent
      }
    }

    // Auto-advance
    if (index < modules.length - 1) {
      setActiveModule(index + 1)
    }
  }

  const getRecommendation = async () => {
    setLoadingRec(true)
    try {
      const res = await fetch('/api/formation/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recommend', language, courseId, courseTitle: course?.title }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.recommendations?.length > 0) {
          const rec = data.recommendations[0]
          setRecommendation(`${rec.title}: ${rec.reason}`)
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingRec(false)
    }
  }

  const getModuleTypeLabel = (type: string) => {
    if (type === 'video') return t(language, 'formationModuleVideo')
    if (type === 'text') return t(language, 'formationModuleText')
    return t(language, 'formationModuleQuiz')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">{t(language, 'formationCourseNotFound')}</p>
          <Button className="mt-4" onClick={() => navigateTo('formationCatalog')}>{t(language, 'formationBackToCatalog')}</Button>
        </div>
      </div>
    )
  }

  const isEnrolled = Boolean(enrollment)
  const progress = enrollment?.progress || 0
  const isCourseComplete = enrollment?.completed || false
  const currentModule = modules[activeModule]

  return (
    <div className={`min-h-screen bg-gradient-to-b from-teal-50/40 via-white to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-teal-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigateTo('formationCatalog')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t(language, 'formationCatalog')}
          </button>
          <h1 className={`text-sm font-semibold text-teal-700 max-w-[60%] truncate ${isRTL ? 'text-right' : ''}`}>{course.title}</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white/80" />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge>{t(language, `formationCategory${course.category.charAt(0).toUpperCase() + course.category.slice(1).replace('-', '')}` as Parameters<typeof t>[1]) || course.category}</Badge>
                    <Badge variant="outline">{t(language, `formationLevel${course.level.charAt(0).toUpperCase() + course.level.slice(1)}` as Parameters<typeof t>[1]) || course.level}</Badge>
                    <Badge variant="outline">{course.duration}h</Badge>
                    {course.rating > 0 && <Badge variant="outline">★ {course.rating}</Badge>}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{course.title}</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{course.description}</p>

                  {!isEnrolled ? (
                    <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={enroll} disabled={enrolling}>
                      {enrolling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {t(language, 'formationStartCourse')}
                    </Button>
                  ) : isCourseComplete ? (
                    <div className="flex gap-3 mt-4">
                      <Button className="bg-emerald-600 hover:bg-emerald-700" disabled>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t(language, 'formationCourseComplete')}
                      </Button>
                      <Button variant="outline" onClick={() => navigateTo('formationCert', { courseId, courseTitle: course.title })}>
                        <Award className="w-4 h-4 mr-2" />
                        {t(language, 'formationTakeExam')}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Module Content */}
            {isEnrolled && currentModule && (
              <motion.div key={activeModule} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${MODULE_COLORS[currentModule.type] || 'bg-gray-50'}`}>
                        {(() => {
                          const Icon = MODULE_ICONS[currentModule.type] || FileText
                          return <Icon className="w-5 h-5" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{getModuleTypeLabel(currentModule.type)} — {activeModule + 1}/{modules.length}</p>
                        <CardTitle className="text-base">{currentModule.title}</CardTitle>
                      </div>
                      {completedModules.has(activeModule) && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    {/* Video placeholder */}
                    {currentModule.type === 'video' && (
                      <div className="aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center gap-3 mb-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className="text-white/60 text-sm">{t(language, 'formationVideoPlaceholder')}</p>
                      </div>
                    )}

                    {/* Text content */}
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      {currentModule.content}
                    </div>

                    {/* Quiz placeholder */}
                    {currentModule.type === 'quiz' && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-800">{t(language, 'formationModuleQuiz')}</span>
                        </div>
                        <p className="text-sm text-amber-700">{currentModule.content}</p>
                        <p className="text-xs text-amber-600 mt-2">{t(language, 'formationQuizNote')}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-6">
                      {!completedModules.has(activeModule) && (
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => markModuleComplete(activeModule)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t(language, 'formationMarkComplete')}
                        </Button>
                      )}
                      {activeModule < modules.length - 1 && (
                        <Button variant="outline" onClick={() => setActiveModule(activeModule + 1)}>
                          {t(language, 'formationNextModule')}
                          <ArrowRight className={`w-4 h-4 ml-1 ${isRTL ? 'rotate-180 mr-1' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* AI Recommendation */}
            <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      {t(language, 'formationAiRecommendation')}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{t(language, 'formationAiRecommendDesc')}</p>
                    {recommendation && <p className="text-sm text-teal-700 mt-2 font-medium">{recommendation}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={getRecommendation} disabled={loadingRec}>
                    {loadingRec && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    {t(language, 'formationGetRecommendation')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Sidebar: Modules list */}
          <div className="space-y-4">
            {/* Progress */}
            {isEnrolled && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">{t(language, 'formationYourProgress')}</h4>
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
                </CardContent>
              </Card>
            )}

            {/* Module List */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm text-gray-900 mb-3">{t(language, 'formationCourseModules')}</h4>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {modules.map((mod, i) => {
                    const Icon = MODULE_ICONS[mod.type] || FileText
                    const isActive = i === activeModule
                    const isComplete = completedModules.has(i)
                    return (
                      <button
                        key={i}
                        onClick={() => isEnrolled && setActiveModule(i)}
                        disabled={!isEnrolled}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-teal-50 border border-teal-200' :
                          isEnrolled ? 'hover:bg-gray-50' : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-teal-500' : 'text-gray-300'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-teal-700' : 'text-gray-700'}`}>{mod.title}</p>
                          <p className="text-xs text-muted-foreground">{getModuleTypeLabel(mod.type)}</p>
                        </div>
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="pb-8" />
          </div>
        </div>
      </main>
    </div>
  )
}
