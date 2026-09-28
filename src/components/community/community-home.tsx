'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, Users, Building2, Globe, Award,
  CheckCircle2, Send, Loader2, Mail, Phone, MapPin,
  Calendar, BarChart3, Megaphone, Shield, Star, Video, Target, Zap,
  GraduationCap, Briefcase, BookOpen, HandCoins, ShoppingCart, TrendingUp,
  Lightbulb, Mic, Headphones, Palette, Code2,
} from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

/* ─── Marketplace Actors ─── */
const marketplaceActors = [
  {
    icon: Headphones,
    title: 'Coaches carrière',
    desc: 'Vendez vos sessions de coaching, ateliers et programmes de développement professionnel.',
    color: 'emerald' as const,
    tag: 'Services',
  },
  {
    icon: GraduationCap,
    title: 'Formateurs',
    desc: 'Proposez vos cours, certifications et formations en ligne.',
    color: 'teal' as const,
    tag: 'Cours',
  },
  {
    icon: Building2,
    title: 'Cabinets RH',
    desc: 'Recrutez directement dans la communauté, publiez vos offres et trouvez les bons profils.',
    color: 'sky' as const,
    tag: 'Recrutement',
  },
  {
    icon: Briefcase,
    title: 'Freelances',
    desc: 'Offrez vos prestations (CV, design, consulting, IT) et développez votre clientèle.',
    color: 'amber' as const,
    tag: 'Prestations',
  },
  {
    icon: Palette,
    title: 'Créateurs de contenu',
    desc: 'Vendez templates CV, guides carrière, e-books et ressources professionnelles.',
    color: 'purple' as const,
    tag: 'Contenu',
  },
  {
    icon: Code2,
    title: 'Développeurs & Agences',
    desc: 'Proposez des intégrations API, plugins et solutions techniques autour de BazNova.',
    color: 'rose' as const,
    tag: 'Tech',
  },
]

/* ─── Community Audiences (orgs) ─── */
const audiences = [
  {
    icon: Building2,
    title: 'Entreprises',
    desc: 'Recrutez les meilleurs talents dans votre espace dédié',
    color: 'emerald' as const,
  },
  {
    icon: Users,
    title: 'Cabinets RH',
    desc: 'Gérez vos missions et candidats depuis un espace centralisé',
    color: 'teal' as const,
  },
  {
    icon: Globe,
    title: 'Organismes publics',
    desc: "Offres d'emploi publiques et événements institutionnels",
    color: 'sky' as const,
  },
  {
    icon: Award,
    title: 'Associations professionnelles',
    desc: 'Communautés sectorielles et événements networking',
    color: 'amber' as const,
  },
]

/* ─── Pricing Plans ─── */
const plans = [
  {
    name: 'Community Partner',
    badge: 'Essentiel',
    price: '49 €/mois',
    audience: 'Coaches, freelances, petites structures',
    features: [
      'Espace officiel personnalisé',
      'Vente de services / cours / prestations',
      'Publication d\'événements',
      'Diffusion d\'offres d\'emploi',
      'Interaction avec les membres',
      'Badge "Partenaire vérifié"',
      'Analytics de base',
    ],
    cta: 'Démarrer maintenant',
    ctaVariant: 'outline' as const,
    color: 'emerald' as const,
  },
  {
    name: 'Community Business',
    badge: 'Professionnel',
    price: '149 €/mois',
    audience: 'Cabinets RH, formateurs, entreprises en croissance',
    features: [
      'Tout du plan Partner',
      'Commission réduite sur vos ventes',
      'Webinaires live intégrés',
      'Analytics avancés (audience, conversions)',
      'Campagnes ciblées (par profil, secteur)',
      'Visibilité renforcée (mise en avant)',
      'Branding personnalisé',
      'Support prioritaire',
    ],
    cta: 'Choisir Business',
    ctaVariant: 'default' as const,
    color: 'teal' as const,
    popular: true,
  },
  {
    name: 'Community Enterprise',
    badge: 'Sur mesure',
    price: '499 €/mois',
    audience: 'Grandes organisations et groupes',
    features: [
      'Tout du plan Business',
      'Commission minimale',
      'Espaces illimités (multi-agences)',
      'API d\'intégration marketplace',
      'White Label optionnel',
      'SLA garanti',
      'Account manager dédié',
      'Rapports sur mesure',
    ],
    cta: 'Contacter l\'équipe',
    ctaVariant: 'outline' as const,
    color: 'purple' as const,
  },
]

