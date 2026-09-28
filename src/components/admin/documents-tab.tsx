'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  FilePlus,
  Download,
  Send,
  Search,
  RefreshCw,
  Building2,
  Receipt,
  FileCheck,
  FileX,
  Loader2,
  Mail,
  TrendingUp,
  Euro,
  Filter,
  Calculator,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'


type DocType = 'invoice' | 'quote' | 'agreement' | 'receipt' | 'credit_note' | 'accounting_statement'
type DocStatus = 'draft' | 'sent' | 'paid' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'finalized'

interface DocumentRow {
  id: string
  type: string
  number: string
  recipientName: string
  recipientEmail: string
  recipientCompany?: string
  subject: string
  currency: string
  total: number
  status: string
  issueDate: string
  dueDate?: string
  paidAt?: string
  createdAt: string
  inquiryId?: string
  // Signature fields
  signatureHash?: string | null
  signatureSerial?: string | null
  signatureDate?: string | null
  signedBy?: string | null
  // Bilan fields
  periodStart?: string | null
  periodEnd?: string | null
  invoiceCount?: number
  netProfit?: number
  totalCollected?: number
  platformFees?: number
  royaltyFees?: number
}

interface InquiryRow {
  id: string
  contactName: string
  workEmail: string
  companyName: string
  country?: string
  usersCount?: string
  useCase?: string
  budget?: string
  message: string
  status: string
  createdAt: string
}

const TYPE_META: Record<string, { key: string; icon: typeof FileText; color: string; badge: string }> = {
  invoice:               { key: 'adminDoc.typeInvoice',     icon: FileText,     color: 'text-emerald-600',     badge: 'bg-emerald-100 text-emerald-700' },
  quote:                 { key: 'adminDoc.typeQuote',       icon: FilePlus,     color: 'text-sky-600',          badge: 'bg-sky-100 text-sky-700' },
  agreement:             { key: 'adminDoc.typeAgreement',   icon: FileCheck,    color: 'text-purple-600',       badge: 'bg-purple-100 text-purple-700' },
  receipt:               { key: 'adminDoc.typeReceipt',     icon: Receipt,      color: 'text-amber-600',        badge: 'bg-amber-100 text-amber-700' },
  credit_note:           { key: 'adminDoc.typeCreditNote',  icon: FileX,        color: 'text-rose-600',         badge: 'bg-rose-100 text-rose-700' },
  accounting_statement:  { key: 'adminDoc.typeBilan',       icon: Calculator,   color: 'text-slate-700',        badge: 'bg-slate-800 text-white' },
}

const STATUS_META: Record<string, { key: string; badge: string }> = {
  draft:      { key: 'adminDoc.statusDraft',     badge: 'bg-slate-100 text-slate-700' },
  sent:       { key: 'adminDoc.statusSent',      badge: 'bg-blue-100 text-blue-700' },
  paid:       { key: 'adminDoc.statusPaid',      badge: 'bg-emerald-100 text-emerald-700' },
  accepted:   { key: 'adminDoc.statusAccepted',   badge: 'bg-emerald-100 text-emerald-700' },
  rejected:   { key: 'adminDoc.statusRejected',  badge: 'bg-rose-100 text-rose-700' },
  cancelled:  { key: 'adminDoc.statusCancelled', badge: 'bg-slate-100 text-slate-500' },
  expired:    { key: 'adminDoc.statusExpired',   badge: 'bg-amber-100 text-amber-700' },
  finalized:  { key: 'adminDoc.statusFinalized', badge: 'bg-slate-800 text-white' },
}

