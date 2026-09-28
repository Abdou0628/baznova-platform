'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Bot, User, Send, Loader2, MessageSquare,
  Sparkles, Trash2, PanelLeftClose, PanelLeft, RotateCcw, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import { AGENTS } from '@/lib/agent-registry'

// --- Types ---
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface SidebarAgent {
  id: string
  name: string
  color: string
}

const MAX_MESSAGES = 20
const SIDEBAR_AGENT_IDS = ['cv', 'ats', 'career', 'coach', 'recruiter', 'intelligence']

const AGENT_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500', violet: 'bg-violet-500', sky: 'bg-sky-500',
  rose: 'bg-rose-500', teal: 'bg-teal-500', amber: 'bg-amber-500',
  orange: 'bg-orange-500', purple: 'bg-purple-500', red: 'bg-red-500',
  slate: 'bg-slate-500',
}

const SUGGESTION_KEYS = ['chatAdvSuggestion1', 'chatAdvSuggestion2', 'chatAdvSuggestion3', 'chatAdvSuggestion4'] as const

// --- Markdown Renderer ---
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      parts.push(
        <pre key={key++} className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          {lang && <div className="text-xs text-gray-400 mb-1 font-mono">{lang}</div>}
          <code className="font-mono whitespace-pre-wrap">{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    if (line.match(/^\s*[-*]\s+/)) {
      parts.push(
        <div key={key++} className="flex gap-2 ml-2">
          <span className="text-violet-500 mt-1 flex-shrink-0">•</span>
          <span>{renderInline(line.replace(/^\s*[-*]\s+/, ''))}</span>
        </div>
      )
      continue
    }

    if (line.match(/^\s*\d+\.\s+/)) {
      parts.push(
        <div key={key++} className="flex gap-2 ml-2">
          <span className="text-violet-500 font-semibold flex-shrink-0">
            {line.match(/^(\s*\d+)\./)?.[1]?.trim()}.
          </span>
          <span>{renderInline(line.replace(/^\s*\d+\.\s+/, ''))}</span>
        </div>
      )
      continue
    }

    if (line.trim() === '') { parts.push(<div key={key++} className="h-2" />); continue }
    parts.push(<p key={key++}>{renderInline(line)}</p>)
  }

  return <div className="space-y-1">{parts}</div>
}

function renderInline(text: string): React.ReactNode {
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    parts.push(<strong key={key++} className="font-semibold">{match[1] || match[2]}</strong>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  return parts.length > 0 ? <>{parts}</> : <>{text}</>
}

// --- Sub-components ---
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" aria-hidden="true" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-2 ml-11">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex items-center gap-3 justify-end">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="bg-gray-50 rounded-2xl p-4 ml-11">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </div>
    </div>
  )
}

