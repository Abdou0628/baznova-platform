'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Globe, Settings, ArrowRight, ArrowLeft, Check, Building2, Loader2, Upload, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

const STEPS = ['whiteLabelStepCompany', 'whiteLabelStepDomain', 'whiteLabelStepFeatures', 'whiteLabelStepReview'] as const
const STEP_ICONS = [Palette, Globe, Settings, Check]

const MODULES = [
  { id: 'cv', labelKey: 'whiteLabelModCv' as const },
  { id: 'cl', labelKey: 'whiteLabelModCl' as const },
  { id: 'ats', labelKey: 'whiteLabelModAts' as const },
  { id: 'jobs', labelKey: 'whiteLabelModJobs' as const },
  { id: 'interview', labelKey: 'whiteLabelModInterview' as const },
  { id: 'linkedin', labelKey: 'whiteLabelModLinkedin' as const },
]

export default function WhiteLabelSetup() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#059669')
  const [domain, setDomain] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [plan, setPlan] = useState('starter')

  const toggleModule = (modId: string) => {
    setSelectedModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    )
  }

  const handleLaunch = async () => {
    if (!companyName.trim()) {
      toast.error(t(language, 'wlCompanyNameRequired'))
      return
    }
    setLoading(true)
    try {
      await fetch('/api/white-label/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          logoUrl,
          primaryColor,
          domain,
          enabledModules: JSON.stringify(selectedModules),
          plan,
        }),
      })
      toast.success(t(language, 'wlPlatformLaunched'))
      setStep('whiteLabelDashboard')
    } catch {
      toast.error(t(language, 'wlErrorTenant'))
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    if (currentStep === 0) return companyName.trim().length > 0
    if (currentStep === 2) return selectedModules.length > 0
    return true
  }

  const stepProgress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => setStep('whiteLabelHome')}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
            {t(language, 'whiteLabelGoBack')}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'whiteLabelSetupTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t(language, 'whiteLabelSetupSubtitle')}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((stepKey, i) => {
              const StepIcon = STEP_ICONS[i]
              const isActive = i <= currentStep
              const isCurrent = i === currentStep
              return (
                <div key={stepKey} className="flex items-center gap-2 cursor-pointer" onClick={() => i < currentStep && setCurrentStep(i)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                  } ${isCurrent ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}>
                    {i < currentStep ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`hidden sm:inline text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(language, stepKey)}
                  </span>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 hidden sm:block mx-2 ${i < currentStep ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                </div>
              )
            })}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <motion.div className="bg-slate-900 h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${stepProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 20 : -20 }} transition={{ duration: 0.2 }}>
              <Card className="border-slate-200">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-slate-600" />
                    {t(language, 'whiteLabelStepCompany')}
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="companyName" className="text-sm font-medium mb-2 block">{t(language, 'whiteLabelCompanyName')} *</Label>
                      <Input id="companyName" placeholder={t(language, 'whiteLabelCompanyNamePh')} value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t(language, 'whiteLabelLogo')}</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                          {logoUrl ? (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-slate-500" />
                            </div>
                          ) : (
                            <Upload className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <Input placeholder={t(language, 'whiteLabelUploadLogo')} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="primaryColor" className="text-sm font-medium mb-2 block">{t(language, 'whiteLabelPrimaryColor')}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer" />
                        <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="max-w-[200px]" />
                        <div className="flex gap-2">
                          {['#059669', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0d9488'].map(c => (
                            <button key={c} className={`w-8 h-8 rounded-full border-2 transition-all ${primaryColor === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setPrimaryColor(c)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 20 : -20 }} transition={{ duration: 0.2 }}>
              <Card className="border-slate-200">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-slate-600" />
                    {t(language, 'whiteLabelStepDomain')}
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="domain" className="text-sm font-medium mb-2 block">{t(language, 'whiteLabelDomainName')}</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="domain" placeholder={t(language, 'whiteLabelDomainPh')} value={domain} onChange={e => setDomain(e.target.value)} className="pl-10" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{t(language, 'whiteLabelSslAuto')}</p>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">{t(language, 'whiteLabelSsl')}</p>
                        <p className="text-xs text-emerald-600">{t(language, 'whiteLabelSslAuto')}</p>
                      </div>
                      <Badge className="ml-auto bg-emerald-600 text-white text-xs">SSL</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 20 : -20 }} transition={{ duration: 0.2 }}>
              <Card className="border-slate-200">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-600" />
                    {t(language, 'whiteLabelStepFeatures')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{t(language, 'whiteLabelSelectModules')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MODULES.map(mod => (
                      <label key={mod.id} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedModules.includes(mod.id) ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        <Checkbox checked={selectedModules.includes(mod.id)} onCheckedChange={() => toggleModule(mod.id)} />
                        <span className="text-sm font-medium text-foreground">{t(language, mod.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 20 : -20 }} transition={{ duration: 0.2 }}>
              <Card className="border-slate-200">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Check className="w-5 h-5 text-slate-600" />
                    {t(language, 'whiteLabelReviewTitle')}
                  </h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t(language, 'whiteLabelReviewCompany')}</p>
                        <p className="font-semibold text-foreground">{companyName || '—'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t(language, 'whiteLabelReviewDomain')}</p>
                        <p className="font-semibold text-foreground">{domain || '—'}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{t(language, 'whiteLabelReviewModules')}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedModules.length > 0 ? selectedModules.map(modId => {
                          const mod = MODULES.find(m => m.id === modId)
                          return mod ? <Badge key={modId} variant="secondary" className="bg-slate-200 text-slate-800">{t(language, mod.labelKey)}</Badge> : null
                        }) : <span className="text-sm text-muted-foreground">—</span>}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t(language, 'whiteLabelReviewPlan')}</p>
                      <p className="font-semibold text-foreground capitalize">{plan}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <Button variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)} className="gap-2">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t(language, 'whiteLabelBack')}
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canNext()} className="bg-slate-900 hover:bg-slate-800 gap-2">
              {t(language, 'whiteLabelNext')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          ) : (
            <Button onClick={handleLaunch} disabled={loading} className="bg-slate-900 hover:bg-slate-800 gap-2 px-8">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t(language, 'whiteLabelLaunch')}
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
