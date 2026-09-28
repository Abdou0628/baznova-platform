'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2, CheckCircle2, Upload, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCVStore } from '@/store/cv-store'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'

export default function GlobalApplyView() {
  const { setStep, stepData, language } = useCVStore()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [cvFile, setCvFile] = useState<string | null>(null)
  const jobId = stepData?.jobId as string

  const handleSubmit = async () => {
    if (!fullName || !email) { toast.error(t(language, 'gApplyErrorNameEmail')); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/global-jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName: fullName, candidateEmail: email, coverNote, cvFile })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t(language, 'gApplySuccessScore').replace('{score}', String(data.matchScore)))
        setStep('globalMarket')
      } else { toast.error(data.error?.message || t(language, 'gApplyError')) }
    } catch { toast.error(t(language, 'gApplyConnectionError')) }
    finally { setLoading(false) }
  }

  const handleFileSelect = () => setCvFile('cv_attached.pdf')

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('globalJobDetail', { jobId })} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t(language, 'gApplyBack')}
          </Button>
          <Globe className="text-teal-600" />
          <div>
            <h1 className="text-xl font-bold">{t(language, 'gApplyTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t(language, 'gApplySubtitle')}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gApplyFullName')}</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gApplyEmail')}</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gApplyPhone')}</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
            </div>
          </div>

          {/* CV Upload Zone */}
          <Card className="border-dashed cursor-pointer hover:border-teal-300 transition-colors" onClick={handleFileSelect}>
            <CardContent className="p-6 text-center">
              {cvFile ? (
                <div className="flex items-center justify-center gap-2 text-teal-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{t(language, 'gApplyCvAttached')}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">{t(language, 'gApplyDropCv')}</p>
                  <p className="text-xs text-muted-foreground">{t(language, 'gApplyFileTypes')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t(language, 'gApplyCoverNote')}</label>
            <Textarea value={coverNote} onChange={e => setCoverNote(e.target.value)}
              placeholder={t(language, 'gApplyCoverNotePlaceholder')}
              rows={4} />
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700 cursor-pointer py-5" onClick={handleSubmit} disabled={loading || !fullName || !email}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t(language, 'gApplySubmitting')}</> : <><Send className="w-4 h-4 mr-2" /> {t(language, 'gApplySubmit')}</>}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
