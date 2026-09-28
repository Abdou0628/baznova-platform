/**
 * Security utility functions — SQL injection, XSS detection, sanitization.
 * Originally from security.ts, moved here to avoid file/directory shadow conflict.
 */

// ─── SQL Injection Patterns ────────────────────────────────────────────────────
const SQL_INJECTION_PATTERNS: RegExp[] = [
  // Multi-keyword combos (SELECT...FROM, INSERT...INTO, etc.)
  /(SELECT\b.*\bFROM\b|INSERT\b.*\bINTO\b|UPDATE\b.*\bSET\b|DELETE\b.*\bFROM\b|DROP\s+TABLE|TRUNCATE\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|UNION\b.*\bSELECT\b|EXEC\b|EXECUTE\b)/i,
  // Comment terminators and dangerous prefixes
  /(--|;|--\s|\/\*|\*\/|xp_|sp_|0x)/i,
  // Tautology conditions
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s+['"].*['"]\s*=\s*['"])/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+['"].*['"]\s*=\s*['"])/i,
  // Comment-based bypass
  /('\s*(?:OR|AND)\s+.*--)/i,
  // Time-based blind injection
  /(WAITFOR\s+DELAY)/i,
  /(BENCHMARK\s*\(\))/i,
  /(SLEEP\s*\(\))/i,
  /(CHAR\s*\(\))/i,
]

// ─── XSS Patterns ─────────────────────────────────────────────────────────
const XSS_PATTERNS: RegExp[] = [
  /<\s*script[^>]*>[\s\S]*?<\s*\/script>/gi,
  /<\s*script[^>]*\/>/gi,
  /\bon\w+\s*=\s*['"]?[^'">]*['"]?/gi,
  /javascript\s*:/gi,
  /(<\s*img[^>]+\b)src\s*=\s*['"]?\s*javascript:/gi,
  /(<\s*iframe[^>]+\b)src\s*=\s*['"]?\s*javascript:/gi,
  /(<\s*a[^>]+\b)href\s*=\s*['"]?\s*javascript:/gi,
  /<\s*embed[^>]*>/gi,
  /<\s*object[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
  /%3Cscript/gi,
]

// ─── Detection helpers ─────────────────────────────────────────
export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Checks input for any suspicious patterns (SQL injection or XSS).
 */
export function scanInput(input: string): {
  isClean: boolean
  sqlInjection: boolean
  xss: boolean
} {
  const sqlInjection = detectSQLInjection(input)
  const xss = detectXSS(input)
  return {
    isClean: !sqlInjection && !xss,
    sqlInjection,
    xss,
  }
}

/**
 * Sanitize a string by encoding dangerous HTML chars.
 * @param encodeSlash If true, also encodes forward slashes.
 */
export function sanitizeString(input: string, encodeSlash = false): string {
  let result = input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  if (encodeSlash) {
    result = result.replace(/\//g, '&#x2F;')
  }
  return result
}

/**
 * Sanitize all string values in a flat or nested object.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      )
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized as T
}

// ─── Legacy Security Event Logging (backward-compatible) ──────────────────────
// Adapts the old logSecurityEvent interface used by auth/CV/copilot routes
// to the HNSA audit-logger interface.

import type { SecurityEventType, SecurityPillar, SecuritySeverity } from './types'

const LEGACY_TYPE_MAP: Record<string, SecurityEventType> = {
  sql_injection_attempt: 'INPUT_VALIDATION_FAILED',
  xss_attempt: 'INPUT_VALIDATION_FAILED',
  suspicious_input: 'INPUT_VALIDATION_FAILED',
  brute_force: 'BRUTE_FORCE_DETECTED',
  invalid_auth: 'AUTH_LOGIN_FAILURE',
  forbidden_access: 'ACCESS_CONTROL_VIOLATION',
  rate_limit: 'RATE_LIMIT_EXCEEDED',
}

const LEGACY_PILLAR_MAP: Record<string, SecurityPillar> = {
  sql_injection_attempt: 'application',
  xss_attempt: 'application',
  suspicious_input: 'application',
  brute_force: 'identity',
  invalid_auth: 'identity',
  forbidden_access: 'zero_trust',
  rate_limit: 'api',
}

interface LegacySecurityEvent {
  type: string
  severity: string
  ip: string
  path: string
  method: string
  userAgent?: string
  email?: string
  details?: Record<string, unknown>
}

/**
 * Legacy security event logger — adapts old API to HNSA audit-logger.
 * Used by auth routes, CV generator, copilot, etc.
 */
export async function logSecurityEvent(event: LegacySecurityEvent): Promise<void> {
  try {
    const { logSecurityEvent: hnsaLog } = await import('./audit-logger')
    await hnsaLog({
      eventType: (LEGACY_TYPE_MAP[event.type] || 'INPUT_VALIDATION_FAILED') as SecurityEventType,
      severity: event.severity as SecuritySeverity,
      pillar: (LEGACY_PILLAR_MAP[event.type] || 'application') as SecurityPillar,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      resource: event.method + ' ' + event.path,
      details: event.method + ' ' + event.path + ' — ' + event.type + (event.email ? ' (email: ' + event.email + ')' : ''),
      metadata: event.details as Record<string, string | number | boolean> | undefined,
    })
  } catch {
    // Silent fail for security logging — never crash the app
  }
}
