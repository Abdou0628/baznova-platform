'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Handshake,
  GraduationCap,
  BookOpen,
  Building2,
  Globe,
  Briefcase,
  Award,
  Rocket,
  Zap,
  Laptop,
  FileCheck,
  LayoutDashboard,
  UserPlus,
  Headphones,
  ClipboardList,
  Search,
  PenLine,
  RocketIcon,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCVStore } from '@/store/cv-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}
const fadeUpDelay = (delay: number) => ({
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut', delay } },
})
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const partnerTypes = [
  {
    icon: GraduationCap,
    title: 'Universités',
    description: 'Accompagnez vos étudiants avec notre écosystème carrière IA',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: BookOpen,
    title: 'Écoles',
    description: "Intégrez HireNova dans votre programme d'insertion professionnelle",
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: Building2,
    title: 'Chambres de commerce',
    description: 'Connectez entreprises et talents dans votre région',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Globe,
    title: 'Ministères',
    description: "Programmes nationaux d'employabilité et de formation",
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Briefcase,
    title: "Agences de l'emploi",
    description: "Plateformes d'orientation et placement professionnel",
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  {
    icon: Award,
    title: 'Associations professionnelles',
    description: 'Communautés sectorielles et développement de carrière',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: Rocket,
    title: 'Incubateurs',
    description: 'Accompagnez vos startups dans le recrutement',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Zap,
    title: 'Accélérateurs',
    description: 'Programmes intensifs avec outils carrière intégrés',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
  {
    icon: Laptop,
    title: 'Espaces de coworking',
    description: 'Services carrière pour vos membres et résidents',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
]

const benefits = [
  {
    icon: FileCheck,
    title: 'Contrats 100 % numériques',
    items: [
      'Signature électronique',
      'Facturation électronique',
      'Archivage dématérialisé',
    ],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: LayoutDashboard,
    title: 'Tableau de bord partenaire',
    items: [
      'Gérez vos licences, utilisateurs, statistiques et contrats depuis un portail unique',
    ],
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: UserPlus,
    title: 'Onboarding automatisé',
    items: [
      'Import en masse',
      'SSO',
      'Intégration LMS',
      'Configuration à distance',
    ],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Headphones,
    title: 'Support dédié',
    items: [
      'Account manager',
      'Formation équipes',
      'SLA garanti',
    ],
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

const revenueSegments = [
  { label: 'Particuliers (B2C)', pct: 40, color: 'bg-emerald-500' },
  { label: 'Entreprises (B2B)', pct: 35, color: 'bg-teal-500' },
  { label: 'Campus', pct: 15, color: 'bg-amber-500' },
  { label: 'Community & Marketplace', pct: 10, color: 'bg-purple-500' },
]

const steps = [
  {
    icon: ClipboardList,
    title: 'Candidature',
    description: 'Remplissez le formulaire ci-dessous avec les détails de votre organisation',
    num: '01',
  },
  {
    icon: Search,
    title: 'Évaluation',
    description: 'Notre équipe étudie votre dossier et propose un plan adapté',
    num: '02',
  },
  {
    icon: PenLine,
    title: 'Convention',
    description: 'Signature électronique du contrat de partenariat',
    num: '03',
  },
  {
    icon: RocketIcon,
    title: 'Déploiement',
    description: 'Configuration, onboarding, formation, et lancement',
    num: '04',
  },
]

const partnerOptions = [
  'Université',
  'École',
  'Chambre de commerce',
  'Ministère',
  "Agence de l'emploi",
  'Association professionnelle',
  'Incubateur',
  'Accélérateur',
  'Espace de coworking',
  'Autre',
]

export default function PartnershipPortal() {
  const { setStep } = useCVStore()

  const [form, setForm] = useState({
    orgName: '',
    partnerType: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    website: '',
    estimatedUsers: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orgName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/partnership/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      toast.success('Candidature envoyée avec succès ! Nous vous recontacterons sous 48h.')
      setForm({
        orgName: '',
        partnerType: '',
        contactName: '',
        email: '',
        phone: '',
        country: '',
        website: '',
        estimatedUsers: '',
        message: '',
      })
    } catch {
      toast.error('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="gap-1.5 text-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-emerald-600" />
            <div className="text-right sm:text-left">
              <p className="text-sm font-semibold leading-tight text-foreground">HireNova Partenariats</p>
              <p className="text-xs text-muted-foreground">Portail dédié</p>
            </div>
          </div>
          <div className="w-[70px] sm:w-[88px]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* HERO */}
        <motion.section
          className="flex flex-col items-center text-center pb-12 sm:pb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
            🤝 Partenaires institutionnels
          </Badge>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Construisons ensemble l&apos;employabilité de demain
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Un portail dédié pour gérer vos contrats, licences et utilisateurs. Partenariats électroniques,
            facturation numérique, onboarding automatisé.
          </p>
          <Button
            className="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
            onClick={() => {
              document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Devenir partenaire
          </Button>
        </motion.section>

        {/* PARTNER TYPES */}
        <section className="pb-12 sm:pb-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
              Nos types de partenaires
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {partnerTypes.map((pt) => {
              const Icon = pt.icon
              return (
                <motion.div key={pt.title} variants={fadeUp}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${pt.bg}`}>
                        <Icon className={`h-5 w-5 ${pt.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{pt.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{pt.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* BENEFITS */}
        <section className="pb-12 sm:pb-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
              Avantages du partenariat
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {benefits.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div key={b.title} variants={fadeUpDelay(i * 0.1)}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-6">
                      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${b.bg}`}>
                        <Icon className={`h-5 w-5 ${b.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
                      <ul className="mt-3 space-y-1.5">
                        {b.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* REVENUE MODEL */}
        <section className="pb-12 sm:pb-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
              <CardContent className="p-6 sm:p-10">
                <h2 className="text-2xl font-bold sm:text-3xl">Modèle de revenus récurrents</h2>
                <div className="mt-8 space-y-4">
                  {revenueSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-4">
                      <span className="w-36 shrink-0 text-sm font-medium text-slate-300 sm:w-48">{seg.label}</span>
                      <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-slate-700/50">
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-md ${seg.color}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${seg.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-sm font-bold text-white">
                          {seg.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Une diversification intelligente des revenus pour une croissance durable
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* HOW TO BECOME A PARTNER */}
        <section className="pb-12 sm:pb-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
              Comment devenir partenaire ?
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {steps.map((s) => {
              const Icon = s.icon
              return (
                <motion.div key={s.title} variants={fadeUp}>
                  <Card className="h-full text-center transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col items-center p-6">
                      <span className="mb-3 text-4xl font-black text-emerald-600/20">{s.num}</span>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                        <Icon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* CONTACT FORM */}
        <section className="pb-12 sm:pb-16" id="contact-form">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <Card className="mx-auto max-w-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Formulaire de candidature</CardTitle>
                <CardDescription>
                  Remplissez ce formulaire pour soumettre votre demande de partenariat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">
                      Nom de l&apos;organisation <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="orgName"
                      placeholder="Ex : Université Mohammed V"
                      value={form.orgName}
                      onChange={(e) => updateField('orgName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partnerType">Type de partenaire</Label>
                    <Select
                      value={form.partnerType}
                      onValueChange={(v) => updateField('partnerType', v)}
                    >
                      <SelectTrigger className="w-full" id="partnerType">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">
                      Nom du contact <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="Prénom Nom"
                      value={form.contactName}
                      onChange={(e) => updateField('contactName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email professionnel <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@organisation.com"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+212 6 00 00 00 00"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Pays</Label>
                      <Input
                        id="country"
                        placeholder="Maroc"
                        value={form.country}
                        onChange={(e) => updateField('country', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://www.organisation.com"
                      value={form.website}
                      onChange={(e) => updateField('website', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedUsers">Nombre d&apos;utilisateurs estimé</Label>
                    <Input
                      id="estimatedUsers"
                      type="number"
                      min={1}
                      placeholder="Ex : 500"
                      value={form.estimatedUsers}
                      onChange={(e) => updateField('estimatedUsers', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      placeholder="Décrivez votre projet de partenariat..."
                      value={form.message}
                      onChange={(e) => updateField('message', e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Soumettre ma candidature
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-foreground">HireNova Partenariats</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a
                href="mailto:partnerships@hirenova.com"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                partnerships@hirenova.com
              </a>
              <a
                href="tel:+212522000000"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                +212 (0) 5 22 00 00 00
              </a>
              <a
                href="https://hirenova.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                hirenova.com
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 E-Society 2050 — HireNova Partenariats
          </div>
        </div>
      </footer>
    </div>
  )
}
