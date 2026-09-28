'use client'

import { useState } from 'react'
import { Building2, Loader2, Send, CheckCircle2, AlertCircle, Mail, Users, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import type { TranslationKey } from '@/lib/i18n'

interface EnterpriseContactFormProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  contactName: string
  workEmail: string
  phone: string
  companyName: string
  jobTitle: string
  industry: string
  companySize: string
  country: string
  website: string
  usersCount: string
  useCase: string
  budget: string
  message: string
}

const EMPTY: FormData = {
  contactName: '',
  workEmail: '',
  phone: '',
  companyName: '',
  jobTitle: '',
  industry: '',
  companySize: '',
  country: '',
  website: '',
  usersCount: '',
  useCase: '',
  budget: '',
  message: '',
}

export default function EnterpriseContactForm({ isOpen, onClose }: EnterpriseContactFormProps) {
  const language = useCVStore((s) => s.language)
  const [data, setData] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Required fields validation
    if (!data.contactName.trim() || !data.workEmail.trim() || !data.companyName.trim() || !data.message.trim()) {
      toast.error(t(language, 'entFormRequired'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.workEmail)) {
      toast.error(t(language, 'entFormWorkEmailHint'))
      return
    }

    if (data.message.trim().length < 20) {
      toast.error(t(language, 'entFormMessageHint'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/enterprise-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Request failed')
      }
      setSuccess(true)
      toast.success(t(language, 'entFormSuccess'))
    } catch (err) {
      console.error('[enterprise-contact] submit error:', err)
      toast.error(t(language, 'entFormError'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setData(EMPTY)
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <Badge className="bg-slate-700 text-white hover:bg-slate-700 mb-1">
                <Building2 className="w-3 h-3 mr-1" /> Enterprise
              </Badge>
              <DialogTitle className="text-xl">{t(language, 'entFormTitle')}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm">
            {t(language, 'entFormSubtitle')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t(language, 'entFormSuccess')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {t(language, 'entFormSuccessDesc')}
            </p>
            <Button onClick={handleClose} className="bg-slate-700 hover:bg-slate-800 cursor-pointer">
              {t(language, 'entFormSuccessCta')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                <Mail className="w-3.5 h-3.5" />
                Contact
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-contactName" className="text-xs font-medium">
                    {t(language, 'entFormContactName')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ent-contactName"
                    value={data.contactName}
                    onChange={(e) => set('contactName', e.target.value)}
                    placeholder={t(language, 'entFormContactNamePh')}
                    required
                    maxLength={100}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-workEmail" className="text-xs font-medium">
                    {t(language, 'entFormWorkEmail')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ent-workEmail"
                    type="email"
                    value={data.workEmail}
                    onChange={(e) => set('workEmail', e.target.value)}
                    placeholder={t(language, 'entFormWorkEmailPh')}
                    required
                    maxLength={150}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">{t(language, 'entFormWorkEmailHint')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-phone" className="text-xs font-medium">
                    {t(language, 'entFormPhone')}
                  </Label>
                  <Input
                    id="ent-phone"
                    value={data.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder={t(language, 'entFormPhonePh')}
                    maxLength={30}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-jobTitle" className="text-xs font-medium">
                    {t(language, 'entFormJobTitle')}
                  </Label>
                  <Input
                    id="ent-jobTitle"
                    value={data.jobTitle}
                    onChange={(e) => set('jobTitle', e.target.value)}
                    placeholder={t(language, 'entFormJobTitlePh')}
                    maxLength={100}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Company section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                <Briefcase className="w-3.5 h-3.5" /> Company
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-companyName" className="text-xs font-medium">
                    {t(language, 'entFormCompanyName')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ent-companyName"
                    value={data.companyName}
                    onChange={(e) => set('companyName', e.target.value)}
                    placeholder={t(language, 'entFormCompanyNamePh')}
                    required
                    maxLength={150}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-industry" className="text-xs font-medium">
                    {t(language, 'entFormIndustry')}
                  </Label>
                  <Input
                    id="ent-industry"
                    value={data.industry}
                    onChange={(e) => set('industry', e.target.value)}
                    placeholder={t(language, 'entFormIndustryPh')}
                    maxLength={80}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-companySize" className="text-xs font-medium">
                    {t(language, 'entFormCompanySize')}
                  </Label>
                  <Select value={data.companySize} onValueChange={(v) => set('companySize', v)}>
                    <SelectTrigger id="ent-companySize" className="text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={`size_${n}`} className="text-sm">
                          {t(language, `entFormCompanySizeOpt${n}` as TranslationKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-country" className="text-xs font-medium">
                    {t(language, 'entFormCountry')}
                  </Label>
                  <Input
                    id="ent-country"
                    value={data.country}
                    onChange={(e) => set('country', e.target.value)}
                    placeholder={t(language, 'entFormCountryPh')}
                    maxLength={80}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ent-website" className="text-xs font-medium">
                  {t(language, 'entFormWebsite')}
                </Label>
                <Input
                  id="ent-website"
                  type="url"
                  value={data.website}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder={t(language, 'entFormWebsitePh')}
                  maxLength={200}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Needs section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                <Users className="w-3.5 h-3.5" /> Needs
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-usersCount" className="text-xs font-medium">
                    {t(language, 'entFormUsersCount')}
                  </Label>
                  <Select value={data.usersCount} onValueChange={(v) => set('usersCount', v)}>
                    <SelectTrigger id="ent-usersCount" className="text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={`users_${n}`} className="text-sm">
                          {t(language, `entFormUsersCountOpt${n}` as TranslationKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-useCase" className="text-xs font-medium">
                    {t(language, 'entFormUseCase')}
                  </Label>
                  <Select value={data.useCase} onValueChange={(v) => set('useCase', v)}>
                    <SelectTrigger id="ent-useCase" className="text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={`usecase_${n}`} className="text-sm">
                          {t(language, `entFormUseCaseOpt${n}` as TranslationKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ent-budget" className="text-xs font-medium">
                  {t(language, 'entFormBudget')}
                </Label>
                <Select value={data.budget} onValueChange={(v) => set('budget', v)}>
                  <SelectTrigger id="ent-budget" className="text-sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={`budget_${n}`} className="text-sm">
                        {t(language, `entFormBudgetOpt${n}` as TranslationKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label htmlFor="ent-message" className="text-xs font-medium">
                {t(language, 'entFormMessage')} <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="ent-message"
                value={data.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder={t(language, 'entFormMessagePh')}
                required
                rows={5}
                maxLength={3000}
                className="text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{t(language, 'entFormMessageHint')}</p>
                <span className="text-[10px] text-muted-foreground">{data.message.length}/3000</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="cursor-pointer"
              >
                {t(language, 'lot5_enterprise_cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-800 cursor-pointer flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t(language, 'entFormSubmitting')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t(language, 'entFormSubmit')}
                  </>
                )}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {t(language, 'lot5_enterprise_disclaimer')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
