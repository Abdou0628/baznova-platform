'use client'

import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  X,
  Building2,
  Globe,
  MonitorPlay,
  FileSignature,
  Settings,
  BarChart3,
  Mail,
  Phone,
  Download,
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  Users,
  Briefcase,
  BrainCircuit,
  Link2,
  MessageSquare,
  Rocket,
  UserPlus,
} from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ─── Comparison table data ─── */
interface FeatureRow {
  name: string
  start: boolean
  pro: boolean
  enterprise: boolean
}

const comparisonFeatureKeys: { key: string; start: boolean; pro: boolean; enterprise: boolean }[] = [
  { key: 'campusSaaS.compFeat.dashboard', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.unlimitedStudents', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.cvAi', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.atsAnalysis', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.coverLetters', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.employability', start: true, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.linkedinAi', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.interviewAi', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.careerAi', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.advancedDashboard', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.apiRest', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.ssoEnterprise', start: false, pro: false, enterprise: true },
  { key: 'campusSaaS.compFeat.fullLms', start: false, pro: false, enterprise: true },
  { key: 'campusSaaS.compFeat.whiteLabel', start: false, pro: false, enterprise: true },
  { key: 'campusSaaS.compFeat.prioritySupport', start: false, pro: true, enterprise: true },
  { key: 'campusSaaS.compFeat.teamTraining', start: false, pro: false, enterprise: true },
]

/* ─── Pricing feature helper ─── */
function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </li>
  )
}

