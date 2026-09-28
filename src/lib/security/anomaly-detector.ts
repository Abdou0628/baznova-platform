/**
 * BazNova Security Architecture (HNSA) — Anomaly Detector
 *
 * Detects suspicious patterns across the platform.
 * Implements CTO Pillar #8: Security Monitoring & Incident Response
 *
 * Monitors for:
 *   - Brute force login attempts (100+ failures from same IP)
 *   - Mass account creation
 *   - Unusual API volume
 *   - Mass CV access (data exfiltration risk)
 *   - Payment anomalies
 *   - Abnormal AI usage
 *
 * Uses a rolling window approach with configurable thresholds.
 * In-memory for now — designed for Redis/metrics backend upgrade.
 */

import type { AnomalyResult, SecurityEventType } from './types'

// ─── Tracking Storage ──────────────────────────────────────────────────────

interface TrackingEntry {
  events: { timestamp: number; type: string; metadata?: Record<string, string> }[]
}

const tracking = new Map<string, TrackingEntry>()

// ─── Thresholds (CTO-specified) ─────────────────────────────────────────────

const THRESHOLDS = {
  /** Login failures before triggering alert (CTO: 100) */
  loginFailuresPerIp: 100,
  /** Login failures per account before alert */
  loginFailuresPerAccount: 20,
  /** Account creations per IP in 1h window */
  accountCreationsPerIp: 10,
  /** CV/document accesses per user in 1h window */
  documentAccessesPerUser: 100,
  /** AI API calls per user per hour */
  aiCallsPerUserPerHour: 200,
  /** Payment failures per user in 1h */
  paymentFailuresPerUser: 5,
  /** API calls per IP in 1h (general) */
  apiCallsPerIpPerHour: 500,
  /** Window duration in ms for all checks */
  windowMs: 60 * 60 * 1000, // 1 hour
}

// ─── Core Detection ─────────────────────────────────────────────────────────

/**
 * Record an event for anomaly tracking.
 */
export function recordSecurityEvent(
  category: string,
  key: string,
  eventType: string,
  metadata?: Record<string, string>,
): void {
  const fullKey = `${category}:${key}`
  let entry = tracking.get(fullKey)

  if (!entry) {
    entry = { events: [] }
    tracking.set(fullKey, entry)
  }

  entry.events.push({
    timestamp: Date.now(),
    type: eventType,
    metadata,
  })

  // Keep only events within the window
  const cutoff = Date.now() - THRESHOLDS.windowMs
  entry.events = entry.events.filter((e) => e.timestamp > cutoff)
}

/**
 * Count events in the current window for a given category + key.
 */
export function countEvents(category: string, key: string): number {
  const fullKey = `${category}:${key}`
  const entry = tracking.get(fullKey)
  if (!entry) return 0

  const cutoff = Date.now() - THRESHOLDS.windowMs
  return entry.events.filter((e) => e.timestamp > cutoff).length
}

// ─── Specific Detectors ─────────────────────────────────────────────────────

/**
 * Check for brute force login attempts.
 * CTO: 100 login failures from same IP triggers protection.
 */
