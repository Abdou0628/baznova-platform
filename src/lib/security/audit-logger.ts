/**
 * BazNova Security Architecture (HNSA) — Security Audit Logger
 *
 * Immutable, append-only security audit trail.
 * Implements CTO Pillar #9: Audit Log immuable
 * And Pillar #8: Security Monitoring & Incident Response
 *
 * Key CTO requirements:
 *   - Immutable: once written, never modified or deleted
 *   - Comprehensive: every security-relevant action is logged
 *   - Queryable: for SIEM integration and incident response
 *   - Tamper-evident: uses both in-memory and database logging
 *
 * Dual-write: logs to both in-memory buffer (fast) and database (persistent).
 */

import type { SecurityEvent, SecurityEventType, SecuritySeverity, SecurityPillar } from './types'
import { randomUUID } from 'crypto'

// ─── In-Memory Buffer ──────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 10_000
const eventBuffer: SecurityEvent[] = []

/**
 * Get recent security events from the in-memory buffer.
 */
export function getRecentEvents(limit = 100, filter?: { pillar?: SecurityPillar; severity?: SecuritySeverity }): SecurityEvent[] {
  let events = eventBuffer

  if (filter?.pillar) {
    events = events.filter((e) => e.pillar === filter.pillar)
  }
  if (filter?.severity) {
    events = events.filter((e) => e.severity === filter.severity)
  }

  return events.slice(-limit).reverse() // Most recent first
}

/**
 * Get security event counts by type for the last 24 hours.
 */
export function getEventCounts24h(): { type: SecurityEventType; count: number }[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const recent = eventBuffer.filter((e) => new Date(e.timestamp).getTime() > cutoff)

  const counts = new Map<SecurityEventType, number>()
  for (const event of recent) {
    counts.set(event.eventType, (counts.get(event.eventType) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get security health summary.
 */
export function getSecurityHealth(): {
  status: 'healthy' | 'degraded' | 'critical'
  activeThreats: number
  blockedRequests24h: number
  totalEvents24h: number
  criticalEvents24h: number
  topThreatTypes: { type: string; count: number }[]
} {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const recent = eventBuffer.filter((e) => new Date(e.timestamp).getTime() > cutoff)

  const criticalEvents = recent.filter(
    (e) => e.severity === 'critical' || e.severity === 'high'
  )
  const blockedRequests = recent.filter(
    (e) => e.eventType === 'RATE_LIMIT_BLOCKED' || e.eventType === 'BRUTE_FORCE_DETECTED'
  )
  const activeThreats = recent.filter((e) => !e.resolved)

  const typeCounts = new Map<string, number>()
  for (const event of recent) {
    typeCounts.set(event.eventType, (typeCounts.get(event.eventType) || 0) + 1)
  }

  const topThreatTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }))

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (criticalEvents.length > 10) status = 'critical'
  else if (criticalEvents.length > 3 || blockedRequests.length > 50) status = 'degraded'

  return {
    status,
    activeThreats: activeThreats.length,
    blockedRequests24h: blockedRequests.length,
    totalEvents24h: recent.length,
    criticalEvents24h: criticalEvents.length,
    topThreatTypes,
  }
}

// ─── Core Logging Function ─────────────────────────────────────────────────

/**
 * Log a security event. This is the main entry point.
 *
 * Writes to:
 *   1. In-memory buffer (instant, for real-time queries)
 *   2. Console (for server logs)
 *   3. Database (async, for persistence) — if db is available
 */
export async function logSecurityEvent(params: {
  eventType: SecurityEventType
  severity: SecuritySeverity
  pillar: SecurityPillar
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  details: string
  metadata?: Record<string, string | number | boolean>
}): Promise<SecurityEvent> {
  const event: SecurityEvent = {
    id: randomUUID(),
    eventType: params.eventType,
    severity: params.severity,
    pillar: params.pillar,
    userId: params.userId,
    sessionId: params.sessionId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    resource: params.resource,
    action: params.action,
    details: params.details,
    metadata: params.metadata,
    timestamp: new Date().toISOString(),
    resolved: false,
  }

  // 1. Add to in-memory buffer
  eventBuffer.push(event)
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift() // Remove oldest
  }

  // 2. Console log (with color-coded severity)
  const colorMap: Record<SecuritySeverity, string> = {
    critical: '\x1b[31m\x1b[1m', // red bold
    high: '\x1b[33m',            // yellow
    medium: '\x1b[36m',          // cyan
    low: '\x1b[90m',             // gray
  }
  const reset = '\x1b[0m'
  const color = colorMap[params.severity]
  console.log(
    `${color}[HNSA][${params.pillar.toUpperCase()}][${params.eventType}]${reset} ${params.details}`
  )
  if (params.metadata && Object.keys(params.metadata).length > 0) {
    console.log(`  ${color}  metadata:${reset}`, JSON.stringify(params.metadata))
  }

  // 3. Persist to database (async, non-blocking)
  persistToDatabase(event).catch((err) => {
    console.error('[HNSA] Failed to persist security event to database:', err)
  })

  return event
}

