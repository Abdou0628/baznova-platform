'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users, FileText, BarChart3, Award, BookOpen, Calendar,
  Loader2, GraduationCap, Search,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface CampusStudentData {
  id: string
  userId: string | null
  universityId: string | null
  program: string
  cvsCreated: number
  atsAvgScore: number
  interviewsCompleted: number
  certificationsEarned: number
  enrolledAt: string
  user?: { name: string | null; email: string } | null
  university?: { name: string } | null
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

export default function CampusStudents() {
  const { language } = useCVStore()
  const isRtl = language === 'ar'
  const [students, setStudents] = useState<CampusStudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campus/students')
      const json = await res.json()
      if (json.success) setStudents(json.data ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const filtered = students.filter((s) => {
    const name = s.user?.name || ''
    const uniName = s.university?.name || ''
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || uniName.toLowerCase().includes(q) || s.program.toLowerCase().includes(q)
  })

  // Summary stats
  const totalCvs = students.reduce((s, st) => s + st.cvsCreated, 0)
  const avgAts = students.length > 0 ? Math.round(students.reduce((s, st) => s + st.atsAvgScore, 0) / students.length) : 0
  const totalInterviews = students.reduce((s, st) => s + st.interviewsCompleted, 0)
  const totalCerts = students.reduce((s, st) => s + st.certificationsEarned, 0)

  const summaryStats = [
    { icon: Users, value: students.length, label: t(language, 'campusTotalStudents'), color: 'text-emerald-600' },
    { icon: FileText, value: totalCvs, label: t(language, 'campusStCvsCreated'), color: 'text-sky-600' },
    { icon: BarChart3, value: `${avgAts}%`, label: t(language, 'campusStAtsAvg'), color: 'text-purple-600' },
    { icon: BookOpen, value: totalInterviews, label: t(language, 'campusStInterviews'), color: 'text-amber-600' },
    { icon: Award, value: totalCerts, label: t(language, 'campusStCerts'), color: 'text-rose-600' },
  ]

  const locale = language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR'

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {summaryStats.map((s) => (
          <Card key={s.label} className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
            <CardContent className="p-3 sm:p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className={`max-w-sm ${isRtl ? 'mr-auto' : ''}`} style={isRtl ? { marginRight: 'auto' } : {}}>
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t(language, 'campusStSearchPlaceholder')}
            className={`${isRtl ? 'pr-9 text-right' : 'pl-9'}`}
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t(language, 'campusStNoStudents')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((st, i) => (
            <motion.div key={st.id} custom={i} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{st.user?.name || t(language, 'campusStDefaultName')}</h4>
                      {st.user?.email && <p className="text-xs text-muted-foreground truncate">{st.user.email}</p>}
                      {st.university?.name && (
                        <Badge variant="secondary" className="text-[10px] mt-1">{st.university.name}</Badge>
                      )}
                      {st.program && (
                        <p className="text-xs text-muted-foreground mt-1">{t(language, 'campusStProgram')}: {st.program}</p>
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <FileText className="w-3 h-3 text-sky-500" />
                          <span>{st.cvsCreated} {t(language, 'campusStCvsCreated')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <BarChart3 className="w-3 h-3 text-purple-500" />
                          <span>ATS {Math.round(st.atsAvgScore)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <BookOpen className="w-3 h-3 text-amber-500" />
                          <span>{st.interviewsCompleted} {t(language, 'campusStInterviews')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Award className="w-3 h-3 text-rose-500" />
                          <span>{st.certificationsEarned} {t(language, 'campusStCerts')}</span>
                        </div>
                      </div>

                      {/* ATS Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{t(language, 'campusStAtsScore')}</span><span>{Math.round(st.atsAvgScore)}%</span>
                        </div>
                        <Progress value={st.atsAvgScore} className="h-2" />
                      </div>

                      <div className={`flex items-center gap-1 mt-2 text-[10px] text-muted-foreground ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        <span>{t(language, 'campusStEnrolled')}: {new Date(st.enrolledAt).toLocaleDateString(locale)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
