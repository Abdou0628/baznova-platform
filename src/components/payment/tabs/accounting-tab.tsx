'use client'

import { useState } from 'react'
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type AccountingEntryRow, formatMAD, t, statusBadge } from '../payment-types'

interface Props {
  language: string
  entries: AccountingEntryRow[]
  summary: { totalIncome: number; totalExpense: number; totalRefund: number; netProfit: number } | null
  loading: boolean
  onRefresh: () => void
}

export function AccountingTab({ language, entries, summary, loading, onRefresh }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ type: 'expense', category: 'infra', description: '', amount: '', reference: '' })

  const handleCreate = async () => {
    if (!form.description || !form.amount) { toast.error(t('Champs requis', 'Required fields', language)); return }
    try {
      await fetch('/api/payments/accounting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) })
      toast.success(t('Écriture comptable ajoutée', 'Accounting entry added', language))
      setForm({ type: 'expense', category: 'infra', description: '', amount: '', reference: '' })
      setFormOpen(false)
      onRefresh()
    } catch { toast.error(t('Erreur', 'Error', language)) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/payments/accounting?id=${id}`, { method: 'DELETE' })
      toast.success(t('Supprimé', 'Deleted', language))
      onRefresh()
    } catch { toast.error(t('Erreur', 'Error', language)) }
  }

  const summaryCards = summary ? [
    { label: t('Total Revenus', 'Total Income', language), value: formatMAD(summary.totalIncome), color: 'text-emerald-600 border-emerald-200 dark:border-emerald-800' },
    { label: t('Total Dépenses', 'Total Expenses', language), value: formatMAD(summary.totalExpense), color: 'text-red-600 border-red-200 dark:border-red-800' },
    { label: t('Remboursements', 'Refunds', language), value: formatMAD(summary.totalRefund), color: 'text-amber-600 border-amber-200 dark:border-amber-800' },
    { label: t('Bénéfice net', 'Net Profit', language), value: formatMAD(summary.netProfit), color: summary.netProfit >= 0 ? 'text-emerald-600 border-emerald-200 dark:border-emerald-800' : 'text-red-600 border-red-200 dark:border-red-800' },
  ] : []

  return (
    <div className="mt-6 space-y-6">
      {/* Header + New Entry Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><BookOpen className="size-5 text-slate-600" /></div>
          <div><p className="font-medium">{t('Grand Livre Comptable', 'General Ledger', language)}</p><p className="text-sm text-muted-foreground">{t('Suivi des revenus, dépenses et écritures comptables', 'Track income, expenses and accounting entries', language)}</p></div>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild><Button className="gap-2 w-fit"><Plus className="size-4" />{t('Nouvelle écriture', 'New Entry', language)}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Nouvelle écriture comptable', 'New Accounting Entry', language)}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('Type', 'Type', language)}</Label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="income">{t('Revenu', 'Income', language)}</option>
                    <option value="expense">{t('Dépense', 'Expense', language)}</option>
                    <option value="refund">{t('Remboursement', 'Refund', language)}</option>
                    <option value="platform_fee">{t('Frais plateforme', 'Platform Fee', language)}</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>{t('Catégorie', 'Category', language)}</Label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="subscription">Subscription</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="api_usage">API Usage</option>
                    <option value="infra">{t('Infrastructure', 'Infrastructure', language)}</option>
                    <option value="tax">{t('Taxe', 'Tax', language)}</option>
                    <option value="payout">Payout</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2"><Label>{t('Description', 'Description', language)} *</Label><Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('Montant (MAD)', 'Amount (MAD)', language)} *</Label><Input type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('Référence', 'Reference', language)}</Label><Input value={form.reference} onChange={(e) => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
              </div>
              <Button className="w-full gap-2" onClick={handleCreate}><Plus className="size-4" />{t('Ajouter', 'Add', language)}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (<Card key={c.label} className={`border ${c.color}`}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-1 text-xl font-bold">{c.value}</p></CardContent></Card>))}
      </div>}

      {/* Entries Table */}
      <Card><CardContent className="p-0">
        {loading && <div className="p-8 flex justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
        {!loading && entries.length === 0 && <div className="p-8 text-center text-muted-foreground"><p>{t('Aucune écriture comptable', 'No accounting entries yet', language)}</p><p className="text-xs mt-1">{t('Cliquez sur "Nouvelle écriture" pour commencer', 'Click "New Entry" to start', language)}</p></div>}
        {!loading && entries.length > 0 && <div className="max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>{t('Date', 'Date', language)}</TableHead><TableHead>{t('Type', 'Type', language)}</TableHead><TableHead>{t('Catégorie', 'Category', language)}</TableHead><TableHead>{t('Description', 'Description', language)}</TableHead><TableHead>{t('Montant', 'Amount', language)}</TableHead><TableHead>{t('Statut', 'Status', language)}</TableHead><TableHead></TableHead>
          </TableRow></TableHeader><TableBody>
            {entries.map((e) => (<TableRow key={e.id}>
              <TableCell className="text-xs text-muted-foreground">{e.createdAt?.slice(0, 10)}</TableCell>
              <TableCell><Badge variant={e.type === 'income' ? 'default' : 'secondary'} className={e.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : e.type === 'refund' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>{e.type}</Badge></TableCell>
              <TableCell className="text-xs">{e.category}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
              <TableCell className={e.type === 'income' ? 'text-emerald-600 font-medium' : 'text-red-500'}>{e.type === 'income' ? '+' : '-'}{formatMAD(e.amount)}</TableCell>
              <TableCell>{statusBadge(e.status, language)}</TableCell>
              <TableCell><Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(e.id)}><Trash2 className="size-3.5 text-muted-foreground hover:text-red-500" /></Button></TableCell>
            </TableRow>))}
          </TableBody></Table>
        </div>}
      </CardContent></Card>
    </div>
  )
}