'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { useSession } from 'next-auth/react'
import { t } from '@/lib/i18n'
import { getPersonaApplicationFields, getPersonaConfig } from '@/lib/persona-engine'
import { toast } from 'sonner'

const personaEmoji: Record<string, string> = {
  student: '🎓', graduate: '🌟', professional: '💼', executive: '👔', freelance: '🚀', expat: '✈️'
}

const personaNameKeys: Record<string, string> = {
  student: 'personaStudent', graduate: 'personaGraduate', professional: 'personaProfessional',
  executive: 'personaExecutive', freelance: 'personaFreelance', expat: 'personaExpat'
}

export default function JobApplyView() {
  const { stepData, setStep, selectedPersona, language, generatedCV } = useCVStore()
  const { data: session } = useSession()
  const lang = language
  const personaConfig = selectedPersona ? getPersonaConfig(selectedPersona) : null
  const personaFields = selectedPersona ? getPersonaApplicationFields(selectedPersona) : []
  const [fields, setFields] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; matchScore?: number } | null>(null)

  const updateField = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = fields.name || session?.user?.name || ''
    const email = fields.email || session?.user?.email || ''
    if (!name || !email) {
      toast.error(t(lang, 'errorFillFields'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${stepData.jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: name,
          candidateEmail: email,
          coverNote: fields.motivation || '',
          persona: selectedPersona,
          personaFields: fields,
          cvSummary: generatedCV?.summary,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: true, matchScore: data.data?.matchScore })
        toast.success(t(lang, 'jobApplySent'))
      } else {
        toast.error(data.error?.message || t(lang, 'jobApplyError'))
      }
    } catch {
      toast.error(t(lang, 'jobApplyConnectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-white to-emerald-50/30'>
      <div className='max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Button variant='ghost' size='sm' onClick={() => setStep('jobDetail', { jobId: stepData.jobId })} className='mb-6 cursor-pointer'>
          <ArrowLeft className='w-4 h-4 mr-1' />
          {t(lang, 'orchBack')}
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {result?.success ? (
            <Card className='text-center p-8'>
              <CardContent className='flex flex-col items-center gap-4'>
                <div className='w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center'>
                  <CheckCircle2 className='w-8 h-8 text-emerald-600' />
                </div>
                <h2 className='text-xl font-bold'>{t(lang, 'jobApplySuccess')}</h2>
                {result.matchScore !== undefined && (
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-emerald-600'>{result.matchScore}%</div>
                    <p className='text-sm text-muted-foreground'>{t(lang, 'jobApplyMatchScore')}</p>
                  </div>
                )}
                <Button onClick={() => setStep('jobMarket')} className='mt-4'>{t(lang, 'jobApplySeeJobs')}</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className='p-6 sm:p-8'>
                {/* Header with persona info */}
                <div className='mb-6'>
                  <div className='flex items-center gap-3 mb-3'>
                    {selectedPersona && personaConfig && (
                      <div className='flex items-center gap-2'>
                        <span className='text-2xl'>{personaEmoji[selectedPersona]}</span>
                        <Badge variant='secondary' className='text-xs'>{t(lang, personaNameKeys[selectedPersona] as 'personaStudent')}</Badge>
                      </div>
                    )}
                    <h1 className='text-xl font-bold'>{t(lang, 'jobApplyTitle')}</h1>
                  </div>
                  {personaConfig && (
                    <p className='text-sm text-muted-foreground'>{personaConfig.applicationIntro[lang as 'fr' | 'en' | 'ar' | 'es'] ?? personaConfig.applicationIntro.fr}</p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className='space-y-4'>
                  {/* Standard fields */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>{t(lang, 'jobApplyFullName')}</label>
                      <Input
                        value={fields.name || session?.user?.name || ''}
                        onChange={e => updateField('name', e.target.value)}
                        placeholder={t(lang, 'jobApplyFullNamePlaceholder')}
                        required
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium'>{t(lang, 'jobApplyEmail')}</label>
                      <Input
                        type='email'
                        value={fields.email || session?.user?.email || ''}
                        onChange={e => updateField('email', e.target.value)}
                        placeholder='votre@email.com'
                        required
                      />
                    </div>
                  </div>

                  {/* Persona-specific fields */}
                  {personaFields.length > 0 && (
                    <div className='border-t pt-4 mt-4'>
                      <h3 className='text-sm font-semibold mb-3 flex items-center gap-2'>
                        <FileText className='w-4 h-4 text-emerald-600' />
                        {t(lang, 'jobApplySpecificInfo')}
                      </h3>
                      <div className='space-y-4'>
                        {personaFields.map(field => (
                          <div key={field.key} className='space-y-2'>
                            <label className='text-sm font-medium'>
                              {t(lang, field.labelKey as 'personaStudent')}
                              {field.required && <span className='text-red-500'>*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                value={fields[field.key] || ''}
                                onChange={e => updateField(field.key, e.target.value)}
                                placeholder={t(lang, field.placeholderKey as 'personaStudent')}
                                rows={3}
                                required={field.required}
                              />
                            ) : field.type === 'select' && field.options ? (
                              <select
                                value={fields[field.key] || ''}
                                onChange={e => updateField(field.key, e.target.value)}
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                                required={field.required}
                              >
                                <option value=''>--</option>
                                {field.options.map(opt => (
                                  <option key={opt.value} value={opt.value}>{t(lang, opt.labelKey as 'personaStudent')}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={field.type === 'date' ? 'date' : 'text'}
                                value={fields[field.key] || ''}
                                onChange={e => updateField(field.key, e.target.value)}
                                placeholder={t(lang, field.placeholderKey as 'personaStudent')}
                                required={field.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <Button type='submit' disabled={loading} className='w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-xl cursor-pointer'>
                    {loading
                      ? <><Loader2 className='w-4 h-4 mr-2 animate-spin' />{t(lang, 'jobApplySending')}</>
                      : <><Send className='w-4 h-4 mr-2' />{t(lang, 'jobApplySubmit')}</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
