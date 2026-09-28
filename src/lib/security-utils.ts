/**
 * Security utility functions:
 * - SQL injection detection
 * - XSS detection
 * - Input sanitization
 * - Security event logging to Prisma SecurityLog model
 */

import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// SQL Injection Patterns
// ---------------------------------------------------------------------------
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE|DATABASE)\b)/i,
  /(--|;|--\s|\/\*|\*\/|xp_|sp_|0x)/i,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s+['"].*['"]\s*=\s*['"])/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+['"].*['"]\s*=\s*['"])/i,
  /('\s*(OR|AND)\s+.*--)/i,
  /(WAITFOR\s+DELAY)/i,
  /(BENCHMARK\s*\()/i,
  /(SLEEP\s*\()/i,
  /(\bCHAR\s*\()/i,
]

// ---------------------------------------------------------------------------
// XSS Patterns
// ---------------------------------------------------------------------------
const XSS_PATTERNS = [
  /<\s*script[^>]*>[\s\S]*?<\s*\/script>/gi,
  /<\s*script[^>]*\/>/gi,
  /\bon\w+\s*=\s*['"]?[^'">]*['"]?/gi, // event handlers: onclick, onerror, onload, etc.
  /javascript\s*:/gi,
  /(<\s*img[^>]+\b)src\s*=\s*['"]?\s*javascript:/gi,
  /(<\s*iframe[^>]+\b)src\s*=\s*['"]?\s*javascript:/gi,
  /(<\s*a[^>]+\b)href\s*=\s*['"]?\s*javascript:/gi,
  /<\s*embed[^>]*>/gi,
  /<\s*object[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
  /%3Cscript/gi,
  /%3E/gi, // encoded > (less strict, skip in combos)
]

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------
export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Checks input for any suspicious patterns (SQL injection or XSS).
 * Returns an object with detection results.
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
 * Sanitize a string by stripping HTML tags and encoding dangerous chars.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
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

// ---------------------------------------------------------------------------
// Security Event Types
// ---------------------------------------------------------------------------
export type SecurityEventType =
  | 'rate_limit'
  | 'brute_force'
  | 'suspicious_input'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'invalid_auth'
  | 'forbidden_access'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  ip: string
  path: string
  method: string
  userAgent?: string
  email?: string
  details?: Record<string, unknown>
}

/**
 * Log a security event to the database and optionally notify.
 * This is async and non-blocking — errors are only logged to console.
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await db.securityLog.create({
      data: {
        type: event.type,
        severity: event.severity,
        ip: event.ip,
        path: event.path,
        method: event.method,
        userAgent: event.userAgent || null,
        email: event.email || null,
        details: event.details ? JSON.stringify(event.details) : null,
      },
    })

    // Log high/critical to console for immediate visibility
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn(
        `[SECURITY ALERT] [${event.severity.toUpperCase()}] ${event.type} — IP: ${event.ip} | Path: ${event.path} | Email: ${event.email || 'N/A'}`
      )
    }
  } catch (error) {
    console.error('[SECURITY] Failed to log security event:', error)
  }
}
