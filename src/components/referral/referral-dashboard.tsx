'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Users,
  Gift,
  Clock,
  Send,
  Mail,
  Linkedin,
  Twitter,
  MessageCircle,
  ExternalLink,
  Sparkles,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCVStore } from '@/store/cv-store'
import { events } from '@/lib/analytics'
import { t } from '@/lib/i18n'

interface ReferralData {
  referralCode: string
  shareUrl: string
  shareLinks: {
    whatsapp: string
    linkedin: string
    twitter: string
    email: string
  }
}

interface ReferralStats {
  totalReferrals: number
  completedReferrals: number
  rewardedReferrals: number
  pendingReferrals: number
  freeMonthsEarned: number
  recentReferrals: Array<{
    id: string
    referredEmail: string
    status: string
    rewardType: string
    rewardValue: string
    createdAt: string
    completedAt: string | null
  }>
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`
}

function statusBadge(status: string, language: string) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50"><Clock className="w-3 h-3 mr-1" />{t(language, 'refStatusPending')}</Badge>
    case 'COMPLETED':
      return <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50"><CheckCircle2 className="w-3 h-3 mr-1" />{t(language, 'refStatusCompleted')}</Badge>
    case 'REWARDED':
      return <Badge className="bg-emerald-600 text-white"><Gift className="w-3 h-3 mr-1" />{t(language, 'refStatusRewarded')}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ReferralDashboard() {
  const { setStep, language } = useCVStore()
  const { data: session, status } = useSession()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrlCopied, setShareUrlCopied] = useState(false)

  const loadReferralData = useCallback(async () => {
    if (status !== 'authenticated') return
    try {
      setGenerating(true)
      const res = await fetch('/api/referral/generate', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setReferralData(json.data)
      }
    } catch {
      toast.error(t(language, 'refLoadError'))
    } finally {
      setGenerating(false)
    }
  }, [status, language])

  const loadStats = useCallback(async () => {
    if (status !== 'authenticated') return
    try {
      const res = await fetch('/api/referral/stats')
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadReferralData()
    loadStats()
  }, [loadReferralData, loadStats])

  const copyCode = async () => {
    if (!referralData?.referralCode) return
    await navigator.clipboard.writeText(referralData.referralCode)
    setCopied(true)
    toast.success(t(language, 'refCodeCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const copyShareLink = async () => {
    if (!referralData?.shareUrl) return
    await navigator.clipboard.writeText(referralData.shareUrl)
    setShareUrlCopied(true)
    events.referralShared('copy_link')
    toast.success(t(language, 'refLinkCopied'))
    setTimeout(() => setShareUrlCopied(false), 2000)
  }

  const shareTo = (channel: string, url: string) => {
    events.referralShared(channel)
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  const statCards = [
    {
      label: t(language, 'refStatTotal'),
      value: stats?.totalReferrals ?? 0,
      icon: Send,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t(language, 'refStatCompleted'),
      value: stats?.completedReferrals ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: t(language, 'refStatRewarded'),
      value: stats?.rewardedReferrals ?? 0,
      icon: Gift,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t(language, 'refStatFreeMonths'),
      value: stats?.freeMonthsEarned ?? 0,
      icon: Sparkles,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-emerald-50/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t(language, 'refLoginRequired')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t(language, 'refLoginRequiredDesc')}
            </p>
            <Button onClick={() => setStep('landing')} className="bg-emerald-600 hover:bg-emerald-700">
              {t(language, 'refBackHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/20 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('landing')}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t(language, 'refBack')}
          </Button>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-semibold">{t(language, 'refProgramTitle')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Banner */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t(language, 'refHeroTitle')}
                </h2>
                <p className="text-emerald-100 text-sm sm:text-base max-w-lg">
                  {t(language, 'refHeroDesc')}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Sparkles className="w-16 h-16 text-emerald-300/60" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              {t(language, 'refCodeTitle')}
            </CardTitle>
            <CardDescription>
              {t(language, 'refCodeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generating ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : referralData ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={referralData.referralCode}
                    className="font-mono text-lg font-bold text-center tracking-widest bg-emerald-50 border-emerald-200 text-emerald-700"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="shrink-0 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={referralData.shareUrl}
                    className="text-xs text-muted-foreground truncate"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyShareLink}
                    className="shrink-0"
                  >
                    {shareUrlCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <ExternalLink className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Share Buttons */}
                <div className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">{t(language, 'refShareVia')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareTo('whatsapp', referralData.shareLinks.whatsapp)}
                      className="gap-2 border-green-200 hover:bg-green-50 hover:text-green-700"
                    >
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareTo('linkedin', referralData.shareLinks.linkedin)}
                      className="gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <span className="hidden sm:inline">LinkedIn</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareTo('twitter', referralData.shareLinks.twitter)}
                      className="gap-2 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                    >
                      <Twitter className="w-4 h-4" />
                      <span className="hidden sm:inline">Twitter/X</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareTo('email', referralData.shareLinks.email)}
                      className="gap-2 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span className="hidden sm:inline">Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Copy className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">{t(language, 'refCopyLink')}</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t(language, 'refCodeLoadError')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
            <Card key={card.label} className="relative overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{loading ? '—' : card.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{card.label}</p>
              </CardContent>
            </Card>
            )
          })}
        </div>

        {/* Tabs: How it works + Recent Referrals */}
        <Tabs defaultValue="how-it-works" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="how-it-works" className="text-sm">{t(language, 'refTabHowItWorks')}</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              {t(language, 'refTabMyReferrals')}
              {stats && stats.totalReferrals > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{stats.totalReferrals}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="how-it-works">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{t(language, 'refStep1Title')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(language, 'refStep1Desc')}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{t(language, 'refStep2Title')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(language, 'refStep2Desc')}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-700 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{t(language, 'refStep3Title')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(language, 'refStep3Desc')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <Gift className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">{t(language, 'refUnlimitedReward')}</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        {t(language, 'refUnlimitedRewardDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t(language, 'refHistoryTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : !stats?.recentReferrals?.length ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t(language, 'refNoReferrals')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(language, 'refNoReferralsDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                    {stats.recentReferrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{maskEmail(ref.referredEmail)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(ref.createdAt)}</p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          {statusBadge(ref.status, language)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
