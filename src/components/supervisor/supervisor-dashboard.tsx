'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Activity, Brain, Zap, AlertTriangle, CheckCircle2, XCircle,
  Clock, Users, Wrench, MessageSquare, RefreshCw, Send, ChevronDown, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────

interface HealthService {
  name: string
  healthy: boolean
  responseTime: number
}

interface Issue {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  service: string
  message: string
  status: 'open' | 'investigating' | 'resolved'
  assignedAgent: string | null
  createdAt: string
}

interface SpecialistAgent {
  id: string
  name: string
  role: string
  status: 'online' | 'offline' | 'busy'
  load: number
  specialties: string[]
}

// ─── Component ───────────────────────────────────────────────────

export default function SupervisorDashboard({ language }: { language: string }) {
  const lang = language as 'fr' | 'en' | 'ar' | 'es'

  // ─── Localization ───────────────────────────────────────────
  const LABELS: Record<string, Record<string, string>> = {
    title: { fr: 'IA Superviseur BazNova', en: 'BazNova AI Supervisor', ar: 'مشرف BazNova الذكي', es: 'Supervisor IA BazNova' },
    subtitle: { fr: 'Surveillance en temps réel · Détection de pannes · Attribution automatique', en: 'Real-time monitoring · Fault detection · Auto-assignment', ar: 'مراقبة فورية · كشف الأعطال · تعيين تلقائي', es: 'Monitoreo en tiempo real · Detección de fallas · Asignación automática' },
    connected: { fr: 'Connecté', en: 'Connected', ar: 'متصل', es: 'Conectado' },
    disconnected: { fr: 'Déconnecté', en: 'Disconnected', ar: 'غير متصل', es: 'Desconectado' },
    submitComplaint: { fr: 'Soumettre une plainte', en: 'Submit Complaint', ar: 'تقديم شكوى', es: 'Enviar queja' },
    healthOverview: { fr: 'Vue d\'ensemble Santé', en: 'Health Overview', ar: 'نظرة عامة على الصحة', es: 'Resumen de Salud' },
    healthy: { fr: 'Sain', en: 'Healthy', ar: 'سليم', es: 'Saludable' },
    unhealthy: { fr: 'Défectueux', en: 'Unhealthy', ar: 'معطل', es: 'Defectuoso' },
    responseTime: { fr: 'Temps de réponse', en: 'Response time', ar: 'وقت الاستجابة', es: 'Tiempo de respuesta' },
    activeIssues: { fr: 'Problèmes actifs', en: 'Active Issues', ar: 'المشاكل النشطة', es: 'Problemas activos' },
    noIssues: { fr: 'Aucun problème actif — Tous les systèmes fonctionnent normalement', en: 'No active issues — All systems operating normally', ar: 'لا توجد مشاكل نشطة — جميع الأنظمة تعمل بشكل طبيعي', es: 'Sin problemas activos — Todos los sistemas operando normalmente' },
    specialistAgents: { fr: 'Agents spécialistes', en: 'Specialist Agents', ar: 'الوكلاء المتخصصون', es: 'Agentes especialistas' },
    assign: { fr: 'Attribuer', en: 'Assign', ar: 'تعيين', es: 'Asignar' },
    resolve: { fr: 'Résoudre', en: 'Resolve', ar: 'حل', es: 'Resolver' },
    refresh: { fr: 'Actualiser', en: 'Refresh', ar: 'تحديث', es: 'Actualizar' },
    ms: { fr: 'ms', en: 'ms', ar: 'مللي ث', es: 'ms' },
    load: { fr: 'Charge', en: 'Load', ar: 'الحمولة', es: 'Carga' },
    specialties: { fr: 'Spécialités', en: 'Specialties', ar: 'التخصصات', es: 'Especialidades' },
    complaintTitle: { fr: 'Nouvelle plainte', en: 'New Complaint', ar: 'شكوى جديدة', es: 'Nueva queja' },
    complaintDesc: { fr: 'Décrivez votre problème en détail', en: 'Describe your issue in detail', ar: 'صف مشكلتك بالتفصيل', es: 'Describa su problema en detalle' },
    description: { fr: 'Description', en: 'Description', ar: 'الوصف', es: 'Descripción' },
    descriptionPlaceholder: { fr: 'Décrivez le problème rencontré...', en: 'Describe the issue encountered...', ar: 'صف المشكلة التي واجهتها...', es: 'Describa el problema encontrado...' },
    category: { fr: 'Catégorie', en: 'Category', ar: 'الفئة', es: 'Categoría' },
    selectCategory: { fr: 'Sélectionner une catégorie', en: 'Select a category', ar: 'اختر فئة', es: 'Seleccionar una categoría' },
    priority: { fr: 'Priorité', en: 'Priority', ar: 'الأولوية', es: 'Prioridad' },
    selectPriority: { fr: 'Sélectionner la priorité', en: 'Select priority', ar: 'اختر الأولوية', es: 'Seleccionar prioridad' },
    send: { fr: 'Envoyer', en: 'Send', ar: 'إرسال', es: 'Enviar' },
    sending: { fr: 'Envoi en cours...', en: 'Sending...', ar: 'جاري الإرسال...', es: 'Enviando...' },
    complaintSuccess: { fr: 'Plainte soumise avec succès', en: 'Complaint submitted successfully', ar: 'تم تقديم الشكوى بنجاح', es: 'Queja enviada exitosamente' },
    complaintError: { fr: 'Erreur lors de la soumission de la plainte', en: 'Error submitting complaint', ar: 'خطأ في تقديم الشكوى', es: 'Error al enviar la queja' },
    resolveSuccess: { fr: 'Problème résolu avec succès', en: 'Issue resolved successfully', ar: 'تم حل المشكلة بنجاح', es: 'Problema resuelto exitosamente' },
    assignSuccess: { fr: 'Agent attribué avec succès', en: 'Agent assigned successfully', ar: 'تم تعيين الوكيل بنجاح', es: 'Agente asignado exitosamente' },
    assignedTo: { fr: 'Attribué à', en: 'Assigned to', ar: 'مسند إلى', es: 'Asignado a' },
    unassigned: { fr: 'Non attribué', en: 'Unassigned', ar: 'غير معين', es: 'Sin asignar' },
    // Categories
    cat_cv: { fr: 'CV', en: 'CV', ar: 'السيرة الذاتية', es: 'CV' },
    cat_ats: { fr: 'ATS', en: 'ATS', ar: 'ATS', es: 'ATS' },
    cat_interview: { fr: 'Entretien', en: 'Interview', ar: 'المقابلة', es: 'Entrevista' },
    cat_linkedin: { fr: 'LinkedIn', en: 'LinkedIn', ar: 'لينكد إن', es: 'LinkedIn' },
    cat_recruiter: { fr: 'Recruteur', en: 'Recruiter', ar: 'الموظف', es: 'Reclutador' },
    cat_career: { fr: 'Carrière', en: 'Career', ar: 'المسيرة', es: 'Carrera' },
    cat_coach: { fr: 'Coach', en: 'Coach', ar: 'المدرب', es: 'Coach' },
    cat_formation: { fr: 'Formation', en: 'Formation', ar: 'التكوين', es: 'Formación' },
    cat_payment: { fr: 'Paiement', en: 'Payment', ar: 'الدفع', es: 'Pago' },
    cat_legal: { fr: 'Juridique', en: 'Legal', ar: 'القانوني', es: 'Legal' },
    cat_mobility: { fr: 'Mobilité', en: 'Mobility', ar: 'التنقل', es: 'Movilidad' },
    cat_global: { fr: 'Global', en: 'Global', ar: 'عام', es: 'Global' },
    cat_other: { fr: 'Autre', en: 'Other', ar: 'أخرى', es: 'Otro' },
    // Priorities
    pri_low: { fr: 'Faible', en: 'Low', ar: 'منخفض', es: 'Bajo' },
    pri_medium: { fr: 'Moyen', en: 'Medium', ar: 'متوسط', es: 'Medio' },
    pri_high: { fr: 'Élevé', en: 'High', ar: 'عالي', es: 'Alto' },
    pri_critical: { fr: 'Critique', en: 'Critical', ar: 'حرج', es: 'Crítico' },
    // Severities
    sev_critical: { fr: 'Critique', en: 'Critical', ar: 'حرج', es: 'Crítico' },
    sev_high: { fr: 'Élevé', en: 'High', ar: 'عالي', es: 'Alto' },
    sev_medium: { fr: 'Moyen', en: 'Medium', ar: 'متوسط', es: 'Medio' },
    sev_low: { fr: 'Faible', en: 'Low', ar: 'منخفض', es: 'Bajo' },
    // Statuses
    status_open: { fr: 'Ouvert', en: 'Open', ar: 'مفتوح', es: 'Abierto' },
    status_investigating: { fr: 'En investigation', en: 'Investigating', ar: 'قيد التحقيق', es: 'Investigando' },
    status_resolved: { fr: 'Résolu', en: 'Resolved', ar: 'تم الحل', es: 'Resuelto' },
    // Agent statuses
    agent_online: { fr: 'En ligne', en: 'Online', ar: 'متصل', es: 'En línea' },
    agent_offline: { fr: 'Hors ligne', en: 'Offline', ar: 'غير متصل', es: 'Desconectado' },
    agent_busy: { fr: 'Occupé', en: 'Busy', ar: 'مشغول', es: 'Ocupado' },
    // Services
    svc_auth: { fr: 'Authentification', en: 'Authentication', ar: 'المصادقة', es: 'Autenticación' },
    svc_api: { fr: 'API', en: 'API', ar: 'API', es: 'API' },
    svc_admin: { fr: 'Administration', en: 'Admin', ar: 'الإدارة', es: 'Administración' },
    svc_websocket: { fr: 'WebSocket', en: 'WebSocket', ar: 'WebSocket', es: 'WebSocket' },
    svc_database: { fr: 'Base de données', en: 'Database', ar: 'قاعدة البيانات', es: 'Base de datos' },
  }

  const l = (key: string) => LABELS[key]?.[lang] ?? LABELS[key]?.fr ?? key

  // ─── State ──────────────────────────────────────────────────
  const [wsConnected, setWsConnected] = useState(false)
  const [healthLoading, setHealthLoading] = useState(true)
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [healthServices, setHealthServices] = useState<HealthService[]>([
    { name: 'svc_auth', healthy: false, responseTime: 0 },
    { name: 'svc_api', healthy: false, responseTime: 0 },
    { name: 'svc_admin', healthy: false, responseTime: 0 },
    { name: 'svc_websocket', healthy: false, responseTime: 0 },
    { name: 'svc_database', healthy: false, responseTime: 0 },
  ])
  const [issues, setIssues] = useState<Issue[]>([])
  const [agents, setAgents] = useState<SpecialistAgent[]>([
    { id: 'agent-diagnostics', name: 'Diagnostics Pro', role: 'role_diagnostic', status: 'online', load: 34, specialties: ['cat_cv', 'cat_ats', 'cat_interview'] },
    { id: 'agent-network', name: 'NetWatch AI', role: 'role_network', status: 'online', load: 67, specialties: ['cat_linkedin', 'cat_global', 'cat_mobility'] },
    { id: 'agent-data', name: 'DataGuard', role: 'role_data', status: 'busy', load: 89, specialties: ['cat_formation', 'cat_career', 'cat_coach'] },
    { id: 'agent-security', name: 'SecureScan', role: 'role_security', status: 'online', load: 12, specialties: ['cat_payment', 'cat_legal', 'cat_recruiter'] },
    { id: 'agent-recovery', name: 'RecoveryBot', role: 'role_recovery', status: 'offline', load: 0, specialties: ['cat_other'] },
    { id: 'agent-observer', name: 'WatchTower', role: 'role_observer', status: 'online', load: 45, specialties: ['cat_global', 'cat_linkedin', 'cat_cv'] },
  ])
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [complaintDesc, setComplaintDesc] = useState('')
  const [complaintCategory, setComplaintCategory] = useState('')
  const [complaintPriority, setComplaintPriority] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const socketRef = useRef<any>(null)

  // ─── Role labels ────────────────────────────────────────────
  const roleLabels: Record<string, Record<string, string>> = {
    role_diagnostic: { fr: 'Diagnostic', en: 'Diagnostic', ar: 'تشخيص', es: 'Diagnóstico' },
    role_network: { fr: 'Réseau', en: 'Network', ar: 'شبكة', es: 'Red' },
    role_data: { fr: 'Données', en: 'Data', ar: 'بيانات', es: 'Datos' },
    role_security: { fr: 'Sécurité', en: 'Security', ar: 'أمان', es: 'Seguridad' },
    role_recovery: { fr: 'Récupération', en: 'Recovery', ar: 'استرداد', es: 'Recuperación' },
    role_observer: { fr: 'Observateur', en: 'Observer', ar: 'مراقب', es: 'Observador' },
  }
  const rl = (key: string) => roleLabels[key]?.[lang] ?? roleLabels[key]?.fr ?? key

  // ─── Category options ───────────────────────────────────────
  const categories = ['cv', 'ats', 'interview', 'linkedin', 'recruiter', 'career', 'coach', 'formation', 'payment', 'legal', 'mobility', 'global', 'other']

  const priorityDot: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-yellow-500',
    low: 'bg-slate-400',
  }
  const severityConfig: Record<string, { color: string; bg: string }> = {
    critical: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/50 border-red-200 dark:border-red-800' },
    high: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
    medium: { color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800' },
    low: { color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' },
  }

  // ─── Agent status config ───────────────────────────────────
  const agentStatusConfig: Record<string, { color: string; dot: string }> = {
    online: { color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    offline: { color: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    busy: { color: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  }

  // ─── Type icon map ──────────────────────────────────────────
  const typeIconMap: Record<string, React.ElementType> = {
    user_complaint: MessageSquare,
    system_alert: AlertTriangle,
    auto_detected: Zap,
    health_check: Activity,
  }

  // ─── Fetch health ───────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/supervisor/health')
      if (res.ok) {
        const data = await res.json()
        if (data.services) {
          setHealthServices(prev =>
            prev.map(s => {
              const svc = data.services.find((d: any) => d.name === s.name || d.name === s.name.replace('svc_', ''))
              if (svc) return { ...s, healthy: svc.healthy ?? svc.status === 'healthy', responseTime: svc.responseTime ?? svc.latency ?? 0 }
              return s
            })
          )
        }
      }
    } catch {
      /* service unavailable — keep default state */
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // ─── Fetch issues ───────────────────────────────────────────
  const fetchIssues = useCallback(async () => {
    setIssuesLoading(true)
    try {
      const res = await fetch('/api/supervisor/issues')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.issues)) {
          setIssues(data.issues.filter((i: Issue) => i.status !== 'resolved'))
        }
      }
    } catch {
      /* service unavailable */
    } finally {
      setIssuesLoading(false)
    }
  }, [])

  // ─── WebSocket connection ──────────────────────────────────
  useEffect(() => {
    let mounted = true
    let reconnectTimer: NodeJS.Timeout

    async function connect() {
      try {
        const { io } = await import('socket.io-client')
        const socket = io('/?XTransformPort=3006', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 3000,
        })
        socketRef.current = socket

        socket.on('connect', () => { if (mounted) setWsConnected(true) })
        socket.on('disconnect', () => { if (mounted) setWsConnected(false) })

        socket.on('supervisor:alert', (data: any) => {
          if (!mounted) return
          if (data.issue) {
            setIssues(prev => [data.issue, ...prev].filter(i => i.status !== 'resolved'))
          }
          if (data.severity === 'critical' || data.severity === 'high') {
            toast.error(data.message || l('activeIssues'), {
              description: data.service ? `Service: ${data.service}` : undefined,
            })
          }
        })

        socket.on('supervisor:status', (data: any) => {
          if (!mounted) return
          if (data.health) {
            setHealthServices(prev =>
              prev.map(s => {
                const svc = data.health.find((h: any) => h.name === s.name || h.name === s.name.replace('svc_', ''))
                if (svc) return { ...s, healthy: svc.healthy ?? svc.status === 'healthy', responseTime: svc.responseTime ?? svc.latency ?? 0 }
                return s
              })
            )
          }
          if (data.agents) {
            setAgents(prev =>
              prev.map(a => {
                const upd = data.agents.find((d: any) => d.id === a.id)
                if (upd) return { ...a, status: upd.status ?? a.status, load: upd.load ?? a.load }
                return a
              })
            )
          }
        })
      } catch {
        if (mounted) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()
    return () => {
      mounted = false
      clearTimeout(reconnectTimer)
      socketRef.current?.disconnect()
    }
  }, [])

  // ─── Initial fetch ─────────────────────────────────────────
  useEffect(() => {
    fetchHealth()
    fetchIssues()
  }, [fetchHealth, fetchIssues])

  // ─── Submit complaint ──────────────────────────────────────
  const handleSubmitComplaint = async () => {
    if (!complaintDesc.trim() || !complaintCategory || !complaintPriority) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/supervisor/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_complaint',
          severity: complaintPriority,
          service: complaintCategory,
          message: complaintDesc.trim(),
        }),
      })
      if (res.ok) {
        toast.success(l('complaintSuccess'))
        setComplaintOpen(false)
        setComplaintDesc('')
        setComplaintCategory('')
        setComplaintPriority('')
        fetchIssues()
      } else {
        toast.error(l('complaintError'))
      }
    } catch {
      toast.error(l('complaintError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Resolve issue ─────────────────────────────────────────
  const handleResolve = async (issueId: string) => {
    try {
      const res = await fetch('/api/supervisor/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status: 'resolved' }),
      })
      if (res.ok) {
        toast.success(l('resolveSuccess'))
        setIssues(prev => prev.filter(i => i.id !== issueId))
      }
    } catch {
      /* silent */
    }
  }

  // ─── Assign agent ──────────────────────────────────────────
  const handleAssign = async (issueId: string, agentId: string) => {
    try {
      const res = await fetch('/api/supervisor/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, assignedAgent: agentId }),
      })
      if (res.ok) {
        toast.success(l('assignSuccess'))
        setIssues(prev =>
          prev.map(i => (i.id === issueId ? { ...i, assignedAgent: agentId } : i))
        )
      }
    } catch {
      /* silent */
    }
  }

  // ─── Format timestamp ──────────────────────────────────────
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="space-y-6">
      {/* ═══ 1. Header Card ═══ */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {l('title')}
                    <Badge className="bg-emerald-600 text-white text-[10px]">SUPERVISOR</Badge>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {l('subtitle')}
                    <span className={`mx-2 inline-flex items-center gap-1 text-[10px] ${wsConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {wsConnected ? l('connected') : l('disconnected')}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setComplaintOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {l('submitComplaint')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { fetchHealth(); fetchIssues() }}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  {l('refresh')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ 2. Health Overview ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          {l('healthOverview')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {healthServices.map((svc, idx) => {
            const cfg = svc.healthy
              ? { icon: CheckCircle2, iconColor: 'text-emerald-500', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }
              : { icon: XCircle, iconColor: 'text-red-500', badgeBg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' }
            const StatusIcon = cfg.icon
            return (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.15 + idx * 0.05 }}
              >
                <Card className={`${healthLoading ? 'animate-pulse' : ''} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {l(svc.name)}
                      </span>
                      <StatusIcon className={`w-4 h-4 ${cfg.iconColor} shrink-0`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] ${cfg.badgeBg} border`}>
                        {svc.healthy ? l('healthy') : l('unhealthy')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {svc.responseTime}{l('ms')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ═══ 3 & 4. Issues + Agents Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ 3. Active Issues Panel ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {l('activeIssues')}
                {issues.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {issues.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {issuesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{l('noIssues')}</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {issues.map((issue, idx) => {
                    const sev = severityConfig[issue.severity] || severityConfig.low
                    const TypeIcon = typeIconMap[issue.type] || AlertTriangle
                    return (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sev.bg} border`}>
                            <TypeIcon className={`w-4 h-4 ${sev.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={`text-[10px] ${sev.bg} border`}>
                                {l(`sev_${issue.severity}`)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {issue.service}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {l(`status_${issue.status}`)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mb-1">
                              {issue.message}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(issue.createdAt)}
                              </span>
                              {issue.assignedAgent && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {issue.assignedAgent}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 px-2">
                                  <Users className="w-3 h-3" />
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {agents
                                  .filter(a => a.status !== 'offline')
                                  .map(agent => (
                                    <DropdownMenuItem
                                      key={agent.id}
                                      onClick={() => handleAssign(issue.id, agent.id)}
                                      className="text-xs"
                                    >
                                      <span className={`w-2 h-2 rounded-full ${agentStatusConfig[agent.status].dot} me-2`} />
                                      {agent.name}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              onClick={() => handleResolve(issue.id)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ═══ 4. Specialist Agents Panel ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                {l('specialistAgents')}
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {agents.filter(a => a.status === 'online').length}/{agents.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agents.map((agent, idx) => {
                  const stCfg = agentStatusConfig[agent.status]
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.35 + idx * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow border-l-4 border-l-teal-500">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {agent.name}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] ${stCfg.color}`}>
                              <span className={`w-2 h-2 rounded-full ${stCfg.dot} ${agent.status === 'online' ? 'animate-pulse' : ''}`} />
                              {l(`agent_${agent.status}`)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] mb-2 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                            {rl(agent.role)}
                          </Badge>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{l('load')}</span>
                              <span>{agent.load}%</span>
                            </div>
                            <Progress
                              value={agent.load}
                              className={`h-1.5 ${
                                agent.load >= 80
                                  ? '[&>div]:bg-red-500'
                                  : agent.load >= 50
                                    ? '[&>div]:bg-amber-500'
                                    : '[&>div]:bg-emerald-500'
                              }`}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.specialties.map(spec => (
                              <Badge key={spec} variant="secondary" className="text-[9px] px-1.5 py-0">
                                {l(`cat_${spec}`)}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══ 5. Complaint Form Dialog ═══ */}
      <Dialog open={complaintOpen} onOpenChange={setComplaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              {l('complaintTitle')}
            </DialogTitle>
            <DialogDescription>{l('complaintDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{l('category')}</Label>
              <Select value={complaintCategory} onValueChange={setComplaintCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={l('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {l(`cat_${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{l('priority')}</Label>
              <Select value={complaintPriority} onValueChange={setComplaintPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={l('selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as const).map(pri => (
                    <SelectItem key={pri} value={pri} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${priorityDot[pri] || 'bg-slate-400'}`} />
                        {l(`pri_${pri}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{l('description')}</Label>
              <Textarea
                value={complaintDesc}
                onChange={e => setComplaintDesc(e.target.value)}
                placeholder={l('descriptionPlaceholder')}
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmitComplaint}
              disabled={!complaintDesc.trim() || !complaintCategory || !complaintPriority || isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? l('sending') : l('send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
