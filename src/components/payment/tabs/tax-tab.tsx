'use client'

import { useState, useCallback } from 'react'
import { Building2, Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type DashboardData, type TaxResult, formatMAD, t } from '../payment-types'

export function TaxTab({ d, language }: { d: DashboardData; language: string }) {
  const [rev, setRev] = useState('')
  const [exp, setExp] = useState('')
  const [result, setResult] = useState<TaxResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalc = useCallback(async () => {
    const r = parseFloat(rev); const e = parseFloat(exp)
    if (isNaN(r) || isNaN(e)) { toast.error(t('Valeurs invalides', 'Invalid values', language)); return }
    setLoading(true)
    try {
      const tvaCollected = r * 0.20
      const res = await fetch('/api/payments/tax/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revenue: r, expenses: e, tvaCollected, tvaDeductible: 0 }) })
      if (res.ok) {
        const data = await res.json(); const rp = data.rapport
        setResult({ isAmount: rp.impotSurSocietes.montant, isRate: rp.impotSurSocietes.tauxEffectif, tvaNet: rp.tva.tvaNette, totalLiability: rp.chargeFiscaleTotale })
      } else setResult({ isAmount: 0, isRate: 0, tvaNet: 0, totalLiability: 0 })
    } catch { setResult({ isAmount: 0, isRate: 0, tvaNet: 0, totalLiability: 0 }) }
    finally { setLoading(false) }
  }, [rev, exp, language])

  return (
    <div className="mt-6 space-y-6">
      {/* IS Brackets */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5" />IS {t('(Impôt sur les Sociétés)', '(Corporate Tax)', language)}</CardTitle><CardDescription>{t('Barèmes progressifs', 'Progressive brackets', language)}</CardDescription></CardHeader>
        <CardContent><div className="max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>{t('Tranche', 'Bracket', language)}</TableHead><TableHead>{t('Taux', 'Rate', language)}</TableHead></TableRow></TableHeader><TableBody>
            {[['0 – 300 000 MAD', '0%'], ['300 001 – 1 000 000 MAD', '10%'], ['1 000 001 – 5 000 000 MAD', '17.5%'], [t('Au-delà de 5 000 000 MAD', 'Over 5 000 000 MAD', language), '30%']].map(([br, rt]) => (
              <TableRow key={br}><TableCell className="font-medium">{br}</TableCell><TableCell><Badge variant="outline">{rt}</Badge></TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TVA Rates */}
        <Card><CardHeader><CardTitle>{t('Taux TVA', 'VAT Rates', language)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[{ label: t('Standard', 'Standard', language), rate: '20%' }, { label: t('Réduit', 'Reduced', language), rate: '14%' }, { label: t('Hôtellerie', 'Hospitality', language), rate: '10%' }, { label: t('Essentiel', 'Essential', language), rate: '7%' }].map((v) => (
              <div key={v.rate} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{v.label}</span><Badge variant="secondary">{v.rate}</Badge></div>
            ))}
          </CardContent></Card>

        {/* Tax Calculator */}
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-5" />{t('Calculateur fiscal', 'Tax Calculator', language)}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>{t("Chiffre d'affaires (MAD)", 'Revenue (MAD)', language)}</Label><Input type="number" value={rev} onChange={(e) => setRev(e.target.value)} placeholder="150000" /></div>
            <div className="space-y-2"><Label>{t('Charges (MAD)', 'Expenses (MAD)', language)}</Label><Input type="number" value={exp} onChange={(e) => setExp(e.target.value)} placeholder="60000" /></div>
            <Button className="w-full gap-2" onClick={handleCalc} disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />}{t('Calculer', 'Calculate', language)}</Button>
            {result && (<div className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">IS ({result.isRate}%)</span><span className="font-semibold">{formatMAD(result.isAmount)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">TVA {t('nette', 'net', language)}</span><span className="font-semibold">{formatMAD(result.tvaNet)}</span></div>
              <Separator />
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span className="font-semibold">{t('Total obligations', 'Total liability', language)}</span><span className="font-bold">{formatMAD(result.totalLiability)}</span></div>
            </div>)}
          </CardContent></Card>
      </div>

      {/* Current month summary */}
      <Card><CardHeader><CardTitle>{t('Résumé fiscal du mois', 'Current Month Tax Summary', language)}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">IS ({d.taxIsRate}%)</p><p className="mt-1 text-lg font-semibold">{formatMAD(d.taxTotalLiability - d.taxTvaCollected)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">TVA {t('collectée', 'collected', language)}</p><p className="mt-1 text-lg font-semibold">{formatMAD(d.taxTvaCollected)}</p></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t('Total', 'Total', language)}</p><p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatMAD(d.taxTotalLiability)}</p></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>{t('Taux effectif IS', 'Effective IS Rate', language)}</span><span className="font-medium">{d.taxIsRate}% / 30%</span></div>
            <Progress value={(d.taxIsRate / 30) * 100} className="h-3" />
          </div>
        </CardContent></Card>
    </div>
  )
}