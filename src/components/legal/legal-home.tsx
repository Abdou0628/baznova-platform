'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scale, FileText, Shield, CheckCircle, Download, ArrowRight, AlertTriangle, Gavel, ClipboardList, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface LegalDoc {
  id: string
  title: string
  type: string
  status: string
  createdAt: string
}

const navSteps: { icon: typeof Scale; labelKey: 'legalGenerateContract' | 'legalCheckCompliance' | 'legalBrowseTemplates'; step: AppStep; desc: string }[] = [
  { icon: Gavel, labelKey: 'legalGenerateContract', step: 'legalContracts' as AppStep, desc: 'legalContractsTitle' },
  { icon: Shield, labelKey: 'legalCheckCompliance', step: 'legalCompliance' as AppStep, desc: 'legalComplianceTitle' },
  { icon: BookOpen, labelKey: 'legalBrowseTemplates', step: 'legalTemplates' as AppStep, desc: 'legalTemplatesTitle' },
]

export default function LegalHome() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [docs, setDocs] = useState<LegalDoc[]>([])
  const [stats, setStats] = useState({ contracts: 0, compliance: 0 })

  useEffect(() => {
    fetch('/api/legal/templates')
      .then(r => r.json())
      .then(data => {
        const templates = Array.isArray(data) ? data : data.templates || []
        setStats(s => ({ ...s, contracts: templates.length }))
      })
      .catch(() => {})
  }, [])

  const typeColors: Record<string, string> = {
    employment: 'bg-emerald-100 text-emerald-700',
    nda: 'bg-red-100 text-red-700',
    service: 'bg-sky-100 text-sky-700',
    'non-compete': 'bg-amber-100 text-amber-700',
    ip: 'bg-violet-100 text-violet-700',
    privacy: 'bg-teal-100 text-teal-700',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    finalized: 'bg-emerald-100 text-emerald-700',
    signed: 'bg-sky-100 text-sky-700',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/40 via-white to-slate-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-800 to-slate-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-red-800/80 text-red-100 border-red-700 hover:bg-red-700/80">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              {t(language, 'legalTitle')}
            </Badge>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t(language, 'legalHomeTitle')}
            </h1>
            <p className="text-lg sm:text-xl text-red-100/80 max-w-3xl mx-auto mb-8 leading-relaxed">
              {t(language, 'legalHomeSubtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: FileText, label: t(language, 'legalContractsGenerated'), value: stats.contracts, color: 'text-red-600 bg-red-50 border-red-200' },
            { icon: ClipboardList, label: t(language, 'legalTemplatesUsed'), value: 8, color: 'text-sky-600 bg-sky-50 border-sky-200' },
            { icon: Shield, label: t(language, 'legalComplianceScore'), value: `${stats.compliance}%`, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className={`border ${stat.color}`}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color.split(' ')[1]}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[0]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">{t(language, 'legalHomeTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {navSteps.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card
                    className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-red-200 cursor-pointer bg-gradient-to-br from-red-50/50 to-white"
                    onClick={() => setStep(item.step)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStep(item.step) } }}
                  >
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t(language, item.labelKey)}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t(language, item.desc as 'legalContractsTitle')}</p>
                      <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                        <span>{t(language, item.labelKey)}</span>
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Documents */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t(language, 'legalRecentDocs')}</h2>
          </div>
          <Card>
            <CardContent className="p-6">
              {docs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t(language, 'legalNoDocs')}</p>
                  <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => setStep('legalContracts' as AppStep)}>
                    {t(language, 'legalGenerateContract')}
                    <ArrowRight className={`w-4 h-4 ml-2 ${isRTL ? 'rotate-180 ml-0 mr-2' : ''}`} />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${typeColors[doc.type] || 'bg-slate-100 text-slate-600'}`}>{doc.type}</Badge>
                        <Badge className={`text-[10px] ${statusColors[doc.status] || 'bg-slate-100 text-slate-600'}`}>{t(language, `legalDocStatus${doc.status.charAt(0).toUpperCase()}${doc.status.slice(1)}` as 'legalDocStatusDraft')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Back */}
        <div className="mt-12 text-center">
          <Button variant="outline" onClick={() => setStep('landing')} className="border-red-200 text-red-700 hover:bg-red-50">
            {t(language, 'legalBackToHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
