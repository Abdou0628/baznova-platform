'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Target, ArrowRight, ArrowLeft, Star,
  FileText, MessageSquare, Compass, Bot, BookOpen, Laptop, Plane,
  Linkedin, Search, Building2, Code2, Store, Scale,
  Briefcase, GraduationCap, Zap, Users, TrendingUp, CheckCircle2,
  Crown, Brain, Shield, BarChart3,
  UserCheck, Globe, RefreshCw, Lightbulb,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'
import { events } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type QuizGoal = 'find_job' | 'create_cv' | 'career_change' | 'prepare_interview' | 'freelance' | 'hire_talent' | 'enterprise_solution'
type QuizExperience = 'student' | 'junior' | 'mid' | 'senior' | 'executive'
type QuizUrgency = 'immediate' | 'this_month' | 'few_months' | 'exploring'
type QuizBudget = 'minimal' | 'moderate' | 'premium' | 'enterprise'

type AppStep = import('@/store/cv-store').AppStep

interface QuizAnswer {
  goal?: QuizGoal
  experience?: QuizExperience
  urgency?: QuizUrgency
  budget?: QuizBudget
}

interface ProductRec {
  slug: string
  name: string
  reason: string
  priority: 'primary' | 'secondary' | 'upsell'
}

interface Testimonial {
  name: string
  role: string
  company: string
  quote: string
  rating: number
  avatar: string
}

interface PersonalizeResult {
  success: boolean
  bundle: {
    id: string
    name: string
    price: string
    reason: string
    savings: string
  }
  products: ProductRec[]
  testimonials: Testimonial[]
  heroCopy: {
    headline: string
    subtitle: string
    cta: string
    socialProof: string
  }
  profileLabel: string
  confidenceScore: number
}

// ─────────────────────────────────────────────────────────────
// i18n — Local translations map (4 languages, RTL for Arabic)
// ─────────────────────────────────────────────────────────────

