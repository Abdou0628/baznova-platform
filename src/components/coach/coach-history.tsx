'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Bot, Clock, BookOpen, MessageSquare,
  X, Sparkles, Target, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface SessionRecord {
  id: string
  topic: string
  summary: string | null
  messages: string
  language: string
  createdAt: string
}

export default function CoachHistory() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const res = await fetch('/api/coach/session')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  function getTopicLabel(topic: string) {
    const map: Record<string, string> = {
      'careerTransition': 'coachCareerTransition',
      'salaryNegotiation': 'coachSalaryNegotiation',
      'leadership': 'coachLeadership',
      'workLifeBalance': 'coachWorkLifeBalance',
    }
    return topic ? t(language, (map[topic] || 'coachQuickStart') as keyof typeof import('@/lib/i18n').translations) : t(language, 'coachSession')
  }

  function parseMessages(msgStr: string): { role: string; content: string }[] {
    try {
      return JSON.parse(msgStr)
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
          <span className="font-semibold text-sm">{t(language, 'coachHistoryTitle')}</span>
          <div className="w-16" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-20">
        {sessions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t(language, 'coachNoHistory')}</p>
            <Button onClick={() => setStep('coachSession')} className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <MessageSquare className="w-4 h-4 mr-1" />
              {t(language, 'coachStartNewSession')}
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {sessions.map((session, i) => {
              const msgCount = parseMessages(session.messages).length
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSession(session)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-emerald-600" />
                          <Badge variant="secondary" className="text-[11px]">{getTopicLabel(session.topic)}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.createdAt)}
                        </div>
                      </div>
                      {session.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{session.summary}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{msgCount} {t(language, 'lot4_coachHistory_messages')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </main>

      {/* Transcript dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-600" />
              {t(language, 'coachSessionSummary')}
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              {/* Summary */}
              {selectedSession.summary && (
                <Card className="bg-emerald-50 border-emerald-100">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {t(language, 'coachSessionSummary')}
                    </p>
                    <p className="text-sm text-emerald-900 leading-relaxed">{selectedSession.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Transcript */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {t(language, 'coachViewTranscript')}
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parseMessages(selectedSession.messages).map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? (isRTL ? 'flex-row-reverse' : '') : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                          <Bot className="w-3 h-3" />
                        </div>
                      )}
                      <Card className={`max-w-[85%] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-muted/50'} border-0`}>
                        <CardContent className="p-2.5">
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setSelectedSession(null)}>
                {t(language, 'coachCloseTranscript')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
