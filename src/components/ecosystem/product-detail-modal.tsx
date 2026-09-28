'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Search, Briefcase, Globe, Plane, Code2, MessageCircle,
  Linkedin, UserCheck, Compass, Bot, BookOpen, Laptop, Brain,
  GraduationCap, Users, Building2, Scale, Check, X, ArrowRight,
  Sparkles, Zap, MessageSquarePlus, type LucideIcon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { CVLanguage, TranslationKey, AppStep } from '@/lib/i18n'

/* ──────────── Product Data Registry ──────────── */

export interface EcosystemProduct {
  id: string
  icon: LucideIcon
  nameKey: string
  descKey: string
  longDescKey: string
  featureKeys: TranslationKey[]
  active: boolean
  accent: string
  step: AppStep | null
  category: 'core' | 'ai' | 'business'
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  // ─── CORE (Active) ───
  {
    id: 'cv', icon: FileText,
    nameKey: 'ecosystemCvName', descKey: 'ecosystemCv',
    longDescKey: 'ecosystemCvLong',
    featureKeys: ['ecosystemCvF1', 'ecosystemCvF2', 'ecosystemCvF3', 'ecosystemCvF4'],
    active: true, accent: 'emerald', step: 'form', category: 'core'
  },
  {
    id: 'ats', icon: Search,
    nameKey: 'ecosystemAtsName', descKey: 'ecosystemAts',
    longDescKey: 'ecosystemAtsLong',
    featureKeys: ['ecosystemAtsF1', 'ecosystemAtsF2', 'ecosystemAtsF3', 'ecosystemAtsF4'],
    active: true, accent: 'emerald', step: 'form', category: 'core'
  },
  {
    id: 'jobs', icon: Briefcase,
    nameKey: 'ecosystemJobsName', descKey: 'ecosystemJobsDesc',
    longDescKey: 'ecosystemJobsLong',
    featureKeys: ['ecosystemJobsF1', 'ecosystemJobsF2', 'ecosystemJobsF3', 'ecosystemJobsF4'],
    active: true, accent: 'emerald', step: 'jobMarket', category: 'core'
  },
  {
    id: 'global', icon: Globe,
    nameKey: 'ecosystemGlobalName', descKey: 'ecosystemGlobalDesc',
    longDescKey: 'ecosystemGlobalLong',
    featureKeys: ['ecosystemGlobalF1', 'ecosystemGlobalF2', 'ecosystemGlobalF3', 'ecosystemGlobalF4'],
    active: true, accent: 'teal', step: 'globalMarket', category: 'core'
  },
  {
    id: 'mobility', icon: Plane,
    nameKey: 'ecosystemMobilityName', descKey: 'ecosystemMobilityDesc',
    longDescKey: 'ecosystemMobilityLong',
    featureKeys: ['ecosystemMobilityF1', 'ecosystemMobilityF2', 'ecosystemMobilityF3', 'ecosystemMobilityF4'],
    active: true, accent: 'purple', step: 'mobilityHome', category: 'core'
  },
  {
    id: 'api', icon: Code2,
    nameKey: 'ecosystemApiName', descKey: 'ecosystemApiDesc',
    longDescKey: 'ecosystemApiLong',
    featureKeys: ['ecosystemApiF1', 'ecosystemApiF2', 'ecosystemApiF3', 'ecosystemApiF4'],
    active: true, accent: 'sky', step: 'apiDocs', category: 'core'
  },

