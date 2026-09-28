'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  AlertTriangle,
  AlertOctagon,
  Info,
  RefreshCw,
  X,
  Globe,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'
import type { CVLanguage } from '@/lib/i18n'

interface SecurityAlertsProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
}

interface SecurityLog {
  id: string
  type: string
  severity: string
  ip: string
  path: string
  method: string
  userAgent: string | null
  email: string | null
  details: string | null
  createdAt: string
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return <AlertOctagon className="h-4 w-4 text-red-600" />
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'medium':
      return <Info className="h-4 w-4 text-yellow-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
  }
}

function typeLabelKey(type: string): string {
  const labels: Record<string, string> = {
    rate_limit: 'adminSec.rateLimit',
    brute_force: 'adminSec.bruteForce',
    suspicious_input: 'adminSec.suspiciousInput',
    sql_injection_attempt: 'adminSec.sqlInjection',
    xss_attempt: 'adminSec.xssAttempt',
    invalid_auth: 'adminSec.invalidAuth',
    forbidden_access: 'adminSec.forbiddenAccess',
  }
  return labels[type] || type
}

function formatTime(dateStr: string, language: CVLanguage): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return t(language, 'adminSec.justNow')
  if (diffMin < 60) return `${diffMin}${t(language, 'adminSec.minutesAgo')}`
  if (diffHour < 24) return `${diffHour}${t(language, 'adminSec.hoursAgo')}`
  return date.toLocaleDateString()
}

export default function SecurityAlerts({ isOpen, onClose, isAdmin }: SecurityAlertsProps) {
  const { language } = useCVStore()
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const fetchAlerts = useCallback(async () => {
    if (!isAdmin) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (severityFilter) params.set('severity', severityFilter)
      if (typeFilter) params.set('type', typeFilter)

      const res = await fetch(`/api/admin/security-alerts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setUnresolvedCount(data.unresolvedHighCritical || 0)
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
    }
  }, [isAdmin, page, severityFilter, typeFilter])

  // Initial fetch + auto-refresh every 30 seconds
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [severityFilter, typeFilter])

  if (!isAdmin) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t(language, 'adminSec.title')}
              </DialogTitle>
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  {unresolvedCount} {t(language, 'adminSec.unresolved')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAlerts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder={t(language, 'adminSec.severityPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(language, 'adminSec.all')}</SelectItem>
              <SelectItem value="critical">{t(language, 'adminSec.critical')}</SelectItem>
              <SelectItem value="high">{t(language, 'adminSec.high')}</SelectItem>
              <SelectItem value="medium">{t(language, 'adminSec.medium')}</SelectItem>
              <SelectItem value="low">{t(language, 'adminSec.low')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder={t(language, 'adminSec.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(language, 'adminSec.allTypes')}</SelectItem>
              <SelectItem value="rate_limit">{t(language, 'adminSec.rateLimit')}</SelectItem>
              <SelectItem value="brute_force">{t(language, 'adminSec.bruteForce')}</SelectItem>
              <SelectItem value="invalid_auth">{t(language, 'adminSec.invalidAuth')}</SelectItem>
              <SelectItem value="sql_injection_attempt">{t(language, 'adminSec.sqlInjection')}</SelectItem>
              <SelectItem value="xss_attempt">{t(language, 'adminSec.xssAttempt')}</SelectItem>
              <SelectItem value="forbidden_access">{t(language, 'adminSec.forbiddenAccess')}</SelectItem>
            </SelectContent>
          </Select>

          {(severityFilter || typeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setSeverityFilter('')
                setTypeFilter('')
              }}
            >
              <X className="h-3 w-3 mr-1" />
              {t(language, 'adminSec.clear')}
            </Button>
          )}
        </div>

        {/* Alert List */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-3 space-y-2">
            {loading && logs.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            ) : logs.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t(language, 'adminSec.emptyState')}</p>
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {severityIcon(log.severity)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${severityColor(log.severity)}`}
                          >
                            {log.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {t(language, typeLabelKey(log.type))}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            {log.method}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 truncate max-w-[200px]" title={log.ip}>
                            <Globe className="h-3 w-3 shrink-0" />
                            {log.ip}
                          </span>
                          <span className="truncate max-w-[180px]" title={log.path}>
                            {log.path}
                          </span>
                          {log.email && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]" title={log.email}>
                              <Mail className="h-3 w-3 shrink-0" />
                              {log.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatTime(log.createdAt, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-6 py-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {t(language, 'adminSec.page')} {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Badge component to show unresolved alert count.
 * Use this in your admin toolbar to trigger the SecurityAlerts dialog.
 */
export function SecurityAlertBadge({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Shield className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  )
}
