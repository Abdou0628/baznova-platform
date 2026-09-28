'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Search, Briefcase, Globe, Plane, Code2, Brain,
  MessageSquare, Linkedin, UserCheck, Compass, Bot, BookOpen,
  Laptop, GraduationCap, Building2, Store, Scale, Network,
  Sparkles, ChevronRight, ArrowRight, Star, Zap, Shield,
  RefreshCw, Loader2, CheckCircle2, TrendingUp, Target, Heart,
  Users, DollarSign, BarChart3, Lock, Eye, Lightbulb,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'

type AppStep = import('@/store/cv-store').AppStep

// ──────────────────────────────────────────────
// Product data
// ──────────────────────────────────────────────

interface Product {
  id: string
  slug: string
  icon: React.ElementType
  names: Record<CVLanguage, string>
  shortDesc: Record<CVLanguage, string>
  bundle: string
  price: string
  color: string
  features: Record<CVLanguage, string[]>
  step: AppStep | null
}

const products: Product[] = [
  {
    id: 'cv',
    slug: 'cv',
    icon: FileText,
    names: {
      fr: 'CV IA Professionnel',
      en: 'Professional AI Resume',
      ar: '\u0633\u064a\u0631\u0629 \u0630\u0627\u062a\u064a\u0629 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629 IA',
      es: 'CV Profesional IA',
    },
    shortDesc: {
      fr: 'Cr\u00e9ez un CV professionnel optimis\u00e9 par IA en quelques secondes.',
      en: 'Create a professional, AI-optimized resume in seconds.',
      ar: '\u0623\u0646\u0634\u0626 \u0633\u064a\u0631\u0629 \u0630\u0627\u062a\u064a\u0629 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629 \u0645\u062d\u0633\u0651\u0646\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a.',
      es: 'Crea un curr\u00edculum profesional optimizado con IA en segundos.',
    },
    bundle: 'Start',
    price: '\u20ac7.90',
    color: 'emerald',
    features: {
      fr: ['Templates modernes', 'Optimisation ATS', 'Multi-langues FR/EN/AR/ES'],
      en: ['Modern templates', 'ATS optimization', 'Multi-language FR/EN/AR/ES'],
      ar: ['\u0642\u0648\u0627\u0644\u0628 \u062d\u062f\u064a\u062b\u0629', '\u062a\u062d\u0633\u064a\u0646 ATS', '\u0645\u062a\u0639\u062f\u062f \u0627\u0644\u0644\u063a\u0627\u062a'],
      es: ['Plantillas modernas', 'Optimizaci\u00f3n ATS', 'Multiling\u00fce'],
    },
    step: 'form',
  },
  {
    id: 'cover-letter',
    slug: 'cover-letter',
    icon: FileText,
    names: {
      fr: 'Lettre de Motivation IA',
      en: 'AI Cover Letter',
      ar: '\u0631\u0633\u0627\u0644\u0629 \u062f\u0627\u0641\u0639\u064a\u0629 IA',
      es: 'Carta de Presentaci\u00f3n IA',
    },
    shortDesc: {
      fr: 'G\u00e9n\u00e9rez une lettre de motivation persuasive et personnalis\u00e9e.',
      en: 'Generate a compelling, personalized cover letter.',
      ar: '\u0623\u0646\u0634\u0626 \u0631\u0633\u0627\u0644\u0629 \u062f\u0627\u0641\u0639\u064a\u0629 \u0645\u0642\u0646\u0639\u0629 \u0648\u0634\u062e\u0635\u064a\u0629.',
      es: 'Genera una carta de presentaci\u00f3n persuasiva y personalizada.',
    },
    bundle: 'Start',
    price: '\u20ac7.90',
    color: 'teal',
    features: {
      fr: ['Contenu personnalis\u00e9', 'Argumentation convaincante', 'Ton \u00e9motionnel adapt\u00e9'],
      en: ['Personalized content', 'Compelling argumentation', 'Emotional tone adaptation'],
      ar: ['\u0645\u062d\u062a\u0648\u0649 \u0645\u062e\u0635\u0635', '\u062d\u062c\u0629 \u0645\u0642\u0646\u0639\u0629', '\u0646\u0628\u0631\u0629 \u0639\u0627\u0637\u0641\u064a\u0629 \u0645\u062a\u0643\u064a\u0641\u0629'],
      es: ['Contenido personalizado', 'Argumentaci\u00f3n convincente', 'Tono emocional adaptado'],
    },
    step: 'clForm',
  },
  {
    id: 'ats',
    slug: 'ats',
    icon: Search,
    names: {
      fr: 'Analyse ATS Intelligente',
      en: 'Smart ATS Analysis',
      ar: '\u062a\u062d\u0644\u064a\u0644 ATS \u0630\u0643\u064a',
      es: 'An\u00e1lisis ATS Inteligente',
    },
    shortDesc: {
      fr: 'Analysez et optimisez votre CV pour passer les filtres ATS.',
      en: 'Analyze and optimize your resume to pass ATS filters.',
      ar: '\u062d\u0644\u0644 \u0648\u062d\u0633\u0651\u0646 \u0633\u064a\u0631\u062a\u0643 \u0644\u062a\u062c\u0627\u0648\u0632 \u0641\u0644\u0627\u062a\u0631 ATS.',
      es: 'Analiza y optimiza tu curr\u00edculum para pasar filtros ATS.',
    },
    bundle: 'Start',
    price: '\u20ac7.90',
    color: 'emerald',
    features: {
      fr: ['Score de compatibilit\u00e9', 'Suggestions d\'optimisation', 'Benchmark march\u00e9'],
      en: ['Compatibility score', 'Optimization tips', 'Market benchmark'],
      ar: ['\u062f\u0631\u062c\u0629 \u0627\u0644\u062a\u0648\u0627\u0641\u0642', '\u0646\u0635\u0627\u0626\u062d \u0627\u0644\u062a\u062d\u0633\u064a\u0646', '\u0645\u0639\u064a\u0627\u0631 \u0627\u0644\u0633\u0648\u0642'],
      es: ['Puntuaci\u00f3n de compatibilidad', 'Consejos de optimizaci\u00f3n', 'Benchmark de mercado'],
    },
    step: 'form',
  },
  {
    id: 'interview',
    slug: 'interview',
    icon: MessageSquare,
    names: {
      fr: 'Simulateur Entretien IA',
      en: 'AI Interview Simulator',
      ar: '\u0645\u062d\u0627\u0643\u064a \u0645\u0642\u0627\u0628\u0644\u0629 IA',
      es: 'Simulador de Entrevista IA',
    },
    shortDesc: {
      fr: 'Pr\u00e9parez-vous aux entretiens avec des questions adapt\u00e9es au poste.',
      en: 'Prepare for interviews with job-tailored questions.',
      ar: '\u062a\u062d\u0636\u0651\u0631 \u0644\u0644\u0645\u0642\u0627\u0628\u0644\u0627\u062a \u0628\u0623\u0633\u0626\u0644\u0629 \u0645\u062e\u0635\u0635\u0629 \u0644\u0644\u0648\u0638\u064a\u0641\u0629.',
      es: 'Prep\u00e1rate para entrevistas con preguntas adaptadas al puesto.',
    },
    bundle: 'Career',
    price: '\u20ac9.90',
    color: 'violet',
    features: {
      fr: ['Questions adapt\u00e9es au poste', 'Feedback instantan\u00e9', 'Pr\u00e9paration compl\u00e8te'],
      en: ['Job-tailored questions', 'Instant feedback', 'Complete preparation'],
      ar: ['\u0623\u0633\u0626\u0644\u0629 \u0645\u062e\u0635\u0635\u0629 \u0644\u0644\u0648\u0638\u064a\u0641\u0629', '\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0641\u0648\u0631\u064a\u0629', '\u062a\u062d\u0636\u064a\u0631 \u0634\u0627\u0645\u0644'],
      es: ['Preguntas adaptadas al puesto', 'Retroalimentaci\u00f3n instant\u00e1nea', 'Preparaci\u00f3n completa'],
    },
    step: 'interview',
  },
  {
    id: 'linkedin',
    slug: 'linkedin',
    icon: Linkedin,
    names: {
      fr: 'LinkedIn Optimizer',
      en: 'LinkedIn Optimizer',
      ar: '\u0645\u062d\u0633\u0651\u0646 LinkedIn',
      es: 'Optimizador LinkedIn',
    },
    shortDesc: {
      fr: 'Optimisez votre profil LinkedIn pour attirer les recruteurs.',
      en: 'Optimize your LinkedIn profile to attract recruiters.',
      ar: '\u062d\u0633\u0651\u0646 \u0645\u0644\u0641\u0643 \u0639\u0644\u0649 LinkedIn \u0644\u062c\u0630\u0628 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646.',
      es: 'Optimiza tu perfil de LinkedIn para atraer reclutadores.',
    },
    bundle: 'Career',
    price: '\u20ac9.90',
    color: 'sky',
    features: {
      fr: ['Optimisation profil', 'Mots-cl\u00e9s strat\u00e9giques', 'R\u00e9sum\u00e9 percutant'],
      en: ['Profile optimization', 'Strategic keywords', 'Powerful summary'],
      ar: ['\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a', '\u0643\u0644\u0645\u0627\u062a \u0645\u0641\u062a\u0627\u062d\u064a\u0629 \u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a\u0629', '\u0645\u0644\u062e\u0635 \u0642\u0648\u064a'],
      es: ['Optimizaci\u00f3n de perfil', 'Palabras clave estrat\u00e9gicas', 'Resumen impactante'],
    },
    step: 'linkedinHome',
  },
  {
    id: 'career',
    slug: 'career',
    icon: Compass,
    names: {
      fr: 'Career Roadmap IA',
      en: 'Career Roadmap AI',
      ar: '\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0647\u0646\u064a IA',
      es: 'Hoja de Ruta Profesional IA',
    },
    shortDesc: {
      fr: 'Tracez votre feuille de route de carri\u00e8re avec l\'intelligence artificielle.',
      en: 'Chart your career roadmap with artificial intelligence.',
      ar: '\u0627\u0631\u0633\u0645 \u062e\u0631\u064a\u0637\u0629 \u0645\u0633\u0627\u0631\u0643 \u0627\u0644\u0645\u0647\u0646\u064a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a.',
      es: 'Dibuja tu hoja de ruta profesional con inteligencia artificial.',
    },
    bundle: 'Career',
    price: '\u20ac9.90',
    color: 'rose',
    features: {
      fr: ['Feuille de route personnalis\u00e9e', 'Objectifs SMART', 'Skills gap analysis'],
      en: ['Personalized roadmap', 'SMART objectives', 'Skills gap analysis'],
      ar: ['\u062e\u0631\u064a\u0637\u0629 \u0645\u062e\u0635\u0635\u0629', '\u0623\u0647\u062f\u0627\u0641 SMART', '\u062a\u062d\u0644\u064a\u0644 \u0641\u062c\u0648\u0629 \u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062a'],
      es: ['Hoja de ruta personalizada', 'Objetivos SMART', 'An\u00e1lisis de brechas de habilidades'],
    },
    step: 'careerHome',
  },
  {
    id: 'coach',
    slug: 'coach',
    icon: Bot,
    names: {
      fr: 'Coach Carri\u00e8re IA',
      en: 'AI Career Coach',
      ar: '\u0645\u062f\u0631\u0628 \u0645\u0633\u0627\u0631 \u0645\u0647\u0646\u064a IA',
      es: 'Coach Profesional IA',
    },
    shortDesc: {
      fr: 'Un coach de carri\u00e8re IA disponible 24/7 pour vous guider.',
      en: 'An AI career coach available 24/7 to guide you.',
      ar: '\u0645\u062f\u0631\u0628 \u0645\u0633\u0627\u0631 \u0645\u0647\u0646\u064a IA \u0645\u062a\u0627\u062d 24/7 \u0644\u0625\u0631\u0634\u0627\u062f\u0643.',
      es: 'Un coach profesional IA disponible 24/7 para guiarte.',
    },
    bundle: 'Professional',
    price: '\u20ac12.90',
    color: 'emerald',
    features: {
      fr: ['Conseil personnalis\u00e9', 'Plan de d\u00e9veloppement', 'Suivi de progression'],
      en: ['Personalized advice', 'Development plan', 'Progress tracking'],
      ar: ['\u0646\u0635\u064a\u062d\u0629 \u0645\u062e\u0635\u0635\u0629', '\u062e\u0637\u0629 \u062a\u0637\u0648\u064a\u0631', '\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062a\u0642\u062f\u0645'],
      es: ['Consejo personalizado', 'Plan de desarrollo', 'Seguimiento de progreso'],
    },
    step: 'coachHome',
  },
  {
    id: 'formation',
    slug: 'formation',
    icon: BookOpen,
    names: {
      fr: 'Formation & Certification',
      en: 'Training & Certification',
      ar: '\u062a\u062f\u0631\u064a\u0628 \u0648\u0634\u0647\u0627\u062f\u0629',
      es: 'Formaci\u00f3n y Certificaci\u00f3n',
    },
    shortDesc: {
      fr: 'Suivez des formations certifiantes pour booster vos comp\u00e9tences.',
      en: 'Take certified training courses to boost your skills.',
      ar: '\u062a\u0627\u0628\u0639 \u062f\u0648\u0631\u0627\u062a \u062a\u062f\u0631\u064a\u0628\u064a\u0629 \u0645\u0639\u062a\u0645\u062f\u0629 \u0644\u062a\u0639\u0632\u064a\u0632 \u0645\u0647\u0627\u0631\u0627\u062a\u0643.',
      es: 'Realiza cursos certificados para potenciar tus habilidades.',
    },
    bundle: 'Professional',
    price: '\u20ac12.90',
    color: 'teal',
    features: {
      fr: ['Cours certifiants', 'Parcours personnalis\u00e9s', 'Badge de comp\u00e9tences'],
      en: ['Certified courses', 'Personalized paths', 'Skill badges'],
      ar: ['\u062f\u0648\u0631\u0627\u062a \u0645\u0639\u062a\u0645\u062f\u0629', '\u0645\u0633\u0627\u0631\u0627\u062a \u0645\u062e\u0635\u0635\u0629', '\u0634\u0627\u0631\u0627\u062a \u0645\u0647\u0627\u0631\u0627\u062a'],
      es: ['Cursos certificados', 'Rutas personalizadas', 'Insignias de habilidades'],
    },
    step: 'formationHome',
  },
  {
    id: 'freelance',
    slug: 'freelance',
    icon: Laptop,
    names: {
      fr: 'Freelance Marketplace',
      en: 'Freelance Marketplace',
      ar: '\u0633\u0648\u0642 \u0627\u0644\u0639\u0645\u0627\u0644\u0629 \u0627\u0644\u062d\u0631\u0629',
      es: 'Marketplace Freelance',
    },
    shortDesc: {
      fr: 'Trouvez des missions freelance avec un matching IA intelligent.',
      en: 'Find freelance missions with smart AI matching.',
      ar: '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0645\u0647\u0627\u0645 \u062d\u0631\u0629 \u0628\u0645\u0637\u0627\u0628\u0642\u0629 IA \u0630\u0643\u064a\u0629.',
      es: 'Encuentra misiones freelance con matching IA inteligente.',
    },
    bundle: 'AI Power',
    price: '\u20ac12.90',
    color: 'orange',
    features: {
      fr: ['Missions matching IA', 'Propositions automatiques', 'Paiement s\u00e9curis\u00e9'],
      en: ['AI mission matching', 'Automatic proposals', 'Secure payment'],
      ar: ['\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0647\u0627\u0645 IA', '\u0639\u0631\u0648\u0636 \u062a\u0644\u0642\u0627\u0626\u064a\u0629', '\u062f\u0641\u0639 \u0622\u0645\u0646'],
      es: ['Matching IA de misiones', 'Propuestas autom\u00e1ticas', 'Pago seguro'],
    },
    step: 'freelanceHome',
  },
  {
    id: 'mobility',
    slug: 'mobility',
    icon: Plane,
    names: {
      fr: 'Mobilit\u00e9 Internationale',
      en: 'International Mobility',
      ar: '\u0627\u0644\u062a\u0646\u0642\u0644 \u0627\u0644\u062f\u0648\u0644\u064a',
      es: 'Movilidad Internacional',
    },
    shortDesc: {
      fr: 'Adaptez votre CV aux normes de chaque pays pour travailler \u00e0 l\'international.',
      en: 'Adapt your resume to country-specific norms for international work.',
      ar: '\u0643\u064a\u0651\u0641 \u0633\u064a\u0631\u062a\u0643 \u062d\u0633\u0628 \u0645\u0639\u0627\u064a\u064a\u0631 \u0643\u0644 \u062f\u0648\u0644\u0629 \u0644\u0644\u0639\u0645\u0644 \u062f\u0648\u0644\u064a\u0627\u064b.',
      es: 'Adapta tu curr\u00edculum a las normas de cada pa\u00eds para trabajar internacionalmente.',
    },
    bundle: 'AI Power',
    price: '\u20ac12.90',
    color: 'amber',
    features: {
      fr: ['Format CV par pays', 'Normes locales', 'Conseils visa'],
      en: ['Country-specific CV format', 'Local norms', 'Visa advice'],
      ar: ['\u062a\u0646\u0633\u064a\u0642 \u0633\u064a\u0631\u0629 \u0630\u0627\u062a\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u062f\u0648\u0644\u0629', '\u0645\u0639\u0627\u064a\u064a\u0631 \u0645\u062d\u0644\u064a\u0629', '\u0646\u0635\u0627\u0626\u062d \u062a\u0623\u0634\u064a\u0631\u0629'],
      es: ['Formato de CV por pa\u00eds', 'Normas locales', 'Consejos de visa'],
    },
    step: 'mobilityHome',
  },
  {
    id: 'jobs',
    slug: 'jobs',
    icon: Briefcase,
    names: {
      fr: 'Job Marketplace',
      en: 'Job Marketplace',
      ar: '\u0633\u0648\u0642 \u0627\u0644\u0648\u0638\u0627\u0626\u0641',
      es: 'Marketplace de Empleo',
    },
    shortDesc: {
      fr: 'Explorez des offres d\'emploi s\u00e9lectionn\u00e9es avec candidature IA.',
      en: 'Explore curated job listings with AI-powered applications.',
      ar: '\u0627\u0633\u062a\u0643\u0634\u0641 \u0639\u0631\u0648\u0636 \u0648\u0638\u0627\u0626\u0641 \u0645\u062e\u062a\u0627\u0631\u0629 \u0645\u0639 \u062a\u0642\u062f\u064a\u0645 IA.',
      es: 'Explora ofertas de empleo seleccionadas con aplicaciones IA.',
    },
    bundle: 'Gratuit',
    price: '',
    color: 'emerald',
    features: {
      fr: ['Offres curat\u00e9es', 'Candidature IA', 'Matching intelligent'],
      en: ['Curated listings', 'AI applications', 'Smart matching'],
      ar: ['\u0639\u0631\u0648\u0636 \u0645\u062e\u062a\u0627\u0631\u0629', '\u062a\u0642\u062f\u064a\u0645 IA', '\u0645\u0637\u0627\u0628\u0642\u0629 \u0630\u0643\u064a\u0629'],
      es: ['Ofertas seleccionadas', 'Aplicaciones IA', 'Matching inteligente'],
    },
    step: 'jobMarket',
  },
]

