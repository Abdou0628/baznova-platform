'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, DollarSign, Star, FileText, Briefcase, Send, TrendingUp, Clock, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Proposal {
  id: string; coverLetter: string; proposedRate: number; estimatedDelivery: string
  status: string; createdAt: string; rating: number | null; review: string | null
  mission: { id: string; title: string; category: string; budgetMin: number; budgetMax: number; currency: string; status: string }
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const statusKeyMap: Record<string, string> = {
  pending: 'freelanceDashPending', accepted: 'freelanceDashAccepted',
  rejected: 'freelanceDashRejected', withdrawn: 'freelanceDashWithdrawn',
  'in-progress': 'freelanceDashInProgress', completed: 'freelanceDashCompleted',
}

// Demo data for dashboard stats (simulated)
const demoEarningsData = [
  { monthKey: 'lot5_freelance_jan', amount: 800 }, { monthKey: 'lot5_freelance_feb', amount: 1200 },
  { monthKey: 'lot5_freelance_mar', amount: 600 }, { monthKey: 'lot5_freelance_apr', amount: 1800 },
  { monthKey: 'lot5_freelance_may', amount: 1500 }, { monthKey: 'lot5_freelance_jun', amount: 2400 },
]
const maxEarning = Math.max(...demoEarningsData.map(e => e.amount))

export default function FreelanceDashboard() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/freelance/proposals?userId=demo-user')
      .then(r => r.json())
      .then(data => { setProposals(data.proposals || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pending = proposals.filter(p => p.status === 'pending').length
  const accepted = proposals.filter(p => p.status === 'accepted').length
  const activeMissions = proposals.filter(p => p.status === 'accepted' || p.mission.status === 'in-progress')
  const reviews = proposals.filter(p => p.rating)
  const totalEarned = proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + p.proposedRate, 0)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, p) => sum + (p.rating || 0), 0) / reviews.length).toFixed(1)
    : '—'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setStep('freelanceHome' as AppStep)} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline ml-1">{t(language, 'orchBack')}</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t(language, 'freelanceDashMyProposals')}</h1>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Send, label: t(language, 'freelanceDashPending'), value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: Briefcase, label: t(language, 'freelanceDashActiveMissions'), value: activeMissions.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: DollarSign, label: t(language, 'freelanceDashTotalEarned'), value: `${totalEarned.toLocaleString()} €`, color: 'text-orange-600', bg: 'bg-orange-50' },
            { icon: Star, label: t(language, 'freelanceDashAvgRating'), value: avgRating, color: 'text-sky-600', bg: 'bg-sky-50' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="proposals" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="proposals" className="cursor-pointer">{t(language, 'freelanceDashMyProposals')}</TabsTrigger>
            <TabsTrigger value="missions" className="cursor-pointer">{t(language, 'freelanceDashActiveMissions')}</TabsTrigger>
            <TabsTrigger value="earnings" className="cursor-pointer">{t(language, 'freelanceDashEarnings')}</TabsTrigger>
            <TabsTrigger value="reviews" className="cursor-pointer">{t(language, 'freelanceDashReviews')}</TabsTrigger>
          </TabsList>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
            ) : proposals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t(language, 'freelanceDashNoProposals')}</p>
                  <Button className="mt-3 bg-orange-500 hover:bg-orange-600 cursor-pointer" onClick={() => setStep('freelanceBrowse' as AppStep)}>
                    {t(language, 'freelanceHomeBrowseCta')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {proposals.map((proposal, i) => (
                  <motion.div key={proposal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="hover:shadow-sm transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-1">{proposal.mission.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proposal.coverLetter}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-medium text-orange-600">{proposal.proposedRate.toLocaleString()} €</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />{proposal.estimatedDelivery}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className={statusColors[proposal.status] || 'bg-gray-100'}>
                            {t(language, (statusKeyMap[proposal.status] || 'freelanceDashPending') as any)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Missions Tab */}
          <TabsContent value="missions">
            {activeMissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t(language, 'freelanceDashNoMissions')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeMissions.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-sm">{p.mission.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.mission.budgetMin.toLocaleString()} – {p.mission.budgetMax.toLocaleString()} {p.mission.currency}
                            </p>
                          </div>
                          <Button
                            variant="outline" size="sm"
                            className="text-xs cursor-pointer"
                            onClick={() => setStep('freelanceMission' as AppStep, { missionId: p.mission.id })}
                          >
                            <Eye className={`w-3 h-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />{t(language, 'freelanceDashViewMission')}
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t(language, 'freelanceDashMissionProgress')}</span>
                            <span className="font-medium">{Math.floor(Math.random() * 40 + 30)}%</span>
                          </div>
                          <Progress value={Math.floor(Math.random() * 40 + 30)} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />{t(language, 'freelanceDashMonthlyEarnings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demoEarningsData.map(entry => (
                    <div key={entry.monthKey} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8 shrink-0">{t(language, entry.monthKey as any)}</span>
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(entry.amount / maxEarning) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-md"
                        />
                      </div>
                      <span className="text-xs font-semibold w-16 text-right shrink-0">{entry.amount.toLocaleString()} €</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t(language, 'freelanceDashTotalEarned')}</span>
                  <span className="text-lg font-bold text-orange-600">{demoEarningsData.reduce((s, e) => s + e.amount, 0).toLocaleString()} €</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t(language, 'freelanceDashNoReviews')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= (r.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">— {r.mission.title}</span>
                        </div>
                        {r.review && <p className="text-sm text-muted-foreground">{r.review}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
