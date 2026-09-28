'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, ShieldAlert, Fingerprint, Search, RefreshCw, Users, Eye, Clock, BarChart3 } from 'lucide-react'

interface TrackingEvent {
  id: string; userId: string; trackingId: string; eventType: string
  eventData: string | null; pagePath: string | null; ip: string | null
  userAgent: string | null; sessionDuration: number | null; createdAt: string
  user: { name: string | null; email: string | null; trackingId: string | null }
}

interface RegistrationAttempt {
  id: string; email: string | null; ip: string; fingerprintHash: string | null
  behavioralScore: number; totalTimeMs: number | null; mouseMovements: number | null
  keystrokes: number | null; blocked: boolean; blockReason: string | null
  captchaChallenge: string; createdAt: string
}

interface Stats {
  totalEvents: number; totalRegistrationAttempts: number; blockedAttempts: number
  averageBehavioralScore: number; uniqueFingerprints: number; eventBreakdown: Record<string, number>
}

interface TrackingData {
  success: boolean; events: TrackingEvent[]; registrationAttempts: RegistrationAttempt[]; stats: Stats
}

const EVENT_COLORS: Record<string, string> = {
  page_view: 'bg-blue-100 text-blue-800', click: 'bg-emerald-100 text-emerald-800',
  form_submit: 'bg-violet-100 text-violet-800', pricing_view: 'bg-amber-100 text-amber-800',
  plan_change: 'bg-pink-100 text-pink-800', subscription: 'bg-indigo-100 text-indigo-800',
  feature_use: 'bg-cyan-100 text-cyan-800', ecosystem_click: 'bg-teal-100 text-teal-800',
  chatbot_open: 'bg-fuchsia-100 text-fuchsia-800', language_change: 'bg-orange-100 text-orange-800',
}

function scoreColor(score: number) {
  if (score < 30) return 'text-red-600'
  if (score < 60) return 'text-amber-500'
  return 'text-emerald-600'
}

function scoreBg(score: number) {
  if (score < 30) return 'bg-red-50 border-red-200'
  if (score < 60) return 'bg-amber-50 border-amber-200'
  return 'bg-emerald-50 border-emerald-200'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TrackingPanel() {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const fetchData = useCallback(async (query?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) {
        if (query.startsWith('HNV-') || /^[a-f0-9]{20,}$/i.test(query)) params.set('trackingId', query)
        else params.set('userId', query)
      }
      const res = await fetch(`/api/admin/tracking?${params}`)
      const json = await res.json()
      if (json.success) setData(json)
    } catch { /* silent */ } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    fetchData(searchQuery.trim())
  }

  const maxBreakdown = data ? Math.max(...Object.values(data.stats.eventBreakdown), 1) : 1

  return (
    <div className="space-y-6">
      {/* User Lookup */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking ID or user ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} variant="outline" disabled={searching}>
          {searching ? '…' : 'Search'}
        </Button>
        <Button onClick={() => { setSearchQuery(''); fetchData() }} variant="ghost" size="icon" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4"><Activity className="h-4 w-4 text-emerald-600" /><CardTitle className="text-xs font-medium text-muted-foreground">Tracked Events</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-emerald-700">{data.stats.totalEvents.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4"><Users className="h-4 w-4 text-blue-600" /><CardTitle className="text-xs font-medium text-muted-foreground">Unique Fingerprints</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-blue-700">{data.stats.uniqueFingerprints.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4"><ShieldAlert className="h-4 w-4 text-red-600" /><CardTitle className="text-xs font-medium text-muted-foreground">Blocked Attempts</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-red-700">{data.stats.blockedAttempts.toLocaleString()}</p></CardContent>
          </Card>
          <Card className={`border ${scoreBg(data.stats.averageBehavioralScore)}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4"><Fingerprint className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-xs font-medium text-muted-foreground">Avg Behavioral Score</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className={`text-2xl font-bold ${scoreColor(data.stats.averageBehavioralScore)}`}>{data.stats.averageBehavioralScore}</p></CardContent>
          </Card>
        </div>
      ) : null}

      {data && (
        <>
          {/* Event Breakdown Chart */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Event Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(data.stats.eventBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-36 text-xs font-medium text-muted-foreground truncate">{type}</span>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-md transition-all" style={{ width: `${(count / maxBreakdown) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold">{count}</span>
                  </div>
                ))}
              {Object.keys(data.stats.eventBreakdown).length === 0 && <p className="text-sm text-muted-foreground">No events recorded.</p>}
            </CardContent>
          </Card>

          {/* Tabs: Events + Blocked Attempts */}
          <Tabs defaultValue="events">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events" className="gap-1"><Eye className="h-3.5 w-3.5" /> Recent Events</TabsTrigger>
              <TabsTrigger value="blocked" className="gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Blocked Attempts</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between"><span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Tracking Events</span><Badge variant="outline">{data.events.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  {data.events.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No events found.</p> : (
                    <ScrollArea className="h-[400px]">
                      <Table><TableHeader><TableRow><TableHead className="w-[110px]">Time</TableHead><TableHead>User</TableHead><TableHead>Tracking ID</TableHead><TableHead>Event</TableHead><TableHead>Details</TableHead><TableHead>IP</TableHead><TableHead>Path</TableHead></TableRow></TableHeader>
                      <TableBody>{data.events.map((ev) => {
                        let details: string = ''
                        try { details = ev.eventData ? JSON.stringify(JSON.parse(ev.eventData)).slice(0, 60) : '—' } catch { details = (ev.eventData || '—').slice(0, 60) }
                        return (
                          <TableRow key={ev.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(ev.createdAt)}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={ev.user.email || ev.userId}>{ev.user.email || ev.userId.slice(0, 8)}</TableCell>
                            <TableCell className="text-xs font-mono">{ev.trackingId.slice(0, 12)}</TableCell>
                            <TableCell><Badge variant="secondary" className={EVENT_COLORS[ev.eventType] || ''}>{ev.eventType}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={details}>{details}</TableCell>
                            <TableCell className="text-xs font-mono">{ev.ip || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={ev.pagePath || ''}>{ev.pagePath || '—'}</TableCell>
                          </TableRow>
                        )})}</TableBody></Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blocked">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between"><span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> Blocked Registration Attempts</span><Badge variant="destructive">{data.registrationAttempts.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  {data.registrationAttempts.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No blocked attempts.</p> : (
                    <ScrollArea className="h-[400px]">
                      <Table><TableHeader><TableRow><TableHead className="w-[110px]">Time</TableHead><TableHead>Email</TableHead><TableHead>IP</TableHead><TableHead>Reason</TableHead><TableHead>Score</TableHead><TableHead>Fingerprint</TableHead></TableRow></TableHeader>
                      <TableBody>{data.registrationAttempts.map((a) => (
                        <TableRow key={a.id} className={a.blocked ? 'bg-red-50/60' : ''}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(a.createdAt)}</TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate" title={a.email || ''}>{a.email || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{a.ip}</TableCell>
                          <TableCell><Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">{a.blockReason || 'unknown'}</Badge></TableCell>
                          <TableCell><span className={`text-sm font-semibold ${scoreColor(a.behavioralScore)}`}>{Math.round(a.behavioralScore)}</span></TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate" title={a.fingerprintHash || ''}>{a.fingerprintHash ? a.fingerprintHash.slice(0, 12) + '…' : '—'}</TableCell>
                        </TableRow>
                      ))}</TableBody></Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