const i18n: Record<CVLanguage, Record<string, string>> = {
  fr: {
    hubTitle: 'Votre Plan IA Personnalisé',
    hubSubtitle: 'Répondez à 4 questions et notre IA construit votre recommandation sur mesure',
    startQuiz: 'Découvrir Mon Plan IA',
    retakeQuiz: 'Refaire le Quiz',
    stepOf: 'Étape',
    q1Title: 'Quel est votre objectif principal ?',
    q1Desc: 'Sélectionnez ce qui correspond le mieux à votre situation actuelle',
    q2Title: 'Quel est votre niveau d\'expérience ?',
    q2Desc: 'Cela nous aide à calibrer nos recommandations',
    q3Title: 'Quel est votre degré d\'urgence ?',
    q3Desc: 'Quand souhaitez-vous voir des résultats ?',
    q4Title: 'Quel investissement êtes-vous prêt à faire ?',
    q4Desc: 'Nous adapterons notre recommandation à votre budget',
    goal_find_job: 'Trouver un emploi',
    goal_create_cv: 'Créer un CV',
    goal_career_change: 'Reconversion professionnelle',
    goal_prepare_interview: 'Préparer un entretien',
    goal_freelance: 'Me lancer en freelance',
    goal_hire_talent: 'Recruter des talents',
    goal_enterprise_solution: 'Solution entreprise',
    exp_student: 'Étudiant / Diplômé récent',
    exp_junior: 'Junior (0-2 ans)',
    exp_mid: 'Confirmé (3-7 ans)',
    exp_senior: 'Senior (8-15 ans)',
    exp_executive: 'Direction (15+ ans)',
    urg_immediate: 'Urgent — Cette semaine',
    urg_this_month: 'Ce mois-ci',
    urg_few_months: 'Dans les prochains mois',
    urg_exploring: 'J\'explore mes options',
    bud_minimal: 'Budget étudiant',
    bud_moderate: 'Budget confortable',
    bud_premium: 'Premium — Le meilleur',
    bud_enterprise: 'Budget entreprise',
    analyzing: 'L\'IA analyse votre profil...',
    analyzingDesc: 'Notre moteur de personnalisation évalue vos besoins',
    resultFor: 'Résultat pour :',
    recommendedBundle: 'Bundle Recommandé',
    confidence: 'Confiance IA',
    yourProducts: 'Vos Outils Recommandés',
    whatTheySay: 'Ce que disent nos utilisateurs',
    whyThisBundle: 'Pourquoi ce bundle ?',
    getStarted: 'Commencer maintenant',
    viewPricing: 'Voir les tarifs',
    primary: 'Prioritaire',
    savings: 'Économies',
    liveStats: 'En temps réel',
    statDocs: 'Documents générés',
    statUsers: 'Utilisateurs actifs',
    statSatisfaction: 'Satisfaction',
    statCountries: 'Pays couverts',
  },
  en: {
    hubTitle: 'Your Personalized AI Plan',
    hubSubtitle: 'Answer 4 questions and our AI builds your custom recommendation',
    startQuiz: 'Discover My AI Plan',
    retakeQuiz: 'Retake Quiz',
    stepOf: 'Step',
    q1Title: 'What is your primary goal?',
    q1Desc: 'Select what best matches your current situation',
    q2Title: 'What is your experience level?',
    q2Desc: 'This helps us calibrate our recommendations',
    q3Title: 'How urgent is this for you?',
    q3Desc: 'When do you want to see results?',
    q4Title: 'What investment are you ready to make?',
    q4Desc: 'We\'ll adapt our recommendation to your budget',
    goal_find_job: 'Find a job',
    goal_create_cv: 'Create a resume',
    goal_career_change: 'Career change',
    goal_prepare_interview: 'Prepare for interview',
    goal_freelance: 'Start freelancing',
    goal_hire_talent: 'Hire talent',
    goal_enterprise_solution: 'Enterprise solution',
    exp_student: 'Student / Recent graduate',
    exp_junior: 'Junior (0-2 years)',
    exp_mid: 'Mid-level (3-7 years)',
    exp_senior: 'Senior (8-15 years)',
    exp_executive: 'Executive (15+ years)',
    urg_immediate: 'Urgent — This week',
    urg_this_month: 'This month',
    urg_few_months: 'In the coming months',
    urg_exploring: 'I\'m exploring options',
    bud_minimal: 'Student budget',
    bud_moderate: 'Comfortable budget',
    bud_premium: 'Premium — The best',
    bud_enterprise: 'Enterprise budget',
    analyzing: 'AI is analyzing your profile...',
    analyzingDesc: 'Our personalization engine is evaluating your needs',
    resultFor: 'Result for:',
    recommendedBundle: 'Recommended Bundle',
    confidence: 'AI Confidence',
    yourProducts: 'Your Recommended Tools',
    whatTheySay: 'What our users say',
    whyThisBundle: 'Why this bundle?',
    getStarted: 'Get started now',
    viewPricing: 'View pricing',
    primary: 'Priority',
    savings: 'Savings',
    liveStats: 'Live',
    statDocs: 'Documents generated',
    statUsers: 'Active users',
    statSatisfaction: 'Satisfaction',
    statCountries: 'Countries covered',
  },
  ar: {
    hubTitle: 'خطتك المخصصة بالذكاء الاصطناعي',
    hubSubtitle: 'أجب على 4 أسئلة وسيبني ذكاؤنا الاصطناعي توصيتك المخصصة',
    startQuiz: 'اكتشف خطتي IA',
    retakeQuiz: 'إعادة الاختبار',
    stepOf: 'خطوة',
    q1Title: 'ما هو هدفك الرئيسي؟',
    q1Desc: 'اختر ما يناسب وضعك الحالي',
    q2Title: 'ما مستوى خبرتك؟',
    q2Desc: 'يساعدنا هذا على ضبط توصياتنا',
    q3Title: 'ما درجة استعجالك؟',
    q3Desc: 'متى تريد رؤية النتائج؟',
    q4Title: 'ما الاستثمار الذي أنت مستعد له؟',
    q4Desc: 'سنكيف توصيتنا مع ميزانيتك',
    goal_find_job: 'إيجاد عمل',
    goal_create_cv: 'إنشاء سيرة ذاتية',
    goal_career_change: 'تغيير المسار المهني',
    goal_prepare_interview: 'التحضير لمقابلة',
    goal_freelance: 'البدء في العمل الحر',
    goal_hire_talent: 'توظيف المواهب',
    goal_enterprise_solution: 'حل مؤسسي',
    exp_student: 'طالب / خريج جديد',
    exp_junior: 'مبتدئ (0-2 سنوات)',
    exp_mid: 'متوسط (3-7 سنوات)',
    exp_senior: 'كبير (8-15 سنة)',
    exp_executive: 'تنفيذي (15+ سنة)',
    urg_immediate: 'عاجل — هذا الأسبوع',
    urg_this_month: 'هذا الشهر',
    urg_few_months: 'في الأشهر القادمة',
    urg_exploring: 'أستكشف خياراتي',
    bud_minimal: 'ميزانية طالب',
    bud_moderate: 'ميزانية مريحة',
    bud_premium: 'بريميوم — الأفضل',
    bud_enterprise: 'ميزانية مؤسسية',
    analyzing: 'الذكاء الاصطناعي يحلل ملفك...',
    analyzingDesc: 'محرك التخصيص لدينا يقيّم احتياجاتك',
    resultFor: 'النتيجة لـ:',
    recommendedBundle: 'الحزمة الموصى بها',
    confidence: 'ثقة الذكاء الاصطناعي',
    yourProducts: 'أدواتك الموصى بها',
    whatTheySay: 'ماذا يقول مستخدمونا',
    whyThisBundle: 'لماذا هذه الحزمة؟',
    getStarted: 'ابدأ الآن',
    viewPricing: 'عرض الأسعار',
    primary: 'أولوية',
    savings: 'توفير',
    liveStats: 'مباشر',
    statDocs: 'وثائق تم إنشاؤها',
    statUsers: 'مستخدمون نشطون',
    statSatisfaction: 'رضا',
    statCountries: 'دول مغطاة',
  },
  es: {
    hubTitle: 'Tu Plan IA Personalizado',
    hubSubtitle: 'Responde 4 preguntas y nuestra IA construye tu recomendación personalizada',
    startQuiz: 'Descubrir Mi Plan IA',
    retakeQuiz: 'Repetir Quiz',
    stepOf: 'Paso',
    q1Title: '¿Cuál es tu objetivo principal?',
    q1Desc: 'Selecciona lo que mejor se adapte a tu situación actual',
    q2Title: '¿Cuál es tu nivel de experiencia?',
    q2Desc: 'Esto nos ayuda a calibrar nuestras recomendaciones',
    q3Title: '¿Qué tan urgente es esto para ti?',
    q3Desc: '¿Cuándo quieres ver resultados?',
    q4Title: '¿Qué inversión estás dispuesto a hacer?',
    q4Desc: 'Adaptaremos nuestra recomendación a tu presupuesto',
    goal_find_job: 'Encontrar empleo',
    goal_create_cv: 'Crear un currículum',
    goal_career_change: 'Cambio de carrera',
    goal_prepare_interview: 'Preparar entrevista',
    goal_freelance: 'Empezar como freelance',
    goal_hire_talent: 'Reclutar talento',
    goal_enterprise_solution: 'Solución empresarial',
    exp_student: 'Estudiante / Recién graduado',
    exp_junior: 'Junior (0-2 años)',
    exp_mid: 'Intermedio (3-7 años)',
    exp_senior: 'Senior (8-15 años)',
    exp_executive: 'Ejecutivo (15+ años)',
    urg_immediate: 'Urgente — Esta semana',
    urg_this_month: 'Este mes',
    urg_few_months: 'En los próximos meses',
    urg_exploring: 'Estoy explorando opciones',
    bud_minimal: 'Presupuesto estudiantil',
    bud_moderate: 'Presupuesto cómodo',
    bud_premium: 'Premium — Lo mejor',
    bud_enterprise: 'Presupuesto empresarial',
    analyzing: 'La IA está analizando tu perfil...',
    analyzingDesc: 'Nuestro motor de personalización evalúa tus necesidades',
    resultFor: 'Resultado para:',
    recommendedBundle: 'Paquete Recomendado',
    confidence: 'Confianza IA',
    yourProducts: 'Tus Herramientas Recomendadas',
    whatTheySay: 'Lo que dicen nuestros usuarios',
    whyThisBundle: '¿Por qué este paquete?',
    getStarted: 'Comenzar ahora',
    viewPricing: 'Ver precios',
    primary: 'Prioridad',
    savings: 'Ahorros',
    liveStats: 'En vivo',
    statDocs: 'Documentos generados',
    statUsers: 'Usuarios activos',
    statSatisfaction: 'Satisfacción',
    statCountries: 'Países cubiertos',
  },
}

