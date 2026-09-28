'use client'

import { CreditCard, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { plans, t } from '../payment-types'

export function SubscriptionsTab({ language, subscribing, onSubscribe, onPortal }: {
  language: string
  subscribing: string | null
  onSubscribe: (key: string) => void
  onPortal: () => void
}) {
  return (
    <div className="mt-6 space-y-6">
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium text-violet-900 dark:text-violet-200">{t('Gérer mon abonnement', 'Manage my subscription', language)}</p><p className="text-sm text-muted-foreground">{t('Accéder au portail de gestion Stripe', 'Access Stripe management portal', language)}</p></div>
          <Button variant="outline" className="gap-2 w-fit" onClick={onPortal}><CreditCard className="size-4" />{t('Portail', 'Portal', language)}</Button>
        </CardContent>
      </Card>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isSub = subscribing === plan.key
          return (
            <Card key={plan.key} className="relative flex h-full flex-col">
              {plan.key === 'annual' && <Badge className="absolute -top-2 right-4 bg-amber-500 text-white">{t('Populaire', 'Popular', language)}</Badge>}
              <CardHeader><CardTitle className="flex items-center justify-between">{plan.key === 'career_plus' ? 'Career+' : plan.key.charAt(0).toUpperCase() + plan.key.slice(1)}<Badge variant="secondary" className="ml-2">{plan.price}€</Badge></CardTitle></CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <ul className="flex-1 space-y-2">{plan.features.map((f) => (<li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /><span>{f}</span></li>))}</ul>
                <Button className="w-full gap-2" disabled={isSub} onClick={() => onSubscribe(plan.key)}>
                  {isSub && <Loader2 className="size-4 animate-spin" />}{t("S'abonner", 'Subscribe', language)}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}