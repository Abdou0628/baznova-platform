'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, FileText, Target, Brain, Crown, Cpu, Megaphone, DollarSign,
  Settings, Package, Scale, Shield, Clock, AlertTriangle, Activity,
  Database, TrendingUp, Eye, CheckCircle2, XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'

/* ------------------------------------------------------------------ */
/*  i18n LABELS                                                       */
/* ------------------------------------------------------------------ */
const LABELS: Record<string, Record<string, string>> = {
  title:           { fr: 'HIRENOVA AI BOARD',  en: 'HIRENOVA AI BOARD',  ar: 'لوحة HIRENOVA الذكية',  es: 'HIRENOVA AI BOARD' },
  subtitle:        { fr: 'Direction Générale IA en Temps Réel', en: 'Real-time AI Executive Board', ar: 'المجلس التنفيذي الذكي بالوقت الفعلي', es: 'Junta Ejecutiva IA en Tiempo Real' },
  totalUsers:      { fr: 'Utilisateurs Totaux', en: 'Total Users', ar: 'إجمالي المستخدمين', es: 'Usuarios Totales' },
  cvsGenerated:    { fr: 'CVs Générés', en: 'CVs Generated', ar: 'السير الذاتية المُنشأة', es: 'CVs Generados' },
  activeMissions:  { fr: 'Missions Actives', en: 'Active Missions', ar: 'المهام النشطة', es: 'Misiones Activas' },
  aiDecisions:     { fr: 'Décisions IA', en: 'AI Decisions', ar: 'قرارات الذكاء الاصطناعي', es: 'Decisiones IA' },
  boardMembers:    { fr: 'Membres du Board IA', en: 'AI Board Members', ar: 'أعضاء المجلس الذكي', es: 'Miembros del Board IA' },
  activeStatus:    { fr: 'ACTIF', en: 'ACTIVE', ar: 'نشط', es: 'ACTIVO' },
  standbyStatus:   { fr: 'EN VEILLE', en: 'STANDBY', ar: 'في انتظار', es: 'EN ESPERA' },
  activity:        { fr: 'Activité', en: 'Activity', ar: 'النشاط', es: 'Actividad' },
  missions:        { fr: 'Missions Actives', en: 'Active Missions', ar: 'المهام النشطة', es: 'Misiones Activas' },
  priority:        { fr: 'Priorité', en: 'Priority', ar: 'الأولوية', es: 'Prioridad' },
  assigned:        { fr: 'Assigné', en: 'Assigned', ar: 'مُعيَّن', es: 'Asignado' },
  riskAudit:       { fr: 'Risque & Audit', en: 'Risk & Audit', ar: 'المخاطر والتدقيق', es: 'Riesgo y Auditoría' },
  riskGauge:       { fr: 'Jauge de Risque', en: 'Risk Gauge', ar: 'مقياس المخاطر', es: 'Medidor de Riesgo' },
  allowed:         { fr: 'Autorisés', en: 'Allowed', ar: 'مصرح', es: 'Permitidos' },
  blocked:         { fr: 'Bloqués', en: 'Blocked', ar: 'محظور', es: 'Bloqueados' },
  auditLogs:       { fr: 'Journaux d\'Audit Récents', en: 'Recent Audit Logs', ar: 'سجلات التدقيق الأخيرة', es: 'Registros de Auditoría Recientes' },
  memoryStats:     { fr: 'Statistiques Mémoire IA', en: 'AI Memory Stats', ar: 'إحصائيات ذاكرة الذكاء الاصطناعي', es: 'Estadísticas de Memoria IA' },
  totalMemories:   { fr: 'Mémoires Totales', en: 'Total Memories', ar: 'إجمالي الذكريات', es: 'Memorias Totales' },
  longTerm:        { fr: 'Long Terme', en: 'Long Term', ar: 'طويلة الأمد', es: 'Largo Plazo' },
  shortTerm:       { fr: 'Court Terme', en: 'Short Term', ar: 'قصيرة الأمد', es: 'Corto Plazo' },
  episodic:        { fr: 'Épisodique', en: 'Episodic', ar: 'مؤقتة', es: 'Episódica' },
  procedural:      { fr: 'Procédurale', en: 'Procedural', ar: 'إجرائية', es: 'Procedimental' },
  loading:         { fr: 'Chargement du board...', en: 'Loading board...', ar: 'جاري تحميل اللوحة...', es: 'Cargando tablero...' },
  deptStrategy:    { fr: 'Stratégie', en: 'Strategy', ar: 'الاستراتيجية', es: 'Estrategia' },
  deptTechnology:  { fr: 'Technologie', en: 'Technology', ar: 'التكنولوجيا', es: 'Tecnología' },
  deptMarketing:   { fr: 'Marketing', en: 'Marketing', ar: 'التسويق', es: 'Marketing' },
  deptFinance:     { fr: 'Finance', en: 'Finance', ar: 'المالية', es: 'Finanzas' },
  deptOperations:  { fr: 'Opérations', en: 'Operations', ar: 'العمليات', es: 'Operaciones' },
  deptProduct:     { fr: 'Produit', en: 'Product', ar: 'المنتج', es: 'Producto' },
  deptCompliance:  { fr: 'Conformité', en: 'Compliance', ar: 'الامتثال', es: 'Cumplimiento' },
  deptSecurity:    { fr: 'Sécurité', en: 'Security', ar: 'الأمن', es: 'Seguridad' },
  mission1:        { fr: 'Audit complet des CV générés ce mois', en: 'Full audit of CVs generated this month', ar: 'تدقيق شامل للسير الذاتية المُنشأة هذا الشهر', es: 'Auditoría completa de CVs generados este mes' },
  mission2:        { fr: 'Optimisation du pipeline de recrutement', en: 'Recruitment pipeline optimization', ar: 'تحسين مسار التوظيف', es: 'Optimización del pipeline de reclutamiento' },
  mission3:        { fr: 'Mise à jour du modèle NLP multilingue', en: 'Multilingual NLP model update', ar: 'تحديث نموذج NLP متعدد اللغات', es: 'Actualización del modelo NLP multilingüe' },
  mission4:        { fr: 'Renforcement de la sécurité des données', en: 'Data security hardening', ar: 'تعزيز أمن البيانات', es: 'Fortalecimiento de la seguridad de datos' },
  mission5:        { fr: 'Expansion internationale — Marché MENA', en: 'International expansion — MENA market', ar: 'التوسع الدولي — سوق الشرق الأوسط', es: 'Expansión internacional — Mercado MENA' },
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface BoardKPI {
  totalUsers: number
  cvsGenerated: number
  activeMissions: number
  aiDecisions: number
  usersChange: number
  cvsChange: number
  missionsChange: number
  decisionsChange: number
}

interface BoardMission {
  id: string
  titleKey: string
  priority: 'P1' | 'P2' | 'P3'
  progress: number
  agents: string[]
}

interface AuditEntry {
  agent: string
  action: string
  timeAgo: string
  type: 'allow' | 'block'
}

interface BoardData {
  kpis: BoardKPI
  missions: BoardMission[]
  audits: AuditEntry[]
  memories: { total: number; longTerm: number; shortTerm: number; episodic: number; procedural: number }
}

/* ------------------------------------------------------------------ */
/*  Board Members Definition                                           */
/* ------------------------------------------------------------------ */
const BOARD_MEMBERS = [
  { id: 'ceo',      name: 'CEO AI',     icon: Crown,      color: 'amber',   deptKey: 'deptStrategy',   active: true,  activity: 94 },
  { id: 'cto',      name: 'CTO AI',     icon: Cpu,        color: 'emerald', deptKey: 'deptTechnology', active: true,  activity: 87 },
  { id: 'cmo',      name: 'CMO AI',     icon: Megaphone,  color: 'violet',  deptKey: 'deptMarketing',  active: true,  activity: 72 },
  { id: 'cfo',      name: 'CFO AI',     icon: DollarSign, color: 'rose',    deptKey: 'deptFinance',    active: false, activity: 45 },
  { id: 'coo',      name: 'COO AI',     icon: Settings,   color: 'cyan',    deptKey: 'deptOperations', active: true,  activity: 81 },
  { id: 'cpo',      name: 'CPO AI',     icon: Package,    color: 'orange',  deptKey: 'deptProduct',    active: true,  activity: 68 },
  { id: 'legal',    name: 'LEGAL AI',   icon: Scale,      color: 'slate',   deptKey: 'deptCompliance', active: false, activity: 33 },
  { id: 'security', name: 'SECURITY AI', icon: Shield,    color: 'red',     deptKey: 'deptSecurity',   active: true,  activity: 91 },
] as const

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; bar: string; iconBg: string }> = {
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-amber-500/30',   bar: '[&>div]:bg-amber-500',   iconBg: 'bg-amber-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/30', bar: '[&>div]:bg-emerald-500', iconBg: 'bg-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  ring: 'ring-violet-500/30',  bar: '[&>div]:bg-violet-500',  iconBg: 'bg-violet-500/20' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',     ring: 'ring-rose-500/30',    bar: '[&>div]:bg-rose-500',    iconBg: 'bg-rose-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',     ring: 'ring-cyan-500/30',    bar: '[&>div]:bg-cyan-500',    iconBg: 'bg-cyan-500/20' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  ring: 'ring-orange-500/30',  bar: '[&>div]:bg-orange-500',  iconBg: 'bg-orange-500/20' },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-300',   ring: 'ring-slate-500/30',   bar: '[&>div]:bg-slate-400',   iconBg: 'bg-slate-500/20' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     ring: 'ring-red-500/30',     bar: '[&>div]:bg-red-500',     iconBg: 'bg-red-500/20' },
}

