'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowLeft, Download, Eye, Search, FileText, Gavel, Shield, Scale, AlertTriangle, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

interface LegalTemplate {
  id: string
  name: string
  type: string
  category: string
  description: string
  content: string
}

const categories = [
  { value: 'all', labelKey: 'legalCategoryAll' as TranslationKey },
  { value: 'employment', labelKey: 'legalCategoryEmployment' as TranslationKey },
  { value: 'protection', labelKey: 'legalCategoryProtection' as TranslationKey },
  { value: 'business', labelKey: 'legalCategoryBusiness' as TranslationKey },
  { value: 'data', labelKey: 'legalCategoryData' as TranslationKey },
]

const typeIcons: Record<string, typeof FileText> = {
  nda: Shield,
  service: Gavel,
  employment: FileText,
  'non-compete': AlertTriangle,
  ip: Scale,
  privacy: ClipboardList,
}

const typeColors: Record<string, string> = {
  nda: 'bg-red-100 text-red-600 border-red-200',
  service: 'bg-sky-100 text-sky-600 border-sky-200',
  employment: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  'non-compete': 'bg-amber-100 text-amber-600 border-amber-200',
  ip: 'bg-violet-100 text-violet-600 border-violet-200',
  privacy: 'bg-teal-100 text-teal-600 border-teal-200',
}

export default function LegalTemplates() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const [templates, setTemplates] = useState<LegalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/legal/templates')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.templates || []
        setTemplates(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = templates.filter((tpl) => {
    const matchCat = category === 'all' || tpl.category === category
    const matchSearch = !search || tpl.name.toLowerCase().includes(search.toLowerCase()) || tpl.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const previewTpl = previewId ? templates.find(tp => tp.id === previewId) : null

  function handleDownload(tpl: LegalTemplate) {
    const blob = new Blob([tpl.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tpl.type}-template-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/40 via-white to-slate-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-red-100 hover:bg-red-800/50 mb-4" onClick={() => setStep('legalHome' as AppStep)}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-0 ml-2' : 'mr-2'}`} />
            {t(language, 'legalBackToHome')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700/50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t(language, 'legalTemplatesTitle')}</h1>
              <p className="text-red-200 text-sm">{t(language, 'legalTemplatesSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={category === cat.value ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1.5 text-xs ${
                    category === cat.value
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                  onClick={() => setCategory(cat.value)}
                >
                  {t(language, cat.labelKey)}
                </Badge>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(language, 'search') as string || 'Search...'}
                className="pl-9 border-red-200 focus:border-red-400"
              />
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">{t(language, 'legalLoadingTemplates')}</p>
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((tpl, i) => {
                const Icon = typeIcons[tpl.type] || FileText
                const colors = typeColors[tpl.type] || 'bg-slate-100 text-slate-600 border-slate-200'
                return (
                  <motion.div
                    key={tpl.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Card className={`h-full border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${colors}`}>
                      <CardContent className="p-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors.split(' ')[0]}`}>
                          <Icon className={`w-5 h-5 ${colors.split(' ')[1]}`} />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{tpl.name}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{tpl.description}</p>
                        <Badge className="text-[10px] bg-white/60 text-foreground border border-slate-200 mb-4">{tpl.category}</Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {t(language, 'legalPreviewTemplate')}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDownload(tpl)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {t(language, 'legalDownloadTemplate')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t(language, 'legalNoTemplatesFound')}</p>
          </div>
        )}

        {/* Preview Modal */}
        <AnimatePresence>
          {previewTpl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setPreviewId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold text-foreground">{previewTpl.name}</h3>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDownload(previewTpl)}>
                      <Download className="w-4 h-4 mr-1" />
                      {t(language, 'legalDownloadTemplate')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewId(null)}>{t(language, 'legalCloseBtn')}</Button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">{previewTpl.content}</pre>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
