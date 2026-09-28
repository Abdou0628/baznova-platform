'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Plus, Trash2, Target, Clock,
  TrendingUp, Bot, Loader2, CheckCircle,
  Edit3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

type AppStep = 'coachHome' | 'coachGoals'

interface CoachGoal {
  id: string
  title: string
  description: string
  category: string
  priority: string
  deadline: string | null
  progress: number
  actionSteps: string | null
  completed: boolean
  createdAt: string
}

const CATEGORIES = ['general', 'career-transition', 'salary', 'leadership', 'skills', 'work-life'] as const
const PRIORITIES = ['low', 'medium', 'high'] as const

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
}

export default function CoachGoals() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [goals, setGoals] = useState<CoachGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    fetchGoals()
  }, [])

  async function fetchGoals() {
    try {
      const res = await fetch('/api/coach/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setCategory('general')
    setPriority('medium')
    setDeadline('')
    setEditingId(null)
  }

  function openAddDialog() {
    resetForm()
    setShowDialog(true)
  }

  function openEditDialog(goal: CoachGoal) {
    setTitle(goal.title)
    setDescription(goal.description)
    setCategory(goal.category)
    setPriority(goal.priority)
    setDeadline(goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '')
    setEditingId(goal.id)
    setShowDialog(true)
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        deadline: deadline || null,
        id: editingId,
        language,
      }

      const res = await fetch('/api/coach/goals', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await fetchGoals()
        setShowDialog(false)
        resetForm()
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t(language, 'coachConfirmDelete'))) return
    try {
      await fetch('/api/coach/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchGoals()
    } catch {
      // silent
    }
  }

  async function handleToggleComplete(goal: CoachGoal) {
    try {
      await fetch('/api/coach/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id, completed: !goal.completed, progress: !goal.completed ? 100 : goal.progress }),
      })
      await fetchGoals()
    } catch {
      // silent
    }
  }

  function getCategoryLabel(cat: string) {
    const map: Record<string, string> = {
      'general': 'coachCategoryGeneral',
      'career-transition': 'coachCategoryCareerTransition',
      'salary': 'coachCategorySalary',
      'leadership': 'coachCategoryLeadership',
      'skills': 'coachCategorySkills',
      'work-life': 'coachCategoryWorkLife',
    }
    return t(language, (map[cat] || 'coachCategoryGeneral') as keyof typeof import('@/lib/i18n').translations)
  }

  function getPriorityLabel(pri: string) {
    const map: Record<string, string> = { low: 'coachPriorityLow', medium: 'coachPriorityMedium', high: 'coachPriorityHigh' }
    return t(language, (map[pri] || 'coachPriorityMedium') as keyof typeof import('@/lib/i18n').translations)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-emerald-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setStep('coachHome')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t(language, 'coachBack')}</span>
          </button>
          <span className="font-semibold text-sm">{t(language, 'coachGoalsTitle')}</span>
          <div className="w-16" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-24">
        {goals.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t(language, 'coachNoGoals')}</p>
            <Button onClick={openAddDialog} className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              {t(language, 'coachAddGoal')}
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {goals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: isRTL ? 100 : -100 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`${goal.completed ? 'opacity-60' : ''} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start gap-3">
                      <button onClick={() => handleToggleComplete(goal)} className="mt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${goal.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/30'}`}>
                          {goal.completed && <CheckCircle className="w-3 h-3" />}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{goal.title}</h3>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditDialog(goal)} className="p-1 rounded-md hover:bg-muted transition-colors">
                          <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(goal.id)} className="p-1 rounded-md hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{getCategoryLabel(goal.category)}</Badge>
                      <Badge className={`text-[10px] px-2 py-0.5 ${PRIORITY_COLORS[goal.priority] || 'bg-slate-100 text-slate-700'}`}>{getPriorityLabel(goal.priority)}</Badge>
                      {goal.deadline && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          {formatDate(goal.deadline)}
                        </Badge>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{t(language, 'coachGoalProgress')}</span>
                        <span className="font-medium text-emerald-700">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-1.5" />
                    </div>

                    {/* Action steps */}
                    {goal.actionSteps && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          {t(language, 'coachSuggestedActions')}
                        </p>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {(JSON.parse(goal.actionSteps) as string[]).map((step, idx) => (
                            <p key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-emerald-500 shrink-0">•</span>
                              {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={openAddDialog}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t(language, 'coachEditGoal') : t(language, 'coachAddGoal')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t(language, 'coachGoalTitle')}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(language, 'coachGoalTitle')} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t(language, 'coachGoalDescription')}</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t(language, 'coachGoalDescription')} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t(language, 'coachGoalCategory')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t(language, 'coachGoalPriority')}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{getPriorityLabel(p)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t(language, 'coachGoalDeadline')}</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm() }}>
              {t(language, 'coachBack')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t(language, 'coachSaveGoal')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