// ──────────────────────────────────────────────
// i18n translations
// ──────────────────────────────────────────────

const i18n: Record<CVLanguage, Record<string, string>> = {
  fr: {
    sectionBadge: 'Propuls\u00e9 par IA',
    sectionTitle: 'Vos outils de recrutement, aliment\u00e9s par l\'intelligence artificielle',
    sectionSubtitle:
      'Chaque module est con\u00e7u pour maximiser votre impact professionnel. D\u00e9couvrez comment l\'IA transforme votre parcours.',
    generateCopy: 'G\u00e9n\u00e9rer avec IA',
    generating: 'G\u00e9n\u00e9ration en cours...',
    aiGenerated: 'G\u00e9n\u00e9r\u00e9 par IA',
    viewAll: 'Voir tous les produits',
    startFree: 'D\u00e9marrer gratuitement',
    popularBadge: 'Populaire',
    newBadge: 'Nouveau',
    securityBadge: 'S\u00e9curis\u00e9 HNSA',
    includedIn: 'Inclus dans',
    tryNow: 'Essayer',
    trustedBy: 'Approuv\u00e9 par +10 000 utilisateurs',
    aiPowerTag: 'IA Avanc\u00e9e',
    noDescription: 'Cliquez sur un produit pour g\u00e9n\u00e9rer une description marketing IA',
    copyError: 'Erreur de g\u00e9n\u00e9ration. R\u00e9essayez.',
    featuresLabel: 'Fonctionnalit\u00e9s cl\u00e9s',
    orBrowse: 'ou parcourir nos',
    bundles: 'bundles',
    allProducts: 'Tous les produits',
    month: '/mois',
    free: 'Gratuit',
    regenerate: 'Reg\u00e9n\u00e9rer',
  },
  en: {
    sectionBadge: 'AI-Powered',
    sectionTitle: 'Your recruitment tools, powered by artificial intelligence',
    sectionSubtitle:
      'Each module is designed to maximize your professional impact. Discover how AI transforms your career journey.',
    generateCopy: 'Generate with AI',
    generating: 'Generating...',
    aiGenerated: 'AI Generated',
    viewAll: 'View all products',
    startFree: 'Start for free',
    popularBadge: 'Popular',
    newBadge: 'New',
    securityBadge: 'HNSA Secured',
    includedIn: 'Included in',
    tryNow: 'Try',
    trustedBy: 'Trusted by +10,000 users',
    aiPowerTag: 'Advanced AI',
    noDescription: 'Click on a product to generate an AI marketing description',
    copyError: 'Generation error. Please retry.',
    featuresLabel: 'Key features',
    orBrowse: 'or browse our',
    bundles: 'bundles',
    allProducts: 'All products',
    month: '/month',
    free: 'Free',
    regenerate: 'Regenerate',
  },
  ar: {
    sectionBadge: '\u0645\u062f\u0639\u0648\u0645 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    sectionTitle: '\u0623\u062f\u0648\u0627\u062a\u0643 \u0644\u0644\u062a\u0648\u0638\u064a\u0641\u060c \u0645\u062f\u0639\u0648\u0645\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    sectionSubtitle:
      '\u0643\u0644 \u0648\u062d\u062f\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u062a\u0639\u0638\u064a\u0645 \u062a\u0623\u062b\u064a\u0631\u0643 \u0627\u0644\u0645\u0647\u0646\u064a. \u0627\u0643\u062a\u0634\u0641 \u0643\u064a\u0641 \u064a\u062d\u0648\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u0633\u0627\u0631\u0643 \u0627\u0644\u0645\u0647\u0646\u064a.',
    generateCopy: '\u062a\u0648\u0644\u064a\u062f \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    generating: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0648\u0644\u064a\u062f...',
    aiGenerated: '\u0645\u0648\u0644\u0651\u062f \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    viewAll: '\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    startFree: '\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b',
    popularBadge: '\u0634\u0627\u0626\u0639',
    newBadge: '\u062c\u062f\u064a\u062f',
    securityBadge: '\u0645\u062d\u0645\u064a HNSA',
    includedIn: '\u0645\u0634\u0645\u0648\u0644 \u0641\u064a',
    tryNow: '\u062c\u0631\u0651\u0628',
    trustedBy: '\u0645\u0648\u062b\u0648\u0642 \u0628\u0648\u0627\u0633\u0637\u0629 +10 000 \u0645\u0633\u062a\u062e\u062f\u0645',
    aiPowerTag: '\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u062a\u0642\u062f\u0645',
    noDescription: '\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0645\u0646\u062a\u062c \u0644\u062a\u0648\u0644\u064a\u062f \u0648\u0635\u0641 \u062a\u0633\u0648\u064a\u0642\u064a IA',
    copyError: '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0648\u0644\u064a\u062f. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
    featuresLabel: '\u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    orBrowse: '\u0623\u0648 \u062a\u0635\u0641\u062d',
    bundles: '\u062d\u0632\u0645\u0646\u0627',
    allProducts: '\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    month: '/\u0634\u0647\u0631',
    free: '\u0645\u062c\u0627\u0646\u064a',
    regenerate: '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0648\u0644\u064a\u062f',
  },
  es: {
    sectionBadge: 'Impulsado por IA',
    sectionTitle: 'Tus herramientas de reclutamiento, impulsadas por inteligencia artificial',
    sectionSubtitle:
      'Cada m\u00f3dulo est\u00e1 dise\u00f1ado para maximizar tu impacto profesional. Descubre c\u00f3mo la IA transforma tu trayectoria.',
    generateCopy: 'Generar con IA',
    generating: 'Generando...',
    aiGenerated: 'Generado por IA',
    viewAll: 'Ver todos los productos',
    startFree: 'Empezar gratis',
    popularBadge: 'Popular',
    newBadge: 'Nuevo',
    securityBadge: 'Protegido HNSA',
    includedIn: 'Incluido en',
    tryNow: 'Probar',
    trustedBy: 'Aprobado por +10,000 usuarios',
    aiPowerTag: 'IA Avanzada',
    noDescription: 'Haz clic en un producto para generar una descripci\u00f3n marketing con IA',
    copyError: 'Error de generaci\u00f3n. Int\u00e9ntalo de nuevo.',
    featuresLabel: 'Caracter\u00edsticas clave',
    orBrowse: 'o explora nuestros',
    bundles: 'paquetes',
    allProducts: 'Todos los productos',
    month: '/mes',
    free: 'Gratis',
    regenerate: 'Regenerar',
  },
}

