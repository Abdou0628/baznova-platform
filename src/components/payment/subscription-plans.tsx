'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

type SubscriptionPlan = {
  id: string
  nameKey: string
  price: number
  descKey: string
  popular: boolean
  featureKeys: string[]
}

const plans: SubscriptionPlan[] = [
  {
    id: 'pro',
    nameKey: 'subPlans.proName',
    price: 149,
    descKey: 'subPlans.proDesc',
    popular: false,
    featureKeys: [
      'subPlans.proF1',
      'subPlans.proF2',
      'subPlans.proF3',
      'subPlans.proF4',
      'subPlans.proF5',
    ],
  },
  {
    id: 'elite',
    nameKey: 'subPlans.eliteName',
    price: 399,
    descKey: 'subPlans.eliteDesc',
    popular: true,
    featureKeys: [
      'subPlans.eliteF1',
      'subPlans.eliteF2',
      'subPlans.eliteF3',
      'subPlans.eliteF4',
      'subPlans.eliteF5',
      'subPlans.eliteF6',
      'subPlans.eliteF7',
      'subPlans.eliteF8',
    ],
  },
]

interface SubscriptionPlansProps {
  onSelectPlan: (planId: string) => void
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { language } = useCVStore()

  return (
    <section className="w-full py-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t(language, 'subPlans.title')}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t(language, 'subPlans.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card
              className={`relative flex h-full flex-col transition-shadow hover:shadow-lg ${
                plan.popular
                  ? 'border-primary shadow-md ring-1 ring-primary/20'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary px-3 py-1 text-xs font-semibold">
                    {t(language, 'subPlans.popular')}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t(language, 'subPlans.plan')} {t(language, plan.nameKey)}</CardTitle>
                <CardDescription>{t(language, plan.descKey)}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {t(language, 'subPlans.perMonth')}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-2">
                <ul className="space-y-3">
                  {plan.featureKeys.map((fk) => (
                    <li key={fk} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-foreground">{t(language, fk)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onSelectPlan(plan.id)}
                >
                  {t(language, 'subPlans.choosePlan')}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