  // ─── AI SERVICES (Coming Soon) ───
  {
    id: 'intelligence', icon: Brain,
    nameKey: 'ecosystemIntelligenceName', descKey: 'ecosystemIntelligence',
    longDescKey: 'ecosystemIntelligenceLong',
    featureKeys: ['ecosystemIntelligenceF1', 'ecosystemIntelligenceF2', 'ecosystemIntelligenceF3', 'ecosystemIntelligenceF4'],
    active: false, accent: 'emerald', step: null, category: 'ai'
  },
  {
    id: 'interview', icon: MessageCircle,
    nameKey: 'ecosystemInterviewName', descKey: 'ecosystemInterview',
    longDescKey: 'ecosystemInterviewLong',
    featureKeys: ['ecosystemInterviewF1', 'ecosystemInterviewF2', 'ecosystemInterviewF3', 'ecosystemInterviewF4'],
    active: false, accent: 'violet', step: null, category: 'ai'
  },
  {
    id: 'chatbot', icon: MessageSquarePlus,
    nameKey: 'ecosystemChatbotName', descKey: 'ecosystemChatbotAdvanced',
    longDescKey: 'ecosystemChatbotLong',
    featureKeys: ['ecosystemChatbotF1', 'ecosystemChatbotF2', 'ecosystemChatbotF3', 'ecosystemChatbotF4'],
    active: true, accent: 'violet', step: null, category: 'ai'
  },
  {
    id: 'linkedin', icon: Linkedin,
    nameKey: 'ecosystemLinkedinName', descKey: 'ecosystemLinkedin',
    longDescKey: 'ecosystemLinkedinLong',
    featureKeys: ['ecosystemLinkedinF1', 'ecosystemLinkedinF2', 'ecosystemLinkedinF3', 'ecosystemLinkedinF4'],
    active: true, accent: 'sky', step: null, category: 'ai'
  },
  {
    id: 'recruiter', icon: UserCheck,
    nameKey: 'ecosystemRecruiterName', descKey: 'ecosystemRecruiter',
    longDescKey: 'ecosystemRecruiterLong',
    featureKeys: ['ecosystemRecruiterF1', 'ecosystemRecruiterF2', 'ecosystemRecruiterF3', 'ecosystemRecruiterF4'],
    active: false, accent: 'amber', step: null, category: 'ai'
  },
  {
    id: 'career', icon: Compass,
    nameKey: 'ecosystemCareerName', descKey: 'ecosystemCareer',
    longDescKey: 'ecosystemCareerLong',
    featureKeys: ['ecosystemCareerF1', 'ecosystemCareerF2', 'ecosystemCareerF3', 'ecosystemCareerF4'],
    active: false, accent: 'rose', step: null, category: 'ai'
  },
  {
    id: 'coach', icon: Bot,
    nameKey: 'ecosystemCoachName', descKey: 'ecosystemCoach',
    longDescKey: 'ecosystemCoachLong',
    featureKeys: ['ecosystemCoachF1', 'ecosystemCoachF2', 'ecosystemCoachF3', 'ecosystemCoachF4'],
    active: false, accent: 'indigo', step: null, category: 'ai'
  },
  {
    id: 'formation', icon: BookOpen,
    nameKey: 'ecosystemFormationName', descKey: 'ecosystemFormation',
    longDescKey: 'ecosystemFormationLong',
    featureKeys: ['ecosystemFormationF1', 'ecosystemFormationF2', 'ecosystemFormationF3', 'ecosystemFormationF4'],
    active: false, accent: 'teal', step: null, category: 'ai'
  },

  // ─── BUSINESS (Coming Soon) ───
  {
    id: 'freelance', icon: Laptop,
    nameKey: 'ecosystemFreelanceName', descKey: 'ecosystemFreelance',
    longDescKey: 'ecosystemFreelanceLong',
    featureKeys: ['ecosystemFreelanceF1', 'ecosystemFreelanceF2', 'ecosystemFreelanceF3', 'ecosystemFreelanceF4'],
    active: false, accent: 'orange', step: null, category: 'business'
  },
  {
    id: 'campus', icon: GraduationCap,
    nameKey: 'ecosystemCampusName', descKey: 'ecosystemCampus',
    longDescKey: 'ecosystemCampusLong',
    featureKeys: ['ecosystemCampusF1', 'ecosystemCampusF2', 'ecosystemCampusF3', 'ecosystemCampusF4'],
    active: true, accent: 'teal', step: null, category: 'business'
  },
  {
    id: 'community', icon: Users,
    nameKey: 'ecosystemCommunityName', descKey: 'ecosystemCommunity',
    longDescKey: 'ecosystemCommunityLong',
    featureKeys: ['ecosystemCommunityF1', 'ecosystemCommunityF2', 'ecosystemCommunityF3', 'ecosystemCommunityF4'],
    active: true, accent: 'rose', step: null, category: 'business'
  },
  {
    id: 'whitelabel', icon: Building2,
    nameKey: 'ecosystemWhiteLabelName', descKey: 'ecosystemWhiteLabel',
    longDescKey: 'ecosystemWhiteLabelLong',
    featureKeys: ['ecosystemWhiteLabelF1', 'ecosystemWhiteLabelF2', 'ecosystemWhiteLabelF3', 'ecosystemWhiteLabelF4'],
    active: false, accent: 'slate', step: null, category: 'business'
  },
  {
    id: 'legal', icon: Scale,
    nameKey: 'ecosystemLegalName', descKey: 'ecosystemLegal',
    longDescKey: 'ecosystemLegalLong',
    featureKeys: ['ecosystemLegalF1', 'ecosystemLegalF2', 'ecosystemLegalF3', 'ecosystemLegalF4'],
    active: false, accent: 'amber', step: null, category: 'business'
  },
]

