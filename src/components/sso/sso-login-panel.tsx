'use client'

import { useState } from 'react'
import { Building2, Shield, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Globe, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import { useCVStore, type CVLanguage } from '@/store/cv-store'
import type { SSOEnterpriseLoginProps } from './sso-types'

export default function SSOLoginPanel({ language = 'fr', onSwitchToRegular, onBack }: SSOEnterpriseLoginProps) {
  const lang = language
  const [workEmail, setWorkEmail] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [ssoFound, setSsoFound] = useState<{ companyName: string; providerType: string } | null>(null)
  const [ssoError, setSsoError] = useState<string | null>(null)
  const { setStep } = useCVStore()

  // Derive reset from workEmail change (no effect needed — use computed or key pattern)
  const currentSsoFound = workEmail ? null : ssoFound
  const currentSsoError = workEmail ? null : ssoError

  // Check if email domain has SSO
  const handleCheckSSO = async () => {
    if (!workEmail.trim() || !workEmail.includes('@')) {
      toast.error(t(lang, 'ssoEmailRequired'))
      return
    }

    setIsChecking(true)
    try {
      const res = await fetch(`/api/sso/callback?email=${encodeURIComponent(workEmail.trim())}`)
      const data = await res.json()

      if (data.hasSSO) {
        setSsoFound({ companyName: data.companyName, providerType: data.providerType })
        setSsoError(null)
      } else {
        setSsoFound(null)
        setSsoError(t(lang, 'ssoNoConfig'))
      }
    } catch {
      setSsoError(t(lang, 'ssoCheckError'))
    }
    setIsChecking(false)
  }

  // Initiate SSO login
  const handleSSOLogin = async () => {
    setIsRedirecting(true)
    try {
      const res = await fetch('/api/sso/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: workEmail.trim() }),
      })

      const data = await res.json()

      if (data.success && data.authUrl) {
        // Redirect to IdP
        window.location.href = data.authUrl
      } else if (data.error === 'NO_SSO_CONFIG') {
        toast.error(t(lang, 'ssoNoConfig'))
        setIsRedirecting(false)
      } else {
        toast.error(data.message || t(lang, 'ssoLoginError'))
        setIsRedirecting(false)
      }
    } catch {
      toast.error(t(lang, 'ssoLoginError'))
      setIsRedirecting(false)
    }
  }

  const getProviderLabel = (type: string) => {
    const labels: Record<string, string> = {
      azure_ad: 'Microsoft Azure AD',
      google_workspace: 'Google Workspace',
      okta: 'Okta',
      generic_oidc: 'OIDC',
    }
    return labels[type] || type
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold">{t(lang, 'ssoEnterpriseTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t(lang, 'ssoEnterpriseDesc')}</p>
      </div>

      {/* Email input */}
      <div className="space-y-3">
        <Label htmlFor="sso-email" className="text-sm font-medium">
          {t(lang, 'ssoWorkEmail')}
        </Label>
        <Input
          id="sso-email"
          type="email"
          placeholder="prenom.nom@entreprise.com"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCheckSSO()}
          className="h-11"
          disabled={isRedirecting}
        />

        {!ssoFound && !ssoError && (
          <Button
            onClick={handleCheckSSO}
            disabled={isChecking || !workEmail.includes('@')}
            variant="outline"
            className="w-full h-11 gap-2 border-slate-300"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t(lang, 'ssoChecking')}
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {t(lang, 'ssoCheckDomain')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* SSO Found */}
      <AnimatePresence>
        {ssoFound && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">{t(lang, 'ssoConfigFound')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{ssoFound.companyName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{getProviderLabel(ssoFound.providerType)}</span>
                </div>

                <Button
                  onClick={handleSSOLogin}
                  disabled={isRedirecting}
                  className="w-full h-11 gap-2 bg-slate-800 hover:bg-slate-900"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t(lang, 'ssoRedirecting')}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      {t(lang, 'ssoLoginBtn')}
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No SSO Error */}
      <AnimatePresence>
        {ssoError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-700">{ssoError}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(lang, 'ssoFallbackHint')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSwitchToRegular}
                  className="gap-1.5"
                >
                  {t(lang, 'ssoSwitchRegular')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t(lang, 'ssoOr')}</span>
        <Separator className="flex-1" />
      </div>

      {/* Back button */}
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full gap-2 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {t(lang, 'ssoBackToLogin')}
        </Button>
      )}
    </motion.div>
  )
}
