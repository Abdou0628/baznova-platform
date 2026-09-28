'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Star, Send, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

function tx(lang: CVLanguage, key: string): string {
  return t(key as any, lang) || key
}

const categories = ['bug', 'feature', 'general', 'ux'] as const
const categoryKeys: Record<string, string> = {
  bug: 'bf.categoryBug',
  feature: 'bf.categoryFeature',
  general: 'bf.categoryGeneral',
  ux: 'bf.categoryUX',
}

type FeedbackState = 'idle' | 'sending' | 'success' | 'error'

export function BetaFeedback() {
  const { language } = useCVStore()
  const lang = language as CVLanguage
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<string>('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [state, setState] = useState<FeedbackState>('idle')

  const handleSubmit = async () => {
    if (!category || message.trim().length < 10) return

    setState('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          rating: rating > 0 ? rating : null,
          page: 'earlyAccess',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit')
      }

      setState('success')
      // Reset after showing success
      setTimeout(() => {
        setState('idle')
        setCategory('')
        setMessage('')
        setRating(0)
        setIsOpen(false)
      }, 2000)
    } catch {
      setState('error')
    }
  }

  const canSubmit = category && message.trim().length >= 10 && state === 'idle'

  return (
    <>
      {/* ── Floating Button ── */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-300 transition-colors"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <MessageCircle className="w-5 h-5" />
        </motion.div>
        <span className="text-sm font-medium">{tx(lang, 'bf.label')}</span>
      </motion.button>

      {/* ── Feedback Dialog ── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-emerald-950 border-emerald-500/20 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              {tx(lang, 'bf.title')}
            </DialogTitle>
            <DialogDescription className="text-emerald-200/60 sr-only">
              {tx(lang, 'bf.title')}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {state === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <p className="text-emerald-200 text-lg font-medium">{tx(lang, 'bf.success')}</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5 pt-2"
              >
                {/* Category Select */}
                <div className="space-y-2">
                  <Label className="text-emerald-200 text-sm">{tx(lang, 'bf.category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/5 border-emerald-500/20 text-white focus:ring-emerald-500/30">
                      <SelectValue placeholder={tx(lang, 'bf.category')} />
                    </SelectTrigger>
                    <SelectContent className="bg-emerald-950 border-emerald-500/20">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-white focus:bg-emerald-500/20 focus:text-white">
                          {tx(lang, categoryKeys[cat])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message Textarea */}
                <div className="space-y-2">
                  <Label className="text-emerald-200 text-sm">{tx(lang, 'bf.message')}</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); if (state === 'error') setState('idle') }}
                    placeholder={tx(lang, 'bf.messagePh')}
                    className="bg-white/5 border-emerald-500/20 text-white placeholder:text-emerald-200/30 focus:ring-emerald-500/30 min-h-[100px] resize-none"
                  />
                  {message.length > 0 && message.length < 10 && (
                    <p className="text-amber-400/80 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {tx(lang, 'bf.minChars')} ({message.length}/10)
                    </p>
                  )}
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <Label className="text-emerald-200 text-sm">{tx(lang, 'bf.rating')}</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star === rating ? 0 : star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-emerald-200/30'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error State */}
                {state === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {tx(lang, 'bf.error')}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit && state !== 'sending'}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white border-0 rounded-xl transition-all disabled:opacity-50"
                >
                  {state === 'sending' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {tx(lang, 'bf.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {tx(lang, 'bf.submit')}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  )
}
