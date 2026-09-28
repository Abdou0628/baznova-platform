'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Calendar, Clock, Users, Mic, Loader2, Pencil, BookOpen, Video, Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface Workshop {
  id: string
  title: string
  description: string
  speaker: string
  date: string
  duration: number
  capacity: number
  registeredCount: number
  type: string
  language: string
  status: string
  createdAt: string
}

const statusColorMap: Record<string, string> = {
  upcoming: 'bg-emerald-100 text-emerald-700',
  ongoing: 'bg-sky-100 text-sky-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const typeIconMap: Record<string, typeof BookOpen> = {
  workshop: BookOpen,
  webinar: Video,
  bootcamp: Zap,
}

const typeKeyMap: Record<string, string> = {
  workshop: 'campusWsTypeWorkshop',
  webinar: 'campusWsTypeWebinar',
  bootcamp: 'campusWsTypeBootcamp',
}

const statusKeyMap: Record<string, string> = {
  upcoming: 'campusUpcoming',
  ongoing: 'campusWsOngoing',
  completed: 'campusPast',
  cancelled: 'campusWsCancelled',
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

export default function CampusWorkshops() {
  const { language } = useCVStore()
  const isRtl = language === 'ar'
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'upcoming' | 'past'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', speaker: '',
    date: '', duration: 60, capacity: 100, type: 'workshop', language: '', status: 'upcoming',
  })

  const fetchWorkshops = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campus/workshops')
      const json = await res.json()
      if (json.success) setWorkshops(json.data ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchWorkshops() }, [fetchWorkshops])

  const now = new Date()
  const filtered = workshops.filter((w) => {
    const wDate = new Date(w.date)
    if (tab === 'upcoming') return wDate >= now && w.status !== 'cancelled'
    if (tab === 'past') return wDate < now || w.status === 'completed'
    return true
  })

  function openCreate() {
    setEditingId(null)
    setForm({ title: '', description: '', speaker: '', date: '', duration: 60, capacity: 100, type: 'workshop', language: '', status: 'upcoming' })
    setDialogOpen(true)
  }

  function openEdit(w: Workshop) {
    setEditingId(w.id)
    setForm({
      title: w.title, description: w.description, speaker: w.speaker,
      date: w.date ? w.date.slice(0, 16) : '',
      duration: w.duration, capacity: w.capacity, type: w.type, language: w.language, status: w.status,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    try {
      const url = editingId ? `/api/campus/workshops?id=${editingId}` : '/api/campus/workshops'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: new Date(form.date).toISOString() }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(editingId ? t(language, 'campusWsUpdated') : t(language, 'campusWsCreated'))
        setDialogOpen(false)
        fetchWorkshops()
      } else {
        toast.error(json.error || t(language, 'campusError'))
      }
    } catch {
      toast.error(t(language, 'campusNetworkError'))
    } finally { setSaving(false) }
  }

  async function handleRegister(w: Workshop) {
    try {
      const res = await fetch(`/api/campus/workshops?id=${w.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(t(language, 'campusWsRegisteredSuccess'))
        fetchWorkshops()
      } else {
        toast.error(json.error || t(language, 'campusError'))
      }
    } catch {
      toast.error(t(language, 'campusNetworkError'))
    }
  }

  const locale = language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR'
  const tabButtons: { key: 'all' | 'upcoming' | 'past'; label: string }[] = [
    { key: 'all', label: t(language, 'campusAllWorkshops') },
    { key: 'upcoming', label: t(language, 'campusUpcoming') },
    { key: 'past', label: t(language, 'campusPast') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`flex gap-2 ${isRtl ? 'sm:order-2' : ''}`}>
          {tabButtons.map((tb) => (
            <Button key={tb.key} variant={tab === tb.key ? 'default' : 'outline'} size="sm"
              onClick={() => setTab(tb.key)} className={`cursor-pointer ${tab === tb.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
              {tb.label} ({tb.key === 'all' ? workshops.length : tb.key === 'upcoming'
                ? workshops.filter(w => new Date(w.date) >= now && w.status !== 'cancelled').length
                : workshops.filter(w => new Date(w.date) < now || w.status === 'completed').length})
            </Button>
          ))}
        </div>
        <Button onClick={openCreate} className={`bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-2 shrink-0 ${isRtl ? 'sm:order-1' : ''}`}>
          <Plus className="w-4 h-4" />{t(language, 'campusCreateWorkshop')}
        </Button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t(language, 'campusNoWorkshops')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ws, i) => {
            const TypeIcon = typeIconMap[ws.type] || BookOpen
            const isFull = ws.registeredCount >= ws.capacity
            const isPast = new Date(ws.date) < now || ws.status === 'completed'
            return (
              <motion.div key={ws.id} custom={i} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <TypeIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm leading-tight">{ws.title}</h4>
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColorMap[ws.status] || ''}`}>{t(language, (statusKeyMap[ws.status] || 'campusUpcoming') as 'campusUpcoming')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ws.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                          <span className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}> <Calendar className="w-3 h-3" />{new Date(ws.date).toLocaleDateString(locale)}</span>
                          <span className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}> <Clock className="w-3 h-3" />{ws.duration} {t(language, 'campusWsMin')}</span>
                          <span className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}> <Users className="w-3 h-3" />{ws.registeredCount}/{ws.capacity}</span>
                        </div>
                        {ws.speaker && (
                          <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${isRtl ? 'flex-row-reverse' : ''}`}> <Mic className="w-3 h-3" />{ws.speaker}</div>
                        )}
                        <div className={`flex items-center gap-2 mt-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Badge variant="secondary" className="text-[10px]">
                            {t(language, (typeKeyMap[ws.type] || 'campusWsTypeWorkshop') as 'campusWsTypeWorkshop')}
                          </Badge>
                          {ws.language && <Badge variant="secondary" className="text-[10px]">{ws.language}</Badge>}
                          <div className="flex-1" />
                          {!isPast && (
                            <Button size="sm" variant={isFull ? 'secondary' : 'default'}
                              disabled={isFull}
                              onClick={() => !isFull && handleRegister(ws)}
                              className={`text-xs cursor-pointer ${!isFull ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                              {isFull ? t(language, 'campusWsFull') : t(language, 'campusWsRegister')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(ws)} className="text-xs cursor-pointer">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t(language, 'campusUniEdit') : t(language, 'campusCreateWorkshop')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t(language, 'campusWsTitle')} *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>{t(language, 'campusWsDescription')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(language, 'campusWsSpeaker')}</Label>
                <Input value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{t(language, 'campusWsDate')} *</Label>
                <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t(language, 'campusWsDuration')} ({t(language, 'campusWsMin')})</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 60 })} className="mt-1" />
              </div>
              <div>
                <Label>{t(language, 'campusWsCapacity')}</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 100 })} className="mt-1" />
              </div>
              <div>
                <Label>{t(language, 'campusWsLanguage')}</Label>
                <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder={t(language, 'campusWsLanguagePlaceholder')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(language, 'campusWsType')}</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="workshop">{t(language, 'campusWsTypeWorkshop')}</option>
                  <option value="webinar">{t(language, 'campusWsTypeWebinar')}</option>
                  <option value="bootcamp">{t(language, 'campusWsTypeBootcamp')}</option>
                </select>
              </div>
              <div>
                <Label>{t(language, 'campusWsStatus')}</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="upcoming">{t(language, 'campusUpcoming')}</option>
                  <option value="ongoing">{t(language, 'campusWsOngoing')}</option>
                  <option value="completed">{t(language, 'campusPast')}</option>
                  <option value="cancelled">{t(language, 'campusWsCancelled')}</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(language, 'campusWsCancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date}
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t(language, 'campusWsSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
