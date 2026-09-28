'use client'

import { CreditCard, Shield, Receipt, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t } from '../payment-types'

export function MethodsTab({ language }: { language: string }) {
  const providers = [
    { name: 'Stripe', currencies: 'EUR, USD, MAD', status: 'active' as const, icon: CreditCard, desc: t('Paiement par carte bancaire international', 'International card payments', language) },
    { name: 'PayMob', currencies: 'MAD, Mobile Money', status: 'configured' as const, icon: Shield, desc: t('Paiement mobile et local marocain', 'Moroccan local & mobile payments', language) },
    { name: 'LemonSqueezy', currencies: 'USD, EUR', status: 'not_configured' as const, icon: Receipt, desc: t('Merchant of Record — licences globales', 'Merchant of Record — global licenses', language) },
  ]

  const statusMap: Record<string, { cls: string; label: string }> = {
    active: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: t('Actif', 'Active', language) },
    configured: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', label: t('Configuré', 'Configured', language) },
    not_configured: { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: t('Non configuré', 'Not configured', language) },
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const Icon = p.icon; const s = statusMap[p.status]
          return (
            <Card key={p.name} className="flex h-full flex-col"><CardHeader className="flex-1">
              <div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Icon className="size-5" />{p.name}</CardTitle><Badge className={s.cls}>{s.label}</Badge></div>
              <CardDescription>{p.desc}</CardDescription>
            </CardHeader><CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('Devises', 'Currencies', language)}</span><span className="font-medium">{p.currencies}</span></div>
              <Button variant="outline" className="w-full gap-2" disabled={p.status === 'not_configured'}><ArrowLeft className="size-4" />{t('Configurer', 'Configure', language)}</Button>
            </CardContent></Card>
          )
        })}
      </div>
    </div>
  )
}