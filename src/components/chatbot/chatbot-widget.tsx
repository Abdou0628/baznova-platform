'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2, GraduationCap, Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { events } from '@/lib/analytics'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

type ChatMode = 'advisor' | 'support' | 'products'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ModeTab {
  mode: ChatMode
  icon: string
  IconComp: typeof GraduationCap
  labelKey: 'chatbotModeAdvisor' | 'chatbotModeSupport' | 'chatbotModeProducts'
  welcomeKey: 'chatbotAdvisorTitle' | 'chatbotSupportTitle' | 'chatbotProductsTitle'
}

const MODE_TABS: ModeTab[] = [
  { mode: 'advisor', icon: '🌹', IconComp: GraduationCap, labelKey: 'chatbotModeAdvisor', welcomeKey: 'chatbotAdvisorTitle' },
  { mode: 'support', icon: '🛠️', IconComp: Wrench, labelKey: 'chatbotModeSupport', welcomeKey: 'chatbotSupportTitle' },
  { mode: 'products', icon: '📦', IconComp: Package, labelKey: 'chatbotModeProducts', welcomeKey: 'chatbotProductsTitle' },
]

type SuggestionKey = `chatbotSuggestion${Capitalize<ChatMode>}${number}`

interface Suggestion {
  key: SuggestionKey
  mode: ChatMode
}

const SUGGESTION_KEYS: Suggestion[] = [
  { key: 'chatbotSuggestionAdvisor1', mode: 'advisor' },
  { key: 'chatbotSuggestionAdvisor2', mode: 'advisor' },
  { key: 'chatbotSuggestionAdvisor3', mode: 'advisor' },
  { key: 'chatbotSuggestionSupport1', mode: 'support' },
  { key: 'chatbotSuggestionSupport2', mode: 'support' },
  { key: 'chatbotSuggestionSupport3', mode: 'support' },
  { key: 'chatbotSuggestionProducts1', mode: 'products' },
  { key: 'chatbotSuggestionProducts2', mode: 'products' },
  { key: 'chatbotSuggestionProducts3', mode: 'products' },
]

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<ChatMode>('advisor')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lang = useCVStore(s => s.language)

  const isRTL = lang === 'ar'

  const getWelcomeMessage = (m: ChatMode): string => {
    const tab = MODE_TABS.find(t2 => t2.mode === m)
    if (!tab) return ''
    const name = t(lang, tab.welcomeKey)
    const greetings: Record<CVLanguage, string> = {
      fr: `${name} \ud83d\udc4b Comment puis-je vous aider \u00e0 propulser votre carri\u00e8re ?`,
      en: `${name} \ud83d\udc4b How can I help you advance your career?`,
      ar: `${name} \ud83d\udc4b \u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u064a \u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u0645\u0633\u0627\u0631\u0643 \u0627\u0644\u0645\u0647\u0646\u064a\u061f`,
      es: `${name} \ud83d\udc4b \u00bfC\u00f3mo puedo ayudarte a impulsar tu carrera?`,
    }
    return greetings[lang]
  }

  const placeholderText: Record<CVLanguage, string> = {
    fr: '\u00c9crivez votre message...',
    en: 'Type your message...',
    ar: '\u0627\u0643\u062a\u0628 \u0631\u0633\u0627\u0644\u062a\u0643...',
    es: 'Escribe tu mensaje...',
  }

  const modeSuggestions = SUGGESTION_KEYS.filter(s => s.mode === mode)
  const showSuggestions = messages.length <= 1 && !isLoading

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(mode) }])
    }
  }, [isOpen, mode])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }])
    setIsLoading(true)
    events.chatbotMessageSent(mode)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          mode,
          conversationHistory: messages.slice(-6)
        })
      })
      const data = await res.json()
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        const errMsg: Record<CVLanguage, string> = {
          fr: 'D\u00e9sol\u00e9, une erreur est survenue.',
          en: 'Sorry, an error occurred.',
          ar: '\u0639\u0630\u0631\u0627\u064b\u060c \u062d\u062f\u062b \u062e\u0637\u0623.',
          es: 'Lo siento, ocurri\u00f3 un error.',
        }
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg[lang] }])
      }
    } catch {
      const connErr: Record<CVLanguage, string> = {
        fr: 'Erreur de connexion. R\u00e9essayez.',
        en: 'Connection error. Please retry.',
        ar: '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
        es: 'Error de conexi\u00f3n. Intenta de nuevo.',
      }
      setMessages(prev => [...prev, { role: 'assistant', content: connErr[lang] }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => sendMessage(input)

  const handleSuggestionClick = (suggestionKey: SuggestionKey) => {
    const text = t(lang, suggestionKey)
    sendMessage(text)
  }

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className={`fixed bottom-6 z-50 ${isRTL ? 'left-6' : 'right-6'}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {!isOpen && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Button
              size="lg"
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl cursor-pointer"
              onClick={() => setIsOpen(true)}
              aria-label={t(lang, 'chatbotOpenAria')}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`fixed bottom-6 z-50 ${isRTL ? 'left-6' : 'right-6'}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`w-[340px] sm:w-[400px] h-[540px] flex flex-col shadow-2xl rounded-2xl overflow-hidden border ${isRTL ? 'font-sans' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block leading-tight">{t(lang, 'chatbotHireNovaAI')}</span>
                    <span className="text-emerald-100 text-[10px]">{t(lang, MODE_TABS.find(t2 => t2.mode === mode)!.labelKey)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-lg p-1.5 cursor-pointer transition-colors"
                  aria-label={t(lang, 'chatbotCloseAria')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Toggle — 3 large buttons */}
              <div className="flex gap-2 p-3 bg-muted/30 border-b" role="tablist" aria-label={t(lang, 'chatbotModeAria')}>
                {MODE_TABS.map((tab) => {
                  const IconComp = tab.IconComp
                  const isActive = mode === tab.mode
                  return (
                    <button
                      key={tab.mode}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => { setMode(tab.mode); setMessages([]) }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-white text-muted-foreground hover:bg-muted/50 border'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{t(lang, tab.labelKey)}</span>
                    </button>
                  )
                })}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                role="tabpanel"
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white border shadow-sm rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Action Suggestions */}
              {showSuggestions && (
                <div className="px-3 pb-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {modeSuggestions.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handleSuggestionClick(s.key)}
                        className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t(lang, s.key)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t bg-white">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholderText[lang]}
                    className="flex-1 text-sm rounded-full"
                    disabled={isLoading}
                    aria-label={t(lang, 'chatbotMsgInputAria')}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    disabled={!input.trim() || isLoading}
                    aria-label={t(lang, 'chatbotSendAria')}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
