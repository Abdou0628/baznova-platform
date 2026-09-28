'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Shield, CreditCard, Mail, Package, TestTube2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// ── Types ──
type CriterionStatus = 'pass' | 'fail' | 'pending'

interface ExitCriterion {
  id: number
  name: string
  target: string
  status: CriterionStatus
  measure: string
  category: CriterionCategory
}

type CriterionCategory = 'Security' | 'Payments' | 'Email' | 'Product' | 'Testing'

// ── Category icon map ──
const categoryIcons: Record<CriterionCategory, React.ElementType> = {
  Security: Shield,
  Payments: CreditCard,
  Email: Mail,
  Product: Package,
  Testing: TestTube2,
}

const categoryColors: Record<CriterionCategory, string> = {
  Security: 'text-red-400',
  Payments: 'text-amber-400',
  Email: 'text-blue-400',
  Product: 'text-emerald-400',
  Testing: 'text-purple-400',
}

const categoryBgColors: Record<CriterionCategory, string> = {
  Security: 'bg-red-500/10 border-red-500/20',
  Payments: 'bg-amber-500/10 border-amber-500/20',
  Email: 'bg-blue-500/10 border-blue-500/20',
  Product: 'bg-emerald-500/10 border-emerald-500/20',
  Testing: 'bg-purple-500/10 border-purple-500/20',
}

// ── The 20 Exit Criteria ──
const exitCriteria: ExitCriterion[] = [
  { id: 1,  name: 'P0 bugs résolus',                 target: '0 remaining',    status: 'pass',   measure: '0 P0 bugs',          category: 'Testing' },
  { id: 2,  name: 'Stripe fonctionnel',              target: 'Checkout + Webhook + Plan update', status: 'pass', measure: 'All flows tested',  category: 'Payments' },
  { id: 3,  name: 'SMTP fonctionnel',                target: 'Vérification + Reset + Reçu', status: 'pass',    measure: 'All emails delivered', category: 'Email' },
  { id: 4,  name: 'Data Isolation',                  target: '0 IDOR routes',  status: 'pass',   measure: '0 IDOR found',       category: 'Security' },
  { id: 5,  name: 'MFA enforced au login',           target: 'Enabled',        status: 'pass',   measure: 'TOTP + backup codes', category: 'Security' },
  { id: 6,  name: 'Email verification enforced',     target: 'Required',       status: 'pass',   measure: 'Verified before access', category: 'Email' },
  { id: 7,  name: 'Rate limiting toutes routes',     target: '100% mutation routes', status: 'pass', measure: 'All mutations limited', category: 'Security' },
  { id: 8,  name: 'CSP header configuré',            target: 'Active',         status: 'pass',   measure: 'CSP + HSTS + X-Frame', category: 'Security' },
  { id: 9,  name: 'Beta-testeurs actifs',            target: '20-50',          status: 'pending', measure: '12 actifs',          category: 'Testing' },
  { id: 10, name: 'Création CV réussie',             target: '>95%',           status: 'pass',   measure: '98.2%',              category: 'Product' },
  { id: 11, name: 'Génération lettre',               target: '>95%',           status: 'pass',   measure: '97.1%',              category: 'Product' },
  { id: 12, name: 'Chatbot fonctionnel',             target: '>95%',           status: 'pending', measure: '89.3%',              category: 'Product' },
  { id: 13, name: 'Erreurs critiques P0',            target: '0',              status: 'pass',   measure: '0 errors',           category: 'Testing' },
  { id: 14, name: 'Parcours inscription',            target: '100%',           status: 'pass',   measure: '100% complete',      category: 'Product' },
  { id: 15, name: 'Emails transactionnels',           target: '100%',           status: 'pass',   measure: '100% delivered',     category: 'Email' },
  { id: 16, name: 'Paiement Stripe',                 target: 'Testé E2E',      status: 'pass',   measure: 'E2E green',          category: 'Payments' },
  { id: 17, name: 'Mobile OK',                       target: 'Responsive',     status: 'pending', measure: 'Minor layout issues', category: 'Testing' },
  { id: 18, name: 'Desktop OK',                      target: 'All browsers',   status: 'pass',   measure: 'Chrome, Firefox, Safari', category: 'Testing' },
  { id: 19, name: 'Feedback utilisateurs collecté',  target: 'Ongoing',        status: 'pending', measure: '8/20 feedback forms', category: 'Product' },
  { id: 20, name: 'Bugs P1 bloquants',               target: '0',              status: 'fail',   measure: '2 P1 bugs',          category: 'Testing' },
]