const steps = [
  {
    num: '01',
    title: 'Créez votre espace',
    desc: 'Inscription en 5 minutes, branding personnalisé, votre identité visuelle intégrée.',
  },
  {
    num: '02',
    title: 'Publiez & vendez',
    desc: 'Services, cours, offres, événements — tout depuis votre dashboard unifié avec monétisation.',
  },
  {
    num: '03',
    title: 'Développez votre activité',
    desc: 'La communauté BazNova devient votre moteur de revenus et de visibilité.',
  },
]

const benefits = [
  { icon: TrendingUp, title: 'Moteur économique', desc: 'La communauté génère de l\'activité économique réelle pour chaque acteur.' },
  { icon: ShoppingCart, title: 'Marketplace intégrée', desc: 'Vendez services, cours et prestations directement dans l\'écosystème.' },
  { icon: Star, title: 'Visibilité employer brand', desc: 'Votre marque en avant dans l\'écosystème BazNova et au-delà.' },
  { icon: Target, title: 'Talents qualifiés', desc: 'Accès direct à la base de candidats et professionnels BazNova.' },
  { icon: BarChart3, title: 'ROI mesurable', desc: 'Analytics complets sur vos ventes, interactions et conversions.' },
  { icon: Zap, title: 'Simplicité', desc: 'Tout-en-un — communauté + marketplace + recrutement en une seule plateforme.' },
]

const orgTypes = [
  'Entreprise',
  'Cabinet RH',
  'Organisme public',
  'Association professionnelle',
  'Coach carrière',
  'Formateur',
  'Freelance',
  'Autre',
]

const planOptions = [
  'Community Partner',
  'Community Business',
  'Community Enterprise',
]

const colorMap = {
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-gradient-to-br from-emerald-50/50 to-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-600',
  },
  teal: {
    border: 'border-teal-500',
    bg: 'bg-gradient-to-br from-teal-50/50 to-white',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-600',
  },
  sky: {
    border: 'border-sky-500',
    bg: 'bg-gradient-to-br from-sky-50/50 to-white',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-600',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-gradient-to-br from-amber-50/50 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-600',
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-gradient-to-br from-purple-50/50 to-white',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-600',
  },
  rose: {
    border: 'border-rose-500',
    bg: 'bg-gradient-to-br from-rose-50/50 to-white',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-600',
  },
}

const tagColorMap: Record<string, string> = {
  Services: 'bg-emerald-100 text-emerald-700',
  Cours: 'bg-teal-100 text-teal-700',
  Recrutement: 'bg-sky-100 text-sky-700',
  Prestations: 'bg-amber-100 text-amber-700',
  Contenu: 'bg-purple-100 text-purple-700',
  Tech: 'bg-rose-100 text-rose-700',
}

