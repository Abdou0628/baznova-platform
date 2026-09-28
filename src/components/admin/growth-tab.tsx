'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Lock,
  Eye,
  Activity,
  Users,
  FileText,
  Brain,
  Target,
  BarChart3,
  Star,
  Building2,
  Gift,
  UserPlus,
  Link2,
  Map,
  ScanSearch,
  FileSignature,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Heart,
} from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'

// ─── Types ───────────────────────────────────────────────────────────────────────

export interface GrowthDashboardData {
  timestamp: string
  revenue: {
    totalEur: number
    totalByCurrency: { currency: string; amountEur: number; count: number }[]
    totalByProvider: { provider: string; amountEur: number; count: number }[]
    paymentFunnel: { status: string; count: number }[]
    succeededCount: number
    failedCount: number
    refundRate: number
    thisMonthEur: number
    lastMonthEur: number
    momGrowthPct: number
  }
  subscriptions: {
    byPlan: { plan: string; count: number }[]
    paidCount: number
    freeCount: number
    conversionRate: number
    mfaAdoption: number
    activeWithExpiry: number
    inGracePeriod: number
    expiredThisMonth: number
  }
  security: {
    loginSuccess: number
    loginFailure: number
    loginSuccessRate: number
    bruteForceDetected: number
    accountLockouts: number
    currentlyLocked: number
    idorAttempts: number
    rateLimitEvents: number
    suspiciousRequests: number
    paymentFailures: number
    encryptionErrors: number
    totalAuditEvents: number
  }
  engagement: {
    cvsCreated: number
    clsCreated: number
    applicationsSubmitted: number
    totalApplications: number
    interviewPrepSessions: number
    linkedInAnalyses: number
    careerRoadmaps: number
    moduleUsageByType: { module: string; count: number }[]
  }
  pricing: {
    avgRevenuePerPaidUser: number
    aiCostEur: number
    aiCostAsPctOfRevenue: number
    aiGrossMarginPct: number
    aiCostByModule: { module: string; costEur: number; actions: number }[]
    referralStats: { pending: number; completed: number; rewarded: number }
    enterpriseInquiries: { total: number; thisMonth: number }
    satisfactionAvg: number
    satisfactionCount: number
  }
  crossStrategy: {
    revenueAtRisk: number
    securityHealthScore: number
    growthEfficiency: number
    aiGrossMarginPct: number
    topConversionModule: string
    mfaByPlan: { plan: string; total: number; mfaEnabled: number; pct: number }[]
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

function fmtEur(n: number, lang?: string): string {
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtNum(n: number, lang?: string): string {
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR'
  return new Intl.NumberFormat(locale).format(n)
}
function fmtPct(n: number, decimals = 1, lang?: string): string {
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR'
  return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n) + ' %'
}

function humanizePlan(plan: string, lang?: CVLanguage): string {
  const maps: Record<CVLanguage, Record<string, string>> = {
    fr: {
      free: 'Gratuit',
      starter: 'Start',
      pro: 'Pro',
      career_plus: 'Carrière+',
      employer: 'Employeur',
      enterprise: 'Entreprise',
      annual: 'Annuel',
      api: 'API',
    },
    en: {
      free: 'Free',
      starter: 'Starter',
      pro: 'Pro',
      career_plus: 'Career+',
      employer: 'Employer',
      enterprise: 'Enterprise',
      annual: 'Annual',
      api: 'API',
    },
    ar: {
      free: 'مجاني',
      starter: 'أساسي',
      pro: 'احترافي',
      career_plus: 'مسيرة+',
      employer: 'صاحب عمل',
      enterprise: 'مؤسسة',
      annual: 'سنوي',
      api: 'API',
    },
    es: {
      free: 'Gratuito',
      starter: 'Inicial',
      pro: 'Pro',
      career_plus: 'Carrera+',
      employer: 'Empleador',
      enterprise: 'Empresa',
      annual: 'Anual',
      api: 'API',
    },
  }
  return maps[lang ?? 'fr'][plan] ?? plan
}

function humanizeModule(key: string, lang?: CVLanguage): string {
  const maps: Record<CVLanguage, Record<string, string>> = {
    fr: {
      CV_CREATED: 'CV Créés',
      CL_CREATED: 'Lettres Créées',
      ATS_ANALYZED: 'Analyses ATS',
      INTERVIEW_SESSION_STARTED: 'Simulations Entretien',
      LINKEDIN_ANALYZED: 'Analyses LinkedIn',
      CAREER_ROADMAP_GENERATED: 'Feuilles de Route',
    },
    en: {
      CV_CREATED: 'CVs Created',
      CL_CREATED: 'Letters Created',
      ATS_ANALYZED: 'ATS Analyses',
      INTERVIEW_SESSION_STARTED: 'Interview Simulations',
      LINKEDIN_ANALYZED: 'LinkedIn Analyses',
      CAREER_ROADMAP_GENERATED: 'Career Roadmaps',
    },
    ar: {
      CV_CREATED: 'سير ذاتية منشأة',
      CL_CREATED: 'رسائل منشأة',
      ATS_ANALYZED: 'تحليلات ATS',
      INTERVIEW_SESSION_STARTED: 'محاكيات المقابلة',
      LINKEDIN_ANALYZED: 'تحليلات لينكد إن',
      CAREER_ROADMAP_GENERATED: 'خرائط المسار المهني',
    },
    es: {
      CV_CREATED: 'CVs Creados',
      CL_CREATED: 'Cartas Creadas',
      ATS_ANALYZED: 'Análisis ATS',
      INTERVIEW_SESSION_STARTED: 'Simulaciones de Entrevista',
      LINKEDIN_ANALYZED: 'Análisis LinkedIn',
      CAREER_ROADMAP_GENERATED: 'Mapas de Carrera',
    },
  }
  const mapped = maps[lang ?? 'fr'][key]
  if (mapped) return mapped
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Translations ───────────────────────────────────────────────────────────────

const translations: Record<CVLanguage, Record<string, string>> = {
  fr: {
    // Section headers
    crossScore: 'Score Croisé',
    revenue: 'Revenu & Paiement',
    securityHealth: 'Santé Sécurité',
    conversion: 'Conversion & Abonnements',
    engagement: 'Engagement Modules',
    economicIntel: 'Intelligence Économique',
    // Section subtitles
    crossScoreSub: 'Indicateurs transversaux des 3 stratégies',
    revenueSub: 'Analyse des revenus et flux de paiement',
    securityHealthSub: 'Métriques HNSA et surveillance des menaces',
    conversionSub: 'Taux de conversion et distribution des plans',
    engagementSub: 'Utilisation des fonctionnalités par les utilisateurs',
    economicIntelSub: 'Coûts IA, parrainage et satisfaction client',
    // Cross Strategy KPIs
    totalRevenue: 'Revenu Total',
    securityScore: 'Score Sécurité',
    growthEfficiency: 'Efficacité Croissance',
    aiGrossMargin: 'Marge Brute IA',
    revenueAtRisk: 'Revenu à Risque',
    noRisk: 'Aucun risque',
    // Revenue section
    revenueSummary: 'Résumé Revenu',
    thisMonth: 'Ce mois',
    lastMonth: 'Mois dernier',
    momGrowth: 'Croissance MoM',
    refundRate: 'Taux de remboursement',
    arpu: 'ARPU / utilisateur payant',
    succeededPayments: 'Paiements réussis',
    failedPayments: 'Paiements échoués',
    byCurrency: 'Répartition par Devise',
    byProvider: 'Répartition par Provider',
    currency: 'Devise',
    provider: 'Provider',
    amount: 'Montant (€)',
    transactions: 'Transactions',
    paymentFunnel: 'Entonnoir Paiement',
    // Security section
    loginSuccessRate: 'Taux de connexion réussie',
    bruteForce: 'Tentatives Brute Force',
    lockedAccounts: 'Comptes verrouillés',
    idorAttempts: 'Tentatives IDOR',
    rateLimit: 'Événements Rate-Limit',
    suspiciousRequests: 'Requêtes suspectes',
    paymentFailures: 'Échecs de paiement',
    encryptionErrors: 'Erreurs chiffrement',
    totalAuditEvents: 'Total événements audit (30j)',
    // Conversion section
    conversionRate: 'Taux de Conversion',
    totalUsers: 'Total utilisateurs',
    paidUsers: 'Utilisateurs payants',
    freeUsers: 'Utilisateurs gratuits',
    planDistribution: 'Distribution des Plans',
    mfaAdoption: 'Adoption MFA',
    subscriptionLifecycle: 'Cycle de Vie Abonnements',
    active: 'Actifs',
    gracePeriod: 'En période de grâce',
    expiredThisMonth: 'Expirés ce mois',
    // Engagement section
    cvsCreated: 'CVs Créés',
    clsCreated: 'Lettres Créées',
    atsAnalyses: 'Analyses ATS',
    interviewSessions: 'Simulations Entretien',
    linkedinAnalyses: 'Analyses LinkedIn',
    careerRoadmaps: 'Feuilles de Route',
    totalCvs: 'Total CVs (30j)',
    totalCls: 'Total Lettres (30j)',
    totalApplications: 'Total Candidatures (30j)',
    // Economic Intel section
    aiCost: 'Coût IA',
    aiCostOfRevenue: 'Coût IA / Revenu',
    aiCostByModule: 'Coût IA par Module',
    module: 'Module',
    cost: 'Coût (€)',
    actions: 'Actions',
    referral: 'Parrainage',
    pending: 'En attente',
    completed: 'Complétés',
    rewarded: 'Récompensés',
    enterprise: 'Entreprise',
    thisMonthShort: 'Ce mois',
    satisfaction: 'Satisfaction',
    outOf5: '/ 5',
    noRatings: 'Aucune évaluation',
    noData: 'Aucune donnée',
    noEngagementData: "Aucune donnée d'engagement",
    noPlans: 'Aucun plan',
    plan: 'Plan',
    users: 'Utilisateurs',
    mfaEnabled: 'MFA Activé',
    pct: '%',
    status: 'Statut',
    count: 'Nombre',
    total: 'Total',
    totalCost: 'Coût Total',
    pctOfRevenue: '% du Revenu',
    enterpriseSatisfaction: 'Entreprise & Satisfaction',
    enterpriseInquiries: 'Demandes Entreprise',
    clientSatisfaction: 'Satisfaction Client',
    reviews: 'avis',
    referralConversionRate: 'Taux de conversion',
    referralConversionHint: '(complétés / en attente)',
    actionRequired: 'Action requise',
    succeeded: 'Réussies',
    failed: 'Échouées',
    totalLockouts: 'Verrouillages total',
    totalAuditEventsShort: 'Événements audit total',
    applications30d: 'Candidatures (30j)',
    totalCandidatures: 'Total Candidatures',
    // Payment funnel statuses
    funnelCreated: 'Créé',
    funnelPending: 'En attente',
    funnelAuthorized: 'Autorisé',
    funnelAuthorized3ds: 'Autorisé (3DS)',
    funnelCaptured: 'Capturé',
    funnelSucceeded: 'Réussi',
    funnelFailed: 'Échoué',
    funnelRefunded: 'Remboursé',
    funnelCancelled: 'Annulé',
  },
  en: {
    crossScore: 'Cross Score',
    revenue: 'Revenue & Payments',
    securityHealth: 'Security Health',
    conversion: 'Conversion & Subscriptions',
    engagement: 'Module Engagement',
    economicIntel: 'Economic Intelligence',
    crossScoreSub: 'Cross-strategy indicators across 3 strategies',
    revenueSub: 'Revenue analysis and payment flows',
    securityHealthSub: 'HNSS metrics and threat monitoring',
    conversionSub: 'Conversion rate and plan distribution',
    engagementSub: 'Feature usage by users',
    economicIntelSub: 'AI costs, referrals, and customer satisfaction',
    totalRevenue: 'Total Revenue',
    securityScore: 'Security Score',
    growthEfficiency: 'Growth Efficiency',
    aiGrossMargin: 'AI Gross Margin',
    revenueAtRisk: 'Revenue at Risk',
    noRisk: 'No risk',
    revenueSummary: 'Revenue Summary',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    momGrowth: 'MoM Growth',
    refundRate: 'Refund Rate',
    arpu: 'ARPU / paid user',
    succeededPayments: 'Succeeded payments',
    failedPayments: 'Failed payments',
    byCurrency: 'By Currency',
    byProvider: 'By Provider',
    currency: 'Currency',
    provider: 'Provider',
    amount: 'Amount (€)',
    transactions: 'Transactions',
    paymentFunnel: 'Payment Funnel',
    loginSuccessRate: 'Login Success Rate',
    bruteForce: 'Brute Force Attempts',
    lockedAccounts: 'Locked Accounts',
    idorAttempts: 'IDOR Attempts',
    rateLimit: 'Rate-Limit Events',
    suspiciousRequests: 'Suspicious Requests',
    paymentFailures: 'Payment failures',
    encryptionErrors: 'Encryption Errors',
    totalAuditEvents: 'Total audit events (30d)',
    conversionRate: 'Conversion Rate',
    totalUsers: 'Total users',
    paidUsers: 'Paid users',
    freeUsers: 'Free users',
    planDistribution: 'Plan Distribution',
    mfaAdoption: 'MFA Adoption',
    subscriptionLifecycle: 'Subscription Lifecycle',
    active: 'Active',
    gracePeriod: 'In grace period',
    expiredThisMonth: 'Expired this month',
    cvsCreated: 'CVs Created',
    clsCreated: 'Letters Created',
    atsAnalyses: 'ATS Analyses',
    interviewSessions: 'Interview Simulations',
    linkedinAnalyses: 'LinkedIn Analyses',
    careerRoadmaps: 'Career Roadmaps',
    totalCvs: 'Total CVs (30d)',
    totalCls: 'Total Letters (30d)',
    totalApplications: 'Total Applications (30d)',
    aiCost: 'AI Cost',
    aiCostOfRevenue: 'AI Cost / Revenue',
    aiCostByModule: 'AI Cost by Module',
    module: 'Module',
    cost: 'Cost (€)',
    actions: 'Actions',
    referral: 'Referral',
    pending: 'Pending',
    completed: 'Completed',
    rewarded: 'Rewarded',
    enterprise: 'Enterprise',
    thisMonthShort: 'This month',
    satisfaction: 'Satisfaction',
    outOf5: '/ 5',
    noRatings: 'No ratings',
    noData: 'No data',
    noEngagementData: 'No engagement data',
    noPlans: 'No plans',
    plan: 'Plan',
    users: 'Users',
    mfaEnabled: 'MFA Enabled',
    pct: '%',
    status: 'Status',
    count: 'Count',
    total: 'Total',
    totalCost: 'Total Cost',
    pctOfRevenue: '% of Revenue',
    enterpriseSatisfaction: 'Enterprise & Satisfaction',
    enterpriseInquiries: 'Enterprise Inquiries',
    clientSatisfaction: 'Customer Satisfaction',
    reviews: 'reviews',
    referralConversionRate: 'Conversion rate',
    referralConversionHint: '(completed / pending)',
    actionRequired: 'Action required',
    succeeded: 'Succeeded',
    failed: 'Failed',
    totalLockouts: 'Total lockouts',
    totalAuditEventsShort: 'Total audit events',
    applications30d: 'Applications (30d)',
    totalCandidatures: 'Total Applications',
    funnelCreated: 'Created',
    funnelPending: 'Pending',
    funnelAuthorized: 'Authorized',
    funnelAuthorized3ds: 'Authorized (3DS)',
    funnelCaptured: 'Captured',
    funnelSucceeded: 'Succeeded',
    funnelFailed: 'Failed',
    funnelRefunded: 'Refunded',
    funnelCancelled: 'Cancelled',
  },
  ar: {
    crossScore: 'النتيجة المتقاطعة',
    revenue: 'الإيرادات والمدفوعات',
    securityHealth: 'صحة الأمان',
    conversion: 'التحويل والاشتراكات',
    engagement: 'تفاعل الوحدات',
    economicIntel: 'الذكاء الاقتصادي',
    crossScoreSub: 'مؤشرات استراتيجية مشتركة عبر 3 استراتيجيات',
    revenueSub: 'تحليل الإيرادات وتدفقات الدفع',
    securityHealthSub: 'مقاييس HNSS ومراقبة التهديدات',
    conversionSub: 'معدل التحويل وتوزيع الخطط',
    engagementSub: 'استخدام الميزات من قبل المستخدمين',
    economicIntelSub: 'تكاليف الذكاء الاصطناعي والإحالات ورضا العملاء',
    totalRevenue: 'إجمالي الإيرادات',
    securityScore: 'نتيجة الأمان',
    growthEfficiency: 'كفاءة النمو',
    aiGrossMargin: 'هامش الربح IA',
    revenueAtRisk: 'إيرادات معرضة للخطر',
    noRisk: 'لا خطر',
    revenueSummary: 'ملخص الإيرادات',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    momGrowth: 'نمو شهري',
    refundRate: 'معدل الاسترداد',
    arpu: 'متوسط الإيرادات / مستخدم مدفوع',
    succeededPayments: 'مدفوعات ناجحة',
    failedPayments: 'مدفوعات فاشلة',
    byCurrency: 'حسب العملة',
    byProvider: 'حسب المزود',
    currency: 'العملة',
    provider: 'المزود',
    amount: 'المبلغ (€)',
    transactions: 'المعاملات',
    paymentFunnel: 'قمع المدفوعات',
    loginSuccessRate: 'معدل نجاح تسجيل الدخول',
    bruteForce: 'محاولات القوة الغاشمة',
    lockedAccounts: 'حسابات مقفلة',
    idorAttempts: 'محاولات IDOR',
    rateLimit: 'أحداث تحديد المعدل',
    suspiciousRequests: 'طلبات مشبوهة',
    paymentFailures: 'فشل المدفوعات',
    encryptionErrors: 'أخطاء التشفير',
    totalAuditEvents: 'إجمالي أحداث التدقيق (30ي)',
    conversionRate: 'معدل التحويل',
    totalUsers: 'إجمالي المستخدمين',
    paidUsers: 'مستخدمين مدفوعين',
    freeUsers: 'مستخدمين مجانيين',
    planDistribution: 'توزيع الخطط',
    mfaAdoption: 'تبني MFA',
    subscriptionLifecycle: 'دورة حياة الاشتراك',
    active: 'نشط',
    gracePeriod: 'في فترة السماح',
    expiredThisMonth: 'منتهية هذا الشهر',
    cvsCreated: 'سير ذاتية منشأة',
    clsCreated: 'رسائل منشأة',
    atsAnalyses: 'تحليلات ATS',
    interviewSessions: 'محاكيات المقابلة',
    linkedinAnalyses: 'تحليلات لينكد إن',
    careerRoadmaps: 'خرائط المسار المهني',
    totalCvs: 'إجمالي السير الذاتية (30ي)',
    totalCls: 'إجمالي الرسائل (30ي)',
    totalApplications: 'إجمالي الطلبات (30ي)',
    aiCost: 'تكلفة IA',
    aiCostOfRevenue: 'تكلفة IA / الإيرادات',
    aiCostByModule: 'تكلفة IA حسب الوحدة',
    module: 'الوحدة',
    cost: 'التكلفة (€)',
    actions: 'الإجراءات',
    referral: 'الإحالة',
    pending: 'قيد الانتظار',
    completed: 'مكتملة',
    rewarded: 'مكافأة',
    enterprise: 'المؤسسات',
    thisMonthShort: 'هذا الشهر',
    satisfaction: 'الرضا',
    outOf5: '/ 5',
    noRatings: 'لا توجد تقييمات',
    noData: 'لا توجد بيانات',
    noEngagementData: 'لا توجد بيانات تفاعل',
    noPlans: 'لا توجد خطط',
    plan: 'الخطة',
    users: 'المستخدمون',
    mfaEnabled: 'MFA مفعّل',
    pct: '%',
    status: 'الحالة',
    count: 'العدد',
    total: 'الإجمالي',
    totalCost: 'التكلفة الإجمالية',
    pctOfRevenue: '% من الإيرادات',
    enterpriseSatisfaction: 'المؤسسات والرضا',
    enterpriseInquiries: 'طلبات المؤسسات',
    clientSatisfaction: 'رضا العملاء',
    reviews: 'تقييم',
    referralConversionRate: 'معدل التحويل',
    referralConversionHint: '(مكتملة / قيد الانتظار)',
    actionRequired: 'إجراء مطلوب',
    succeeded: 'ناجحة',
    failed: 'فاشلة',
    totalLockouts: 'إجمالي عمليات القفل',
    totalAuditEventsShort: 'إجمالي أحداث التدقيق',
    applications30d: 'الطلبات (30ي)',
    totalCandidatures: 'إجمالي الطلبات',
    funnelCreated: 'تم الإنشاء',
    funnelPending: 'قيد الانتظار',
    funnelAuthorized: 'مصرح به',
    funnelAuthorized3ds: 'مصرح به (3DS)',
    funnelCaptured: 'تم الالتقاط',
    funnelSucceeded: 'ناجح',
    funnelFailed: 'فاشل',
    funnelRefunded: 'مسترد',
    funnelCancelled: 'ملغى',
  },
  es: {
    crossScore: 'Puntuación Cruzada',
    revenue: 'Ingresos y Pagos',
    securityHealth: 'Salud de Seguridad',
    conversion: 'Conversión y Suscripciones',
    engagement: 'Interacción de Módulos',
    economicIntel: 'Inteligencia Económica',
    crossScoreSub: 'Indicadores transversales de las 3 estrategias',
    revenueSub: 'Análisis de ingresos y flujos de pago',
    securityHealthSub: 'Métricas HNSS y monitoreo de amenazas',
    conversionSub: 'Tasa de conversión y distribución de planes',
    engagementSub: 'Uso de funciones por los usuarios',
    economicIntelSub: 'Costos IA, referidos y satisfacción del cliente',
    totalRevenue: 'Ingresos Totales',
    securityScore: 'Puntuación de Seguridad',
    growthEfficiency: 'Eficiencia de Crecimiento',
    aiGrossMargin: 'Margen Bruto IA',
    revenueAtRisk: 'Ingresos en Riesgo',
    noRisk: 'Sin riesgo',
    revenueSummary: 'Resumen de Ingresos',
    thisMonth: 'Este mes',
    lastMonth: 'Mes pasado',
    momGrowth: 'Crecimiento MoM',
    refundRate: 'Tasa de Reembolso',
    arpu: 'ARPU / usuario de pago',
    succeededPayments: 'Pagos exitosos',
    failedPayments: 'Pagos fallidos',
    byCurrency: 'Por Moneda',
    byProvider: 'Por Proveedor',
    currency: 'Moneda',
    provider: 'Proveedor',
    amount: 'Monto (€)',
    transactions: 'Transacciones',
    paymentFunnel: 'Embudo de Pagos',
    loginSuccessRate: 'Tasa de Inicio de Sesión',
    bruteForce: 'Intentos de Fuerza Bruta',
    lockedAccounts: 'Cuentas Bloqueadas',
    idorAttempts: 'Intentos IDOR',
    rateLimit: 'Eventos de Rate-Limit',
    suspiciousRequests: 'Solicitudes Sospechosas',
    paymentFailures: 'Fallos de pago',
    encryptionErrors: 'Errores de Cifrado',
    totalAuditEvents: 'Total eventos auditoría (30d)',
    conversionRate: 'Tasa de Conversión',
    totalUsers: 'Total usuarios',
    paidUsers: 'Usuarios de pago',
    freeUsers: 'Usuarios gratuitos',
    planDistribution: 'Distribución de Planes',
    mfaAdoption: 'Adopción MFA',
    subscriptionLifecycle: 'Ciclo de Vida de Suscripciones',
    active: 'Activos',
    gracePeriod: 'En período de gracia',
    expiredThisMonth: 'Expirados este mes',
    cvsCreated: 'CVs Creados',
    clsCreated: 'Cartas Creadas',
    atsAnalyses: 'Análisis ATS',
    interviewSessions: 'Simulaciones de Entrevista',
    linkedinAnalyses: 'Análisis LinkedIn',
    careerRoadmaps: 'Mapas de Carrera',
    totalCvs: 'Total CVs (30d)',
    totalCls: 'Total Cartas (30d)',
    totalApplications: 'Total Aplicaciones (30d)',
    aiCost: 'Costo IA',
    aiCostOfRevenue: 'Costo IA / Ingresos',
    aiCostByModule: 'Costo IA por Módulo',
    module: 'Módulo',
    cost: 'Costo (€)',
    actions: 'Acciones',
    referral: 'Referidos',
    pending: 'Pendientes',
    completed: 'Completados',
    rewarded: 'Recompensados',
    enterprise: 'Empresa',
    thisMonthShort: 'Este mes',
    satisfaction: 'Satisfacción',
    outOf5: '/ 5',
    noRatings: 'Sin evaluaciones',
    noData: 'Sin datos',
    noEngagementData: 'Sin datos de interacción',
    noPlans: 'Sin planes',
    plan: 'Plan',
    users: 'Usuarios',
    mfaEnabled: 'MFA activado',
    pct: '%',
    status: 'Estado',
    count: 'Cantidad',
    total: 'Total',
    totalCost: 'Costo Total',
    pctOfRevenue: '% de Ingresos',
    enterpriseSatisfaction: 'Empresa y Satisfacción',
    enterpriseInquiries: 'Consultas Empresariales',
    clientSatisfaction: 'Satisfacción del Cliente',
    reviews: 'reseñas',
    referralConversionRate: 'Tasa de conversión',
    referralConversionHint: '(completados / pendientes)',
    actionRequired: 'Acción requerida',
    succeeded: 'Exitosas',
    failed: 'Fallidas',
    totalLockouts: 'Bloqueos totales',
    totalAuditEventsShort: 'Eventos auditoría totales',
    applications30d: 'Aplicaciones (30d)',
    totalCandidatures: 'Total Aplicaciones',
    funnelCreated: 'Creado',
    funnelPending: 'Pendiente',
    funnelAuthorized: 'Autorizado',
    funnelAuthorized3ds: 'Autorizado (3DS)',
    funnelCaptured: 'Capturado',
    funnelSucceeded: 'Exitoso',
    funnelFailed: 'Fallido',
    funnelRefunded: 'Reembolsado',
    funnelCancelled: 'Cancelado',
  },
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** Section heading with emerald left border */
function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-3">
      <span className="text-emerald-600">{icon}</span>
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

/** Reusable KPI card */
function KpiCard({
  icon,
  iconColor,
  label,
  value,
  subValue,
  subColor,
}: {
  icon: React.ReactNode
  iconColor?: string
  label: string
  value: React.ReactNode
  subValue?: React.ReactNode
  subColor?: string
}) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ${iconColor ?? 'text-emerald-600'}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {subValue && (
            <p className={`mt-0.5 text-xs ${subColor ?? 'text-muted-foreground'}`}>
              {subValue}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Color for payment funnel statuses */
function funnelStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s === 'succeeded' || s === 'captured') return 'bg-emerald-500'
  if (s === 'failed' || s === 'error') return 'bg-red-500'
  if (s === 'refunded' || s === 'cancelled') return 'bg-amber-500'
  if (s === 'authorized' || s === 'authorized_3ds') return 'bg-emerald-400'
  return 'bg-emerald-300'
}

function funnelStatusLabel(status: string, lang?: CVLanguage): string {
  const s = status.toLowerCase()
  if (s === 'created') return translations[lang ?? 'fr'].funnelCreated
  if (s === 'pending') return translations[lang ?? 'fr'].funnelPending
  if (s === 'authorized') return translations[lang ?? 'fr'].funnelAuthorized
  if (s === 'authorized_3ds') return translations[lang ?? 'fr'].funnelAuthorized3ds
  if (s === 'captured') return translations[lang ?? 'fr'].funnelCaptured
  if (s === 'succeeded') return translations[lang ?? 'fr'].funnelSucceeded
  if (s === 'failed') return translations[lang ?? 'fr'].funnelFailed
  if (s === 'refunded') return translations[lang ?? 'fr'].funnelRefunded
  if (s === 'cancelled') return translations[lang ?? 'fr'].funnelCancelled
  return status
}

/** Module icon mapping */
function moduleIcon(moduleKey: string) {
  const m = moduleKey.toUpperCase()
  if (m.includes('CV') || m === 'CV_CREATED') return <FileText className="h-5 w-5" />
  if (m.includes('CL') || m === 'CL_CREATED' || m.includes('LETTER'))
    return <FileSignature className="h-5 w-5" />
  if (m.includes('ATS') || m.includes('SCAN')) return <ScanSearch className="h-5 w-5" />
  if (m.includes('INTERVIEW') || m.includes('SESSION'))
    return <MessageSquare className="h-5 w-5" />
  if (m.includes('LINKEDIN') || m.includes('LINKED'))
    return <Link2 className="h-5 w-5" />
  if (m.includes('ROADMAP') || m.includes('CAREER') || m.includes('MAP'))
    return <Map className="h-5 w-5" />
  return <BarChart3 className="h-5 w-5" />
}

/** Security health score color */
function securityScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function securityScoreRing(score: number): string {
  if (score >= 80) return 'stroke-emerald-500'
  if (score >= 50) return 'stroke-amber-500'
  return 'stroke-red-500'
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GrowthTab({ data }: { data: GrowthDashboardData }) {
  const { language } = useCVStore()
  const gt = (key: string): string => translations[language]?.[key] ?? translations.fr[key] ?? key

  const funnelMax = Math.max(...data.revenue.paymentFunnel.map((f) => f.count), 1)
  const totalSubs = data.subscriptions.paidCount + data.subscriptions.freeCount

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={language === 'ar' ? 'font-sans space-y-6' : 'space-y-6'}>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 1. 🎯 SCORE CROISÉ — Cross-Strategy KPIs                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<Target className="h-4 w-4" />}
          title={gt('crossScore')}
          subtitle={gt('crossScoreSub')}
        />
        <div className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {/* Revenu Total */}
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {gt('totalRevenue')}
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 md:text-3xl">
                    {fmtEur(data.revenue.totalEur, language)}
                  </span>
                </div>

                {/* Score Sécurité */}
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center">
                  <svg
                    viewBox="0 0 36 36"
                    className="h-10 w-10"
                  >
                    <path
                      className="text-muted-foreground/20"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={securityScoreRing(data.crossStrategy.securityHealthScore)}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${data.crossStrategy.securityHealthScore}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {gt('securityScore')}
                  </span>
                  <span className={`text-2xl font-bold md:text-3xl ${securityScoreColor(data.crossStrategy.securityHealthScore)}`}>
                    {data.crossStrategy.securityHealthScore}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </span>
                </div>

                {/* Efficacité Croissance */}
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center">
                  <Zap className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {gt('growthEfficiency')}
                  </span>
                  <span className="text-2xl font-bold md:text-3xl">
                    {fmtPct(data.crossStrategy.growthEfficiency, 1, language)}
                  </span>
                </div>

                {/* Marge Brute IA */}
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center">
                  <Brain className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {gt('aiGrossMargin')}
                  </span>
                  <span className="text-2xl font-bold md:text-3xl">
                    {fmtPct(data.crossStrategy.aiGrossMarginPct, 1, language)}
                  </span>
                </div>

                {/* Revenu à Risque */}
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center col-span-2 sm:col-span-1">
                  {data.crossStrategy.revenueAtRisk > 0 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {gt('revenueAtRisk')}
                      </span>
                      <span className="text-2xl font-bold text-amber-500 md:text-3xl">
                        {fmtEur(data.crossStrategy.revenueAtRisk, language)}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {gt('revenueAtRisk')}
                      </span>
                      <span className="text-2xl font-bold text-emerald-600 md:text-3xl">
                        {fmtEur(0, language)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 2. 💰 REVENU & PAIEMENT                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<DollarSign className="h-4 w-4" />}
          title={gt('revenue')}
          subtitle={gt('revenueSub')}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Card A: Résumé Revenu */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('revenueSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{gt('totalRevenue')}</p>
                  <p className="text-xl font-bold">{fmtEur(data.revenue.totalEur, language)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{gt('arpu')}</p>
                  <p className="text-xl font-bold">{fmtEur(data.pricing.avgRevenuePerPaidUser, language)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{gt('thisMonth')}</p>
                  <p className="text-sm font-semibold">{fmtEur(data.revenue.thisMonthEur, language)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{gt('lastMonth')}</p>
                  <p className="text-sm font-semibold">{fmtEur(data.revenue.lastMonthEur, language)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{gt('momGrowth')}</p>
                  <div className="flex items-center gap-1">
                    {data.revenue.momGrowthPct >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        data.revenue.momGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {fmtPct(data.revenue.momGrowthPct, 1, language)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">{gt('refundRate')}</span>
                <Badge
                  variant={data.revenue.refundRate > 5 ? 'destructive' : 'secondary'}
                  className={
                    data.revenue.refundRate <= 5
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : ''
                  }
                >
                  {fmtPct(data.revenue.refundRate, 1, language)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{gt('succeededPayments')}</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {fmtNum(data.revenue.succeededCount, language)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{gt('failedPayments')}</p>
                  <p className="text-sm font-semibold text-red-500">
                    {fmtNum(data.revenue.failedCount, language)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card B: Répartition par Devise */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('byCurrency')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{gt('currency')}</TableHead>
                      <TableHead className="text-right">{gt('amount')}</TableHead>
                      <TableHead className="text-right">{gt('transactions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue.totalByCurrency.map((row) => (
                      <TableRow key={row.currency}>
                        <TableCell className="font-medium">{row.currency}</TableCell>
                        <TableCell className="text-right">
                          {fmtEur(row.amountEur, language)}
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(row.count, language)}</TableCell>
                      </TableRow>
                    ))}
                    {data.revenue.totalByCurrency.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {gt('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card C: Répartition par Provider */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('byProvider')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{gt('provider')}</TableHead>
                      <TableHead className="text-right">{gt('amount')}</TableHead>
                      <TableHead className="text-right">{gt('transactions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue.totalByProvider.map((row) => (
                      <TableRow key={row.provider}>
                        <TableCell className="font-medium">{row.provider}</TableCell>
                        <TableCell className="text-right">
                          {fmtEur(row.amountEur, language)}
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(row.count, language)}</TableCell>
                      </TableRow>
                    ))}
                    {data.revenue.totalByProvider.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {gt('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card D: Entonnoir Paiement */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('paymentFunnel')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <div className="space-y-3">
                  {data.revenue.paymentFunnel.map((step) => (
                    <div key={step.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{funnelStatusLabel(step.status, language)}</span>
                        <span className="text-muted-foreground">{fmtNum(step.count, language)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${funnelStatusColor(step.status)}`}
                          style={{
                            width: `${Math.max((step.count / funnelMax) * 100, 1)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {data.revenue.paymentFunnel.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {gt('noData')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. 🛡️ SANTÉ SÉCURITÉ                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<Shield className="h-4 w-4" />}
          title={gt('securityHealth')}
          subtitle={gt('securityHealthSub')}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Taux de connexion réussie */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('loginSuccessRate')}
                </span>
              </div>
              <p className="text-2xl font-bold">{fmtPct(data.security.loginSuccessRate, 1, language)}</p>
              <Progress value={data.security.loginSuccessRate} className="mt-2 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{gt('succeeded')}: {fmtNum(data.security.loginSuccess, language)}</span>
                <span>{gt('failed')}: {fmtNum(data.security.loginFailure, language)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tentatives brute force */}
          <Card className={`bg-white ${data.security.bruteForceDetected > 0 ? 'border-red-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`h-4 w-4 ${data.security.bruteForceDetected > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('bruteForce')}
                </span>
              </div>
              <p className={`text-2xl font-bold ${data.security.bruteForceDetected > 0 ? 'text-red-500' : ''}`}>
                {fmtNum(data.security.bruteForceDetected, language)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {gt('totalLockouts')}: {fmtNum(data.security.accountLockouts, language)}
              </p>
            </CardContent>
          </Card>

          {/* Comptes verrouillés */}
          <Card className={`bg-white ${data.security.currentlyLocked > 0 ? 'border-red-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className={`h-4 w-4 ${data.security.currentlyLocked > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('lockedAccounts')}
                </span>
              </div>
              <p className={`text-2xl font-bold ${data.security.currentlyLocked > 0 ? 'text-red-500' : ''}`}>
                {fmtNum(data.security.currentlyLocked, language)}
              </p>
              {data.security.currentlyLocked > 0 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  {gt('actionRequired')}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Tentatives IDOR */}
          <Card className={`bg-white ${data.security.idorAttempts > 0 ? 'border-red-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className={`h-4 w-4 ${data.security.idorAttempts > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('idorAttempts')}
                </span>
              </div>
              <p className={`text-2xl font-bold ${data.security.idorAttempts > 0 ? 'text-red-500' : ''}`}>
                {fmtNum(data.security.idorAttempts, language)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {gt('totalAuditEventsShort')}: {fmtNum(data.security.totalAuditEvents, language)}
              </p>
            </CardContent>
          </Card>

          {/* Événements rate-limit */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('rateLimit')}
                </span>
              </div>
              <p className="text-2xl font-bold">{fmtNum(data.security.rateLimitEvents, language)}</p>
            </CardContent>
          </Card>

          {/* Requêtes suspectes */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-emerald-600" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('suspiciousRequests')}
                </span>
              </div>
              <p className="text-2xl font-bold">{fmtNum(data.security.suspiciousRequests, language)}</p>
            </CardContent>
          </Card>

          {/* Échecs paiement */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('paymentFailures')}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-500">
                {fmtNum(data.security.paymentFailures, language)}
              </p>
            </CardContent>
          </Card>

          {/* Erreurs chiffrement */}
          <Card className={`bg-white ${data.security.encryptionErrors > 0 ? 'border-red-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className={`h-4 w-4 ${data.security.encryptionErrors > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gt('encryptionErrors')}
                </span>
              </div>
              <p className={`text-2xl font-bold ${data.security.encryptionErrors > 0 ? 'text-red-500' : ''}`}>
                {fmtNum(data.security.encryptionErrors, language)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 4. 📈 CONVERSION & ABONNEMENTS                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<Users className="h-4 w-4" />}
          title={gt('conversion')}
          subtitle={gt('conversionSub')}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Card A: Taux de Conversion */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('conversionRate')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600">
                  {fmtPct(data.subscriptions.conversionRate, 1, language)}
                </p>
                <Progress value={data.subscriptions.conversionRate} className="mt-3 h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('paidUsers')}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {fmtNum(data.subscriptions.paidCount, language)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('freeUsers')}</p>
                  <p className="text-lg font-bold">{fmtNum(data.subscriptions.freeCount, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card B: Distribution des Plans */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('planDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <div className="space-y-3">
                  {data.subscriptions.byPlan.map((plan) => {
                    const pct =
                      totalSubs > 0 ? (plan.count / totalSubs) * 100 : 0
                    return (
                      <div key={plan.plan} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{humanizePlan(plan.plan, language)}</span>
                          <span className="text-muted-foreground">
                            {fmtNum(plan.count, language)} ({fmtPct(pct, 0, language)})
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {data.subscriptions.byPlan.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {gt('noPlans')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card C: Adoption MFA */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('mfaAdoption')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600">
                  {fmtPct(data.subscriptions.mfaAdoption, 1, language)}
                </p>
                <Progress value={data.subscriptions.mfaAdoption} className="mt-3 h-3" />
              </div>
              {/* MFA by plan table */}
              {data.crossStrategy.mfaByPlan.length > 0 && (
                <ScrollArea className="max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{gt('plan')}</TableHead>
                        <TableHead className="text-right">{gt('mfaEnabled')}</TableHead>
                        <TableHead className="text-right">{gt('total')}</TableHead>
                        <TableHead className="text-right">{gt('pct')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.crossStrategy.mfaByPlan.map((row) => (
                        <TableRow key={row.plan}>
                          <TableCell className="font-medium">
                            {humanizePlan(row.plan, language)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtNum(row.mfaEnabled, language)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtNum(row.total, language)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                row.pct >= 80
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={
                                row.pct >= 80
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : ''
                              }
                            >
                              {fmtPct(row.pct, 1, language)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Card D: Cycle de Vie Abonnements */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('subscriptionLifecycle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                  <Users className="mx-auto h-5 w-5 text-emerald-600" />
                  <p className="mt-1 text-xs text-muted-foreground">{gt('active')}</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {fmtNum(data.subscriptions.activeWithExpiry, language)}
                  </p>
                </div>
                <div className="rounded-lg border bg-amber-50 p-3 text-center">
                  <Activity className="mx-auto h-5 w-5 text-amber-500" />
                  <p className="mt-1 text-xs text-muted-foreground">{gt('gracePeriod')}</p>
                  <p className="text-xl font-bold text-amber-500">
                    {fmtNum(data.subscriptions.inGracePeriod, language)}
                  </p>
                </div>
                <div className="rounded-lg border bg-red-50 p-3 text-center">
                  <AlertTriangle className="mx-auto h-5 w-5 text-red-500" />
                  <p className="mt-1 text-xs text-muted-foreground">{gt('expiredThisMonth')}</p>
                  <p className="text-xl font-bold text-red-500">
                    {fmtNum(data.subscriptions.expiredThisMonth, language)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 5. 🔥 ENGAGEMENT MODULES                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<BarChart3 className="h-4 w-4" />}
          title={gt('engagement')}
          subtitle={gt('engagementSub')}
        />
        <div className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              {/* Module tiles grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {data.engagement.moduleUsageByType.map((mod) => (
                  <div
                    key={mod.module}
                    className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      {moduleIcon(mod.module)}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground leading-tight">
                      {humanizeModule(mod.module, language)}
                    </span>
                    <span className="text-xl font-bold">{fmtNum(mod.count, language)}</span>
                  </div>
                ))}
                {data.engagement.moduleUsageByType.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    {gt('noEngagementData')}
                  </p>
                )}
              </div>

              {/* Summary stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-4 sm:grid-cols-4 lg:grid-cols-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('cvsCreated')}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {fmtNum(data.engagement.cvsCreated, language)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('clsCreated')}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {fmtNum(data.engagement.clsCreated, language)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('applications30d')}</p>
                  <p className="text-lg font-bold">{fmtNum(data.engagement.applicationsSubmitted, language)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{gt('totalCandidatures')}</p>
                  <p className="text-lg font-bold">{fmtNum(data.engagement.totalApplications, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 6. 🤖 INTELLIGENCE ÉCONOMIQUE                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon={<Brain className="h-4 w-4" />}
          title={gt('economicIntel')}
          subtitle={gt('economicIntelSub')}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Card A: Coût IA */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('aiCost')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{gt('totalCost')}</p>
                  <p className="text-lg font-bold">{fmtEur(data.pricing.aiCostEur, language)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{gt('pctOfRevenue')}</p>
                  <p className="text-lg font-bold">
                    {fmtPct(data.pricing.aiCostAsPctOfRevenue, 1, language)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {gt('aiGrossMargin')}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      data.pricing.aiGrossMarginPct >= 0
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}
                  >
                    {fmtPct(data.pricing.aiGrossMarginPct, 1, language)}
                  </span>
                </div>
              </div>
              {/* AI Cost by Module table */}
              {data.pricing.aiCostByModule.length > 0 && (
                <ScrollArea className="max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{gt('module')}</TableHead>
                        <TableHead className="text-right">{gt('cost')}</TableHead>
                        <TableHead className="text-right">{gt('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pricing.aiCostByModule.map((row) => (
                        <TableRow key={row.module}>
                          <TableCell className="font-medium">
                            {humanizeModule(row.module, language)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtEur(row.costEur, language)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtNum(row.actions, language)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Card B: Parrainage */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('referral')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pending */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">{gt('pending')}</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      {fmtNum(data.pricing.referralStats.pending, language)}
                    </Badge>
                  </div>
                </div>
                {/* Completed */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">{gt('completed')}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {fmtNum(data.pricing.referralStats.completed, language)}
                    </Badge>
                  </div>
                </div>
                {/* Rewarded */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">{gt('rewarded')}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {fmtNum(data.pricing.referralStats.rewarded, language)}
                    </Badge>
                  </div>
                </div>

                {/* Conversion funnel */}
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">{gt('referralConversionRate')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-emerald-600">
                      {data.pricing.referralStats.pending > 0
                        ? fmtPct(
                            (data.pricing.referralStats.completed /
                              data.pricing.referralStats.pending) *
                              100,
                            1,
                            language
                          )
                        : '0 %'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {gt('referralConversionHint')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card C: Entreprise & Satisfaction */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {gt('enterpriseSatisfaction')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enterprise Inquiries */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{gt('enterpriseInquiries')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{gt('total')}</p>
                    <p className="text-xl font-bold">{fmtNum(data.pricing.enterpriseInquiries.total, language)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{gt('thisMonthShort')}</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {fmtNum(data.pricing.enterpriseInquiries.thisMonth, language)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Satisfaction */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{gt('clientSatisfaction')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">
                    {data.pricing.satisfactionAvg.toFixed(1)}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(data.pricing.satisfactionAvg)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {fmtNum(data.pricing.satisfactionCount, language)} {gt('reviews')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
