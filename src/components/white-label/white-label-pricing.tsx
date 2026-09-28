'use client'

import { motion } from 'framer-motion'
import { Check, Star, ArrowRight, ArrowLeft, Zap, Building2, Shield, Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const plans = [
  {
    planKey: 'whiteLabelPlanStarter' as const,
    priceKey: 'whiteLabelPlanStarterPrice' as const,
    descKey: 'whiteLabelPlanStarterDesc' as const,
    icon: Zap,
    accent: 'slate',
    features: [
      { key: 'whiteLabelFeatureCv' as const, included: true },
      { key: 'whiteLabelFeatureCl' as const, included: true },
      { key: 'whiteLabelFeatureAts' as const, included: true },
      { key: 'whiteLabelFeatureCustomDomain' as const, included: false },
      { key: 'whiteLabelFeatureWhiteLabel' as const, included: false },
      { key: 'whiteLabelFeatureApiAccess' as const, included: false },
      { key: 'whiteLabelFeatureAdminPanel' as const, included: true },
      { key: 'whiteLabelFeatureAnalytics' as const, included: false },
      { key: 'whiteLabelFeatureMultiTenant' as const, included: false },
      { key: 'whiteLabelFeaturePriority' as const, included: false },
      { key: 'whiteLabelFeatureCustomIntegration' as const, included: false },
      { key: 'whiteLabelFeatureDedicated' as const, included: false },
      { key: 'whiteLabelFeatureSla' as const, included: false },
    ],
    ctaKey: 'whiteLabelChoosePlan' as const,
    popular: false,
  },
  {
    planKey: 'whiteLabelPlanBusiness' as const,
    priceKey: 'whiteLabelPlanBusinessPrice' as const,
    descKey: 'whiteLabelPlanBusinessDesc' as const,
    icon: Star,
    accent: 'emerald',
    features: [
      { key: 'whiteLabelFeatureCv' as const, included: true },
      { key: 'whiteLabelFeatureCl' as const, included: true },
      { key: 'whiteLabelFeatureAts' as const, included: true },
      { key: 'whiteLabelFeatureJobs' as const, included: true },
      { key: 'whiteLabelFeatureInterview' as const, included: true },
      { key: 'whiteLabelFeatureApiAccess' as const, included: true },
      { key: 'whiteLabelFeatureAdminPanel' as const, included: true },
      { key: 'whiteLabelFeatureAnalytics' as const, included: true },
      { key: 'whiteLabelFeatureMultiTenant' as const, included: true },
      { key: 'whiteLabelFeaturePriority' as const, included: true },
      { key: 'whiteLabelFeatureCustomIntegration' as const, included: false },
      { key: 'whiteLabelFeatureDedicated' as const, included: false },
      { key: 'whiteLabelFeatureSla' as const, included: false },
    ],
    ctaKey: 'whiteLabelChoosePlan' as const,
    popular: true,
  },
  {
    planKey: 'whiteLabelPlanEnterprise' as const,
    priceKey: 'whiteLabelPlanEnterprisePrice' as const,
    descKey: 'whiteLabelPlanEnterpriseDesc' as const,
    icon: Crown,
    accent: 'amber',
    features: [
      { key: 'whiteLabelFeatureCv' as const, included: true },
      { key: 'whiteLabelFeatureCl' as const, included: true },
      { key: 'whiteLabelFeatureAts' as const, included: true },
      { key: 'whiteLabelFeatureJobs' as const, included: true },
      { key: 'whiteLabelFeatureInterview' as const, included: true },
      { key: 'whiteLabelFeatureLinkedin' as const, included: true },
      { key: 'whiteLabelFeatureRecruiter' as const, included: true },
      { key: 'whiteLabelFeatureCoach' as const, included: true },
      { key: 'whiteLabelFeatureFormation' as const, included: true },
      { key: 'whiteLabelFeatureFreelance' as const, included: true },
      { key: 'whiteLabelFeatureMarketplace' as const, included: true },
      { key: 'whiteLabelFeatureIntelligence' as const, included: true },
      { key: 'whiteLabelFeatureApiAccess' as const, included: true },
      { key: 'whiteLabelFeatureAdminPanel' as const, included: true },
      { key: 'whiteLabelFeatureAnalytics' as const, included: true },
      { key: 'whiteLabelFeatureMultiTenant' as const, included: true },
      { key: 'whiteLabelFeaturePriority' as const, included: true },
      { key: 'whiteLabelFeatureCustomIntegration' as const, included: true },
      { key: 'whiteLabelFeatureDedicated' as const, included: true },
      { key: 'whiteLabelFeatureSla' as const, included: true },
    ],
    ctaKey: 'whiteLabelContactSales' as const,
    popular: false,
  },
]

const featureLabels = plans[2].features.map(f => f.key)

export default function WhiteLabelPricing() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const accentClass = (accent: string, popular: boolean) => {
    if (popular) return 'border-emerald-500 shadow-lg bg-gradient-to-br from-emerald-50/50 to-white'
    if (accent === 'amber') return 'border-amber-400 bg-gradient-to-br from-amber-50/30 to-white'
    return 'border-slate-200'
  }

  const badgeClass = (accent: string, popular: boolean) => {
    if (popular) return 'bg-emerald-600 text-white'
    if (accent === 'amber') return 'bg-amber-600 text-white'
    return 'bg-slate-600 text-white'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => setStep('whiteLabelHome')}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
            {t(language, 'whiteLabelGoBack')}
          </Button>
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {t(language, 'whiteLabelTitle')}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t(language, 'whiteLabelPricingTitle')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t(language, 'whiteLabelPricingSubtitle')}</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.planKey}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
              >
                <Card className={`h-full relative ${accentClass(plan.accent, plan.popular)}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className={`${badgeClass(plan.accent, plan.popular)} px-4 py-1 text-xs font-semibold`}>
                        <Star className="w-3 h-3 mr-1" />
                        {t(language, 'lot4_whiteLabelPricing_popular')}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 sm:p-8 flex flex-col h-full">
                    <div className="mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        plan.popular ? 'bg-emerald-100 text-emerald-700' : plan.accent === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{t(language, plan.planKey)}</h3>
                      <p className="text-3xl font-bold text-foreground mt-2">{t(language, plan.priceKey)}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t(language, plan.descKey)}</p>
                    </div>

                    <div className="flex-1 space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <div key={feature.key} className="flex items-center gap-3">
                          {feature.included ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            </div>
                          )}
                          <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {t(language, feature.key)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`w-full py-3 text-sm font-semibold ${
                        plan.popular
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : plan.accent === 'amber'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                      onClick={() => {
                        if (plan.planKey === 'whiteLabelPlanEnterprise') {
                          setStep('whiteLabelHome')
                        } else {
                          setStep('whiteLabelSetup')
                        }
                      }}
                    >
                      {t(language, plan.ctaKey)}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Feature Comparison Table */}
        <Card className="border-slate-200">
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">
              {t(language, 'lot4_whiteLabelPricing_featureComparison')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 pr-4">
                      {t(language, 'lot4_whiteLabelPricing_feature')}
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 px-4">{t(language, 'whiteLabelPlanStarter')}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 px-4">{t(language, 'whiteLabelPlanBusiness')}</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 px-4">{t(language, 'whiteLabelPlanEnterprise')}</th>
                  </tr>
                </thead>
                <tbody>
                  {featureLabels.map((fKey) => {
                    const starter = plans[0].features.find(f => f.key === fKey)?.included ?? false
                    const business = plans[1].features.find(f => f.key === fKey)?.included ?? false
                    const enterprise = plans[2].features.find(f => f.key === fKey)?.included ?? false
                    return (
                      <tr key={fKey} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-sm text-foreground">{t(language, fKey)}</td>
                        <td className="py-3 px-4 text-center">
                          {starter ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {business ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {enterprise ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Button size="lg" className="bg-slate-900 hover:bg-slate-800 px-8 py-6 text-base font-semibold" onClick={() => setStep('whiteLabelSetup')}>
            {t(language, 'whiteLabelGoSetup')}
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}
