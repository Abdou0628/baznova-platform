'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Rocket, Check, Copy, Zap, Building2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

export default function ApiRegisterView() {
  const { setStep, language } = useCVStore()
  const isRTL = language === 'ar'
  const [plan, setPlan] = useState('business')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [form, setForm] = useState({ name: '', email: '', company: '', industry: '', website: '', phone: '' })

  const plans = [
    { id: 'starter', name: 'Starter', price: '49€', credits: '100', features: [t(language, 'apiRegStarterF1'), t(language, 'apiRegStarterF2'), t(language, 'apiRegStarterF3'), t(language, 'apiRegStarterF4')], popular: false },
    { id: 'business', name: 'Business', price: '149€', credits: '500', features: [t(language, 'apiRegBusinessF1'), t(language, 'apiRegBusinessF2'), t(language, 'apiRegBusinessF3'), t(language, 'apiRegBusinessF4'), t(language, 'apiRegBusinessF5')], popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '399€', credits: '∞', features: [t(language, 'apiRegEntF1'), t(language, 'apiRegEntF2'), t(language, 'apiRegEntF3'), t(language, 'apiRegEntF4'), t(language, 'apiRegEntF5'), t(language, 'apiRegEntF6')], popular: false },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.company) { toast.error(t(language, 'apiRegRequiredFields')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/api-portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan })
      })
      const data = await res.json()
      if (data.success && data.data?.apiKey) {
        setApiKey(data.data.apiKey)
        toast.success(t(language, 'apiRegSuccess'))
      } else { toast.error(data.error?.message || t(language, 'apiRegError')) }
    } catch { toast.error(t(language, 'apiRegError')) } finally { setLoading(false) }
  }

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-1' : 'mr-1'}`} /> {t(language, 'orchBack')}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Rocket className="text-emerald-600" /> {t(language, 'apiRegTitle')}
          </h1>
        </div>

        {apiKey ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="max-w-2xl mx-auto text-center p-8">
              <Check className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">{t(language, 'apiRegKeyReady')}</h2>
              <p className="text-sm text-amber-600 font-medium mb-4">{t(language, 'apiRegKeyWarning')}</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-6 break-all">{apiKey}</div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success(t(language, 'apiRegCopied')) }} className="cursor-pointer"><Copy className="w-4 h-4 mr-1" /> {t(language, 'apiRegCopy')}</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer" onClick={() => setStep('apiDocs')}>{t(language, 'apiRegViewDocs')}</Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {plans.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className={`cursor-pointer transition-all hover:shadow-lg ${plan === p.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}`} onClick={() => setPlan(p.id)}>
                    <CardContent className="p-5 text-center">
                      {p.popular && <Badge className="bg-emerald-600 mb-2">{t(language, 'apiRegPopular')}</Badge>}
                      <h3 className="text-lg font-bold">{p.name}</h3>
                      <div className="text-3xl font-bold text-emerald-600 my-2">{p.price}<span className="text-sm font-normal text-muted-foreground">/{t(language, 'apiRegPerMonth')}</span></div>
                      <p className="text-sm text-muted-foreground mb-4">{p.credits === '∞' ? t(language, 'apiRegUnlimited') : `${p.credits} ${t(language, 'apiRegCredits')}`}/{t(language, 'apiRegPerMonth')}</p>
                      <ul className="space-y-1 text-xs text-left">
                        {p.features.map((f, fi) => <li key={fi} className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> {f}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="max-w-2xl mx-auto">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-lg font-semibold mb-6">{t(language, 'apiRegFormTitle')}</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegName')} *</label><Input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegEmail')} *</label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegCompany')} *</label><Input value={form.company} onChange={e => update('company', e.target.value)} required /></div>
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegIndustry')}</label><Input value={form.industry} onChange={e => update('industry', e.target.value)} /></div>
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegWebsite')}</label><Input value={form.website} onChange={e => update('website', e.target.value)} /></div>
                      <div><label className="text-sm font-medium mb-1 block">{t(language, 'apiRegPhone')}</label><Input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer" disabled={loading}>
                      {loading ? t(language, 'apiRegSubmitting') : t(language, 'apiRegSubmit')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