/* ──────────── Accent Color Helpers ──────────── */

export function getAccentClasses(accent: string) {
  const map: Record<string, { border: string; bg: string; bgLight: string; text: string; badge: string; gradient: string }> = {
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-100', bgLight: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
    teal: { border: 'border-teal-500', bg: 'bg-teal-100', bgLight: 'bg-teal-50', text: 'text-teal-600', badge: 'bg-teal-600', gradient: 'from-teal-500 to-teal-600' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-100', bgLight: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-600', gradient: 'from-purple-500 to-purple-600' },
    sky: { border: 'border-sky-500', bg: 'bg-sky-100', bgLight: 'bg-sky-50', text: 'text-sky-600', badge: 'bg-sky-600', gradient: 'from-sky-500 to-sky-600' },
    violet: { border: 'border-violet-500', bg: 'bg-violet-100', bgLight: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-600', gradient: 'from-violet-500 to-violet-600' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-100', bgLight: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-600', gradient: 'from-amber-500 to-amber-600' },
    rose: { border: 'border-rose-500', bg: 'bg-rose-100', bgLight: 'bg-rose-50', text: 'text-rose-600', badge: 'bg-rose-600', gradient: 'from-rose-500 to-rose-600' },
    indigo: { border: 'border-indigo-500', bg: 'bg-indigo-100', bgLight: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-100', bgLight: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-600', gradient: 'from-orange-500 to-orange-600' },
    slate: { border: 'border-slate-400', bg: 'bg-slate-100', bgLight: 'bg-slate-50', text: 'text-slate-600', badge: 'bg-slate-600', gradient: 'from-slate-500 to-slate-600' },
  }
  return map[accent] || map.emerald
}

/* ──────────── Product Detail Modal Component ──────────── */

interface ProductDetailModalProps {
  product: EcosystemProduct | null
  open: boolean
  onClose: () => void
  onNavigate: (step: AppStep) => void
  onAuthRequired: () => void
  onScrollToPricing: () => void
  language: CVLanguage
}

export default function ProductDetailModal({
  product,
  open,
  onClose,
  onNavigate,
  onAuthRequired,
  onScrollToPricing,
  language,
}: ProductDetailModalProps) {
  if (!product) return null

  const colors = getAccentClasses(product.accent)
  const IconComponent = product.icon

  function handleAction() {
    onClose()
    if (!product.active || !product.step) {
      onScrollToPricing()
      return
    }
    if (product.step === 'form') {
      onAuthRequired()
    } else {
      onNavigate(product.step)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-br ${colors.gradient} px-6 pt-8 pb-6`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <IconComponent className="w-7 h-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {t(language, product.nameKey as TranslationKey)}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {product.active ? (
                    <Badge className="bg-white/25 text-white border-0 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      ACTIF
                    </Badge>
                  ) : (
                    <Badge className="bg-white/20 text-white/80 border-0 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      BIENTÔT
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(language, product.longDescKey as TranslationKey)}
          </p>

          {/* Features */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t(language, 'modalFeatures')}
            </h4>
            <div className="space-y-2">
              {product.featureKeys.map((key, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full ${colors.bgLight} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Check className={`w-3 h-3 ${colors.text}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{t(language, key)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t(language, 'modalCategory')}:</span>
            <Badge variant="outline" className={`text-[10px] font-medium ${colors.border} ${colors.text}`}>
              {product.category === 'core' ? t(language, 'modalCategoryCore')
                : product.category === 'ai' ? t(language, 'modalCategoryAi')
                : t(language, 'modalCategoryBusiness')}
            </Badge>
            {product.active && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-medium text-emerald-600">
                  {t(language, 'modalPlansIncluded')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-6">
          {product.active && product.step ? (
            <Button
              onClick={handleAction}
              className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all shadow-md`}
            >
              {t(language, 'modalStart')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleAction}
              variant="outline"
              className="w-full rounded-xl py-3 text-sm font-semibold cursor-pointer border-dashed border-muted-foreground/30 text-muted-foreground"
              disabled
            >
              <Zap className="mr-2 w-4 h-4" />
              {t(language, 'modalComingSoon')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