/* ------------------------------------------------------------------ */
/*  Mock Data (fallback when API fails)                                */
/* ------------------------------------------------------------------ */
const MOCK_DATA: BoardData = {
  kpis: {
    totalUsers: 14832, cvsGenerated: 38741, activeMissions: 12, aiDecisions: 284503,
    usersChange: 12.4, cvsChange: 18.7, missionsChange: 8.3, decisionsChange: 24.1,
  },
  missions: [
    { id: 'm1', titleKey: 'mission1', priority: 'P1', progress: 78, agents: ['CEO AI', 'CTO AI'] },
    { id: 'm2', titleKey: 'mission2', priority: 'P1', progress: 45, agents: ['COO AI', 'CPO AI'] },
    { id: 'm3', titleKey: 'mission3', priority: 'P2', progress: 92, agents: ['CTO AI'] },
    { id: 'm4', titleKey: 'mission4', priority: 'P2', progress: 63, agents: ['SECURITY AI', 'LEGAL AI'] },
    { id: 'm5', titleKey: 'mission5', priority: 'P3', progress: 31, agents: ['CEO AI', 'CMO AI'] },
  ],
  audits: [
    { agent: 'CEO AI',     action: 'CV pipeline approved',       timeAgo: '2m',  type: 'allow' },
    { agent: 'SECURITY AI', action: 'Suspicious request blocked', timeAgo: '5m',  type: 'block' },
    { agent: 'LEGAL AI',   action: 'GDPR check passed',          timeAgo: '8m',  type: 'allow' },
    { agent: 'CTO AI',     action: 'Model deploy approved',      timeAgo: '12m', type: 'allow' },
    { agent: 'SECURITY AI', action: 'Rate limit enforced',        timeAgo: '15m', type: 'block' },
  ],
  memories: { total: 184729, longTerm: 98421, shortTerm: 52310, episodic: 21847, procedural: 12151 },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function getPriorityStyle(p: string) {
  switch (p) {
    case 'P1': return 'bg-red-500/20 text-red-400 border border-red-500/30'
    case 'P2': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    case 'P3': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    default:  return 'bg-slate-500/20 text-slate-400'
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DigitalBoard() {
  const { language } = useCVStore()
  const lang = language as 'fr' | 'en' | 'ar' | 'es'
  const isRTL = lang === 'ar'
  const l = (key: string) => LABELS[key]?.[lang] ?? LABELS[key]?.fr ?? key

  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')

  /* ---- Fetch board data ---- */
  useEffect(() => {
    let cancelled = false
    async function fetchBoard() {
      try {
        const res = await fetch('/api/ai-os/board')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(MOCK_DATA)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBoard()
    return () => { cancelled = true }
  }, [])

  /* ---- Clock (every 30s) ---- */
  useEffect(() => {
    function tick() {
      const now = new Date()
      setCurrentTime(
        now.toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }) + ' — ' +
        now.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
      )
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [lang])

  /* ---- Derived ---- */
  const kpis = data?.kpis ?? MOCK_DATA.kpis
  const missions = data?.missions ?? MOCK_DATA.missions
  const audits = data?.audits ?? MOCK_DATA.audits
  const memories = data?.memories ?? MOCK_DATA.memories
  const allowedCount = audits.filter(a => a.type === 'allow').length
  const blockedCount = audits.filter(a => a.type === 'block').length

  const KPI_CARDS = [
    { icon: Users,    color: 'emerald', value: kpis.totalUsers,    change: kpis.usersChange,    labelKey: 'totalUsers' },
    { icon: FileText, color: 'violet',  value: kpis.cvsGenerated,  change: kpis.cvsChange,     labelKey: 'cvsGenerated' },
    { icon: Target,   color: 'amber',   value: kpis.activeMissions,change: kpis.missionsChange, labelKey: 'activeMissions' },
    { icon: Brain,    color: 'rose',    value: kpis.aiDecisions,   change: kpis.decisionsChange, labelKey: 'aiDecisions' },
  ]

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto"
          />
          <p className="text-slate-400 text-sm">{l('loading')}</p>
        </motion.div>
      </div>
    )
  }

  /* ---- Main render ---- */
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 text-slate-100">

      {/* ═══════════════════ 1. HEADER ═══════════════════ */}
      <header className="relative border-b border-slate-800/60">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 start-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-emerald-500/8 blur-[120px] rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent"
          >
            {l('title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-2 text-sm sm:text-base text-slate-500"
          >
            {l('subtitle')}
          </motion.p>
          {currentTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-900/60 border border-slate-800/60 rounded-full px-4 py-1.5"
            >
              <Clock className="w-3 h-3" />
              {currentTime}
            </motion.div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* ═══════════════════ 2. KPI CARDS ═══════════════════ */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {KPI_CARDS.map((kpi, i) => {
              const Icon = kpi.icon
              const colors = COLOR_MAP[kpi.color]
              return (
                <motion.div
                  key={kpi.labelKey}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                >
                  <Card className="bg-slate-900/70 border-slate-800/60 backdrop-blur-sm hover:border-slate-700/60 transition-colors">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`${colors.iconBg} p-2 rounded-lg`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
                        </div>
                        <span className={`text-xs font-medium ${kpi.change >= 0 ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-0.5`}>
                          <TrendingUp className={`w-3 h-3 ${kpi.change < 0 ? 'rotate-180' : ''}`} />
                          {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                        </span>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold ${colors.text} tabular-nums`}>
                        {formatNumber(kpi.value)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 truncate">{l(kpi.labelKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════ 3. AI BOARD MEMBERS ═══════════════════ */}
        <section>
          <motion.h2
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg sm:text-xl font-bold text-slate-200 mb-4 flex items-center gap-2"
          >
            <Brain className="w-5 h-5 text-emerald-400" />
            {l('boardMembers')}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {BOARD_MEMBERS.map((member, i) => {
              const Icon = member.icon
              const colors = COLOR_MAP[member.color]
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <Card className={`bg-slate-900/70 border-slate-800/60 backdrop-blur-sm hover:border-slate-700/60 transition-all ring-1 ring-transparent hover:${colors.ring}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Icon + Name row */}
                      <div className="flex items-center gap-3">
                        <div className={`relative ${colors.iconBg} p-2.5 rounded-xl ring-1 ${colors.ring}`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                          {member.active && (
                            <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900">
                              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm ${colors.text} truncate`}>{member.name}</p>
                          <p className="text-xs text-slate-500">{l(member.deptKey)}</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        <Badge
                          className={`${
                            member.active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          } border text-[10px] font-semibold tracking-wide px-2.5 py-0.5`}
                        >
                          {member.active ? l('activeStatus') : l('standbyStatus')}
                        </Badge>
                      </div>

                      {/* Mini progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{l('activity')}</span>
                          <span className="tabular-nums">{member.activity}%</span>
                        </div>
                        <Progress value={member.activity} className={`h-1.5 bg-slate-800 ${colors.bar}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════ 4. ACTIVE MISSIONS ═══════════════════ */}
        <section>
          <motion.h2
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg sm:text-xl font-bold text-slate-200 mb-4 flex items-center gap-2"
          >
            <Target className="w-5 h-5 text-amber-400" />
            {l('missions')}
          </motion.h2>

          <div className="space-y-3">
            {missions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: isRTL ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
              >
                <Card className="bg-slate-900/70 border-slate-800/60 backdrop-blur-sm hover:border-slate-700/60 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Title + Priority */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-200 truncate">{l(mission.titleKey)}</p>
                          <Badge className={`${getPriorityStyle(mission.priority)} text-[10px] font-bold px-2 py-0`}>
                            {mission.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={mission.progress} className="h-2 flex-1 bg-slate-800 [&>div]:bg-emerald-500" />
                          <span className="text-xs text-emerald-400 font-semibold tabular-nums w-10 text-end">{mission.progress}%</span>
                        </div>
                      </div>

                      {/* Assigned agents */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">{l('assigned')}</span>
                        {mission.agents.map(agent => (
                          <Badge key={agent} variant="outline" className="text-[10px] text-slate-400 border-slate-700 bg-slate-800/50 px-2 py-0">
                            {agent}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════ 5. RISK & AUDIT SUMMARY ═══════════════════ */}
        <section>
          <motion.h2
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg sm:text-xl font-bold text-slate-200 mb-4 flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            {l('riskAudit')}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Gauge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="bg-slate-900/70 border-slate-800/60 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    {l('riskGauge')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Horizontal stacked bar */}
                  <div className="flex rounded-lg overflow-hidden h-8 bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(allowedCount / Math.max(audits.length, 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.9 }}
                      className="bg-emerald-500/70 flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-sm">
                        {l('allowed')}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(blockedCount / Math.max(audits.length, 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.9 }}
                      className="bg-red-500/70 flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-sm">
                        {l('blocked')}
                      </span>
                    </motion.div>
                  </div>

                  {/* Summary numbers */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-400">{l('allowed')}:</span>
                      <span className="text-emerald-400 font-bold tabular-nums">{allowedCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-slate-400">{l('blocked')}:</span>
                      <span className="text-red-400 font-bold tabular-nums">{blockedCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Audit Logs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <Card className="bg-slate-900/70 border-slate-800/60 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" />
                    {l('auditLogs')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-800/60">
                    {audits.map((entry, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.85 + i * 0.05 }}
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.type === 'allow' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium text-slate-300 truncate min-w-0 flex-1">{entry.agent}</span>
                        <span className="text-[11px] text-slate-500 truncate hidden sm:inline max-w-[160px]">{entry.action}</span>
                        <span className="text-[10px] text-slate-600 tabular-nums flex-shrink-0">{entry.timeAgo}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════ 6. MEMORY STATS ═══════════════════ */}
        <section>
          <motion.h2
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg sm:text-xl font-bold text-slate-200 mb-4 flex items-center gap-2"
          >
            <Database className="w-5 h-5 text-cyan-400" />
            {l('memoryStats')}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-slate-900/70 border-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-5">
                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">{l('totalMemories')}</span>
                  <span className="text-xl sm:text-2xl font-bold text-cyan-400 tabular-nums">{formatNumber(memories.total)}</span>
                </div>

                {/* Breakdown bars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { key: 'longTerm',   value: memories.longTerm,   color: 'emerald', pct: Math.round((memories.longTerm / Math.max(memories.total, 1)) * 100) },
                    { key: 'shortTerm',  value: memories.shortTerm,  color: 'violet',  pct: Math.round((memories.shortTerm / Math.max(memories.total, 1)) * 100) },
                    { key: 'episodic',   value: memories.episodic,   color: 'amber',   pct: Math.round((memories.episodic / Math.max(memories.total, 1)) * 100) },
                    { key: 'procedural', value: memories.procedural, color: 'rose',    pct: Math.round((memories.procedural / Math.max(memories.total, 1)) * 100) },
                  ].map(item => {
                    const colors = COLOR_MAP[item.color]
                    return (
                      <div key={item.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{l(item.key)}</span>
                          <span className={`text-[11px] font-semibold ${colors.text} tabular-nums`}>{item.pct}%</span>
                        </div>
                        <Progress value={item.pct} className={`h-1.5 bg-slate-800 ${colors.bar}`} />
                        <p className={`text-xs ${colors.text} tabular-nums font-medium`}>{formatNumber(item.value)}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

      </main>

      {/* Footer glow */}
      <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  )
}