export default function CommunityHome() {
  const { setStep } = useCVStore()
  const [form, setForm] = useState({
    orgName: '',
    orgType: '',
    contactName: '',
    email: '',
    phone: '',
    plan: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires (*).')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Demande envoyée ! Notre équipe vous contactera sous 24h.')
        setForm({ orgName: '', orgType: '', contactName: '', email: '', phone: '', plan: '', message: '' })
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      toast.error('Erreur de connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('landing')}
              className="-ml-2 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight truncate">BazNova Community & Marketplace</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Communauté + Marché</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="gap-1.5 cursor-pointer shrink-0"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nous contacter</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 sm:mb-16"
        >
          <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 mb-4">
            <ShoppingCart className="w-3 h-3 mr-1" />
            Communauté & Marketplace
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
            La communauté qui <span className="text-emerald-600">génère de l&apos;activité économique</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Coaches, formateurs, cabinets RH, freelances — vendez vos services, cours et prestations
            dans l&apos;écosystème BazNova. La communauté devient un moteur de revenus.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-2"
              onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <ShoppingCart className="w-4 h-4" />
              Explorer le Marketplace
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Voir les formules
            </Button>
          </div>
        </motion.section>

        {/* Marketplace Actors — WHO SELLS WHAT */}
        <section id="marketplace" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-3">
              <HandCoins className="w-3 h-3 mr-1" />
              Marketplace
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Qui vend quoi dans le Marketplace ?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un coach reconnu peut vendre ses services. Un formateur peut vendre ses cours.
              Un cabinet RH peut recruter. Un freelance peut proposer ses prestations.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {marketplaceActors.map((actor, idx) => {
              const c = colorMap[actor.color]
              return (
                <motion.div
                  key={actor.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <Card className={`h-full hover:shadow-md transition-shadow border ${c.border} ${c.bg}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                          <actor.icon className={`w-6 h-6 ${c.iconColor}`} />
                        </div>
                        <Badge className={`${tagColorMap[actor.tag] || 'bg-muted text-muted-foreground'} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                          {actor.tag}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-base mb-1">{actor.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{actor.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Revenue Model — How it works economically */}
        <section className="mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
              <CardContent className="p-6 sm:p-10">
                <div className="text-center mb-8">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-3">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Modèle économique
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    Un moteur d&apos;activité économique
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
                    La commission BazNova sur chaque transaction finance la plateforme.
                    Plus la communauté grandit, plus l&apos;écosystème prospère.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Coaches & Formateurs', pct: 35, color: 'bg-emerald-500', desc: 'Cours, coaching, ateliers' },
                    { label: 'Freelances & Prestataires', pct: 30, color: 'bg-teal-500', desc: 'Services, missions, CV' },
                    { label: 'Recrutement RH', pct: 25, color: 'bg-sky-500', desc: 'Offres, matching, headhunting' },
                    { label: 'Contenu & Ressources', pct: 10, color: 'bg-amber-500', desc: 'Templates, e-books, guides' },
                  ].map((seg) => (
                    <motion.div
                      key={seg.label}
                      className="text-center"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <div className="relative h-20 w-20 mx-auto mb-3">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="35" fill="none" stroke="#334155" strokeWidth="6" />
                          <motion.circle
                            cx="40" cy="40" r="35" fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 35}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 35 }}
                            whileInView={{ strokeDashoffset: 2 * Math.PI * 35 * (1 - seg.pct / 100) }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`${seg.color}`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{seg.pct}%</span>
                      </div>
                      <p className="font-semibold text-sm">{seg.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{seg.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Community Spaces — Organizations */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Espaces communautaires
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {audiences.map((item, idx) => {
              const c = colorMap[item.color]
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`h-full hover:shadow-md transition-shadow border ${c.border} ${c.bg}`}>
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center mb-4`}>
                        <item.icon className={`w-6 h-6 ${c.iconColor}`} />
                      </div>
                      <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-3">
              Tarification
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Choisissez votre formule</h2>
            <p className="text-muted-foreground">Communauté + Marketplace — tout-en-un</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan, idx) => {
              const c = colorMap[plan.color]
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`h-full relative overflow-hidden ${plan.popular ? `${c.border} shadow-xl ${c.bg}` : `border-muted/50 bg-white`}`}>
                    {plan.badge && (
                      <div className="absolute top-3 right-3">
                        <Badge className={`${plan.popular ? c.badgeBg : 'bg-muted text-muted-foreground'} px-2 py-0.5 text-[10px] font-semibold rounded-full text-white`}>
                          {plan.popular ? '* ' : ''}{plan.badge}
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6 pt-5">
                      <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{plan.audience}</p>
                      <div className="mb-5">
                        <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full cursor-pointer ${plan.ctaVariant === 'default' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                        variant={plan.ctaVariant}
                        onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {plan.cta}
                        {plan.ctaVariant === 'outline' && <ArrowRight className="w-4 h-4 ml-1" />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-5xl font-bold text-emerald-100">
                    {step.num}
                  </div>
                  <CardContent className="p-6 relative">
                    <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-12 sm:mb-16">
          <Card className="bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 border-teal-200">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-center mb-8">Pourquoi BazNova Community & Marketplace ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((b, idx) => (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <b.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{b.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact Form */}
        <section id="contact" className="mb-12 scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                Rejoindre la Community & Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orgName">Nom de l&apos;organisation / profil *</Label>
                    <Input
                      id="orgName"
                      required
                      value={form.orgName}
                      onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                      placeholder="Ex: CoachCareer Pro, Cabinet ABC..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgType">Type de profil</Label>
                    <select
                      id="orgType"
                      value={form.orgType}
                      onChange={(e) => setForm({ ...form, orgType: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Sélectionner...</option>
                      {orgTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="contactName">Nom du contact *</Label>
                    <Input
                      id="contactName"
                      required
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      placeholder="Ex: Sarah Benali"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="contact@organisation.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+212 6 00 00 00 00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">Formule souhaitée</Label>
                    <select
                      id="plan"
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Sélectionner...</option>
                      {planOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Décrivez ce que vous souhaitez vendre ou proposer dans le Marketplace..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Rejoindre la Community & Marketplace
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-teal-50/30 via-white to-emerald-50/20 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-6">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              community@baznova.com
            </span>
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              marketplace.baznova.com
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 E-Society 2050 — BazNova Community & Marketplace. Casablanca, Maroc.
          </p>
        </div>
      </footer>
    </div>
  )
}
