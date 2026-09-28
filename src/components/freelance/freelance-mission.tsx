'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, DollarSign, Clock, Star, Send, Sparkles, FileText, User, Calendar, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Mission {
  id: string; title: string; description: string; category: string
  budgetMin: number; budgetMax: number; currency: string; duration: string
  skills: string; status: string; createdAt: string
  user: { name: string; companyName: string | null; image: string | null }
  _count: { proposals: number }
}

const categoryColors: Record<string, string> = {
  tech: 'bg-emerald-100 text-emerald-700', design: 'bg-pink-100 text-pink-700',
  marketing: 'bg-amber-100 text-amber-700', writing: 'bg-violet-100 text-violet-700',
  translation: 'bg-sky-100 text-sky-700', consulting: 'bg-orange-100 text-orange-700',
  video: 'bg-rose-100 text-rose-700', data: 'bg-teal-100 text-teal-700',
}

const categoryKeyMap: Record<string, string> = {
  tech: 'freelanceCategoryTech', design: 'freelanceCategoryDesign',
  marketing: 'freelanceCategoryMarketing', writing: 'freelanceCategoryWriting',
  translation: 'freelanceCategoryTranslation', consulting: 'freelanceCategoryConsulting',
  video: 'freelanceCategoryVideo', data: 'freelanceCategoryData',
}

export default function FreelanceMission() {
  const { language, setStep, stepData } = useCVStore()
  const isRtl = language === 'ar'
  const missionId = stepData?.missionId as string | undefined

  const [mission, setMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [coverLetter, setCoverLetter] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!missionId) { setLoading(false); return }
    fetch('/api/freelance/missions?keyword=')
      .then(r => r.json())
      .then(data => {
        const m = (data.missions || []).find((m: Mission) => m.id === missionId)
        if (m) setMission(m)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Check if already applied
    fetch(`/api/freelance/proposals?missionId=${missionId}&userId=demo-user`)
      .then(r => r.json())
      .then(data => {
        if (data.proposals && data.proposals.length > 0) setAlreadyApplied(true)
      })
      .catch(() => {})
  }, [missionId])

  const handleAiGenerate = async () => {
    if (!mission) return
    setGenerating(true)
    try {
      const res = await fetch('/api/freelance/proposal-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionTitle: mission.title,
          missionDescription: mission.description,
          missionSkills: mission.skills,
          language,
        }),
      })
      const data = await res.json()
      if (data.proposal) setCoverLetter(data.proposal)
    } catch { /* ignore */ } finally { setGenerating(false) }
  }

  const handleSubmit = async () => {
    if (!mission || !coverLetter || !proposedRate || !estimatedDelivery) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/freelance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: mission.id,
          userId: 'demo-user',
          coverLetter,
          proposedRate: Number(proposedRate),
          estimatedDelivery,
        }),
      })
      if (res.status === 201) {
        setAlreadyApplied(true)
        setShowForm(false)
      }
    } catch { /* ignore */ } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={() => setStep('freelanceBrowse' as AppStep)} className="cursor-pointer mb-4">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} /> {t(language, 'freelanceMissionBackToBrowse')}
          </Button>
          <p className="text-center text-muted-foreground py-20">{t(language, 'freelanceMissionNotFound')}</p>
        </div>
      </div>
    )
  }

  const skills: string[] = JSON.parse(mission.skills || '[]')

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setStep('freelanceBrowse' as AppStep)} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline ml-1">{t(language, 'freelanceMissionBackToBrowse')}</span>
          </Button>
        </div>

        {/* Mission Content */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary" className={categoryColors[mission.category] || 'bg-gray-100'}>
                  {t(language, (categoryKeyMap[mission.category] || 'freelanceCategoryTech') as any)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {mission._count.proposals} {t(language, 'freelanceMissionProposals')}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mb-4">{mission.title}</h1>

              {/* Client Info */}
              <div className="flex items-center gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{mission.user?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> 4.7
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" /> {t(language, 'freelanceMissionDescription')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{mission.description}</p>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h2 className="font-semibold text-sm mb-2">{t(language, 'freelanceMissionSkills')}</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Budget & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card className="bg-orange-50 border-orange-100">
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t(language, 'freelanceMissionBudget')}</p>
                      <p className="font-bold text-orange-700">
                        {mission.budgetMin.toLocaleString()} – {mission.budgetMax.toLocaleString()} {mission.currency}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-sky-50 border-sky-100">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t(language, 'freelanceMissionTimeline')}</p>
                      <p className="font-bold text-sky-700">{mission.duration}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Posted date */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t(language, 'freelanceMissionPostedOn')} {new Date(mission.createdAt).toLocaleDateString(isRtl ? 'ar-MA' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR')}
              </p>
            </CardContent>
          </Card>

          {/* Apply Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-500" />
                {alreadyApplied ? t(language, 'freelanceMissionAlreadyApplied') : t(language, 'freelanceMissionApplyNow')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alreadyApplied ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{t(language, 'freelanceMissionAlreadyApplied')}</span>
                </div>
              ) : !showForm ? (
                <Button className="bg-orange-500 hover:bg-orange-600 cursor-pointer w-full sm:w-auto" onClick={() => setShowForm(true)}>
                  <Send className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />{t(language, 'freelanceMissionApplyNow')}
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* AI Generate hint */}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" /> {t(language, 'freelanceMissionAiHint')}
                  </p>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t(language, 'freelanceMissionCoverLetter')}</label>
                    <Textarea
                      placeholder={t(language, 'freelanceMissionCoverLetterPlaceholder')}
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      rows={6}
                    />
                    <Button
                      variant="outline" size="sm" className="mt-2 text-orange-600 border-orange-200 cursor-pointer"
                      onClick={handleAiGenerate} disabled={generating}
                    >
                      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span className={`ml-2 ${generating ? '' : ''}`}>{generating ? t(language, 'freelanceMissionAiGenerating') : t(language, 'freelanceMissionAiGenerate')}</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t(language, 'freelanceMissionProposedRate')}</label>
                      <Input
                        type="number"
                        placeholder="1500"
                        value={proposedRate}
                        onChange={e => setProposedRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t(language, 'freelanceMissionEstimatedDelivery')}</label>
                      <Input
                        placeholder={t(language, 'freelanceMissionEstimatedDeliveryPlaceholder')}
                        value={estimatedDelivery}
                        onChange={e => setEstimatedDelivery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 cursor-pointer"
                      onClick={handleSubmit}
                      disabled={submitting || !coverLetter || !proposedRate || !estimatedDelivery}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className={`ml-2`}>{t(language, 'freelanceMissionSubmitProposal')}</span>
                    </Button>
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="cursor-pointer">
                      {t(language, 'freelanceCancelBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