function hubT(key: string, lang: CVLanguage): string {
  return i18n[lang]?.[key] ?? i18n.fr[key] ?? key
}

// ─────────────────────────────────────────────────────────────
// Quiz option data
// ─────────────────────────────────────────────────────────────

interface QuizOption<T> {
  value: T
  icon: React.ElementType
  i18nKey: string
  descKey?: string
}

const goalOptions: QuizOption<QuizGoal>[] = [
  { value: 'find_job', icon: Briefcase, i18nKey: 'goal_find_job' },
  { value: 'create_cv', icon: FileText, i18nKey: 'goal_create_cv' },
  { value: 'career_change', icon: RefreshCw, i18nKey: 'goal_career_change' },
  { value: 'prepare_interview', icon: MessageSquare, i18nKey: 'goal_prepare_interview' },
  { value: 'freelance', icon: Laptop, i18nKey: 'goal_freelance' },
  { value: 'hire_talent', icon: Users, i18nKey: 'goal_hire_talent' },
  { value: 'enterprise_solution', icon: Building2, i18nKey: 'goal_enterprise_solution' },
]

const experienceOptions: QuizOption<QuizExperience>[] = [
  { value: 'student', icon: GraduationCap, i18nKey: 'exp_student' },
  { value: 'junior', icon: UserCheck, i18nKey: 'exp_junior' },
  { value: 'mid', icon: BarChart3, i18nKey: 'exp_mid' },
  { value: 'senior', icon: TrendingUp, i18nKey: 'exp_senior' },
  { value: 'executive', icon: Crown, i18nKey: 'exp_executive' },
]

