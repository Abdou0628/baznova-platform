'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Send, Loader2, ChevronLeft, Sparkles,
  MessageSquare, Clock, ArrowRight, Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const TOPICS = ['coachTopicCareerChange', 'coachTopicSalary', 'coachTopicLeadership', 'coachTopicWorkLife', 'coachTopicNetworking'] as const

export default function CoachSession() {
  const { language, setStep, stepData } = useCVStore()
  const isRTL = language === 'ar'
  const topic = (stepData?.topic as string) || ''

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (topic && !sessionId && messages.length === 0) {
      const topicKey = Object.entries({
        'careerTransition': 'coachTopicCareerChange',
        'salaryNegotiation': 'coachTopicSalary',
        'leadership': 'coachTopicLeadership',
        'workLifeBalance': 'coachTopicWorkLife',
      }).find(([k]) => k === topic)?.[1]
      if (topicKey) {
        handleSend(t(language, topicKey as keyof typeof import('@/lib/i18n').translations))
      }
    }
  }, [topic, language, handleSend])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          messages: updated.slice(-10),
          sessionId,
          topic,
          language,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: t(language, 'lot4_coachSession_errorMsg'), timestamp: new Date().toISOString() }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t(language, 'lot4_coachSession_connectionError'), timestamp: new Date().toISOString() }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, sessionId, topic, language])

  async function handleEndSession() {
    if (!confirm(t(language, 'coachEndSessionConfirm'))) return

    setIsLoading(true)
    try {
      await fetch('/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId, messages: messages.slice(-10), language }),
      })
    } catch {
      // silent
    }
    setEnded(true)
    setIsLoading(false)
  }

  function handleNewChat() {
    setMessages([])
    setSessionId(null)
    setEnded(false)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
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
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">{t(language, 'coachSessionTitle')}</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground text-sm">{t(language, 'coachSessionSubtitle')}</p>
            <p className="text-xs font-medium text-emerald-700">{t(language, 'coachSuggestedTopics')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TOPICS.map(topicKey => (
                <Badge
                  key={topicKey}
                  variant="outline"
                  className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-xs py-1.5 px-3"
                  onClick={() => handleSend(t(language, topicKey))}
                >
                  {t(language, topicKey)}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? (isRTL ? 'flex-row-reverse' : 'flex-row') : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <Card className={`max-w-[80%] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-muted/50'} border-0 shadow-sm`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <Card className="bg-muted/50 border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-sm text-muted-foreground">{t(language, 'coachThinking')}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {ended && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8 space-y-3">
            <CheckCircleIcon />
            <p className="text-sm font-medium text-emerald-700">{t(language, 'coachSessionEnded')}</p>
            <Button onClick={handleNewChat} variant="outline" className="border-emerald-200 hover:bg-emerald-50">
              <Plus className="w-4 h-4 mr-1" />
              {t(language, 'coachNewChat')}
            </Button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!ended && (
        <div className="sticky bottom-0 backdrop-blur-md bg-white/80 border-t border-emerald-100 p-3">
          <div className="max-w-3xl mx-auto space-y-2">
            {messages.length <= 3 && (
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(topicKey => (
                  <Badge
                    key={topicKey}
                    variant="outline"
                    className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-[11px] py-1 px-2"
                    onClick={() => handleSend(t(language, topicKey))}
                  >
                    {t(language, topicKey)}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(input)
                  }
                }}
                placeholder={t(language, 'coachTypeMessage')}
                className="min-h-[44px] max-h-[120px] resize-none flex-1 text-sm"
                rows={1}
              />
              <Button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {messages.length > 1 && (
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleEndSession}>
                <Clock className="w-3 h-3 mr-1" />
                {t(language, 'coachEndSession')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckCircleIcon() {
  return (
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}
