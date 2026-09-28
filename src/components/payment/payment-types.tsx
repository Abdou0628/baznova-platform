'use client'

import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Transaction {
  id: string; date: string; client: string; plan: string
  montant: number; statut: 'succeeded' | 'failed' | 'pending'; provider: string
}

export interface MonthlyRevenue { month: string; amount: number }

export interface Invoice {
  id: string; client: string; amount: number; status: string; dueDate: string
}

export interface DashboardData {
  totalRevenue: number; activeSubscriptions: number; mrr: number
  pendingInvoices: number; revenueTrend: number; subscriptionTrend: number
  transactions: Transaction[]; monthlyRevenue: MonthlyRevenue[]
  starterCount: number; proCount: number; careerCount: number
  employerCount: number; annualCount: number
  invoices: Invoice[]; taxIsRate: number; taxTvaCollected: number; taxTotalLiability: number
}

export interface TaxResult { isAmount: number; isRate: number; tvaNet: number; totalLiability: number }

export interface AiInsight {
  insights: string[]; risks: string[]; recommendations: string[]
  forecast: { nextMonthRevenue: number; confidence: number; projectedMRR: number }
  healthScore: number; summary: string
}

export interface CashFlowMonth { key: string; label: string; inflow: number; outflow: number; net: number }

export interface CashFlowData {
  months: CashFlowMonth[]; currentMonth: { inflow: number; outflow: number; net: number }
  trends: { inflowTrend: number; outflowTrend: number }
  metrics: { avgMonthlyInflow: number; avgMonthlyOutflow: number; burnRate: number; runwayDays: number; profitMargin: number }
}

export interface AccountingEntryRow {
  id: string; type: string; category: string; description: string
  amount: number; currency: string; status: string; createdAt: string; reference?: string
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

export const mockData: DashboardData = {
  totalRevenue: 124750, activeSubscriptions: 287, mrr: 38450, pendingInvoices: 12,
  revenueTrend: 12.5, subscriptionTrend: 8.3,
  transactions: [
    { id: 'TXN-001', date: '2025-06-28', client: 'Yasmine B.', plan: 'Career+', montant: 399, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-002', date: '2025-06-27', client: 'Omar T.', plan: 'Pro', montant: 190, statut: 'succeeded', provider: 'PayMob' },
    { id: 'TXN-003', date: '2025-06-27', client: 'Fatima Z.', plan: 'Employer', montant: 490, statut: 'pending', provider: 'Stripe' },
    { id: 'TXN-004', date: '2025-06-26', client: 'Karim M.', plan: 'Starter', montant: 90, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-005', date: '2025-06-25', client: 'Amina R.', plan: 'Annual', montant: 700, statut: 'failed', provider: 'LemonSqueezy' },
    { id: 'TXN-006', date: '2025-06-24', client: 'Hassan L.', plan: 'Pro', montant: 190, statut: 'succeeded', provider: 'PayMob' },
    { id: 'TXN-007', date: '2025-06-23', client: 'Sara K.', plan: 'Career+', montant: 399, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-008', date: '2025-06-22', client: 'Rachid D.', plan: 'Starter', montant: 90, statut: 'succeeded', provider: 'Stripe' },
    { id: 'TXN-009', date: '2025-06-21', client: 'Nadia F.', plan: 'Employer', montant: 490, statut: 'pending', provider: 'PayMob' },
    { id: 'TXN-010', date: '2025-06-20', client: 'Mehdi A.', plan: 'Annual', montant: 700, statut: 'succeeded', provider: 'LemonSqueezy' },
  ],
  monthlyRevenue: [
    { month: 'Jan', amount: 14200 }, { month: 'Fév', amount: 18600 },
    { month: 'Mar', amount: 22400 }, { month: 'Avr', amount: 19800 },
    { month: 'Mai', amount: 25100 }, { month: 'Juin', amount: 24650 },
  ],
  starterCount: 42, proCount: 105, careerCount: 78, employerCount: 34, annualCount: 28,
  invoices: [
    { id: 'INV-001', client: 'Société Atlas', amount: 4900, status: 'pending', dueDate: '2025-07-15' },
    { id: 'INV-002', client: 'Groupe Sahara', amount: 7200, status: 'draft', dueDate: '2025-07-20' },
    { id: 'INV-003', client: 'TechMa Solutions', amount: 1400, status: 'paid', dueDate: '2025-06-30' },
    { id: 'INV-004', client: 'Oasis RH', amount: 3500, status: 'cancelled', dueDate: '2025-06-10' },
    { id: 'INV-005', client: 'Digital Maroc', amount: 2800, status: 'pending', dueDate: '2025-07-25' },
  ],
  taxIsRate: 17.5, taxTvaCollected: 7690, taxTotalLiability: 19015,
}

export const plans = [
  { key: 'starter', price: 9, features: ['CV Generator', 'ATS Analysis', '5 CV/month'] },
  { key: 'pro', price: 19, features: ['All Starter + Jobs', 'LinkedIn', '20 CV/month', 'Interview Sim'] },
  { key: 'career_plus', price: 39, features: ['All Pro + Coach', 'Formation', 'Freelance', '50 CV/month', 'Intelligence'] },
  { key: 'employer', price: 49, features: ['Recruiter Pipeline', 'Candidate Matching', 'Job Postings', 'API Access'] },
  { key: 'annual', price: 70, features: ['All Career+ features', '17% savings', 'Priority support'] },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatMAD(amount: number): string {
  return new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' MAD'
}

export function t(fr: string, en: string, lang: string) { return lang === 'fr' ? fr : en }

export function statusBadge(status: string, language?: string) {
  const map: Record<string, { cls: string; label: Record<string, string> }> = {
    succeeded: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: { fr: 'Succès', en: 'Success', ar: 'نجاح', es: 'Éxito' } },
    pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', label: { fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار', es: 'Pendiente' } },
    failed: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', label: { fr: 'Échoué', en: 'Failed', ar: 'فشل', es: 'Fallido' } },
    draft: { cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: { fr: 'Brouillon', en: 'Draft', ar: 'مسودة', es: 'Borrador' } },
    paid: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: { fr: 'Payée', en: 'Paid', ar: 'مدفوعة', es: 'Pagada' } },
    cancelled: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', label: { fr: 'Annulée', en: 'Cancelled', ar: 'ملغاة', es: 'Cancelada' } },
    completed: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: { fr: 'Terminé', en: 'Completed', ar: 'مكتمل', es: 'Completado' } },
  }
  const s = map[status] || map.draft
  return <Badge className={s.cls}>{s.label[language ?? 'fr'] ?? s.label.fr}</Badge>
}
