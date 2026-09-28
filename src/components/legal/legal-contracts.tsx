'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gavel, ArrowRight, ArrowLeft, Loader2, Download, FileText, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const contractTypes = [
  { value: 'cdi', labelKey: 'legalContractTypeCdi' as TranslationKey },
  { value: 'cdt', labelKey: 'legalContractTypeCdt' as TranslationKey },
  { value: 'freelance', labelKey: 'legalContractTypeFreelance' as TranslationKey },
  { value: 'internship', labelKey: 'legalContractTypeInternship' as TranslationKey },
]

export default function LegalContracts() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'

  const [employer, setEmployer] = useState('')
  const [employee, setEmployee] = useState('')
  const [contractType, setContractType] = useState('cdi')
  const [startDate, setStartDate] = useState('')
  const [salary, setSalary] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [clauses, setClauses] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!employer.trim() || !employee.trim()) {
      setError(t(language, 'legalPleaseFillNames'))
      return
    }
    setError('')
    setGenerating(true)
    setGenerated('')
    try {
      const res = await fetch('/api/legal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer, employee, contractType, startDate, salary, responsibilities, clauses, language,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setGenerated(data.content || '')
      }
    } catch {
      setError(t(language, 'legalFailedGenContract'))
    } finally {
      setGenerating(false)
    }
  }

  function handleDownload() {
    if (!generated) return
    const blob = new Blob([generated], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-${contractType}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/40 via-white to-slate-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-red-100 hover:bg-red-800/50 mb-4" onClick={() => setStep('legalHome' as AppStep)}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-0 ml-2' : 'mr-2'}`} />
            {t(language, 'legalBackToHome')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700/50 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t(language, 'legalContractsTitle')}</h1>
              <p className="text-red-200 text-sm">{t(language, 'legalContractsSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!generated && !generating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-200">
              <CardContent className="p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Employer */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(language, 'legalPartyEmployer')} *</Label>
                    <Input
                      value={employer}
                      onChange={(e) => setEmployer(e.target.value)}
                      placeholder={t(language, 'legalPartyEmployerPh')}
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>

                  {/* Employee */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(language, 'legalPartyEmployee')} *</Label>
                    <Input
                      value={employee}
                      onChange={(e) => setEmployee(e.target.value)}
                      placeholder={t(language, 'legalPartyEmployeePh')}
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>

                  {/* Contract Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(language, 'legalContractType')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {contractTypes.map((ct) => (
                        <Badge
                          key={ct.value}
                          variant={contractType === ct.value ? 'default' : 'outline'}
                          className={`cursor-pointer px-3 py-1.5 text-xs ${
                            contractType === ct.value
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'border-red-300 text-red-700 hover:bg-red-50'
                          }`}
                          onClick={() => setContractType(ct.value)}
                        >
                          {t(language, ct.labelKey)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(language, 'legalStartDate')}</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>

                  {/* Salary */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">{t(language, 'legalSalary')}</Label>
                    <Input
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder={t(language, 'legalSalaryPh')}
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>

                  {/* Responsibilities */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">{t(language, 'legalResponsibilities')}</Label>
                    <Textarea
                      value={responsibilities}
                      onChange={(e) => setResponsibilities(e.target.value)}
                      placeholder={t(language, 'legalResponsibilitiesPh')}
                      rows={3}
                      className="border-red-200 focus:border-red-400 resize-none"
                    />
                  </div>

                  {/* Additional Clauses */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">{t(language, 'legalClauses')}</Label>
                    <Textarea
                      value={clauses}
                      onChange={(e) => setClauses(e.target.value)}
                      placeholder={t(language, 'legalClausesPh')}
                      rows={2}
                      className="border-red-200 focus:border-red-400 resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <Scale className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t(language, 'legalGenerating')}</>
                    ) : (
                      <><Gavel className="w-4 h-4 mr-2" />{t(language, 'legalGenerateBtn')}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">{t(language, 'legalGenerating')}</p>
          </motion.div>
        )}

        {generated && !generating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-200">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{t(language, 'legalPreviewTitle')}</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setGenerated('')}>
                      {t(language, 'legalBackToHome')}
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      {t(language, 'legalDownloadText')}
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-h-[60vh] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">{generated}</pre>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
