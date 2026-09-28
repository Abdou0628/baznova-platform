'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, GraduationCap, Clock, Star, Search, Filter,
  ChevronLeft, Users, SlidersHorizontal, X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { TranslationKey } from '@/lib/i18n'

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'bg-cyan-100 text-cyan-700',
  marketing: 'bg-amber-100 text-amber-700',
  finance: 'bg-emerald-100 text-emerald-700',
  design: 'bg-rose-100 text-rose-700',
  'soft-skills': 'bg-violet-100 text-violet-700',
  languages: 'bg-sky-100 text-sky-700',
  general: 'bg-gray-100 text-gray-700',
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  tech: 'from-cyan-500 to-blue-600',
  marketing: 'from-amber-500 to-orange-600',
  finance: 'from-emerald-500 to-teal-600',
  design: 'from-rose-500 to-pink-600',
  'soft-skills': 'from-violet-500 to-purple-600',
  languages: 'from-sky-500 to-indigo-600',
  general: 'from-gray-500 to-slate-600',
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
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
}

export default function FormationCatalog() {
  const { language, setStep, setStepData } = useCVStore()
  const isRTL = language === 'ar'
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [duration, setDuration] = useState('')
  const [courseLanguage, setCourseLanguage] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  function navigateTo(step: 'formationCourse', data?: Record<string, unknown>) {
    if (data) setStepData(data)
    setStep(step)
  }

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (level) params.set('level', level)
      if (duration) params.set('duration', duration)
      if (courseLanguage) params.set('language', courseLanguage)
      if (search) params.set('search', search)

      const res = await fetch(`/api/formation/courses?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCourses(data.courses || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [category, level, duration, courseLanguage, search])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const filteredCourses = useMemo(() => courses, [courses])

  const hasActiveFilters = category || level || duration || courseLanguage

  const getCategoryLabel = (cat: string) => {
    const keyMap: Record<string, TranslationKey> = {
      tech: 'formationCategoryTech',
      marketing: 'formationCategoryMarketing',
      finance: 'formationCategoryFinance',
      design: 'formationCategoryDesign',
      'soft-skills': 'formationCategorySoftSkills',
      languages: 'formationCategoryLanguages',
    }
    return keyMap[cat] ? t(language, keyMap[cat]) : cat
  }

  const getLevelLabel = (lvl: string) => {
    const keyMap: Record<string, TranslationKey> = {
      beginner: 'formationLevelBeginner',
      intermediate: 'formationLevelIntermediate',
      advanced: 'formationLevelAdvanced',
    }
    return keyMap[lvl] ? t(language, keyMap[lvl]) : lvl
  }

  const clearFilters = () => {
    setCategory('')
    setLevel('')
    setDuration('')
    setCourseLanguage('')
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-teal-50/40 via-white to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-teal-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('formationHome')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t(language, 'previous')}
          </button>
          <h1 className="text-lg font-semibold text-teal-700">{t(language, 'formationTitle')}</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={t(language, 'formationSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${isRTL ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            className={`${showFilters ? 'bg-teal-600 hover:bg-teal-700' : ''} ${hasActiveFilters ? 'ring-2 ring-teal-300' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {t(language, 'formationFilter')}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Select value={category} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder={t(language, 'formationAllCategories')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(language, 'formationAllCategories')}</SelectItem>
                      <SelectItem value="tech">{t(language, 'formationCategoryTech')}</SelectItem>
                      <SelectItem value="marketing">{t(language, 'formationCategoryMarketing')}</SelectItem>
                      <SelectItem value="finance">{t(language, 'formationCategoryFinance')}</SelectItem>
                      <SelectItem value="design">{t(language, 'formationCategoryDesign')}</SelectItem>
                      <SelectItem value="soft-skills">{t(language, 'formationCategorySoftSkills')}</SelectItem>
                      <SelectItem value="languages">{t(language, 'formationCategoryLanguages')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={level} onValueChange={(v) => setLevel(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder={t(language, 'formationAllLevels')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(language, 'formationAllLevels')}</SelectItem>
                      <SelectItem value="beginner">{t(language, 'formationLevelBeginner')}</SelectItem>
                      <SelectItem value="intermediate">{t(language, 'formationLevelIntermediate')}</SelectItem>
                      <SelectItem value="advanced">{t(language, 'formationLevelAdvanced')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={duration} onValueChange={(v) => setDuration(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder={t(language, 'formationAllDurations')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(language, 'formationAllDurations')}</SelectItem>
                      <SelectItem value="short">{t(language, 'formationDurationShort')}</SelectItem>
                      <SelectItem value="medium">{t(language, 'formationDurationMedium')}</SelectItem>
                      <SelectItem value="long">{t(language, 'formationDurationLong')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={courseLanguage} onValueChange={(v) => setCourseLanguage(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder={t(language, 'formationAllLanguages')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(language, 'formationAllLanguages')}</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" />
                    {t(language, 'lot5_formationCatalog_clearFilters')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredCourses.length} {t(language, 'lot5_formationCatalog_courses')}
          </p>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t(language, 'formationNoEnrollments')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, i) => (
              <motion.div key={course.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Card
                  className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
                  onClick={() => navigateTo('formationCourse', { courseId: course.id })}
                >
                  <div className={`h-36 bg-gradient-to-br ${CATEGORY_GRADIENTS[course.category] || CATEGORY_GRADIENTS.general} flex items-center justify-center relative`}>
                    <BookOpen className="w-14 h-14 text-white/80" />
                    {course.featured && (
                      <Badge className="absolute top-3 right-3 bg-white/90 text-gray-900 text-xs">
                        ★ {t(language, 'lot5_formationCatalog_featured')}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`text-xs ${CATEGORY_COLORS[course.category] || CATEGORY_COLORS.general}`}>
                        {getCategoryLabel(course.category)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{getLevelLabel(course.level)}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">{course.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}{t(language, 'formationHours')}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollCount}</span>
                      {course.rating > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{course.rating}</span>
                      )}
                    </div>
                    <Button className="w-full mt-3 bg-teal-600 hover:bg-teal-700 text-white text-sm" size="sm">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {t(language, 'formationEnroll')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="pb-8" />
      </main>
    </div>
  )
}
