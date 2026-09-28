'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Building2, Plus, Trash2, Edit3, Save, X, Loader2, Shield,
  Globe, Key, CheckCircle2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { t } from '@/lib/i18n'
import type { CVLanguage } from '@/lib/i18n'

interface SSOConfig {
  id: string
  companyName: string
  domains: string[]
  providerType: string
  clientId: string | null
  issuerUrl: string | null
  authorizationUrl: string | null
  scopes: string
  status: string
  maxUsers: number
  planOverride: string | null
  fieldMapping: Record<string, string>
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

interface SSOAdminPanelProps {
  language?: CVLanguage
}

const PROVIDER_TYPES = [
  { value: 'azure_ad', label: 'Microsoft Azure AD', icon: '🔵' },
  { value: 'google_workspace', label: 'Google Workspace', icon: '🟡' },
  { value: 'okta', label: 'Okta', icon: '🟢' },
  { value: 'generic_oidc', label: 'OIDC Generic', icon: '⚪' },
]

const DEFAULT_AUTH_URLS: Record<string, string> = {
  azure_ad: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
  google_workspace: 'https://accounts.google.com/o/oauth2/v2/auth',
  okta: 'https://{org}.okta.com/oauth2/v1/authorize',
  generic_oidc: '',
}

export default function SSOAdminPanel({ language = 'fr' }: SSOAdminPanelProps) {
  const lang = language
  const { data: session } = useSession()
  const [configs, setConfigs] = useState<SSOConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    companyName: '',
    domains: '',
    providerType: 'azure_ad',
    clientId: '',
    clientSecret: '',
    issuerUrl: '',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    scopes: 'openid profile email',
    maxUsers: '0',
    planOverride: '',
    status: 'active',
  })

  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    session?.user?.email === 'admin@baznova.com'

  // Fetch configs
  const fetchConfigs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/sso/config')
      const data = await res.json()
      if (data.success) setConfigs(data.configs)
    } catch {
      toast.error('Failed to load SSO configurations')
    }
    setIsLoading(false)
  }, [])

  // Fetch configs on mount
  const [mounted, setMounted] = useState(false)
  if (!mounted) {
    setMounted(true)
    void fetchConfigs()
  }

  // Handle provider type change — auto-fill auth URL
  const handleProviderChange = (type: string) => {
    setForm((prev) => ({
      ...prev,
      providerType: type,
      authorizationUrl: DEFAULT_AUTH_URLS[type] || '',
    }))
  }

  // Create new config
  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.domains.trim()) {
      toast.error('Company name and domains are required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/sso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          domains: form.domains.split(',').map((d) => d.trim()).filter(Boolean),
          providerType: form.providerType,
          clientId: form.clientId || undefined,
          clientSecret: form.clientSecret || undefined,
          issuerUrl: form.issuerUrl || undefined,
          authorizationUrl: form.authorizationUrl || undefined,
          tokenUrl: form.tokenUrl || undefined,
          userInfoUrl: form.userInfoUrl || undefined,
          scopes: form.scopes,
          maxUsers: parseInt(form.maxUsers) || 0,
          planOverride: form.planOverride || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('SSO configuration created')
        resetForm()
        setIsCreating(false)
        fetchConfigs()
      } else {
        toast.error(data.message || 'Failed to create configuration')
      }
    } catch {
      toast.error('Failed to create configuration')
    }
    setIsSaving(false)
  }

  // Update config
  const handleUpdate = async (id: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/sso/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          companyName: form.companyName,
          domains: form.domains.split(',').map((d) => d.trim()).filter(Boolean),
          providerType: form.providerType,
          clientId: form.clientId || undefined,
          clientSecret: form.clientSecret || undefined,
          issuerUrl: form.issuerUrl || undefined,
          authorizationUrl: form.authorizationUrl || undefined,
          tokenUrl: form.tokenUrl || undefined,
          userInfoUrl: form.userInfoUrl || undefined,
          scopes: form.scopes,
          maxUsers: parseInt(form.maxUsers) || 0,
          planOverride: form.planOverride || undefined,
          status: form.status,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Configuration updated')
        setEditingId(null)
        fetchConfigs()
      } else {
        toast.error(data.message || 'Failed to update configuration')
      }
    } catch {
      toast.error('Failed to update configuration')
    }
    setIsSaving(false)
  }

  // Delete config
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SSO configuration?')) return
    try {
      const res = await fetch(`/api/sso/config?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Configuration deleted')
        fetchConfigs()
      }
    } catch {
      toast.error('Failed to delete configuration')
    }
  }

  // Edit config
  const handleEdit = (config: SSOConfig) => {
    setEditingId(config.id)
    setForm({
      companyName: config.companyName,
      domains: config.domains.join(', '),
      providerType: config.providerType,
      clientId: config.clientId || '',
      clientSecret: '',
      issuerUrl: config.issuerUrl || '',
      authorizationUrl: config.authorizationUrl || '',
      tokenUrl: '',
      userInfoUrl: '',
      scopes: config.scopes,
      maxUsers: config.maxUsers.toString(),
      planOverride: config.planOverride || '',
      status: config.status,
    })
  }

  const resetForm = () => {
    setForm({
      companyName: '',
      domains: '',
      providerType: 'azure_ad',
      clientId: '',
      clientSecret: '',
      issuerUrl: '',
      authorizationUrl: '',
      tokenUrl: '',
      userInfoUrl: '',
      scopes: 'openid profile email',
      maxUsers: '0',
      planOverride: '',
      status: 'active',
    })
  }

  const getProviderLabel = (type: string) => {
    return PROVIDER_TYPES.find((p) => p.value === type)?.label || type
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{t(lang, 'ssoAdminTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t(lang, 'ssoAdminDesc')}</p>
          </div>
        </div>
        {!isCreating && (
          <Button onClick={() => { resetForm(); setIsCreating(true); setEditingId(null) }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t(lang, 'ssoAddConfig')}
          </Button>
        )}
      </div>

      {/* Create/Edit form */}
      <AnimatePresence>
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  {editingId ? t(lang, 'ssoEditConfig') : t(lang, 'ssoNewConfig')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t(lang, 'ssoCompanyName')}</Label>
                    <Input
                      placeholder="Acme Corp"
                      value={form.companyName}
                      onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t(lang, 'ssoDomains')}</Label>
                    <Input
                      placeholder="acme.com, corp.acme.com"
                      value={form.domains}
                      onChange={(e) => setForm((p) => ({ ...p, domains: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t(lang, 'ssoProvider')}</Label>
                    <Select value={form.providerType} onValueChange={handleProviderChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_TYPES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.icon} {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="pending_setup">Pending Setup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Key className="w-3 h-3" /> Client ID</Label>
                    <Input
                      placeholder="your-client-id"
                      value={form.clientId}
                      onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Key className="w-3 h-3" /> Client Secret</Label>
                    <Input
                      type="password"
                      placeholder={editingId ? 'Leave empty to keep current' : 'your-client-secret'}
                      value={form.clientSecret}
                      onChange={(e) => setForm((p) => ({ ...p, clientSecret: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> Authorization URL</Label>
                  <Input
                    placeholder="https://..."
                    value={form.authorizationUrl}
                    onChange={(e) => setForm((p) => ({ ...p, authorizationUrl: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Issuer URL</Label>
                    <Input
                      placeholder="https://..."
                      value={form.issuerUrl}
                      onChange={(e) => setForm((p) => ({ ...p, issuerUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Users (0 = unlimited)</Label>
                    <Input
                      type="number"
                      value={form.maxUsers}
                      onChange={(e) => setForm((p) => ({ ...p, maxUsers: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                    disabled={isSaving || !form.companyName.trim() || !form.domains.trim()}
                    className="gap-1.5"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingId ? t(lang, 'save') : t(lang, 'ssoCreateConfig')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setIsCreating(false); setEditingId(null); resetForm() }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configs list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t(lang, 'ssoNoConfigs')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <Card key={config.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{config.companyName}</span>
                        <Badge variant={config.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {config.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{config.domains.join(', ')}</span>
                        <span>·</span>
                        <span>{getProviderLabel(config.providerType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === config.id ? null : config.id)}
                    >
                      {expandedId === config.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(config)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(config.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === config.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Client ID:</span>{' '}
                          <span className="font-mono">{config.clientId || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Provider:</span>{' '}
                          <span>{getProviderLabel(config.providerType)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Users:</span>{' '}
                          <span>{config.maxUsers === 0 ? '∞' : config.maxUsers}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plan:</span>{' '}
                          <span>{config.planOverride || 'Default'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Scopes:</span>{' '}
                          <span className="font-mono">{config.scopes}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>{' '}
                          <span>{new Date(config.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