// ── Status helpers ──
const statusConfig: Record<CriterionStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  pass:    { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'PASS' },
  fail:    { icon: XCircle,      color: 'text-red-400',     bgColor: 'bg-red-500/10',     label: 'FAIL' },
  pending: { icon: Clock,        color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   label: 'WIP' },
}

// ── Animation variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ── Component ──
export default function ExitCriteriaTracker() {
  // ── Stats ──
  const stats = useMemo(() => {
    const total = exitCriteria.length
    const passed = exitCriteria.filter((c) => c.status === 'pass').length
    const failed = exitCriteria.filter((c) => c.status === 'fail').length
    const pending = exitCriteria.filter((c) => c.status === 'pending').length
    const completion = Math.round((passed / total) * 100)
    return { total, passed, failed, pending, completion }
  }, [])

  // ── Grouped criteria ──
  const grouped = useMemo(() => {
    const categories: CriterionCategory[] = ['Security', 'Payments', 'Email', 'Product', 'Testing']
    return categories.map((cat) => ({
      category: cat,
      items: exitCriteria.filter((c) => c.category === cat),
    }))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 sm:p-6 lg:p-8">
      <motion.div
        className="max-w-5xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ── */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
                Exit Criteria Tracker
              </h1>
              <p className="text-slate-400 text-sm mt-1">BazNova V1 — Audit &amp; Launch Readiness</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${statusConfig.pass.bgColor} ${statusConfig.pass.color} border-0 px-3 py-1`}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {stats.passed} Pass
              </Badge>
              <Badge className={`${statusConfig.pending.bgColor} ${statusConfig.pending.color} border-0 px-3 py-1`}>
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {stats.pending} WIP
              </Badge>
              <Badge className={`${statusConfig.fail.bgColor} ${statusConfig.fail.color} border-0 px-3 py-1`}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                {stats.failed} Fail
              </Badge>
            </div>
          </div>

          {/* ── Overall progress ── */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300 text-sm font-medium">Overall Completion</span>
                <span className="text-white font-bold text-lg tabular-nums">{stats.completion}%</span>
              </div>
              <Progress value={stats.completion} className="h-4 bg-slate-700/50 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-teal-400" />
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>{stats.passed} of {stats.total} criteria met</span>
                <span>{stats.failed === 0 ? 'No blocking failures' : `${stats.failed} blocking failure${stats.failed > 1 ? 's' : ''}`}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Category sections ── */}
        <div className="space-y-6">
          {grouped.map(({ category, items }) => {
            const CategoryIcon = categoryIcons[category]
            const catPassed = items.filter((i) => i.status === 'pass').length
            const catTotal = items.length
            const catPercent = Math.round((catPassed / catTotal) * 100)

            return (
              <motion.div key={category} variants={itemVariants}>
                <Card className="bg-slate-800/40 border-slate-700/40 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryBgColors[category]} border`}>
                          <CategoryIcon className={`w-4 h-4 ${categoryColors[category]}`} />
                        </div>
                        {category}
                        <span className="text-slate-500 text-sm font-normal">({catPassed}/{catTotal})</span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs tabular-nums">{catPercent}%</span>
                        <div className="w-20 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${catPercent}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {items.map((criterion) => {
                        const cfg = statusConfig[criterion.status]
                        const StatusIcon = cfg.icon
                        return (
                          <div
                            key={criterion.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/30 transition-colors group"
                          >
                            {/* Status icon */}
                            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />

                            {/* Criterion name */}
                            <span className="text-sm text-slate-200 font-medium min-w-0 flex-1 truncate">
                              {criterion.id}. {criterion.name}
                            </span>

                            {/* Target */}
                            <span className="text-xs text-slate-500 hidden sm:block flex-shrink-0 max-w-[180px] truncate">
                              {criterion.target}
                            </span>

                            {/* Measure / current */}
                            <span className={`text-xs font-mono flex-shrink-0 ${
                              criterion.status === 'pass' ? 'text-emerald-400/70' :
                              criterion.status === 'fail' ? 'text-red-400/70' :
                              'text-amber-400/70'
                            }`}>
                              {criterion.measure}
                            </span>

                            {/* Status badge */}
                            <Badge
                              className={`${cfg.bgColor} ${cfg.color} border-0 text-[10px] px-2 py-0 h-5 flex-shrink-0`}
                            >
                              {cfg.label}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* ── Footer summary ── */}
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <Card className="bg-slate-800/30 border-slate-700/30">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Pass = criterion fully met
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  WIP = in progress, partially met
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  Fail = not met, blocks launch
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
