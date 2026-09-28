'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, GripVertical, X, Briefcase, MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import { toast } from 'sonner'

interface Candidate {
  id: string
  name: string
  email: string
  score: number
  stage: string
  notes: string
  appliedAt: string
}

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  status: string
  candidates: Candidate[]
}

const STAGES = ['new', 'screening', 'interview', 'offer', 'hired'] as const
const STAGE_COLORS: Record<string, string> = {
  new: 'border-sky-300 bg-sky-50/50',
  screening: 'border-amber-300 bg-amber-50/50',
  interview: 'border-violet-300 bg-violet-50/50',
  offer: 'border-emerald-300 bg-emerald-50/50',
  hired: 'border-teal-300 bg-teal-50/50',
}
const STAGE_HEADER_COLORS: Record<string, string> = {
  new: 'text-sky-700',
  screening: 'text-amber-700',
  interview: 'text-violet-700',
  offer: 'text-emerald-700',
  hired: 'text-teal-700',
}

export default function RecruiterPipeline() {
  const { language, setStep } = useCVStore()
  const lang = language as CVLanguage
  const isRTL = lang === 'ar'
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [showNewJob, setShowNewJob] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDesc, setNewJobDesc] = useState('')
  const [newJobDept, setNewJobDept] = useState('')
  const [newJobLoc, setNewJobLoc] = useState('')
  const [creating, setCreating] = useState(false)
  const dragItem = useRef<{ candidateId: string; fromStage: string } | null>(null)
  const dragOverStage = useRef<string | null>(null)

  const stageLabel = (stage: string) => {
    const map: Record<string, string> = {
      new: t(lang, 'recruiterStageNew'),
      screening: t(lang, 'recruiterStageScreening'),
      interview: t(lang, 'recruiterStageInterview'),
      offer: t(lang, 'recruiterStageOffer'),
      hired: t(lang, 'recruiterStageHired'),
    }
    return map[stage] || stage
  }

  const fetchJobs = () => {
    fetch('/api/recruiter/pipeline')
      .then(r => r.json())
      .then(data => {
        const j = data.jobs || []
        setJobs(j)
        if (!selectedJobId && j.length > 0) setSelectedJobId(j[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchJobs() }, [])

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleDragStart = (candidateId: string, fromStage: string) => {
    dragItem.current = { candidateId, fromStage }
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    dragOverStage.current = stage
  }

  const handleDrop = async (toStage: string) => {
    if (!dragItem.current || !dragOverStage.current || dragItem.current.fromStage === toStage) return
    const { candidateId, fromStage } = dragItem.current
    setMovingId(candidateId)

    try {
      const res = await fetch('/api/recruiter/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, fromStage, toStage, jobId: selectedJobId }),
      })
      if (res.ok) {
        setJobs(prev => prev.map(j => {
          if (j.id !== selectedJobId) return j
          return {
            ...j,
            candidates: j.candidates.map(c => c.id === candidateId ? { ...c, stage: toStage } : c),
          }
        }))
        toast.success(`${stageLabel(fromStage)} → ${stageLabel(toStage)}`)
      }
    } catch {
      toast.error(t(lang, 'recruiterErrorMoving'))
    } finally {
      setMovingId(null)
      dragItem.current = null
      dragOverStage.current = null
    }
  }

  const handleCreateJob = async () => {
    if (!newJobTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/recruiter/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createJob', title: newJobTitle, description: newJobDesc, department: newJobDept, location: newJobLoc }),
      })
      if (res.ok) {
        setShowNewJob(false)
        setNewJobTitle('')
        setNewJobDesc('')
        setNewJobDept('')
        setNewJobLoc('')
        fetchJobs()
        toast.success(t(lang, 'recruiterJobCreated'))
      }
    } catch {
      toast.error(t(lang, 'recruiterErrorCreatingJob'))
    } finally {
      setCreating(false)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('recruiterHome')} className="cursor-pointer">
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''} ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {t(lang, 'recruiterBack')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="text-amber-600" />
                {t(lang, 'recruiterPipelineTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">{t(lang, 'recruiterPipelineSubtitle')}</p>
            </div>
          </div>
          <Dialog open={showNewJob} onOpenChange={setShowNewJob}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 cursor-pointer">
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t(lang, 'recruiterNewJob')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t(lang, 'recruiterNewJob')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder={t(lang, 'recruiterJobTitle')} value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} />
                <Input placeholder={t(lang, 'recruiterJobDept')} value={newJobDept} onChange={e => setNewJobDept(e.target.value)} />
                <Input placeholder={t(lang, 'recruiterJobLocation')} value={newJobLoc} onChange={e => setNewJobLoc(e.target.value)} />
                <Textarea placeholder={t(lang, 'recruiterPasteJobDescPlaceholder')} value={newJobDesc} onChange={e => setNewJobDesc(e.target.value)} rows={4} />
                <Button onClick={handleCreateJob} disabled={creating || !newJobTitle.trim()} className="w-full bg-amber-600 hover:bg-amber-700 cursor-pointer">
                  {creating && <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                  {t(lang, 'recruiterNewJob')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Job selector */}
        {jobs.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {jobs.map(job => (
              <Button
                key={job.id}
                variant={selectedJobId === job.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedJobId(job.id)}
                className={`cursor-pointer whitespace-nowrap shrink-0 ${selectedJobId === job.id ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              >
                {job.title}
                <Badge variant="secondary" className={`text-xs ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  {job.candidates?.length || 0}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : !selectedJob ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">{t(lang, 'recruiterNoJobs')}</p>
            <Button className="mt-4 bg-amber-600 hover:bg-amber-700 cursor-pointer" onClick={() => setShowNewJob(true)}>
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t(lang, 'recruiterNewJob')}
            </Button>
          </Card>
        ) : (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {STAGES.map((stage, i) => {
              const stageCandidates = (selectedJob?.candidates || []).filter(c => c.stage === stage)
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`min-w-[280px] w-[280px] shrink-0 rounded-xl border-2 border-dashed p-3 ${STAGE_COLORS[stage]} transition-colors`}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDrop={() => handleDrop(stage)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${STAGE_HEADER_COLORS[stage]}`}>{stageLabel(stage)}</h3>
                    <Badge variant="outline" className="text-xs">{stageCandidates.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {stageCandidates.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6 opacity-50">—</div>
                    )}
                    {stageCandidates.map(candidate => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={() => handleDragStart(candidate.id, stage)}
                        className={`bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${movingId === candidate.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${scoreColor(candidate.score)}`}>{candidate.score}%</span>
                        </div>
                        {candidate.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{candidate.notes}</p>
                        )}
                        {candidate.score > 0 && (
                          <Progress value={candidate.score} className="mt-2 h-1.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
