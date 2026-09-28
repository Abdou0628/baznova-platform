'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, ShieldCheck, BarChart3, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'
import { t } from '@/lib/i18n'

const STORAGE_KEY = 'hirenova_cookie_consent'

// Inline i18n map for cookie consent (FR default, EN/AR/ES)
const labels: Record<CVLanguage, {
  title: string
  description: string
  necessary: string
  necessaryDesc: string
  analytics: string
  analyticsDesc: string
  marketing: string
  marketingDesc: string
  acceptAll: string
  customize: string
  savePrefs: string
  sheetTitle: string
  sheetDesc: string
  newsletterJobs: string
  newsletterProducts: string
}> = {
  fr: {
    title: 'Nous respectons votre vie privée',
    description: 'HireNova utilise des cookies nécessaires au fonctionnement du service ainsi que, selon votre consentement, des cookies de mesure d\'audience et d\'amélioration de l\'expérience. Le détail figure dans la Politique Cookies.',
    necessary: 'Nécessaires',
    necessaryDesc: 'Essentiels au bon fonctionnement du service',
    analytics: 'Analytique',
    analyticsDesc: 'Mesure d\'audience et statistiques',
    marketing: 'Marketing',
    marketingDesc: 'Amélioration de votre expérience',
    acceptAll: 'Tout accepter',
    customize: 'Personnaliser',
    savePrefs: 'Enregistrer les préférences',
    sheetTitle: 'Préférences de cookies',
    sheetDesc: 'Gérez vos préférences de cookies et de newsletter.',
    newsletterJobs: 'Recevoir nos offres d\'emploi correspondantes',
    newsletterProducts: 'Être informé des nouveautés et services',
  },
  en: {
    title: 'We respect your privacy',
    description: 'HireNova uses cookies necessary for the service to function, and, depending on your consent, analytics and experience improvement cookies. Details are available in the Cookie Policy.',
    necessary: 'Necessary',
    necessaryDesc: 'Essential for the service to function',
    analytics: 'Analytics',
    analyticsDesc: 'Audience measurement and statistics',
    marketing: 'Marketing',
    marketingDesc: 'Experience improvement',
    acceptAll: 'Accept All',
    customize: 'Customize',
    savePrefs: 'Save preferences',
    sheetTitle: 'Cookie preferences',
    sheetDesc: 'Manage your cookie and newsletter preferences.',
    newsletterJobs: 'Receive matching job offers',
    newsletterProducts: 'Stay informed about new features and services',
  },
  ar: {
    title: 'نحترم خصوصيتك',
    description: 'يستخدم HireNova ملفات تعريف الارتباط الضرورية لعمل الخدمة، ووفقاً لموافقتك، ملفات تعريف الارتباط لقياس الجمهور وتحسين التجربة. التفاصيل في سياسة ملفات تعريف الارتباط.',
    necessary: 'ضروري',
    necessaryDesc: 'أساسي لعمل الخدمة',
    analytics: 'تحليلات',
    analyticsDesc: 'قياس الجمهور والإحصائيات',
    marketing: 'تسويق',
    marketingDesc: 'تحسين تجربتك',
    acceptAll: 'قبول الكل',
    customize: 'تخصيص',
    savePrefs: 'حفظ التفضيلات',
    sheetTitle: 'تفضيلات ملفات تعريف الارتباط',
    sheetDesc: 'إدارة تفضيلات ملفات تعريف الارتباط والنشرة الإخبارية.',
    newsletterJobs: 'تلقي عروض الوظائف المناسبة',
    newsletterProducts: 'الاطلاع على الميزات والخدمات الجديدة',
  },
  es: {
    title: 'Respetamos tu privacidad',
    description: 'HireNova utiliza cookies necesarias para el funcionamiento del servicio así como, según tu consentimiento, cookies de medición de audiencia y mejora de la experiencia. El detalle figura en la Política de Cookies.',
    necessary: 'Necesarios',
    necessaryDesc: 'Esenciales para el funcionamiento del servicio',
    analytics: 'Analítica',
    analyticsDesc: 'Medición de audiencia y estadísticas',
    marketing: 'Marketing',
    marketingDesc: 'Mejora de tu experiencia',
    acceptAll: 'Aceptar todo',
    customize: 'Personalizar',
    savePrefs: 'Guardar preferencias',
    sheetTitle: 'Preferencias de cookies',
    sheetDesc: 'Gestiona tus preferencias de cookies y boletín.',
    newsletterJobs: 'Recibir ofertas de empleo coincidentes',
    newsletterProducts: 'Estar informado de novedades y servicios',
  },
}

