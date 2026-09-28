'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCVStore } from '@/store/cv-store'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'

const countries = ['France', 'Germany', 'UK', 'USA', 'Canada', 'UAE', 'Switzerland', 'Belgium', 'Spain', 'Italy', 'Japan', 'Australia', 'Morocco', 'Tunisia', 'Algeria', 'Brazil', 'Mexico', 'China', 'India', 'Singapore']
const regions = ['Europe', 'Asie', 'Afrique', 'Amériques', 'MENA']
const currencies = ['EUR', 'USD', 'GBP', 'MAD', 'CAD', 'AED', 'CHF', 'JPY', 'AUD', 'BRL', 'MXN', 'CNY', 'INR', 'SGD']
const types = ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance', 'Contrat']

const regionKeyMap: Record<string, string> = {
  'Monde': 'gMarketRegionMonde', 'Europe': 'gMarketRegionEurope', 'Asie': 'gMarketRegionAsie',
  'Afrique': 'gMarketRegionAfrique', 'Amériques': 'gMarketRegionAmeriques', 'MENA': 'gMarketRegionMENA',
}
const countryKeyMap: Record<string, string> = {
  'France': 'gMarketCountryFrance', 'Germany': 'gMarketCountryGermany', 'UK': 'gMarketCountryUK',
  'USA': 'gMarketCountryUSA', 'Canada': 'gMarketCountryCanada', 'UAE': 'gMarketCountryUAE',
  'Switzerland': 'gMarketCountrySwitzerland', 'Belgium': 'gMarketCountryBelgium', 'Spain': 'gMarketCountrySpain',
  'Italy': 'gMarketCountryItaly', 'Japan': 'gMarketCountryJapan', 'Australia': 'gMarketCountryAustralia',
  'Morocco': 'gMarketCountryMorocco', 'Tunisia': 'gMarketCountryTunisia', 'Algeria': 'gMarketCountryAlgeria',
  'Senegal': 'gMarketCountrySenegal', 'Nigeria': 'gMarketCountryNigeria', 'Kenya': 'gMarketCountryKenya',
  'China': 'gMarketCountryChina', 'India': 'gMarketCountryIndia', 'Singapore': 'gMarketCountrySingapore',
  'Brazil': 'gMarketCountryBrazil', 'Mexico': 'gMarketCountryMexico', 'Saudi': 'gMarketCountrySaudi',
}
const typeKeyMap: Record<string, string> = {
  'CDI': 'gPostJobTypeCDI', 'CDD': 'gPostJobTypeCDD', 'Freelance': 'gPostJobTypeFreelance',
  'Stage': 'gPostJobTypeInternship', 'Alternance': 'gPostJobTypeAlternance', 'Contrat': 'gPostJobTypeContract',
}

export default function GlobalPostJobView() {
  const { setStep, language } = useCVStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', company: '', location: '', country: 'France', region: 'Europe',
    type: 'CDI', salaryMin: '', salaryMax: '', currency: 'EUR',
    description: '', requirements: '', skills: '', language: 'fr',
    visaSponsorship: false, relocationPackage: false, isRemote: false,
  })

  const update = (key: string, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }))
  const tc = (name: string) => t(language, countryKeyMap[name] || name)
  const tr = (name: string) => t(language, regionKeyMap[name] || name)
  const tt = (name: string) => t(language, typeKeyMap[name] || name)

  const handleSubmit = async () => {
    if (!form.title || !form.company) { toast.error(t(language, 'gPostJobErrorTitleCompany')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/global-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
          salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t(language, 'gPostJobSuccess'))
        setStep('globalEmployerDashboard')
      } else { toast.error(t(language, 'gPostJobPublishError')) }
    } catch { toast.error(t(language, 'gPostJobConnectionError')) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('globalEmployerDashboard')} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t(language, 'gPostJobBack')}
          </Button>
          <Globe className="text-teal-600" />
          <div>
            <h1 className="text-xl font-bold">{t(language, 'gPostJobTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t(language, 'gPostJobSubtitle')}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobJobTitle')}</label>
              <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Software Engineer Senior" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobCompany')}</label>
              <Input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobCity')}</label>
              <Input value={form.location} onChange={e => update('location', e.target.value)} placeholder="Paris" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobCountry')}</label>
              <select value={form.country} onChange={e => update('country', e.target.value)} className="w-full h-9 rounded-md border bg-white px-3 text-sm">
                {countries.map(c => <option key={c} value={c}>{tc(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobRegion')}</label>
              <select value={form.region} onChange={e => update('region', e.target.value)} className="w-full h-9 rounded-md border bg-white px-3 text-sm">
                {regions.map(r => <option key={r} value={r}>{tr(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobContractType')}</label>
              <select value={form.type} onChange={e => update('type', e.target.value)} className="w-full h-9 rounded-md border bg-white px-3 text-sm">
                {types.map(tp => <option key={tp} value={tp}>{tt(tp)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobCurrency')}</label>
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className="w-full h-9 rounded-md border bg-white px-3 text-sm">
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobSalaryMin')}</label>
              <Input type="number" value={form.salaryMin} onChange={e => update('salaryMin', e.target.value)} placeholder="35000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobSalaryMax')}</label>
              <Input type="number" value={form.salaryMax} onChange={e => update('salaryMax', e.target.value)} placeholder="55000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobLanguage')}</label>
              <select value={form.language} onChange={e => update('language', e.target.value)} className="w-full h-9 rounded-md border bg-white px-3 text-sm">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobSkillsLabel')}</label>
            <Input value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="React, TypeScript, Node.js, AWS" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobDescription')}</label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder={t(language, 'gPostJobDescriptionPlaceholder')} rows={4} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t(language, 'gPostJobRequirements')}</label>
            <Textarea value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder={t(language, 'gPostJobRequirementsPlaceholder')} rows={3} />
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium text-sm">{t(language, 'gPostJobInternationalOptions')}</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.visaSponsorship} onChange={e => update('visaSponsorship', e.target.checked)} className="rounded" />
                  {t(language, 'gPostJobVisaSponsorship')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.relocationPackage} onChange={e => update('relocationPackage', e.target.checked)} className="rounded" />
                  {t(language, 'gPostJobRelocationPackage')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isRemote} onChange={e => update('isRemote', e.target.checked)} className="rounded" />
                  {t(language, 'gPostJobRemote')}
                </label>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full bg-teal-600 hover:bg-teal-700 cursor-pointer py-5" onClick={handleSubmit} disabled={loading || !form.title || !form.company}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t(language, 'gPostJobPublishing')}</> : <><Send className="w-4 h-4 mr-2" /> {t(language, 'gPostJobPublish')}</>}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
