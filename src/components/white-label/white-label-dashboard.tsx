'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, Globe, ArrowRight, Building2, Settings, Zap, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Tenant {
  id: string
  companyName: string
  domain: string
  primaryColor: string
  plan: string
  apiCalls: number
  usersCount: number
  status: string
  enabledModules: string
  createdAt: string
}

export default function WhiteLabelDashboard() {
  const { language, setStep } = useCVStore()
  const isRTL = language === 'ar'
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch('/api/white-label/tenants')
        const data = await res.json()
        setTenants(Array.isArray(data) ? data : [])
      } catch {
        setTenants([])
      } finally {
        setLoading(false)
      }
    }
    loadTenants()
  }, [])

  const totalApiCalls = tenants.reduce((s, t) => s + t.apiCalls, 0)
  const totalUsers = tenants.reduce((s, t) => s + t.usersCount, 0)
  const activeTenants = tenants.filter(t => t.status === 'active').length
  const revenueShare = Math.round(totalApiCalls * 0.03)

  const stats = [
    { label: t(language, 'whiteLabelApiCalls'), value: totalApiCalls.toLocaleString(), icon: Zap, color: 'bg-slate-100 text-slate-700', change: '+12%' },
    { label: t(language, 'whiteLabelUsersCount'), value: totalUsers.toLocaleString(), icon: Users, color: 'bg-emerald-100 text-emerald-700', change: '+8%' },
    { label: t(language, 'whiteLabelActiveTenants'), value: activeTenants, icon: Globe, color: 'bg-sky-100 text-sky-700', change: '+2' },
    { label: t(language, 'whiteLabelRevenueShare'), value: `${revenueShare.toLocaleString()}€`, icon: TrendingUp, color: 'bg-amber-100 text-amber-700', change: '+15%' },
  ]

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-emerald-100 text-emerald-700'
    if (status === 'paused') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 text-muted-foreground" onClick={() => setStep('whiteLabelHome')}>
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
              {t(language, 'whiteLabelGoBack')}
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t(language, 'whiteLabelDashboardTitle')}</h1>
            <p className="text-muted-foreground mt-1">{t(language, 'whiteLabelDashboardSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('whiteLabelPricing')}>
              <BarChart3 className="w-4 h-4 mr-1.5" />
              {t(language, 'whiteLabelViewPricing')}
            </Button>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => setStep('whiteLabelSetup')}>
              <Settings className="w-4 h-4 mr-1.5" />
              {t(language, 'whiteLabelGoSetup')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">{stat.change}</Badge>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Tenants List */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-600" />
                {t(language, 'whiteLabelActiveTenants')} ({tenants.length})
              </h2>
              <Button size="sm" variant="outline" onClick={() => setStep('whiteLabelSetup')}>
                {t(language, 'whiteLabelCreateFirst')}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{t(language, 'whiteLabelNoTenants')}</p>
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setStep('whiteLabelSetup')}>
                  {t(language, 'whiteLabelCreateFirst')}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 ml-0 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 pr-4">{t(language, 'whiteLabelTenantName')}</th>
                      <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 pr-4 hidden sm:table-cell">{t(language, 'whiteLabelTenantDomain')}</th>
                      <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 pr-4">{t(language, 'whiteLabelTenantPlan')}</th>
                      <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 pr-4">{t(language, 'whiteLabelTenantStatus')}</th>
                      <th className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3">{t(language, 'whiteLabelApiCalls')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: tenant.primaryColor || '#059669' }}>
                              {tenant.companyName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{tenant.companyName}</p>
                              <p className="text-xs text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">{tenant.domain || '—'}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant="secondary" className="capitalize text-xs">{tenant.plan}</Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge className={`text-xs ${statusColor(tenant.status)}`}>{tenant.status}</Badge>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-medium text-foreground">{tenant.apiCalls.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
