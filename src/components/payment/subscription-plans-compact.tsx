'use client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const plans = [
  { id: 'pro', name: 'Pro', price: 149, popular: false, featureKeys: ['subPlansCompact.proF1', 'subPlansCompact.proF2', 'subPlansCompact.proF3', 'subPlansCompact.proF4', 'subPlansCompact.proF5'] },
  { id: 'elite', name: 'Elite', price: 399, popular: true, featureKeys: ['subPlansCompact.eliteF1', 'subPlansCompact.eliteF2', 'subPlansCompact.eliteF3', 'subPlansCompact.eliteF4', 'subPlansCompact.eliteF5', 'subPlansCompact.eliteF6', 'subPlansCompact.eliteF7', 'subPlansCompact.eliteF8'] },
]

interface Props { onSelectPlan: (id: string) => void }

export default function SubscriptionPlans({ onSelectPlan }: Props) {
  const { language } = useCVStore()

  return (
    <section className="py-12 px-4">
      <h2 className="text-2xl font-bold text-center mb-8">{t(language, 'subPlansCompact.title')}</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
            <Card className={`relative h-full ${plan.popular ? 'border-2 border-primary shadow-lg' : 'border'} p-6`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                  {t(language, 'subPlansCompact.popular')}
                </Badge>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">{t(language, 'subPlansCompact.hireNova')} {plan.name}</CardTitle>
                <p className="text-3xl font-extrabold mt-2">
                  {plan.price}<span className="text-base font-normal text-muted-foreground"> {t(language, 'subPlansCompact.perMonth')}</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.featureKeys.map((fk) => (
                    <li key={fk} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>{t(language, fk)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-6"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => onSelectPlan(plan.id)}
                >
                  {t(language, 'subPlansCompact.choosePlan')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
