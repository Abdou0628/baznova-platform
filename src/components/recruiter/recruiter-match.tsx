'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, Loader2, User, Star, TrendingUp, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

interface MatchResult {
  id: string
  name: string
  email: string
  score: number
  skills: string[]
  experience: string
  reason: string
}

export default function RecruiterMatch() {
  const { language, setStep } = useCVStore()
  const lang = language as CVLanguage
  const isRTL = lang === 'ar'
  const [jobDesc, setJobDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MatchResult[]>([])

  const handleMatch = async () => {
    if (!jobDesc.trim()) return
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/recruiter/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jobDesc, language: lang }),
      })
      const data = await res.json()
      setResults(data.candidates || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  const scoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
    if (score >= 60) return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
    return 'bg-red-100 text-red-700 hover:bg-red-100'
  }

  const topResult = results.length > 0 ? results[0] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setStep('recruiterHome')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''} ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t(lang, 'recruiterBack')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-amber-600" />
              {t(lang, 'recruiterMatchTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">{t(lang, 'recruiterMatchSubtitle')}</p>
          </div>
        </div>

        {/* Input Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600" />
              {t(lang, 'recruiterPasteJobDesc')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={t(lang, 'recruiterPasteJobDescPlaceholder')}
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              rows={6}
              className="resize-y"
            />
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleMatch}
                disabled={loading || !jobDesc.trim()}
                className="bg-amber-600 hover:bg-amber-700 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t(lang, 'recruiterMatchingProgress')}
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t(lang, 'recruiterStartMatching')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading Animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200" />
                <div className="absolute inset-0 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-600" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">{t(lang, 'recruiterMatchingProgress')}</p>
              <div className="max-w-xs mx-auto mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '90%' }}
                    transition={{ duration: 8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {!loading && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-amber-600" />
              {t(lang, 'recruiterMatchResults')}
              <Badge variant="secondary">{results.length}</Badge>
            </h2>

            {/* Top Pick */}
            {topResult && (
              <Card className="mb-4 border-amber-300 bg-amber-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-lg">
                      {topResult.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold truncate">{topResult.name}</p>
                        <Badge className={scoreBgColor(topResult.score)}>{topResult.score}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {topResult.email}
                      </p>
                    </div>
                    <div className={`text-3xl font-bold ${scoreColor(topResult.score)}`}>{topResult.score}%</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{topResult.reason}</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {topResult.skills.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <Progress value={topResult.score} className="h-2" />
                </CardContent>
              </Card>
            )}

            {/* Other Results */}
            <div className="grid gap-3">
              {results.slice(1).map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.08 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{r.name}</p>
                            <span className="text-xs text-muted-foreground">{r.experience}</span>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {r.skills.slice(0, 5).map((s, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className={`shrink-0 text-right ${isRTL ? 'order-first' : ''}`}>
                          <p className={`text-xl font-bold ${scoreColor(r.score)}`}>{r.score}%</p>
                          <Progress value={r.score} className="mt-1 h-1.5 w-16" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.reason}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No results */}
        {!loading && jobDesc && results.length === 0 && (
          <Card className="p-8 text-center">
            <User className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">{t(lang, 'recruiterNoResults')}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