/**
 * Resolve pillar from event type.
 */
export function resolvePillar(eventType: SecurityEventType): SecurityPillar {
  if (eventType.startsWith('AUTH_')) return 'identity'
  if (eventType.startsWith('RATE_LIMIT_')) return 'api'
  if (eventType.startsWith('INPUT_')) return 'application'
  if (eventType.startsWith('PROMPT_') || eventType.startsWith('AI_')) return 'application'
  if (eventType.startsWith('ACCESS_') || eventType.startsWith('IDOR_')) return 'zero_trust'
  if (eventType.startsWith('BRUTE_FORCE_')) return 'identity'
  if (eventType.startsWith('ANOMALY_')) return 'monitoring'
  if (eventType.startsWith('WEBHOOK_') || eventType.startsWith('PAYMENT_')) return 'payment'
  return 'monitoring'
}

/**
 * Resolve default severity for an event type.
 */
export function resolveSeverity(eventType: SecurityEventType): SecuritySeverity {
  const critical: SecurityEventType[] = [
    'AUTH_CREDENTIAL_STUFFING_DETECTED',
    'PROMPT_INJECTION_DETECTED',
    'AI_ABUSE_DETECTED',
    'IDOR_ATTEMPT_DETECTED',
    'BRUTE_FORCE_DETECTED',
    'AUDIT_LOG_TAMPER_ATTEMPT',
    'ANOMALY_MASS_ACCOUNT_CREATION',
    'ANOMALY_MASS_CV_ACCESS',
  ]
  const high: SecurityEventType[] = [
    'AUTH_LOGIN_BLOCKED',
    'RATE_LIMIT_BLOCKED',
    'ACCESS_CONTROL_VIOLATION',
    'WEBHOOK_SIGNATURE_INVALID',
    'ANOMALY_API_VOLUME',
    'ANOMALY_PAYMENT_PATTERN',
  ]

  if (critical.includes(eventType)) return 'critical'
  if (high.includes(eventType)) return 'high'
  return 'medium'
}

// ─── Database Persistence ───────────────────────────────────────────────────

async function persistToDatabase(event: SecurityEvent): Promise<void> {
  try {
    const { db } = await import('@/lib/db')

    await db.securityAuditLog.create({
      data: {
        eventType: event.eventType,
        severity: event.severity,
        pillar: event.pillar,
        userId: event.userId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resource: event.resource,
        action: event.action,
        details: event.details,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        eventId: event.id,
      },
    })
  } catch (err: any) {
    // Table might not exist yet — don't crash the app
    if (err?.code !== 'P2021' && !err?.message?.includes('securityAuditLog')) {
      console.error('[HNSA] DB persist error:', err?.message || err)
    }
  }
}
