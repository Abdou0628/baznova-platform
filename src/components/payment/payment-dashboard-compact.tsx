'use client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, CreditCard, Calculator, FileText, Receipt, Scale, UserPlus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SubscriptionPlans from './subscription-plans-compact'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const summaryCardKeys = [
  { labelKey: 'payDashCompact.revenue', value: '124 750 MAD', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  { labelKey: 'payDashCompact.activeSubs', value: '287', icon: Users, color: 'text-blue-600 bg-blue-100' },
  { labelKey: 'payDashCompact.monthlyPayments', value: '38 450 MAD', icon: CreditCard, color: 'text-violet-600 bg-violet-100' },
  { labelKey: 'payDashCompact.taxIS', value: '11 325 MAD', icon: Calculator, color: 'text-orange-600 bg-orange-100' },
]

const transactions = [
  { id: 'TXN-001', date: '2025-06-28', client: 'Esmail B.', plan: 'Elite', amount: 399, status: 'paye' as const },
  { id: 'TXN-002', date: '2025-06-27', client: 'Omar T.', plan: 'Pro', amount: 149, status: 'paye' as const },
  { id: 'TXN-003', date: '2025-06-26', client: 'Fatima Z.', plan: 'Elite', amount: 399, status: 'en_attente' as const },
  { id: 'TXN-004', date: '2025-06-25', client: 'Karim M.', plan: 'Pro', amount: 149, status: 'paye' as const },
  { id: 'TXN-005', date: '2025-06-24', client: 'Amine R.', plan: 'Elite', amount: 399, status: 'echoue' as const },
]

const taxItemKeys = [
  { labelKey: 'payDashCompact.taxISLabel', rate: '30%', amount: '11 325 MAD' },
  { labelKey: 'payDashCompact.taxTVA', rate: '20%', amount: '7 690 MAD' },
  { labelKey: 'payDashCompact.taxCNSS', rate: '25,59%', amount: '9 840 MAD' },
]

const monthKeys = ['payDashCompact.jan', 'payDashCompact.feb', 'payDashCompact.mar', 'payDashCompact.apr', 'payDashCompact.may', 'payDashCompact.jun']

function statusBadge(status: string, language: string) {
  const map: Record<string, { labelKey: string; cls: string }> = {
    paye: { labelKey: 'payDashCompact.statusPaid', cls: 'bg-emerald-100 text-emerald-700' },
    en_attente: { labelKey: 'payDashCompact.statusPending', cls: 'bg-yellow-100 text-yellow-700' },
    echoue: { labelKey: 'payDashCompact.statusFailed', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] || map.en_attente
  return <Badge className={s.cls}>{t(language, s.labelKey)}</Badge>
}

export default function PaymentDashboard() {
  const { language } = useCVStore()

  const handleSelectPlan = (planId: string) => {
    const price = planId === 'elite' ? 39900 : 14900
    console.log(`[Payment] Plan ${planId} selected, redirecting to checkout...`)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">{t(language, 'payDashCompact.title')}</h1>
        <p className="text-muted-foreground mt-1">{t(language, 'payDashCompact.subtitle')}</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCardKeys.map((card, i) => (
          <motion.div key={card.labelKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.color}`}><card.icon className="size-5" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{t(language, card.labelKey)}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <CardHeader><CardTitle className="text-lg">{t(language, 'payDashCompact.monthlyRevenue')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48 mt-4">
            {[{ v: 65 }, { v: 78 }, { v: 82 }, { v: 95 }, { v: 88 }, { v: 100 }].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors" style={{ height: `${bar.v}%` }} />
                <span className="text-xs text-muted-foreground">{t(language, monthKeys[idx])}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6">
        <CardHeader><CardTitle className="text-lg">{t(language, 'payDashCompact.recentTransactions')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t(language, 'payDashCompact.date')}</TableHead><TableHead>{t(language, 'payDashCompact.client')}</TableHead><TableHead>{t(language, 'payDashCompact.plan')}</TableHead><TableHead className="text-right">{t(language, 'payDashCompact.amount')}</TableHead><TableHead className="text-center">{t(language, 'payDashCompact.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-muted-foreground">{txn.date}</TableCell>
                  <TableCell>{txn.client}</TableCell>
                  <TableCell>{txn.plan}</TableCell>
                  <TableCell className="text-right font-mono">{txn.amount} MAD</TableCell>
                  <TableCell className="text-center">{statusBadge(txn.status, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card className="p-6">
        <CardHeader><CardTitle className="text-lg">{t(language, 'payDashCompact.taxSummary')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {taxItemKeys.map((ti) => (
              <div key={ti.labelKey} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t(language, ti.labelKey)}</p>
                <p className="text-xs font-medium text-muted-foreground">{t(language, 'payDashCompact.rate')}: {ti.rate}</p>
                <p className="text-lg font-bold mt-1">{ti.amount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <CardHeader><CardTitle className="text-lg">{t(language, 'payDashCompact.quickActions')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm"><UserPlus className="size-4 mr-2" />{t(language, 'payDashCompact.newClient')}</Button>
            <Button variant="outline" size="sm"><Receipt className="size-4 mr-2" />{t(language, 'payDashCompact.generateInvoice')}</Button>
            <Button variant="outline" size="sm"><Scale className="size-4 mr-2" />{t(language, 'payDashCompact.taxDeclaration')}</Button>
            <Button variant="outline" size="sm"><FileText className="size-4 mr-2" />{t(language, 'payDashCompact.monthlyReport')}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <SubscriptionPlans onSelectPlan={handleSelectPlan} />
    </div>
  )
}