export function CookieConsent() {
  const language = useCVStore((s) => s.language)
  const l = labels[language] || labels.fr

  // On mount, check localStorage via lazy initializer (SSR-safe: defaults to hidden)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(STORAGE_KEY)
  })
  const [dismissed, setDismissed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Consent state
  const [analyticsCookies, setAnalyticsCookies] = useState(false)
  const [marketingCookies, setMarketingCookies] = useState(false)
  const [newsletterJobs, setNewsletterJobs] = useState(false)
  const [newsletterProducts, setNewsletterProducts] = useState(false)

  const saveConsent = useCallback(async (
    analytics: boolean,
    marketing: boolean,
    jobs: boolean,
    products: boolean,
  ) => {
    const payload = {
      analyticsCookies: analytics,
      marketingCookies: marketing,
      newsletterConsent: jobs || products,
      newsletterJobs: jobs,
      newsletterProducts: products,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))

    // Try to persist to server (works if logged in, silently fails if not)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // silent — localStorage is the source of truth for non-logged-in
    }
  }, [])

  const handleAcceptAll = async () => {
    setDismissed(true)
    await saveConsent(true, true, true, true)
    setTimeout(() => setVisible(false), 400)
  }

  const handleSavePrefs = async () => {
    setDismissed(true)
    setSheetOpen(false)
    await saveConsent(analyticsCookies, marketingCookies, newsletterJobs, newsletterProducts)
    setTimeout(() => setVisible(false), 400)
  }

  if (!visible && !dismissed) return null

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{l.sheetTitle}</SheetTitle>
            <SheetDescription>{l.sheetDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4">
            {/* Necessary — always on */}
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">{l.necessary}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{l.necessaryDesc}</p>
              </div>
              <Switch checked disabled aria-label={l.necessary} />
            </div>

            {/* Analytics toggle */}
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">{l.analytics}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{l.analyticsDesc}</p>
              </div>
              <Switch
                checked={analyticsCookies}
                onCheckedChange={setAnalyticsCookies}
                aria-label={l.analytics}
              />
            </div>

            {/* Marketing toggle */}
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">{l.marketing}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{l.marketingDesc}</p>
              </div>
              <Switch
                checked={marketingCookies}
                onCheckedChange={setMarketingCookies}
                aria-label={l.marketing}
              />
            </div>

            {/* Separator */}
            <div className="border-t pt-4">
              <p className="mb-4 text-sm font-semibold text-foreground">{t(language, 'lot3_cookieConsent_newsletter')}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="newsletter-jobs"
                    checked={newsletterJobs}
                    onCheckedChange={(v) => setNewsletterJobs(v === true)}
                  />
                  <Label htmlFor="newsletter-jobs" className="text-sm leading-snug">
                    {l.newsletterJobs}
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="newsletter-products"
                    checked={newsletterProducts}
                    onCheckedChange={(v) => setNewsletterProducts(v === true)}
                  />
                  <Label htmlFor="newsletter-products" className="text-sm leading-snug">
                    {l.newsletterProducts}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6 px-4">
            <Button
              onClick={handleSavePrefs}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {l.savePrefs}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Banner ---- */}
      <AnimatePresence>
        {visible && !dismissed && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="mx-auto max-w-5xl px-4 pb-4">
              <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                {/* Left: icon + text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Cookie className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{l.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{l.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> {l.necessary}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" /> {l.analytics}
                      </span>
                      <span className="flex items-center gap-1">
                        <Megaphone className="h-3 w-3" /> {l.marketing}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: buttons */}
                <div className="flex shrink-0 gap-2 sm:flex-col sm:gap-2">
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-4"
                  >
                    {l.acceptAll}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSheetOpen(true)}
                    className="text-xs px-4"
                  >
                    {l.customize}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
