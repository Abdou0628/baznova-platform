'use client'

import { useState } from 'react'
import { FileText, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type DashboardData, formatMAD, t, statusBadge } from '../payment-types'

export function InvoicesTab({ d, language }: { d: DashboardData; language: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ client: '', description: '', amount: '', dueDate: '' })

  const handleCreate = async () => {
    if (!form.client || !form.amount) { toast.error(t('Veuillez remplir les champs requis', 'Please fill required fields', language)); return }
    try {
      await fetch('/api/payments/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      toast.success(t('Facture créée avec succès', 'Invoice created successfully', language))
      setForm({ client: '', description: '', amount: '', dueDate: '' })
      setOpen(false)
    } catch { toast.error(t('Erreur lors de la création', 'Error creating invoice', language)) }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><FileText className="size-4" />{t('Créer une facture', 'Create Invoice', language)}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Nouvelle facture', 'New Invoice', language)}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>{t('Client', 'Client', language)} *</Label><Input value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} placeholder={t('Nom du client', 'Client name', language)} /></div>
              <div className="space-y-2"><Label>{t('Description', 'Description', language)}</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('Montant (MAD)', 'Amount (MAD)', language)} *</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('Échéance', 'Due Date', language)}</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
              </div>
              <Button className="w-full gap-2" onClick={handleCreate}><Receipt className="size-4" />{t('Créer', 'Create', language)}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>{t('Client', 'Client', language)}</TableHead>
            <TableHead>{t('Montant', 'Amount', language)}</TableHead><TableHead>{t('Statut', 'Status', language)}</TableHead>
            <TableHead>{t('Échéance', 'Due Date', language)}</TableHead>
          </TableRow></TableHeader><TableBody>
            {d.invoices.map((inv) => (<TableRow key={inv.id}>
              <TableCell className="font-mono text-xs">{inv.id}</TableCell>
              <TableCell className="font-medium">{inv.client}</TableCell>
              <TableCell>{formatMAD(inv.amount)}</TableCell>
              <TableCell>{statusBadge(inv.status, language)}</TableCell>
              <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
            </TableRow>))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
    </div>
  )
}