export function detectBruteForce(ip: string, userId?: string): AnomalyResult {
  const ipFailures = countEvents('auth_failure_ip', ip)
  const accountFailures = userId ? countEvents('auth_failure_account', userId) : 0

  if (ipFailures >= THRESHOLDS.loginFailuresPerIp) {
    return {
      isAnomaly: true,
      anomalyType: 'BRUTE_FORCE_IP',
      score: Math.min(ipFailures / THRESHOLDS.loginFailuresPerIp * 100, 100),
      details: `${ipFailures} login failures from IP in 1h (threshold: ${THRESHOLDS.loginFailuresPerIp})`,
      action: 'block',
    }
  }

  if (accountFailures >= THRESHOLDS.loginFailuresPerAccount) {
    return {
      isAnomaly: true,
      anomalyType: 'BRUTE_FORCE_ACCOUNT',
      score: Math.min(accountFailures / THRESHOLDS.loginFailuresPerAccount * 100, 100),
      details: `${accountFailures} failed login attempts on account in 1h`,
      action: 'warn',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

/**
 * Check for mass account creation.
 */
export function detectMassAccountCreation(ip: string): AnomalyResult {
  const count = countEvents('account_creation_ip', ip)

  if (count >= THRESHOLDS.accountCreationsPerIp) {
    return {
      isAnomaly: true,
      anomalyType: 'MASS_ACCOUNT_CREATION',
      score: Math.min(count / THRESHOLDS.accountCreationsPerIp * 100, 100),
      details: `${count} accounts created from IP in 1h (threshold: ${THRESHOLDS.accountCreationsPerIp})`,
      action: 'block',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

/**
 * Check for mass CV/document access (potential IDOR/data exfiltration).
 * CTO: A user should never access /api/users/{otherId}/documents
 */
export function detectMassDocumentAccess(userId: string): AnomalyResult {
  const count = countEvents('document_access_user', userId)

  if (count >= THRESHOLDS.documentAccessesPerUser) {
    return {
      isAnomaly: true,
      anomalyType: 'MASS_CV_ACCESS',
      score: Math.min(count / THRESHOLDS.documentAccessesPerUser * 100, 100),
      details: `${count} document accesses by user in 1h (threshold: ${THRESHOLDS.documentAccessesPerUser})`,
      action: 'block',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

/**
 * Check for abnormal AI usage.
 */
export function detectAIAbuse(userId: string): AnomalyResult {
  const count = countEvents('ai_call_user', userId)

  if (count >= THRESHOLDS.aiCallsPerUserPerHour) {
    return {
      isAnomaly: true,
      anomalyType: 'AI_USAGE_ANOMALY',
      score: Math.min(count / THRESHOLDS.aiCallsPerUserPerHour * 100, 100),
      details: `${count} AI calls by user in 1h (threshold: ${THRESHOLDS.aiCallsPerUserPerHour})`,
      action: 'block',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

/**
 * Check for payment anomalies (multiple failures).
 */
export function detectPaymentAnomaly(userId: string): AnomalyResult {
  const count = countEvents('payment_failure_user', userId)

  if (count >= THRESHOLDS.paymentFailuresPerUser) {
    return {
      isAnomaly: true,
      anomalyType: 'PAYMENT_ANOMALY',
      score: Math.min(count / THRESHOLDS.paymentFailuresPerUser * 100, 100),
      details: `${count} payment failures by user in 1h (threshold: ${THRESHOLDS.paymentFailuresPerUser})`,
      action: 'warn',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

/**
 * Check for abnormal API volume from an IP.
 */
export function detectAPIVolumeAnomaly(ip: string): AnomalyResult {
  const count = countEvents('api_call_ip', ip)

  if (count >= THRESHOLDS.apiCallsPerIpPerHour) {
    return {
      isAnomaly: true,
      anomalyType: 'API_VOLUME_ANOMALY',
      score: Math.min(count / THRESHOLDS.apiCallsPerIpPerHour * 100, 100),
      details: `${count} API calls from IP in 1h (threshold: ${THRESHOLDS.apiCallsPerIpPerHour})`,
      action: 'block',
    }
  }

  return { isAnomaly: false, score: 0, details: 'Normal', action: 'allow' }
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/**
 * Get anomaly detection stats for monitoring.
 */
export function getAnomalyStats(): {
  trackedKeys: number
  totalEvents: number
  categories: Record<string, number>
} {
  let totalEvents = 0
  const categories: Record<string, number> = {}

  for (const [key, entry] of tracking.entries()) {
    const category = key.split(':')[0]
    totalEvents += entry.events.length
    categories[category] = (categories[category] || 0) + entry.events.length
  }

  return {
    trackedKeys: tracking.size,
    totalEvents,
    categories,
  }
}

/**
 * Cleanup old tracking data.
 */
export function cleanup(): void {
  const cutoff = Date.now() - THRESHOLDS.windowMs * 2
  for (const [key, entry] of tracking.entries()) {
    entry.events = entry.events.filter((e) => e.timestamp > cutoff)
    if (entry.events.length === 0) {
      tracking.delete(key)
    }
  }
}