/* ─── Animated wrapper ─── */
function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Main Component ─── */
export default function CampusSaaS() {
  const { setStep, language } = useCVStore()
  const contactRef = useRef<HTMLDivElement>(null)

  /* Translated comparison features */
  const comparisonFeatures = useMemo<FeatureRow[]>(
    () =>
      comparisonFeatureKeys.map((f) => ({
        name: t(language, f.key),
        start: f.start,
        pro: f.pro,
        enterprise: f.enterprise,
      })),
    [language]
  )

  /* Contact form state */
  const [form, setForm] = useState({
    institutionName: '',
    institutionType: '',
    contactName: '',
    email: '',
    phone: '',
    studentCount: '',
    desiredPlan: '',
    message: '',
    whiteLabelInterest: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.institutionName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error(t(language, 'campusSaaS.toastRequired'))
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/campus-saas/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        throw new Error(t(language, 'campusSaaS.toastServerError'))
      }

      toast.success(t(language, 'campusSaaS.toastSuccess'))
      setForm({
        institutionName: '',
        institutionType: '',
        contactName: '',
        email: '',
        phone: '',
        studentCount: '',
        desiredPlan: '',
        message: '',
        whiteLabelInterest: false,
      })
    } catch {
      toast.error(t(language, 'campusSaaS.toastError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ═══════ HEADER (sticky) ═══════ */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('landing')}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{t(language, 'campusSaaS.back')}</span>
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-emerald-600" />
              <div className="leading-tight">
                <span className="font-semibold text-sm">HireNova Campus</span>
                <span className="hidden sm:inline text-xs text-muted-foreground ml-1.5">
                  {t(language, 'campusSaaS.platformBadge')}
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={scrollToContact}>
            <Mail className="size-4" />
            <span className="hidden sm:inline">{t(language, 'campusSaaS.contactUs')}</span>
          </Button>
        </div>
      </header>

      {/* ═══════ MAIN ═══════ */}
      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeIn>
              <Badge className="mb-4 px-3 py-1 text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                {t(language, 'campusSaaS.heroBadge')}
              </Badge>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight mt-4">
                {t(language, 'campusSaaS.heroTitle')}{' '}
                <span className="text-emerald-600">{t(language, 'campusSaaS.heroHighlight')}</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t(language, 'campusSaaS.heroSubtitle')}
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                  onClick={scrollToContact}
                >
                  <MonitorPlay className="size-4" />
                  {t(language, 'campusSaaS.demoBtn')}
                </Button>
                <Button variant="outline" size="lg">
                  <Download className="size-4" />
                  {t(language, 'campusSaaS.brochureBtn')}
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="py-16 sm:py-20 bg-muted/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t(language, 'campusSaaS.pricingTitle')}
                </h2>
                <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                  {t(language, 'campusSaaS.pricingSubtitle')}
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
              {/* ── Campus Start ── */}
              <FadeIn delay={0.1}>
                <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      {t(language, 'campusSaaS.popular')}
                    </Badge>
                  </div>
                  <CardHeader className="pt-8 text-center">
                    <CardTitle className="text-lg font-bold">Campus Start</CardTitle>
                    <CardDescription>{t(language, 'campusSaaS.startDesc')}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">990 €</span>
                      <span className="text-muted-foreground">{t(language, 'campusSaaS.perYear')}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <FeatureItem text={t(language, 'campusSaaS.startF1')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF2')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF3')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF4')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF5')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF6')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF7')} />
                      <FeatureItem text={t(language, 'campusSaaS.startF8')} />
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      {t(language, 'campusSaaS.chooseStart')}
                    </Button>
                  </CardFooter>
                </Card>
              </FadeIn>

              {/* ── Campus Pro ── */}
              <FadeIn delay={0.2}>
                <Card className="border-teal-200 bg-gradient-to-b from-teal-50/60 to-white shadow-lg md:-mt-4 md:mb-[-16px] relative z-10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                      {t(language, 'campusSaaS.recommended')}
                    </Badge>
                  </div>
                  <CardHeader className="pt-8 text-center">
                    <CardTitle className="text-lg font-bold">Campus Pro</CardTitle>
                    <CardDescription>{t(language, 'campusSaaS.proDesc')}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">
                        3 900 €
                      </span>
                      <span className="text-muted-foreground">{t(language, 'campusSaaS.perYear')}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <FeatureItem text={t(language, 'campusSaaS.proF1')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF2')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF3')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF4')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF5')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF6')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF7')} />
                      <FeatureItem text={t(language, 'campusSaaS.proF8')} />
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    >
                      {t(language, 'campusSaaS.choosePro')}
                    </Button>
                  </CardFooter>
                </Card>
              </FadeIn>

              {/* ── Campus Enterprise ── */}
              <FadeIn delay={0.3}>
                <Card className="border-purple-200 bg-gradient-to-b from-purple-50/60 to-white relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      {t(language, 'campusSaaS.onQuote')}
                    </Badge>
                  </div>
                  <CardHeader className="pt-8 text-center">
                    <CardTitle className="text-lg font-bold">Campus Enterprise</CardTitle>
                    <CardDescription>{t(language, 'campusSaaS.enterpriseDesc')}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-foreground">{t(language, 'campusSaaS.onQuote')}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <FeatureItem text={t(language, 'campusSaaS.entF1')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF2')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF3')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF4')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF5')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF6')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF7')} />
                      <FeatureItem text={t(language, 'campusSaaS.entF8')} />
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                      onClick={scrollToContact}
                    >
                      {t(language, 'campusSaaS.contactTeam')}
                    </Button>
                  </CardFooter>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t(language, 'campusSaaS.comparisonTitle')}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {t(language, 'campusSaaS.comparisonSubtitle')}
                </p>
              </div>
            </FadeIn>

            {/* Desktop table (lg+) */}
            <FadeIn delay={0.1}>
              <Card className="hidden lg:block overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%] font-semibold">
                          {t(language, 'campusSaaS.feature')}
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          <div>
                            <div className="text-emerald-700">Campus Start</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {t(language, 'campusSaaS.startPrice')}
                            </div>
                          </div>
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          <div>
                            <div className="text-teal-700">Campus Pro</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {t(language, 'campusSaaS.proPrice')}
                            </div>
                          </div>
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          <div>
                            <div className="text-purple-700">Campus Enterprise</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {t(language, 'campusSaaS.onQuote')}
                            </div>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonFeatures.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-center">
                            {row.start ? (
                              <CheckCircle2 className="size-5 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="size-5 text-muted-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.pro ? (
                              <CheckCircle2 className="size-5 text-teal-600 mx-auto" />
                            ) : (
                              <X className="size-5 text-muted-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.enterprise ? (
                              <CheckCircle2 className="size-5 text-purple-600 mx-auto" />
                            ) : (
                              <X className="size-5 text-muted-300 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Mobile comparison (simplified cards) */}
            <div className="lg:hidden space-y-6">
              {[
                {
                  name: 'Campus Start',
                  price: t(language, 'campusSaaS.startPrice'),
                  color: 'emerald',
                  features: comparisonFeatures.filter((f) => f.start),
                },
                {
                  name: 'Campus Pro',
                  price: t(language, 'campusSaaS.proPrice'),
                  color: 'teal',
                  features: comparisonFeatures.filter((f) => f.pro),
                },
                {
                  name: 'Campus Enterprise',
                  price: t(language, 'campusSaaS.onQuote'),
                  color: 'purple',
                  features: comparisonFeatures.filter((f) => f.enterprise),
                },
              ].map((plan) => (
                <FadeIn key={plan.name}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {plan.color === 'emerald' && (
                          <span className="text-emerald-700">{plan.name}</span>
                        )}
                        {plan.color === 'teal' && (
                          <span className="text-teal-700">{plan.name}</span>
                        )}
                        {plan.color === 'purple' && (
                          <span className="text-purple-700">{plan.name}</span>
                        )}
                        <span className="text-muted-foreground font-normal ml-2">
                          {plan.price}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid grid-cols-1 gap-1.5">
                        {plan.features.map((f) => (
                          <li key={f.name} className="flex items-center gap-2 text-sm">
                            <CheckCircle2
                              className={`size-4 shrink-0 ${
                                plan.color === 'emerald'
                                  ? 'text-emerald-600'
                                  : plan.color === 'teal'
                                    ? 'text-teal-600'
                                    : 'text-purple-600'
                              }`}
                            />
                            <span className="text-muted-foreground">{f.name}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHITE LABEL SECTION ── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-700 text-white">
                <CardContent className="p-6 sm:p-10 lg:p-14">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="size-8 text-white/90" />
                        <h2 className="text-2xl sm:text-3xl font-bold">
                          {t(language, 'campusSaaS.wlTitle')}
                        </h2>
                      </div>
                      <p className="text-white/85 text-base leading-relaxed">
                        {t(language, 'campusSaaS.wlDesc')}
                      </p>
                      <div className="mt-6">
                        <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                          <ShieldCheck className="size-3" />
                          {t(language, 'campusSaaS.wlBadge')}
                        </Badge>
                      </div>
                    </div>

                    {/* Visual preview */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                          <GraduationCap className="size-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">UniversitéX</div>
                          <div className="text-xs text-white/70">{t(language, 'campusSaaS.wlCareerPortal')}</div>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-lg px-4 py-2 mb-3 font-mono text-sm">
                        career.universitex.edu
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/80">
                          {t(language, 'campusSaaS.wlPreview1')}
                        </div>
                        <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/80">
                          {t(language, 'campusSaaS.wlPreview2')}
                        </div>
                        <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/80">
                          {t(language, 'campusSaaS.wlPreview3')}
                        </div>
                        <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/80">
                          {t(language, 'campusSaaS.wlPreview4')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-16 sm:py-20 bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t(language, 'campusSaaS.howTitle')}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {t(language, 'campusSaaS.howSubtitle')}
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  icon: MonitorPlay,
                  title: t(language, 'campusSaaS.step1Title'),
                  desc: t(language, 'campusSaaS.step1Desc'),
                  color: 'text-emerald-600 bg-emerald-100',
                },
                {
                  step: 2,
                  icon: FileSignature,
                  title: t(language, 'campusSaaS.step2Title'),
                  desc: t(language, 'campusSaaS.step2Desc'),
                  color: 'text-teal-600 bg-teal-100',
                },
                {
                  step: 3,
                  icon: Settings,
                  title: t(language, 'campusSaaS.step3Title'),
                  desc: t(language, 'campusSaaS.step3Desc'),
                  color: 'text-amber-600 bg-amber-100',
                },
                {
                  step: 4,
                  icon: BarChart3,
                  title: t(language, 'campusSaaS.step4Title'),
                  desc: t(language, 'campusSaaS.step4Desc'),
                  color: 'text-purple-600 bg-purple-100',
                },
              ].map((item, i) => (
                <FadeIn key={item.step} delay={i * 0.1}>
                  <Card className="text-center h-full">
                    <CardContent className="pt-6 flex flex-col items-center">
                      <div
                        className={`size-12 rounded-full ${item.color} flex items-center justify-center mb-4`}
                      >
                        <item.icon className="size-6" />
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        {t(language, 'campusSaaS.stepLabel').replace('{n}', String(item.step))}
                      </div>
                      <CardTitle className="text-base mb-2">{item.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t(language, 'campusSaaS.statsTitle')}
                </h2>
              </div>
            </FadeIn>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  value: '500+',
                  label: t(language, 'campusSaaS.statsStudentsStart'),
                  icon: Users,
                  color: 'text-emerald-600',
                },
                {
                  value: '2 000+',
                  label: t(language, 'campusSaaS.statsStudentsPro'),
                  icon: GraduationCap,
                  color: 'text-teal-600',
                },
                {
                  value: '0%',
                  label: t(language, 'campusSaaS.statsNoHiddenCost'),
                  icon: Sparkles,
                  color: 'text-amber-600',
                },
                {
                  value: '24/7',
                  label: t(language, 'campusSaaS.statsSupport'),
                  icon: ShieldCheck,
                  color: 'text-purple-600',
                },
              ].map((stat, i) => (
                <FadeIn key={stat.value} delay={i * 0.1}>
                  <Card className="text-center">
                    <CardContent className="pt-6 pb-6">
                      <stat.icon className={`size-6 ${stat.color} mx-auto mb-3`} />
                      <div className={`text-3xl sm:text-4xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {stat.label}
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT FORM ── */}
        <section id="contact" ref={contactRef} className="py-16 sm:py-20 bg-muted/40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <Card>
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Mail className="size-5 text-emerald-600" />
                    <CardTitle className="text-2xl font-bold">
                      {t(language, 'campusSaaS.contactTitle')}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {t(language, 'campusSaaS.contactSubtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Institution name */}
                      <div className="space-y-2">
                        <Label htmlFor="institution">
                          {t(language, 'campusSaaS.formInstitutionName')}{' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="institution"
                          placeholder={t(language, 'campusSaaS.formInstitutionNamePh')}
                          value={form.institutionName}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, institutionName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      {/* Institution type */}
                      <div className="space-y-2">
                        <Label htmlFor="inst-type">{t(language, 'campusSaaS.formInstitutionType')}</Label>
                        <Select
                          value={form.institutionType}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, institutionType: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t(language, 'campusSaaS.formSelect')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="universite">{t(language, 'campusSaaS.typeUniversity')}</SelectItem>
                            <SelectItem value="ecole">{t(language, 'campusSaaS.typeSchool')}</SelectItem>
                            <SelectItem value="centre-formation">
                              {t(language, 'campusSaaS.typeTrainingCenter')}
                            </SelectItem>
                            <SelectItem value="bootcamp">{t(language, 'campusSaaS.typeBootcamp')}</SelectItem>
                            <SelectItem value="institut-prive">
                              {t(language, 'campusSaaS.typePrivateInstitute')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact name */}
                      <div className="space-y-2">
                        <Label htmlFor="contact">
                          {t(language, 'campusSaaS.formContactName')}{' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contact"
                          placeholder={t(language, 'campusSaaS.formContactNamePh')}
                          value={form.contactName}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, contactName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {t(language, 'campusSaaS.formEmail')}{' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t(language, 'campusSaaS.formEmailPh')}
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Phone */}
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t(language, 'campusSaaS.formPhone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t(language, 'campusSaaS.formPhonePh')}
                          value={form.phone}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                      </div>

                      {/* Student count */}
                      <div className="space-y-2">
                        <Label htmlFor="students">{t(language, 'campusSaaS.formStudentCount')}</Label>
                        <Select
                          value={form.studentCount}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, studentCount: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t(language, 'campusSaaS.formSelect')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lt-500">&lt; 500</SelectItem>
                            <SelectItem value="500-2000">{t(language, 'campusSaaS.studentCountRange')}</SelectItem>
                            <SelectItem value="gt-2000">{t(language, 'campusSaaS.studentCountMore')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Desired plan */}
                      <div className="space-y-2">
                        <Label htmlFor="plan">{t(language, 'campusSaaS.formDesiredPlan')}</Label>
                        <Select
                          value={form.desiredPlan}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, desiredPlan: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t(language, 'campusSaaS.formSelect')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Campus Start</SelectItem>
                            <SelectItem value="pro">Campus Pro</SelectItem>
                            <SelectItem value="enterprise">Campus Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">{t(language, 'campusSaaS.formMessage')}</Label>
                      <Textarea
                        id="message"
                        placeholder={t(language, 'campusSaaS.formMessagePh')}
                        rows={4}
                        value={form.message}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, message: e.target.value }))
                        }
                      />
                    </div>

                    {/* White Label checkbox */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="white-label"
                        checked={form.whiteLabelInterest}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({
                            ...f,
                            whiteLabelInterest: checked === true,
                          }))
                        }
                      />
                      <Label htmlFor="white-label" className="text-sm leading-relaxed cursor-pointer">
                        {t(language, 'campusSaaS.formWhiteLabelInterest')}
                      </Label>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    >
                      {submitting ? (
                        <>
                          <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t(language, 'campusSaaS.formSending')}
                        </>
                      ) : (
                        <>
                          <Rocket className="size-4" />
                          {t(language, 'campusSaaS.formSubmit')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="size-5 text-emerald-600" />
              <span className="font-semibold text-sm">HireNova Campus</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <a
                href="mailto:campus@hirenova.com"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="size-3.5" />
                campus@hirenova.com
              </a>
              <a
                href="tel:+2120522000000"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="size-3.5" />
                +212 (0) 5 22 00 00 00
              </a>
            </div>
            <div className="text-xs text-muted-foreground">
              © 2026 E-Society 2050
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
