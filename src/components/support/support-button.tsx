'use client'

import { useState } from 'react'
import { MessageCircle, Send, Loader2, Bug, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

export default function SupportButton() {
  const { language } = useCVStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const getSubjectLabel = (key: string): string => {
    if (key === 'bug') return t(language, 'supSubjectBug')
    if (key === 'payment') return t(language, 'supSubjectPayment')
    if (key === 'question') return t(language, 'supSubjectQuestion')
    if (key === 'other') return t(language, 'supSubjectOther')
    return key
  }

  const handleSubmit = async () => {
    const subject = selectedSubject === 'other' ? customSubject : getSubjectLabel(selectedSubject)
    if (!name.trim() || !subject || !message.trim()) {
      toast.error(t(language, 'supFillFields'))
      return
    }

    if (email.trim() && !email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error(t(language, 'supInvalidEmail'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || 'non-connecte@hirenova.app',
          subject,
          message: message.trim(),
        }),
      })
      if (res.ok) {
        toast.success(t(language, 'supSuccess'))
        setOpen(false)
        setSelectedSubject('')
        setCustomSubject('')
        setMessage('')
        setName('')
        setEmail('')
      } else {
        const data = await res.json()
        toast.error(data.error || t(language, 'supError'))
      }
    } catch {
      toast.error(t(language, 'supConnectionError'))
    } finally {
      setLoading(false)
    }
  }

  const subjectButtons: Array<{ key: string; label: string; Icon: React.ElementType; color: string }> = [
    { key: 'bug', label: t(language, 'supSubjectBug'), Icon: Bug, color: 'text-red-500' },
    { key: 'payment', label: t(language, 'supSubjectPayment'), Icon: MessageCircle, color: 'text-amber-500' },
    { key: 'question', label: t(language, 'supSubjectQuestion'), Icon: HelpCircle, color: 'text-sky-500' },
    { key: 'other', label: t(language, 'supSubjectOther'), Icon: MessageCircle, color: 'text-muted-foreground' },
  ]

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        aria-label={t(language, 'supAriaLabel')}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
              </div>
              {t(language, 'supTitle')}
            </DialogTitle>
            <DialogDescription>
              {t(language, 'supDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t(language, 'supNameLabel')}</Label>
              <Input
                placeholder={t(language, 'supNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t(language, 'supEmailLabel')}</Label>
              <Input
                placeholder="votre@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t(language, 'supSubjectLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {subjectButtons.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSelectedSubject(s.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm text-left transition-all cursor-pointer ${
                      selectedSubject === s.key
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <s.Icon className={`w-4 h-4 shrink-0 ${selectedSubject === s.key ? 'text-emerald-600' : s.color}`} />
                    <span className="text-xs font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom subject for 'other' */}
            {selectedSubject === 'other' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t(language, 'supSpecifySubject')}</Label>
                <Input
                  placeholder={t(language, 'supSpecifySubjectPlaceholder')}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t(language, 'supMessageLabel')}</Label>
              <Textarea
                placeholder={t(language, 'supMessagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedSubject || !message.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Send className="mr-2 w-4 h-4" />}
              {t(language, 'supSend')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}