// Shared agent list sidebar content
function AgentSidebarContent({
  agents, activeAgentId, lang, onSelect, onClose,
}: {
  agents: SidebarAgent[]
  activeAgentId: string
  lang: CVLanguage
  onSelect: (id: string) => void
  onClose?: () => void
}) {
  const activeAgent = agents.find(a => a.id === activeAgentId) ?? agents[0]

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">{t(lang, 'chatAdvAgents')}</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onClose}>
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {agents.map(agent => {
            const isActive = agent.id === activeAgentId
            return (
              <button
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all ${
                  isActive ? 'bg-white border border-violet-200 shadow-sm' : 'hover:bg-white/60 border border-transparent'
                }`}
              >
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${AGENT_COLOR_MAP[agent.color] ?? 'bg-gray-400'}`} />
                <span className={`text-sm font-medium flex-1 truncate ${isActive ? 'text-violet-700' : 'text-gray-600'}`}>
                  {agent.name}
                </span>
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className={`text-[10px] px-1.5 py-0 h-5 font-medium ${
                    isActive
                      ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {isActive ? t(lang, 'chatAdvActive') : t(lang, 'chatAdvIdle')}
                </Badge>
              </button>
            )
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
          {t(lang, 'chatAdvCurrentMode')}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${AGENT_COLOR_MAP[activeAgent.color] ?? 'bg-gray-400'}`} />
          <span className="text-sm font-semibold text-gray-800">{activeAgent.name}</span>
        </div>
      </div>
    </>
  )
}

// --- Main Component ---
export default function ChatbotAdvanced() {
  const lang = useCVStore(s => s.language)
  const setStep = useCVStore(s => s.setStep)
  const isRTL = lang === 'ar'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState('cv')

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading])

  const sidebarAgents = useMemo<SidebarAgent[]>(() => {
    return SIDEBAR_AGENT_IDS.map(id => {
      const agent = AGENTS.find(a => a.id === id)
      return { id, name: agent?.name ?? `Agent ${id}`, color: agent?.color ?? 'slate' }
    })
  }, [])

  const showSuggestions = messages.length <= 1 && !isLoading && !error

  const trimMessages = useCallback((msgs: ChatMessage[]) =>
    msgs.length > MAX_MESSAGES ? msgs.slice(msgs.length - MAX_MESSAGES) : msgs
  , [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const trimmed = text.trim()
    setInput('')
    setError(null)
    setLastFailedMsg(null)

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: Date.now() }
    const updated = trimMessages([...messages, userMsg])
    setMessages(updated)
    setIsLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/chatbot-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: updated.map(m => ({ role: m.role, content: m.content })),
          language: lang,
        }),
      })
      const data = await res.json()
      if (data.response) {
        setMessages(prev => trimMessages([...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: data.response, timestamp: Date.now() }]))
      } else {
        setError(t(lang, 'chatAdvError'))
        setLastFailedMsg(trimmed)
      }
    } catch {
      setError(t(lang, 'chatAdvConnError'))
      setLastFailedMsg(trimmed)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, lang, trimMessages])

  const handleSend = useCallback(() => { sendMessage(input) }, [input, sendMessage])

  const handleRetry = useCallback(() => {
    if (lastFailedMsg) { setError(null); setLastFailedMsg(null); sendMessage(lastFailedMsg) }
  }, [lastFailedMsg, sendMessage])

  const handleClear = useCallback(() => { setMessages([]); setError(null); setLastFailedMsg(null) }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  const handleAgentSelect = useCallback((id: string) => { setActiveAgentId(id) }, [])

  // --- Initial loading state ---
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="border-b px-4 py-3 flex items-center gap-3 bg-white">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-64" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </header>
        <div className="flex-1"><LoadingSkeleton /></div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`min-h-screen flex flex-col bg-white ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* ===== HEADER ===== */}
        <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 bg-white sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0 cursor-pointer"
            onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? t(lang, 'chatAdvBack') : 'Open agents panel'}>
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0 cursor-pointer hover:bg-gray-100"
            onClick={() => setStep('landing')} aria-label={t(lang, 'chatAdvBack')}>
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              {t(lang, 'chatAdvTitle')}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-600 hidden sm:inline">
              {t(lang, 'chatAdvAgentActive')}
            </span>
          </div>
        </header>

        {/* ===== MAIN LAYOUT ===== */}
        <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">
          {/* Desktop Sidebar */}
          <AnimatePresence>
            {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="hidden lg:block flex-shrink-0 border-r border-gray-200 bg-gray-50/50 overflow-hidden"
              >
                <div className="w-[280px] h-full flex flex-col">
                  <AgentSidebarContent
                    agents={sidebarAgents} activeAgentId={activeAgentId} lang={lang}
                    onSelect={handleAgentSelect} onClose={() => setSidebarOpen(false)}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile sidebar overlay + drawer */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ x: isRTL ? 300 : -300 }} animate={{ x: 0 }}
                exit={{ x: isRTL ? 300 : -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 bottom-0 z-20 w-[280px] lg:hidden bg-gray-50 border-r border-gray-200 flex flex-col"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <AgentSidebarContent
                  agents={sidebarAgents} activeAgentId={activeAgentId} lang={lang}
                  onSelect={id => { handleAgentSelect(id); setSidebarOpen(false) }}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ===== CHAT AREA ===== */}
          <main className="flex-1 flex flex-col min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Welcome screen */}
              {messages.length === 0 && !isLoading && !error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{t(lang, 'chatAdvTitle')}</h2>
                  <p className="text-sm text-gray-500 max-w-md">{t(lang, 'chatAdvWelcome')}</p>
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx === messages.length - 1 ? 0.05 : 0 }}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-violet-500/20">
                        <Bot className="w-4 h-4 text-white" aria-hidden="true" />
                      </div>
                    )}
                    <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                    }`}>
                      {isUser ? msg.content : renderMarkdown(msg.content)}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-gray-600" aria-hidden="true" />
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {isLoading && <TypingIndicator />}

              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-4">
                  <Card className="border-red-200 bg-red-50 px-4 py-3 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                    <Button variant="outline" size="sm"
                      className="mt-2 border-red-200 text-red-600 hover:bg-red-100 cursor-pointer" onClick={handleRetry}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      {t(lang, 'chatAdvRetry')}
                    </Button>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Suggestion chips */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }} className="px-4 sm:px-6 pb-3">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTION_KEYS.map(key => (
                      <button key={key} onClick={() => sendMessage(t(lang, key))}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors cursor-pointer whitespace-nowrap">
                        <Sparkles className="w-3 h-3" />
                        {t(lang, key)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== INPUT AREA ===== */}
            <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-3">
              {input.length > 0 && (
                <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-[11px] text-gray-400">
                    {t(lang, 'chatAdvCharCount').replace('{count}', String(input.length))}
                  </span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea ref={textareaRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  placeholder={t(lang, 'chatAdvPlaceholder')}
                  className="flex-1 resize-none min-h-[44px] max-h-[160px] rounded-xl border-gray-300 focus:border-violet-400 focus:ring-violet-400/20 text-sm"
                  rows={1} disabled={isLoading} aria-label={t(lang, 'chatAdvPlaceholder')} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" size="icon"
                      className={`h-11 w-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white cursor-pointer flex-shrink-0 shadow-md shadow-violet-500/20 ${
                        !input.trim() || isLoading ? 'opacity-50' : ''
                      }`} onClick={handleSend} disabled={!input.trim() || isLoading}
                      aria-label={t(lang, 'chatAdvSend')}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'chatAdvSend')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon"
                      className={`h-11 w-11 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer flex-shrink-0 ${
                        messages.length === 0 ? 'opacity-30 pointer-events-none' : ''
                      }`} onClick={handleClear} disabled={messages.length === 0}
                      aria-label={t(lang, 'chatAdvClear')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'chatAdvClear')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