// ──────────────────────────────────────────────
// Color utility
// ──────────────────────────────────────────────

const colorMap: Record<string, { bg: string; text: string; border: string; bgLight: string }> = {
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bgLight: 'bg-emerald-50',
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-600',
    border: 'border-teal-200',
    bgLight: 'bg-teal-50',
  },
  violet: {
    bg: 'bg-violet-100',
    text: 'text-violet-600',
    border: 'border-violet-200',
    bgLight: 'bg-violet-50',
  },
  sky: {
    bg: 'bg-sky-100',
    text: 'text-sky-600',
    border: 'border-sky-200',
    bgLight: 'bg-sky-50',
  },
  rose: {
    bg: 'bg-rose-100',
    text: 'text-rose-600',
    border: 'border-rose-200',
    bgLight: 'bg-rose-50',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
    bgLight: 'bg-orange-50',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-200',
    bgLight: 'bg-amber-50',
  },
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface AIProductShowcaseProps {
  onTryProduct?: (step: AppStep) => void
}

export default function AIProductShowcase({ onTryProduct }: AIProductShowcaseProps) {
  const { language } = useCVStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [generatedCopy, setGeneratedCopy] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const gt = (key: string) => i18n[language]?.[key] ?? i18n.fr[key] ?? key
  const colors = (color: string) => colorMap[color] ?? colorMap.emerald

  const handleTryProduct = (step: AppStep | null) => {
    if (!step) return
    if (onTryProduct) {
      onTryProduct(step)
    } else {
      // Fallback: direct navigation (should not happen if parent provides onTryProduct)
      const { setStep } = useCVStore.getState()
      setStep(step)
    }
  }

  const handleGenerateCopy = async (product: Product) => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerationError(null)

    try {
      const res = await fetch('/api/ai/marketing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_description',
          product: product.slug,
          language,
        }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const data = await res.json()
      const text = data?.content ?? data?.text ?? data?.description ?? ''
      setGeneratedCopy((prev) => ({ ...prev, [product.slug]: text }))
    } catch {
      setGenerationError(gt('copyError'))
    } finally {
      setIsGenerating(false)
    }
  }

  const isRTL = language === 'ar'

  return (
    <section
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative py-16 sm:py-24 bg-gradient-to-b from-emerald-50/40 via-white to-teal-50/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-1.5 text-sm font-medium mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {gt('sectionBadge')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
            {gt('sectionTitle')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {gt('sectionSubtitle')}
          </p>
        </motion.div>

        {/* ── Product Grid / Carousel ── */}
        <div className="mb-12">
          {/* Desktop: grid */}
          <div className="hidden lg:grid grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                language={language}
                gt={gt}
                colors={colors}
                isSelected={selectedProduct?.id === product.id}
                onSelect={setSelectedProduct}
                onTry={handleTryProduct}
              />
            ))}
          </div>

          {/* Mobile/Tablet: horizontal scroll */}
          <div className="lg:hidden">
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4 px-1 snap-x snap-mandatory">
                {products.map((product, idx) => (
                  <div key={product.id} className="snap-start shrink-0 w-[280px] sm:w-[300px]">
                    <ProductCard
                      product={product}
                      index={idx}
                      language={language}
                      gt={gt}
                      colors={colors}
                      isSelected={selectedProduct?.id === product.id}
                      onSelect={setSelectedProduct}
                      onTry={handleTryProduct}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>

        {/* ── AI Marketing Copy Panel ── */}
        <AnimatePresence mode="wait">
          {selectedProduct && (
            <motion.div
              key={selectedProduct.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-12"
            >
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  {/* Panel header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          colors(selectedProduct.color).bg
                        } ${colors(selectedProduct.color).text}`}
                      >
                        <selectedProduct.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {selectedProduct.names[language]}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedProduct.shortDesc[language]}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {generatedCopy[selectedProduct.slug] && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleGenerateCopy(selectedProduct)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-100/60"
                          title={gt('regenerate')}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">{gt('regenerate')}</span>
                        </motion.button>
                      )}

                      <Button
                        onClick={() => handleGenerateCopy(selectedProduct)}
                        disabled={isGenerating}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {gt('generating')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {gt('generateCopy')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Features pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">
                      {gt('featuresLabel')}:
                    </span>
                    {selectedProduct.features[language].map((feat, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={`text-xs ${colors(selectedProduct.color).border} ${colors(selectedProduct.color).text} bg-white`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {feat}
                      </Badge>
                    ))}
                  </div>

                  {/* Generated content or placeholder */}
                  <div className="min-h-[100px]">
                    {generationError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                        <Zap className="w-4 h-4 shrink-0" />
                        {generationError}
                      </div>
                    )}

                    {generatedCopy[selectedProduct.slug] && !generationError ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {gt('aiGenerated')}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-gray-500">
                            {gt('aiPowerTag')}
                          </Badge>
                        </div>
                        <div className="bg-white rounded-xl border border-emerald-100 p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                          {generatedCopy[selectedProduct.slug]}
                        </div>
                      </motion.div>
                    ) : (
                      !generationError && (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                          <Lightbulb className="w-8 h-8 mb-3 text-emerald-300" />
                          <p className="text-sm max-w-md">{gt('noDescription')}</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-100"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-emerald-500" />
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{gt('trustedBy')}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {gt('orBrowse')}{' '}
              <span className="font-semibold text-emerald-600">{gt('bundles')}</span>
            </span>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                onClick={() => {
                  const pricingSection = document.getElementById('pricing')
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                {gt('viewAll')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────
// Product Card sub-component
// ──────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  index: number
  language: CVLanguage
  gt: (key: string) => string
  colors: (color: string) => { bg: string; text: string; border: string; bgLight: string }
  isSelected: boolean
  onSelect: (product: Product) => void
  onTry: (step: import('@/store/cv-store').AppStep | null) => void
}

function ProductCard({
  product,
  index,
  language,
  gt,
  colors,
  isSelected,
  onSelect,
  onTry,
}: ProductCardProps) {
  const c = colors(product.color)
  const isFree = !product.price
  const Icon = product.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card
        onClick={() => onSelect(product)}
        className={`relative bg-white border transition-all duration-300 cursor-pointer group overflow-hidden h-full
          ${
            isSelected
              ? 'ring-2 ring-emerald-500 border-emerald-300 shadow-lg'
              : 'border-gray-100 hover:border-emerald-200 hover:shadow-lg'
          }`}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
          {/* Top: icon + badges */}
          <div className="flex items-start justify-between">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text} group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex flex-col items-end gap-1">
              {isFree ? (
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0">
                  {gt('free')}
                </Badge>
              ) : (
                <Badge className="bg-white text-gray-700 border border-gray-200 text-[10px] px-2 py-0 font-semibold">
                  {product.price}{gt('month')}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-gray-400 border-gray-200"
              >
                {gt('includedIn')} {product.bundle}
              </Badge>
            </div>
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
              {product.names[language]}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {product.shortDesc[language]}
            </p>
          </div>

          {/* Security badge (paid only) */}
          {!isFree && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600">
              <Shield className="w-3 h-3" />
              <span>{gt('securityBadge')}</span>
            </div>
          )}

          {/* Try button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              className={`w-full mt-1 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300`}
              onClick={(e) => {
                e.stopPropagation()
                onTry(product.step)
              }}
            >
              {gt('tryNow')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
