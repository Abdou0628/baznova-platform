'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, CreditCard, Zap, Activity, Globe, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

export default function ApiDashboardView() {
  const { setStep, language } = useCVStore()
  const isRTL = language === 'ar'
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const dateLocale: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', es: 'es-ES' }
  const locale = dateLocale[language] || 'fr-FR'

  useEffect(() => {
    fetch('/api/v1/usage')
      .then(r => r.json())
      .then(d => setUsage(d.data || d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const creditsUsed = usage?.creditsUsed || 0
  const creditsLimit = usage?.creditsLimit || 100
  const percentage = creditsLimit === 999999 ? 0 : Math.round((creditsUsed / creditsLimit) * 100)
  const isUnlimited = creditsLimit >= 999999

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-1' : 'mr-1'}`} /> {t(language, 'orchBack')}
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-emerald-600" /> {t(language, 'apiDashTitle')}
          </h1>
        </div>

        {!loading && !usage && (
          <Card className="max-w-2xl mx-auto text-center p-12">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">{t(language, 'apiDashNoKey')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t(language, 'apiDashNoKeyDesc')}</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer" onClick={() => setStep('apiRegister')}>{t(language, 'apiDashGetKey')}</Button>
          </Card>
        )}

        {usage && (
          <>
            {/* Credits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2"><CreditCard className="w-5 h-5 text-emerald-600" /><span className="text-sm text-muted-foreground">{t(language, 'apiDashCredits')}</span></div>
                    <p className="text-2xl font-bold">{isUnlimited ? `∞ ${t(language, 'apiDashUnlimited')}` : `${creditsUsed} / ${creditsLimit}`}</p>
                    {!isUnlimited && <Progress value={percentage} className="mt-2" />}
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2"><Zap className="w-5 h-5 text-amber-500" /><span className="text-sm text-muted-foreground">{t(language, 'apiDashPlan')}</span></div>
                    <p className="text-2xl font-bold capitalize">{usage.plan || 'starter'}</p>
                    <Badge variant="outline" className="mt-2 capitalize">{usage.status || 'active'}</Badge>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-blue-500" /><span className="text-sm text-muted-foreground">{t(language, 'apiDashTotalReqs')}</span></div>
                    <p className="text-2xl font-bold">{usage.logs?.length || 0}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Usage Logs */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t(language, 'apiDashLogsTitle')}</h2>
                {usage.logs?.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {usage.logs.map((log: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">{log.status}</Badge>
                        <code className="flex-1 text-xs">{log.endpoint}</code>
                        <Badge variant="outline" className="text-xs">{log.credits} {t(language, 'apiDashCredit')}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString(locale)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{t(language, 'apiDashNoUsage')}</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
