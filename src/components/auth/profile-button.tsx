'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, User, ChevronDown, Crown, Shield, Code2, Briefcase, FileText, Gift, GraduationCap, Loader2, LayoutDashboard, Brain } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'
import AuthModal from './auth-modal'
import AdminDashboard from '@/components/admin/admin-dashboard'

export default function ProfileButton() {
  const { data: session, status } = useSession()
  const { language, setStep } = useCVStore()
  const lang = language
  const [authOpen, setAuthOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  const user = session?.user
  const isLoading = status === 'loading'
  const isLoggedIn = status === 'authenticated' && user
  const isAdmin = !!adminEmail && user?.email === adminEmail

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.adminEmail) setAdminEmail(data.adminEmail)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    toast.success(t(lang, 'logout'))
  }

  // Loading skeleton — prevents the "Connexion" flash when session is loading
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <Button
          variant="outline"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-sm font-medium cursor-pointer transition-all"
          onClick={() => setAuthOpen(true)}
        >
          <User className="w-4 h-4 mr-2" />
          {t(lang, 'loginTitle')}
        </Button>
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode="login"
        />
      </>
    )
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? 'U'

  const plan = (user as { plan?: string }).plan ?? 'free'
  const userImage = (user as { image?: string | null }).image

  // Plan display config: label + badge color
  const planConfig: Record<string, { label: string; badgeClass: string }> = {
    free: { labelKey: 'dashPlanFree', badgeClass: '' },
    starter: { labelKey: 'dashPlanStarter', badgeClass: 'bg-emerald-500 text-white' },
    pro: { labelKey: 'dashPlanPro', badgeClass: 'bg-emerald-600 text-white' },
    career_plus: { labelKey: 'dashPlanCareerPlus', badgeClass: 'bg-purple-600 text-white' },
    employer: { labelKey: 'dashPlanEmployer', badgeClass: 'bg-amber-500 text-white' },
    enterprise: { labelKey: 'dashPlanEnterprise', badgeClass: 'bg-slate-700 text-white' },
    annual: { labelKey: 'dashPlanAnnual', badgeClass: 'bg-teal-600 text-white' },
    api: { labelKey: 'dashPlanApi', badgeClass: 'bg-sky-600 text-white' },
  }
  const planInfo = planConfig[plan] ?? planConfig.free

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted transition-colors cursor-pointer group"
            aria-label={t(lang, 'profileMenuAria')}
          >
            <div className="relative">
              {/* Gradient ring for visibility */}
              <div className={`absolute -inset-0.5 rounded-full ${isAdmin ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'} opacity-80 group-hover:opacity-100 transition-opacity`} />
              {/* Avatar circle */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold bg-emerald-600 ring-2 ring-white">
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={user.name || user.email || 'Avatar'}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {/* Admin shield badge */}
              {isAdmin && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-white flex items-center justify-center" title={t(lang, 'profileAdminAria')}>
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <div className={`absolute -inset-0.5 rounded-full ${isAdmin ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'} opacity-80`} />
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold bg-emerald-600 ring-2 ring-white">
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={user.name || user.email || 'Avatar'}
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-white flex items-center justify-center">
                    <Shield className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.name || user.email}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge
                    variant={plan === 'free' ? 'secondary' : 'default'}
                    className={`text-xs ${planInfo.badgeClass}`}
                  >
                    {(plan === 'pro' || plan === 'career_plus') && <Crown className="w-3 h-3 mr-1" />}
                    {t(lang, planInfo.labelKey)}
                  </Badge>
                  {isAdmin && (
                    <Badge className="text-xs bg-amber-500 text-white">
                      <Shield className="w-3 h-3 mr-1" />
                      {t(lang, 'profileAdmin"')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="px-3 py-2.5 text-sm font-semibold text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('dashboard') }}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            {t(lang, 'mySpace')}
          </DropdownMenuItem>

          <DropdownMenuItem className="px-3 py-2 text-sm text-muted-foreground">
            <span>{t(lang, 'remainingCvs')}</span>
            <span className="ml-auto font-medium text-foreground">
              {plan === 'free' ? '2/2' : '∞'}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem className="px-3 py-2 text-sm text-muted-foreground">
            <span>{t(lang, 'remainingCls')}</span>
            <span className="ml-auto font-medium text-foreground">
              {plan === 'free' ? '1/1' : '∞'}
            </span>
          </DropdownMenuItem>

          {plan === 'free' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="px-3 py-2.5 text-sm font-semibold text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault()
                  document.dispatchEvent(new CustomEvent('scroll-to-pricing'))
                }}
              >
                <Crown className="w-4 h-4 mr-2 text-emerald-600" />
                {t(lang, 'upgradeToPro')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('apiDocs') }}
          >
            <Code2 className="w-4 h-4 mr-2 text-emerald-600" />
            {t(lang, 'profileApiDocs"')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('jobMarket') }}
          >
            <Briefcase className="w-4 h-4 mr-2 text-teal-600" />
            {t(lang, 'profileJobOffers')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('candidateApplications') }}
          >
            <FileText className="w-4 h-4 mr-2 text-amber-600" />
            {t(lang, 'profileMyApplications')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('referral') }}
          >
            <Gift className="w-4 h-4 mr-2 text-emerald-600" />
            {t(lang, 'profileReferralProgram')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('interview') }}
          >
            <Brain className="w-4 h-4 mr-2 text-purple-600" />
            {t(lang, 'profileInterviewSim')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2.5 text-sm focus:bg-emerald-50 cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setStep('campus') }}
          >
            <GraduationCap className="w-4 h-4 mr-2 text-emerald-600" />
            {t(lang, 'profileCampus')}
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="px-3 py-2.5 text-sm font-semibold text-amber-700 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault()
                  setStep('admin')
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                {t(lang, 'profileDashboardAdmin"')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="px-3 py-2.5 text-sm text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onSelect={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t(lang, 'logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
      />

      <AdminDashboard isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  )
}