function formatMoney(amount: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'DH' }
  const symbol = symbols[currency] || currency
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${symbol}`
}

function formatDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DocumentsTab() {
  const { language } = useCVStore()
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stats, setStats] = useState<Record<string, { count: number; total: number }>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [generateModal, setGenerateModal] = useState<{ open: boolean; inquiry?: InquiryRow }>({ open: false })
  const [bilanOpen, setBilanOpen] = useState(false)
  const [bilanLoading, setBilanLoading] = useState(false)
  const [bilanResult, setBilanResult] = useState<{ number: string; invoiceCount: number; totalCollected: number; netProfit: number } | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/documents?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setDocuments(json.data.documents)
        setStats(json.data.stats)
      }
    } catch (err) {
      console.error('[documents] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, search])

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/enterprise-inquiries')
      const json = await res.json()
      if (json.success) {
        setInquiries(json.data.inquiries)
      }
    } catch (err) {
      console.error('[inquiries] fetch error:', err)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetchInquiries()
  }, [fetchDocuments, fetchInquiries])

  const handleDownload = async (doc: DocumentRow) => {
    setActionLoading(`dl-${doc.id}`)
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.type}-${doc.number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t(language, 'adminDoc.toastPdfDownloaded'))
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastDownloadError'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleSend = async (doc: DocumentRow) => {
    setActionLoading(`send-${doc.id}`)
    try {
      const res = await fetch(`/api/documents/${doc.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${t(language, 'adminDoc.toastDocSent')} ${doc.recipientEmail}`)
        fetchDocuments()
      } else {
        throw new Error(json.error)
      }
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastSendError'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateQuote = async (inquiry: InquiryRow) => {
    setActionLoading(`gen-${inquiry.id}`)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          inquiryId: inquiry.id,
          currency: 'EUR',
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${t(language, 'adminDoc.typeQuote')} ${json.data.number} ${t(language, 'adminDoc.generated')}`)
        fetchDocuments()
        fetchInquiries()
        setGenerateModal({ open: false })
      } else {
        throw new Error(json.error)
      }
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastGenerationError'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateAgreement = async (inquiry: InquiryRow) => {
    setActionLoading(`ctr-${inquiry.id}`)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'agreement',
          inquiryId: inquiry.id,
          totalAmount: 16500,
          currency: 'EUR',
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${t(language, 'adminDoc.typeAgreement')} ${json.data.number} ${t(language, 'adminDoc.generated')}`)
        fetchDocuments()
      } else {
        throw new Error(json.error)
      }
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastContractGenError'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateStatus = async (docId: string, status: DocStatus) => {
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, status }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(t(language, 'adminDoc.toastStatusUpdated'))
        fetchDocuments()
      }
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastError'))
    }
  }

  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/enterprise-inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inquiryId, status }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(t(language, 'adminDoc.toastInquiryUpdated'))
        fetchInquiries()
      }
    } catch (err) {
      toast.error(t(language, 'adminDoc.toastError'))
    }
  }

  const handleGenerateBilan = async (preset: string) => {
    setBilanLoading(true)
    setBilanResult(null)
    try {
      const res = await fetch('/api/admin/documents/bilan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      })
      const json = await res.json()
      if (json.success) {
        const d = json.data
        setBilanResult({
          number: d.number,
          invoiceCount: d.invoiceCount,
          totalCollected: d.totalCollected,
          netProfit: d.netProfit,
        })
        toast.success(`${t(language, 'adminDoc.typeBilan')} ${d.number} ${t(language, 'adminDoc.generated')} — ${d.invoiceCount} ${t(language, 'adminDoc.invoicesCount')}, ${t(language, 'adminDoc.netProfit')} ${formatMoney(d.netProfit, 'EUR')}`)
        fetchDocuments()
      } else {
        throw new Error(json.error)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(language, 'adminDoc.toastBilanGenError'))
    } finally {
      setBilanLoading(false)
    }
  }

  const totalRevenue = (stats.invoice?.total || 0) + (stats.receipt?.total || 0)
  const totalDocs = Object.values(stats).reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">{t(language, 'adminDoc.invoices')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.invoice?.count || 0}</p>
            <p className="text-xs text-emerald-600 font-medium">{formatMoney(stats.invoice?.total || 0, 'EUR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FilePlus className="w-4 h-4 text-sky-600" />
              <span className="text-xs text-muted-foreground">{t(language, 'adminDoc.typeQuote')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.quote?.count || 0}</p>
            <p className="text-xs text-sky-600 font-medium">{formatMoney(stats.quote?.total || 0, 'EUR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">{t(language, 'adminDoc.contracts')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.agreement?.count || 0}</p>
            <p className="text-xs text-purple-600 font-medium">{formatMoney(stats.agreement?.total || 0, 'EUR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">{t(language, 'adminDoc.receipts')}</span>
            </div>
            <p className="text-2xl font-bold">{stats.receipt?.count || 0}</p>
            <p className="text-xs text-amber-600 font-medium">{formatMoney(stats.receipt?.total || 0, 'EUR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-emerald-700" />
              <span className="text-xs text-muted-foreground">{t(language, 'adminDoc.totalRevenue')}</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{formatMoney(totalRevenue, 'EUR')}</p>
            <p className="text-xs text-muted-foreground">{totalDocs} {t(language, 'adminDoc.documents')}</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Bilan Comptable — Accounting Statement Generator ===== */}
      <Card className="border-slate-300 bg-gradient-to-br from-slate-50 to-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {t(language, 'adminDoc.bilanTitle')}
                  <Badge className="text-[10px] bg-slate-800 text-white">{t(language, 'adminDoc.bilanBadge')}</Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(language, 'adminDoc.bilanDesc')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => { setBilanResult(null); setBilanOpen(true) }}
              disabled={bilanLoading}
              className="cursor-pointer bg-slate-800 hover:bg-slate-900 text-white shrink-0"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {t(language, 'adminDoc.bilanGenerate')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Inquiries (only show if any) */}
      {inquiries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                {t(language, 'adminDoc.enterpriseInquiries')} ({inquiries.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInquiries}
                className="cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {t(language, 'adminDoc.refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {inquiries.slice(0, 10).map((inq) => (
                  <div key={inq.id} className="p-3 rounded-lg border bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm truncate">{inq.companyName}</p>
                          <Badge className={`text-[10px] ${
                            inq.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            inq.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                            inq.status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                            inq.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {inq.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {inq.contactName} · {inq.workEmail} · {inq.country || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inq.message}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs h-7"
                          onClick={() => handleGenerateQuote(inq)}
                          disabled={actionLoading === `gen-${inq.id}`}
                        >
                          {actionLoading === `gen-${inq.id}` ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <FilePlus className="w-3 h-3 mr-1" />
                          )}
                          {t(language, 'adminDoc.typeQuote')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs h-7"
                          onClick={() => handleGenerateAgreement(inq)}
                          disabled={actionLoading === `ctr-${inq.id}`}
                        >
                          <FileCheck className="w-3 h-3 mr-1" />
                          {t(language, 'adminDoc.typeAgreement')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Filters + Documents table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t(language, 'adminDoc.generatedDocuments')} ({documents.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t(language, 'adminDoc.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-40"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t(language, 'adminDoc.allTypes')}</SelectItem>
                  <SelectItem value="invoice" className="text-xs">{t(language, 'adminDoc.invoices')}</SelectItem>
                  <SelectItem value="quote" className="text-xs">{t(language, 'adminDoc.typeQuote')}</SelectItem>
                  <SelectItem value="agreement" className="text-xs">{t(language, 'adminDoc.contracts')}</SelectItem>
                  <SelectItem value="receipt" className="text-xs">{t(language, 'adminDoc.receipts')}</SelectItem>
                  <SelectItem value="accounting_statement" className="text-xs">{t(language, 'adminDoc.bilans')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t(language, 'adminDoc.allStatuses')}</SelectItem>
                  <SelectItem value="draft" className="text-xs">{t(language, 'adminDoc.statusDraft')}</SelectItem>
                  <SelectItem value="sent" className="text-xs">{t(language, 'adminDoc.statusSent')}</SelectItem>
                  <SelectItem value="paid" className="text-xs">{t(language, 'adminDoc.statusPaid')}</SelectItem>
                  <SelectItem value="accepted" className="text-xs">{t(language, 'adminDoc.statusAccepted')}</SelectItem>
                  <SelectItem value="finalized" className="text-xs">{t(language, 'adminDoc.statusFinalized')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDocuments}
                className="cursor-pointer h-8"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              {t(language, 'adminDoc.loading')}
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t(language, 'adminDoc.emptyState')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(language, 'adminDoc.emptyStateSub')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colNumber')}</TableHead>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colType')}</TableHead>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colRecipient')}</TableHead>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colSubject')}</TableHead>
                  <TableHead className="text-xs text-right">{t(language, 'adminDoc.colAmount')}</TableHead>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colStatus')}</TableHead>
                  <TableHead className="text-xs">{t(language, 'adminDoc.colDate')}</TableHead>
                  <TableHead className="text-xs text-right">{t(language, 'adminDoc.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const meta = TYPE_META[doc.type] || TYPE_META.invoice
                  const statusMeta = STATUS_META[doc.status] || STATUS_META.draft
                  const Icon = meta.icon
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="text-xs font-mono font-semibold">
                        <div className="flex items-center gap-1.5">
                          {doc.number}
                          {doc.signatureSerial && (
                            <span title={`${t(language, 'adminDoc.signed')} — ${doc.signatureSerial} — Hash: ${doc.signatureHash?.slice(0, 16)}…`}>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${meta.badge}`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />
                          {t(language, meta.key)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{doc.recipientName}</div>
                        {doc.recipientCompany && (
                          <div className="text-[10px] text-muted-foreground">{doc.recipientCompany}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={doc.subject}>
                        {doc.subject}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {doc.type === 'accounting_statement' && doc.totalCollected != null ? (
                          <div>
                            <div className="text-slate-500 line-through text-[10px]">{formatMoney(doc.totalCollected, doc.currency)}</div>
                            <div className="text-emerald-700">{formatMoney(doc.netProfit || 0, doc.currency)}</div>
                            <div className="text-[9px] text-muted-foreground">{t(language, 'adminDoc.netProfit')}</div>
                          </div>
                        ) : (
                          formatMoney(doc.total, doc.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusMeta.badge}`}>
                          {t(language, statusMeta.key)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(doc.issueDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer h-7 w-7 p-0"
                            onClick={() => handleDownload(doc)}
                            disabled={actionLoading === `dl-${doc.id}`}
                            title={t(language, 'adminDoc.downloadPdf')}
                          >
                            {actionLoading === `dl-${doc.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer h-7 w-7 p-0"
                            onClick={() => handleSend(doc)}
                            disabled={actionLoading === `send-${doc.id}`}
                            title={t(language, 'adminDoc.sendEmail')}
                          >
                            {actionLoading === `send-${doc.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          {doc.type === 'quote' && doc.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="cursor-pointer h-7 text-xs px-2 text-emerald-600"
                              onClick={() => handleUpdateStatus(doc.id, 'accepted')}
                              title={t(language, 'adminDoc.markAccepted')}
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {doc.type === 'invoice' && doc.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="cursor-pointer h-7 text-xs px-2 text-emerald-600"
                              onClick={() => handleUpdateStatus(doc.id, 'paid')}
                              title={t(language, 'adminDoc.markPaid')}
                            >
                              ✓
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ===== Bilan Generation Dialog ===== */}
      <Dialog open={bilanOpen} onOpenChange={setBilanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-slate-700" />
              {t(language, 'adminDoc.bilanDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t(language, 'adminDoc.bilanDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {bilanResult ? (
            <div className="py-4 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <p className="font-semibold text-sm">{t(language, 'adminDoc.typeBilan')} {bilanResult.number} {t(language, 'adminDoc.generated')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bilanResult.invoiceCount} {t(language, 'adminDoc.invoicesAggregated')} · {t(language, 'adminDoc.collected')} {formatMoney(bilanResult.totalCollected, 'EUR')}
                </p>
                <p className="text-sm font-bold text-emerald-700 mt-2">
                  {t(language, 'adminDoc.netProfitLabel')} {formatMoney(bilanResult.netProfit, 'EUR')}
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    const doc = documents.find((d) => d.number === bilanResult.number)
                    if (doc) handleDownload(doc)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t(language, 'adminDoc.downloadPdf')}
                </Button>
                <Button
                  className="cursor-pointer bg-slate-800 hover:bg-slate-900 text-white"
                  onClick={() => { setBilanResult(null); setBilanOpen(false) }}
                >
                  {t(language, 'adminDoc.close')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {t(language, 'adminDoc.choosePeriod')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('this_month')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.thisMonth')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.thisMonthDesc')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('last_month')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.lastMonth')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.lastMonthDesc')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('this_quarter')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.thisQuarter')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.thisQuarterDesc')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('last_quarter')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.lastQuarter')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.lastQuarterDesc')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('ytd')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.yearToDate')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.yearToDateDesc')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer h-auto py-3 flex flex-col items-start"
                  disabled={bilanLoading}
                  onClick={() => handleGenerateBilan('last_year')}
                >
                  <span className="text-xs font-semibold">{t(language, 'adminDoc.lastYear')}</span>
                  <span className="text-[10px] text-muted-foreground">{t(language, 'adminDoc.lastYearDesc')}</span>
                </Button>
              </div>

              {bilanLoading && (
                <div className="flex items-center justify-center py-3 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t(language, 'adminDoc.bilanGenerating')}
                </div>
              )}

              <div className="text-[10px] text-muted-foreground bg-slate-50 rounded-md p-2.5 border border-slate-200 space-y-1">
                <p className="font-semibold text-slate-600">{t(language, 'adminDoc.bilanContentsTitle')}</p>
                <p>{t(language, 'adminDoc.bilanContentSummary')}</p>
                <p>{t(language, 'adminDoc.bilanContentDetail')}</p>
                <p>{t(language, 'adminDoc.bilanContentFiscal')}</p>
                <p>{t(language, 'adminDoc.bilanContentSignature')}</p>
                <p>{t(language, 'adminDoc.bilanContentAudit')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
