'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Plus, Building2, MapPin, Users, Mail, Calendar,
  Loader2, GraduationCap, Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface University {
  id: string
  name: string
  country: string
  programs: string
  studentCount: number
  status: string
  contactEmail: string
  partnershipDate: string | null
  createdAt: string
}

const statusColorMap: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-100 text-gray-600',
}

const statusKeyMap: Record<string, string> = {
  active: 'campusUniActive',
  pending: 'campusUniPending',
  inactive: 'campusUniInactive',
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

export default function CampusUniversities() {
  const { language } = useCVStore()
  const isRtl = language === 'ar'

  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', country: '', programs: '', studentCount: 0,
    status: 'active', contactEmail: '',
  })

  const fetchUnis = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campus/universities')
      const json = await res.json()
      if (json.success) setUniversities(json.data ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUnis() }, [fetchUnis])

  const filtered = universities.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.country.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    return matchSearch && matchStatus
  })

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', country: '', programs: '', studentCount: 0, status: 'active', contactEmail: '' })
    setDialogOpen(true)
  }

  function openEdit(u: University) {
    setEditingId(u.id)
    setForm({
      name: u.name, country: u.country, programs: u.programs,
      studentCount: u.studentCount, status: u.status, contactEmail: u.contactEmail,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editingId ? `/api/campus/universities?id=${editingId}` : '/api/campus/universities'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(editingId ? t(language, 'campusWsUpdated') : t(language, 'campusWsCreated'))
        setDialogOpen(false)
        fetchUnis()
      } else {
        toast.error(json.error || t(language, 'campusError'))
      }
    } catch {
      toast.error(t(language, 'campusNetworkError'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`flex-1 w-full sm:max-w-sm ${isRtl ? 'sm:order-2' : ''}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t(language, 'campusSearchUni')}
              className={`${isRtl ? 'pr-9 text-right' : 'pl-9'}`}
            />
          </div>
        </div>
        <div className={`flex items-center gap-2 ${isRtl ? 'sm:order-1' : ''}`}>
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded-md px-3 py-2 bg-background"
            aria-label={t(language, 'campusFilterStatus')}
          >
            <option value="all">{t(language, 'campusFilterAll')}</option>
            <option value="active">{t(language, 'campusUniActive')}</option>
            <option value="pending">{t(language, 'campusUniPending')}</option>
            <option value="inactive">{t(language, 'campusUniInactive')}</option>
          </select>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-2 shrink-0">
            <Plus className="w-4 h-4" />{t(language, 'campusAddUni')}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t(language, 'campusNoUniversities')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((uni, i) => {
            const programs: string[] = (() => { try { return JSON.parse(uni.programs || '[]') } catch { return [] } })()
            return (
              <motion.div key={uni.id} custom={i} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm truncate">{uni.name}</h4>
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColorMap[uni.status] || ''}`}>
                            {t(language, (statusKeyMap[uni.status] || 'campusUniActive') as 'campusUniActive')}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground mt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <MapPin className="w-3 h-3" /><span>{uni.country}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Users className="w-3 h-3" /><span>{uni.studentCount} {t(language, 'campusUniStudentCount')}</span>
                        </div>
                        {uni.contactEmail && (
                          <div className={`flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Mail className="w-3 h-3" /><span className="truncate">{uni.contactEmail}</span>
                          </div>
                        )}
                        {programs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {programs.slice(0, 3).map((p) => (
                              <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                            ))}
                            {programs.length > 3 && <Badge variant="secondary" className="text-[10px]">+{programs.length - 3}</Badge>}
                          </div>
                        )}
                        {uni.partnershipDate && (
                          <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(uni.partnershipDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR')}</span>
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(uni)}
                          className={`mt-3 text-xs gap-1 cursor-pointer ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                          <Pencil className="w-3 h-3" />{t(language, 'campusUniEdit')}
                        </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t(language, 'campusUniEdit') : t(language, 'campusAddUni')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t(language, 'campusUniName')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(language, 'campusUniCountry')}</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{t(language, 'campusUniStudents')}</Label>
                <Input type="number" value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{t(language, 'campusUniPrograms')}</Label>
              <Input value={form.programs} onChange={(e) => setForm({ ...form, programs: e.target.value })}
                placeholder={t(language, 'campusUniProgramsPlaceholder')} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t(language, 'campusUniEmail')}</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{t(language, 'campusUniStatus')}</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="active">{t(language, 'campusUniActive')}</option>
                  <option value="pending">{t(language, 'campusUniPending')}</option>
                  <option value="inactive">{t(language, 'campusUniInactive')}</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(language, 'campusUniCancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t(language, 'campusUniSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