const urgencyOptions: QuizOption<QuizUrgency>[] = [
  { value: 'immediate', icon: Zap, i18nKey: 'urg_immediate' },
  { value: 'this_month', icon: Target, i18nKey: 'urg_this_month' },
  { value: 'few_months', icon: Globe, i18nKey: 'urg_few_months' },
  { value: 'exploring', icon: Compass, i18nKey: 'urg_exploring' },
]

const budgetOptions: QuizOption<QuizBudget>[] = [
  { value: 'minimal', icon: Lightbulb, i18nKey: 'bud_minimal' },
  { value: 'moderate', icon: TrendingUp, i18nKey: 'bud_moderate' },
  { value: 'premium', icon: Crown, i18nKey: 'bud_premium' },
  { value: 'enterprise', icon: Building2, i18nKey: 'bud_enterprise' },
]

// ─────────────────────────────────────────────────────────────
// Product icon map
// ─────────────────────────────────────────────────────────────

const productIcons: Record<string, React.ElementType> = {
  cv: FileText,
  'cover-letter': FileText,
  ats: Search,
  interview: MessageSquare,
  linkedin: Linkedin,
  career: Compass,
  coach: Bot,
  formation: BookOpen,
  freelance: Laptop,
  mobility: Plane,
  'white-label': Store,
  recruiter: Users,
  api: Code2,
  legal: Scale,
}

