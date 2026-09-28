'use client'

import { useState } from 'react'
import { ArrowLeft, GraduationCap, Building2, Calendar, Users, Download, Mail, Phone, Globe, Sparkles, ArrowRight, } from 'lucide-react'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { events } from '@/lib/analytics'
import dynamic from 'next/dynamic'

const CampusOverview = dynamic(() => import('./campus-overview'), { ssr: false })
const CampusUniversities = dynamic(() => import('./campus-universities'), { ssr: false })
const CampusWorkshops = dynamic(() => import('./campus-workshops'), { ssr: false })
const CampusStudents = dynamic(() => import('./campus-students'), { ssr: false })

type CampusTab = 'overview' | 'universities' | 'workshops' | 'students'

export default function CampusKit() {
  const { setStep, language } = useCVStore()
  const isRtl = language === 'ar'
  const [tab, setTab] = useState<CampusTab>('overview')

  function handleSetTab(t: string) {
    setTab(t as CampusTab)
  }

  function downloadBrochure() {
    events.track('campus_brochure_downloaded')
    const brochure = `HireNova IA CAMPUS SaaS — ${t(language, 'campusSubtitle')}\n\nE-Society 2050 — HireNova\n© 2026\n`
    const blob = new Blob([brochure], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'HireNova-Campus-Brochure.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(language, 'campusBrochureDownloaded'))
  }

  const tabConfig: { value: CampusTab; icon: typeof GraduationCap; labelKey: 'campusOverview' | 'campusUniversities' | 'campusWorkshops' | 'campusStudents' }[] = [
    { value: 'overview', icon: GraduationCap, labelKey: 'campusOverview' },
    { value: 'universities', icon: Building2, labelKey: 'campusUniversities' },
    { value: 'workshops', icon: Calendar, labelKey: 'campusWorkshops' },
    { value: 'students', icon: Users, labelKey: 'campusStudents' },
  ]

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white flex flex-col ${isRtl ? 'rtl' : ''}`}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className={`flex items-center gap-2 min-w-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('landing')}
              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 -ml-2"
              aria-label={t(language, 'campusBack')}
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''} ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
              <span className="hidden sm:inline">{t(language, 'campusBack')}</span>
            </Button>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight truncate">{t(language, 'campusBadgeTitle')}</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">{t(language, 'campusSubtitle')}</p>
            </div>
          </div>
          <Button
            variant="ghost" size="sm" onClick={downloadBrochure}
            className="gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" /><span className="hidden sm:inline">{t(language, 'campusBrochure')}</span>
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as CampusTab)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6 h-auto">
            {tabConfig.map((tc) => (
              <TabsTrigger key={tc.value} value={tc.value} className="gap-1.5 text-xs sm:text-sm py-2.5 cursor-pointer">
                <tc.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(language, tc.labelKey)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <CampusOverview onSetTab={handleSetTab} />
          </TabsContent>
          <TabsContent value="universities">
            <CampusUniversities />
          </TabsContent>
          <TabsContent value="workshops">
            <CampusWorkshops />
          </TabsContent>
          <TabsContent value="students">
            <CampusStudents />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className={`flex flex-wrap justify-center gap-4 text-xs text-muted-foreground ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Mail className="w-3.5 h-3.5 text-emerald-600" />campus@hirenova.com
            </span>
            <span className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Phone className="w-3.5 h-3.5 text-emerald-600" />+212 (0) 5 22 00 00 00
            </span>
            <span className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Globe className="w-3.5 h-3.5 text-emerald-600" />hirenova.com
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">© 2026 E-Society 2050 — HireNova IA CAMPUS SaaS</p>
        </div>
      </footer>
    </div>
  )
}
