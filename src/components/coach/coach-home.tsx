'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, Target, TrendingUp, CheckCircle, Clock,
  Plus, Sparkles, Award, BookOpen, ArrowRight,
  MessageSquare, ChevronLeft, Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t } from '@/lib/i18n'

type AppStep = 'coachHome' | 'coachSession' | 'coachGoals' | 'coachHistory'

interface Stats {
  sessionsCompleted: number
  activeGoals: number
  streak: number
}

const QUICK_START_TOPICS = [
  { key: 'careerTransition', icon: TrendingUp, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
  { key: 'salaryNegotiation', icon: Target, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
  { key: 'leadership', icon: Award, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50' },
  { key: 'workLifeBalance', icon: Clock, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50' },
] as const

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

export default function CoachHome() {
  const { language, setStep, stepData, setStepData } = useCVStore()
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats>({ sessionsCompleted: 0, activeGoals: 0, streak: 0 })
  const isRTL = language === 'ar'

  const fetchStats = useCallback(async () => {
    try {
      const [sessionRes, goalsRes] = await Promise.all([
        fetch('/api/coach/session'),
        fetch('/api/coach/goals'),
      ])
      const sessionsData = sessionRes.ok ? await sessionRes.json() : { sessions: [] }
      const goalsData = goalsRes.ok ? await goalsRes.json() : { goals: [] }
      setStats({
        sessionsCompleted: sessionsData.sessions?.length || 0,
        activeGoals: goalsData.goals?.filter((g: { completed: boolean }) => !g.completed).length || 0,
        streak: 0,
      })
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await fetchStats()
    }
    load()
  }, [fetchStats])

  function navigateTo(step: AppStep, data?: Record<string, unknown>) {
    if (data) setStepData(data)
    setStep(step)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigateTo('coachHome')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t(language, 'coachBack')}</span>
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">HireNova IA Coach</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-20">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 mb-2">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'coachHomeTitle')}</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">{t(language, 'coachHomeSubtitle')}</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t(language, 'coachSessionsCompleted'), value: stats.sessionsCompleted, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: t(language, 'coachCurrentGoals'), value: stats.activeGoals, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: t(language, 'coachStreak'), value: stats.streak, icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className={`${stat.bg} border-0 shadow-sm`}>
                <CardContent className="p-4 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick start */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                {t(language, 'coachQuickStart')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_START_TOPICS.map((topic) => (
                <button
                  key={topic.key}
                  onClick={() => navigateTo('coachSession', { topic: topic.key })}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center text-white shrink-0`}>
                    <topic.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">
                    {t(language, `coach${topic.key.charAt(0).toUpperCase() + topic.key.slice(1)}` as keyof typeof import('@/lib/i18n').translations)}
                  </span>
                  <ArrowRight className={`w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivational quote */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-5 text-center">
              <BookOpen className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm italic text-emerald-800 leading-relaxed">{t(language, 'coachMotivationalQuote')}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action buttons */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants} className="space-y-2">
          <Button
            onClick={() => navigateTo('coachSession')}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-200"
            size="lg"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t(language, 'coachStartNewSession')}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => navigateTo('coachGoals')}
              variant="outline"
              className="border-emerald-200 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t(language, 'coachViewGoals')}
            </Button>
            <Button
              onClick={() => navigateTo('coachHistory')}
              variant="outline"
              className="border-emerald-200 hover:bg-emerald-50"
            >
              <BookOpen className="w-4 h-4 mr-1" />
              {t(language, 'coachViewHistory')}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