const productColors: Record<string, string> = {
  cv: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'cover-letter': 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  ats: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  interview: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  linkedin: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  career: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  coach: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  formation: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  freelance: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  mobility: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  'white-label': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  recruiter: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  api: 'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
  legal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

// ─────────────────────────────────────────────────────────────
// Animated number counter
// ─────────────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    let start = 0
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function AIMarketingHub({ onScrollToPricing }: { onScrollToPricing?: () => void }) {
  const { language } = useCVStore()
  const isRTL = language === 'ar'

  // Quiz state
  const [phase, setPhase] = useState<'idle' | 'quiz' | 'analyzing' | 'results'>('idle')
  const [quizStep, setQuizStep] = useState(0) // 0-3 for 4 questions
  const [answers, setAnswers] = useState<QuizAnswer>({})
  const [result, setResult] = useState<PersonalizeResult | null>(null)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [publicStats, setPublicStats] = useState({ documents: 12450, users: 8320, satisfiedUsers: 7650, avgRating: 4.8 })
  const sectionRef = useRef<HTMLDivElement>(null)

  // Fetch public stats
  useEffect(() => {
    fetch('/api/public-stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.documents) setPublicStats((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {})
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    if (phase !== 'results' || !result?.testimonials.length) return
    const interval = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % result.testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [phase, result?.testimonials.length])

  // Start quiz
  const startQuiz = useCallback(() => {
    setAnswers({})
    setQuizStep(0)
    setPhase('quiz')
    events.quizStarted()
  }, [])

  // Submit quiz
  const submitQuiz = useCallback(async () => {
    setPhase('analyzing')
    try {
      const res = await fetch('/api/ai/marketing-personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizProfile: answers, language }),
      })
      const data = await res.json()
      setResult(data)
      setTestimonialIdx(0)
      setPhase('results')
      events.quizCompleted({ bundle: data.bundle?.id, confidence: data.confidenceScore })
    } catch {
      // Fallback to default result
      setResult({
        success: true,
        bundle: { id: 'hirenova_start', name: 'HireNova Start', price: '€9.90/mois', reason: hubT('whyThisBundle', language), savings: '' },
        products: [
          { slug: 'cv', name: 'CV IA', reason: '', priority: 'primary' },
          { slug: 'cover-letter', name: 'Lettre de Motivation', reason: '', priority: 'secondary' },
        ],
        testimonials: [],
        heroCopy: { headline: '', subtitle: '', cta: '', socialProof: '' },
        profileLabel: '',
        confidenceScore: 70,
      })
      setPhase('results')
    }
  }, [answers, language])

  // Select an answer for current step
  const selectAnswer = useCallback((field: keyof QuizAnswer, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
    // Auto-advance after selection (small delay for visual feedback)
    setTimeout(() => {
      setQuizStep((s) => Math.min(s + 1, 3))
    }, 400)
  }, [])

  const currentStepData = [
    { field: 'goal' as const, options: goalOptions, titleKey: 'q1Title', descKey: 'q1Desc' },
    { field: 'experience' as const, options: experienceOptions, titleKey: 'q2Title', descKey: 'q2Desc' },
    { field: 'urgency' as const, options: urgencyOptions, titleKey: 'q3Title', descKey: 'q3Desc' },
    { field: 'budget' as const, options: budgetOptions, titleKey: 'q4Title', descKey: 'q4Desc' },
  ][quizStep]

  const progressPercent = quizStep === 0 && !answers.goal ? 0 : ((quizStep + 1) / 4) * 100

  const satisfactionPercent = publicStats.users > 0 ? Math.round((publicStats.satisfiedUsers / publicStats.users) * 100) : 95

  return (
    <section ref={sectionRef} dir={isRTL ? 'rtl' : 'ltr'} className="py-16 sm:py-24 bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0">
            <Brain className="w-3.5 h-3.5 mr-1.5" />
            {hubT('liveStats', language)}
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {hubT('hubTitle', language)}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {hubT('hubSubtitle', language)}
          </p>
        </motion.div>

        {/* ── Live Stats Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14"
        >
          {[
            { value: publicStats.documents, suffix: '+', icon: FileText, label: hubT('statDocs', language), color: 'text-emerald-600' },
            { value: publicStats.users, suffix: '+', icon: Users, label: hubT('statUsers', language), color: 'text-teal-600' },
            { value: satisfactionPercent, suffix: '%', icon: Star, label: hubT('statSatisfaction', language), color: 'text-amber-500' },
            { value: 47, suffix: '+', icon: Globe, label: hubT('statCountries', language), color: 'text-sky-600' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
            >
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                  <div className={`text-2xl sm:text-3xl font-bold ${stat.color} mb-0.5`}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Phases ── */}
        {phase === 'idle' && (
          <motion.div
              key="idle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Animated visual */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-200 dark:border-emerald-800"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border-2 border-dashed border-teal-200 dark:border-teal-800"
                />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Brain className="w-12 h-12 text-white" />
                </div>
                {/* Orbiting dots */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: i * -1.67 }}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${i * 60}deg)` }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-emerald-400" />
                  </motion.div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => { try { startQuiz() } catch(e) { console.error('[MarketingHub] startQuiz error:', e) } }}
                className="inline-flex items-center gap-2 px-8 py-6 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 rounded-lg cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                {hubT('startQuiz', language)}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {phase === 'quiz' && (
            <motion.div
              key={`quiz-${quizStep}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    {hubT('stepOf', language)} {quizStep + 1}/4
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Question card */}
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-center">
                    {t(currentStepData.titleKey, language)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground text-center">
                    {t(currentStepData.descKey, language)}
                  </p>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentStepData.options.map((opt) => {
                      const isSelected = answers[currentStepData.field] === opt.value
                      const Icon = opt.icon
                      return (
                        <motion.button
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectAnswer(currentStepData.field, opt.value)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 ${isRTL ? 'text-right' : 'text-left'} transition-all duration-200 cursor-pointer
                            ${isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-md'
                              : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                            ${isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`font-medium text-sm sm:text-base ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                            {t(opt.i18nKey, language)}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`${isRTL ? 'mr-auto' : 'ml-auto'} shrink-0`}
                            >
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuizStep((s) => Math.max(s - 1, 0))}
                      disabled={quizStep === 0}
                      className={isRTL ? 'flex-row-reverse' : ''}
                    >
                      {isRTL ? <ArrowRight className="w-4 h-4 ml-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
                      {hubT('stepOf', language)} {quizStep}
                    </Button>

                    {quizStep === 3 && answers.budget ? (
                      <Button
                        onClick={submitQuiz}
                        disabled={!answers.goal || !answers.experience || !answers.urgency || !answers.budget}
                        className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                      >
                        <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {hubT('analyzing', language).replace('...', '')}
                        {!isRTL && <ArrowRight className="w-4 h-4 ml-1" />}
                        {isRTL && <ArrowLeft className="w-4 h-4 mr-1" />}
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {quizStep + 1}/4
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Phase: Analyzing ── */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-transparent border-b-emerald-200 border-l-transparent"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{hubT('analyzing', language)}</h3>
              <p className="text-muted-foreground">{hubT('analyzingDesc', language)}</p>
            </motion.div>
          )}

          {/* ── Phase: Results ── */}
          {phase === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Profile label + retake */}
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {result.profileLabel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-semibold border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      {hubT('resultFor', language)} {result.profileLabel}
                    </Badge>
                  </motion.div>
                )}
                <Button variant="ghost" size="sm" onClick={startQuiz} className="text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`w-3.5 h-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                  {hubT('retakeQuiz', language)}
                </Button>
              </div>

              {/* AI Personalized Hero Copy */}
              {result.heroCopy?.headline && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center max-w-3xl mx-auto"
                >
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    {result.heroCopy.headline}
                  </h3>
                  <p className="text-lg text-muted-foreground mb-2">{result.heroCopy.subtitle}</p>
                  {result.heroCopy.socialProof && (
                    <p className="text-sm font-medium text-emerald-600">{result.heroCopy.socialProof}</p>
                  )}
                </motion.div>
              )}

              {/* Bundle Recommendation Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-lg overflow-hidden relative">
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-bl-full" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-emerald-600" />
                        <CardTitle className="text-lg font-bold">{hubT('recommendedBundle', language)}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Confidence badge */}
                        <Badge variant="secondary" className="bg-white/80 dark:bg-black/20 text-xs">
                          <Brain className="w-3 h-3 mr-1" />
                          {hubT('confidence', language)} {result.confidenceScore}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{result.bundle.name}</h4>
                        <p className="text-muted-foreground text-sm mb-3 leading-relaxed max-w-lg">{result.bundle.reason}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-2xl font-bold text-emerald-600">{result.bundle.price}</span>
                          {result.bundle.savings && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0">
                              <Zap className="w-3 h-3 mr-1" />
                              {result.bundle.savings}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button
                          size="lg"
                          onClick={() => {
                            if (onScrollToPricing) onScrollToPricing()
                          }}
                          className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md whitespace-nowrap"
                        >
                          {hubT('getStarted', language)}
                          {!isRTL && <ArrowRight className="w-4 h-4 ml-2" />}
                          {isRTL && <ArrowLeft className="w-4 h-4 mr-2" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (onScrollToPricing) onScrollToPricing()
                          }}
                          className="text-muted-foreground whitespace-nowrap"
                        >
                          {hubT('viewPricing', language)}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Product Recommendations Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  {hubT('yourProducts', language)}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.products.map((product, i) => {
                    const Icon = productIcons[product.slug] || FileText
                    const colorClass = productColors[product.slug] || 'bg-gray-100 text-gray-700'
                    const isPrimary = product.priority === 'primary'
                    return (
                      <motion.div
                        key={product.slug}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                      >
                        <Card className={`h-full border transition-all duration-200 hover:shadow-md ${isPrimary ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold text-sm text-foreground truncate">{product.name}</h5>
                                  {isPrimary && (
                                    <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-0">
                                      {hubT('primary', language)}
                                    </Badge>
                                  )}
                                </div>
                                {product.reason && (
                                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{product.reason}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Dynamic Social Proof Carousel */}
              {result.testimonials.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                >
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    {hubT('whatTheySay', language)}
                  </h4>
                  <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={testimonialIdx}
                        initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 40 : -40 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Card className="border-0 shadow-sm bg-gradient-to-r from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/20">
                          <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                              {/* Avatar */}
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center text-2xl shrink-0">
                                {result.testimonials[testimonialIdx].avatar}
                              </div>
                              <div className="flex-1">
                                {/* Stars */}
                                <div className="flex gap-0.5 mb-3">
                                  {Array.from({ length: result.testimonials[testimonialIdx].rating }).map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                                {/* Quote */}
                                <blockquote className="text-foreground text-sm sm:text-base leading-relaxed mb-4 italic">
                                  &ldquo;{result.testimonials[testimonialIdx].quote}&rdquo;
                                </blockquote>
                                {/* Author */}
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{result.testimonials[testimonialIdx].name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {result.testimonials[testimonialIdx].role} · {result.testimonials[testimonialIdx].company}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </AnimatePresence>

                    {/* Testimonial indicators */}
                    {result.testimonials.length > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        {result.testimonials.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setTestimonialIdx(i)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              i === testimonialIdx
                                ? 'w-6 bg-emerald-500'
                                : 'bg-emerald-200 dark:bg-emerald-800 hover:bg-emerald-300'
                            }`}
                            aria-label={`Testimonial ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* AI-Powered Trust Signal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t(language, 'lot3_marketingHub_securedByHnsa')}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
    </section>
  )
}
