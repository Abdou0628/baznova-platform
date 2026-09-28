'use client'

import { motion } from 'framer-motion'
import { Palette, Globe, Settings, BarChart3, Check, ArrowRight, Building2, Shield, Zap, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const features = [
  { icon: Palette, titleKey: 'whiteLabelFeatureBranding' as const, descKey: 'whiteLabelFeatureBrandingDesc' as const, color: 'bg-slate-100 text-slate-700' },
  { icon: Globe, titleKey: 'whiteLabelFeatureDomain' as const, descKey: 'whiteLabelFeatureDomainDesc' as const, color: 'bg-emerald-100 text-emerald-700' },
  { icon: Settings, titleKey: 'whiteLabelFeatureApi' as const, descKey: 'whiteLabelFeatureApiDesc' as const, color: 'bg-sky-100 text-sky-700' },
  { icon: Shield, titleKey: 'whiteLabelFeatureAdmin' as const, descKey: 'whiteLabelFeatureAdminDesc' as const, color: 'bg-amber-100 text-amber-700' },
  { icon: BarChart3, titleKey: 'whiteLabelFeatureAnalytics' as const, descKey: 'whiteLabelFeatureAnalyticsDesc' as const, color: 'bg-violet-100 text-violet-700' },
  { icon: Users, titleKey: 'whiteLabelFeatureMultitenant' as const, descKey: 'whiteLabelFeatureMultitenantDesc' as const, color: 'bg-rose-100 text-rose-700' },
]

const steps = [
  { num: '01', titleKey: 'whiteLabelStep1Title' as const, descKey: 'whiteLabelStep1Desc' as const, step: 'whiteLabelHome' as AppStep },
  { num: '02', titleKey: 'whiteLabelStep2Title' as const, descKey: 'whiteLabelStep2Desc' as const, step: 'whiteLabelSetup' as AppStep },
  { num: '03', titleKey: 'whiteLabelStep3Title' as const, descKey: 'whiteLabelStep3Desc' as const, step: 'whiteLabelDashboard' as AppStep },
  { num: '04', titleKey: 'whiteLabelStep4Title' as const, descKey: 'whiteLabelStep4Desc' as const, step: 'whiteLabelPricing' as AppStep },
]

export default function WhiteLabelHome() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              {t(language, 'whiteLabelTitle')}
            </Badge>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t(language, 'whiteLabelHomeTitle')}
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              {t(language, 'whiteLabelHomeSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-slate-100 text-slate-900 hover:bg-white font-semibold px-8 py-6 text-base" onClick={() => setStep('whiteLabelSetup')}>
                <Zap className="w-4 h-4 mr-2" />
                {t(language, 'whiteLabelGetStarted')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
              </Button>
              <Button size="lg" variant="outline" className="border-slate-500 text-slate-200 hover:bg-slate-800 font-semibold px-8 py-6 text-base" onClick={() => setStep('whiteLabelPricing')}>
                {t(language, 'whiteLabelViewPricing')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">{t(language, 'whiteLabelTitle')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t(language, 'whiteLabelHomeSubtitle')}</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-slate-200">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t(language, feature.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(language, feature.descKey)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
              {t(language, 'lot4_whiteLabelHome_howItWorks')}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card
                  className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-slate-200"
                  onClick={() => setStep(s.step)}
                >
                  <CardContent className="p-6 text-center">
                    <span className="text-4xl font-bold text-slate-200 mb-3 block">{s.num}</span>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t(language, s.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">{t(language, s.descKey)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-10 text-center">{t(language, 'whiteLabelBenefitsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[t(language, 'whiteLabelBenefit1'), t(language, 'whiteLabelBenefit2'), t(language, 'whiteLabelBenefit3')].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="h-full border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-foreground font-medium leading-relaxed">{benefit}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">{t(language, 'whiteLabelCta')}</h2>
            <p className="text-slate-300 mb-8 text-lg">{t(language, 'whiteLabelHomeSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8 py-6 text-base" onClick={() => setStep('whiteLabelSetup')}>
                {t(language, 'whiteLabelGetStarted')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
              </Button>
              <Button size="lg" variant="outline" className="border-slate-500 text-slate-200 hover:bg-slate-800 font-semibold px-8 py-6 text-base" onClick={() => setStep('whiteLabelDashboard')}>
                {t(language, 'whiteLabelGoDashboard')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-foreground">{t(language, 'whiteLabelTitle')}</span>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('whiteLabelSetup')}>
                {t(language, 'whiteLabelGoSetup')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('whiteLabelPricing')}>
                {t(language, 'whiteLabelViewPricing')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('landing')}>
                {t(language, 'whiteLabelGoBack')}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
