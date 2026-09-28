/**
 * HireNova Security Architecture (HNSA) — Main Entry Point
 *
 * CTO: "Je baptiserais cette couche : HireNova Security Architecture — HNSA"
 * 8 piliers : Identity, Zero Trust, Application, API, Payment, Data, Infrastructure, Monitoring
 *
 * Usage in API routes:
 *   import { hnsa } from '@/lib/security'
 *   const result = hnsa.protect(request)
 *   if (!result.allowed) return result.response
 *
 * Usage for AI inputs:
 *   import { hnsa } from '@/lib/security'
 *   const analysis = hnsa.analyzeAIInput(userMessage)
 *   if (!analysis.isSafe) return error
 */

// ─── Public API ────────────────────────────────────────────────────────────

export type {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  SecurityPillar,
  SecurityRequest,
  SecurityThreat,
  AIAnalysisResult,
  AnomalyResult,
  SecurityHealth,
} from './types'

export {
  SecurityError,
  RateLimitExceededError,
  InputValidationError,
  PromptInjectionError,
  AccessControlError,
} from './types'

export { rateLimit, resolveConfigForPath, getRateLimitKey, getStats as getRateLimitStats } from './rate-limiter'
export { validateInput, analyzeAIInput, sanitizeAIOutput } from './input-sanitizer'
export { getRecentEvents, getEventCounts24h, getSecurityHealth, resolvePillar, resolveSeverity } from './audit-logger'
export { logSecurityEvent as hnsaLog } from './audit-logger'
export { hasPermission, isAdmin, checkResourceOwnership, zeroTrustCheck } from './access-control'
export type { Permission } from './access-control'

// Legacy utility functions (SQL/XSS detection, sanitization, backward-compat logger)
export { detectSQLInjection, detectXSS, scanInput, sanitizeString, sanitizeObject, logSecurityEvent } from './utils'
export {
  detectBruteForce,
  detectMassAccountCreation,
  detectMassDocumentAccess,
  detectAIAbuse,
  detectPaymentAnomaly,
  detectAPIVolumeAnomaly,
  recordSecurityEvent,
} from './anomaly-detector'

// ─── Unified HNSA Facade ───────────────────────────────────────────────────

import type { SecurityRequest, AIAnalysisResult, ValidationResult } from './types'
import { rateLimit } from './rate-limiter'
import { validateInput, analyzeAIInput, sanitizeAIOutput as _sanitizeAIOutput } from './input-sanitizer'
import { logSecurityEvent, getSecurityHealth, getRecentEvents, resolvePillar, resolveSeverity } from './audit-logger'
import { detectBruteForce, detectMassAccountCreation, detectMassDocumentAccess, detectAIAbuse, detectPaymentAnomaly, recordSecurityEvent as recordAnomaly } from './anomaly-detector'

/**
 * Unified HNSA protection result for API routes.
 */
export interface HNSAProtectResult {
  allowed: boolean
  reason?: string
  response?: Response
  rateLimit: { allowed: boolean; remaining: number; resetAt: number }
  inputValidation?: ValidationResult
  aiAnalysis?: AIAnalysisResult
}

/**
 * The main HNSA protection function.
 * Call this at the top of every API route.
 *
 * Performs:
 *   1. Rate limiting
 *   2. Input validation (if body is a string)
 *   3. Security event logging
 *
 * Example:
 *   const protection = await hnsa.protect(request)
 *   if (!protection.allowed) return protection.response!
 */
export const hnsa = {
  /**
   * Full API route protection.
   */
  async protect(
    req: Request,
    options?: {
      skipRateLimit?: boolean
      skipInputValidation?: boolean
      userId?: string
    },
  ): Promise<HNSAProtectResult> {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const path = new URL(req.url).pathname

    const secRequest: SecurityRequest = {
      ip,
      userAgent,
      userId: options?.userId,
      method: req.method,
      path,
      headers: Object.fromEntries(req.headers.entries()),
    }

    // 1. Rate limiting
    const rlResult = options?.skipRateLimit
      ? { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity }
      : rateLimit(secRequest)

    if (!rlResult.allowed) {
      await logSecurityEvent({
        eventType: rlResult.remaining === 0 && rlResult.resetAt > Date.now() + 60000
          ? 'RATE_LIMIT_BLOCKED' : 'RATE_LIMIT_EXCEEDED',
        severity: 'medium',
        pillar: 'api',
        ipAddress: ip,
        userAgent,
        resource: path,
        details: `Rate limit exceeded for ${ip} on ${path}`,
        metadata: { method: req.method, path },
      })

      return {
        allowed: false,
        reason: 'RATE_LIMITED',
        response: new Response(
          JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((rlResult.resetAt - Date.now()) / 1000) }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rlResult.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rlResult.resetAt / 1000)),
            },
          },
        ),
        rateLimit: rlResult,
      }
    }

    // 2. Input validation (only for string bodies)
    let inputValidation: ValidationResult | undefined
    if (!options?.skipInputValidation && req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const contentType = req.headers.get('content-type') || ''
        if (contentType.includes('text/') || contentType.includes('json')) {
          const clone = req.clone()
          const text = await clone.text()
          if (text.length > 0 && text.length < 100_000) {
            inputValidation = validateInput(text)
            if (!inputValidation.valid) {
              await logSecurityEvent({
                eventType: 'INPUT_VALIDATION_FAILED',
                severity: 'high',
                pillar: 'application',
                ipAddress: ip,
                userAgent,
                resource: path,
                details: `Input validation failed: ${inputValidation.threats.map(t => t.type).join(', ')}`,
                metadata: { threatCount: inputValidation.threats.length, path, method: req.method },
              })
            }
          }
        }
      } catch {
        // Don't fail the request if input validation has a technical error
      }
    }

    return {
      allowed: true,
      rateLimit: rlResult,
      inputValidation,
    }
  },

  /**
   * Analyze AI input for prompt injection and other threats.
   * Call BEFORE sending to LLM.
   */
  protectAIInput(input: string): AIAnalysisResult {
    return analyzeAIInput(input)
  },

  /**
   * Sanitize AI output before sending to user.
   * Call AFTER receiving from LLM.
   */
  sanitizeAIOutput(output: string): string {
    return _sanitizeAIOutput(output)
  },

  /**
   * Log a security event manually.
   */
  log: logSecurityEvent,

  /**
   * Get security health for dashboard.
   */
  getHealth: getSecurityHealth,

  /**
   * Get recent security events.
   */
  getEvents: getRecentEvents,

  /**
   * Check for anomalies.
   */
  anomaly: {
    bruteForce: detectBruteForce,
    massAccountCreation: detectMassAccountCreation,
    massDocumentAccess: detectMassDocumentAccess,
    aiAbuse: detectAIAbuse,
    paymentAnomaly: detectPaymentAnomaly,
    record: recordAnomaly,
  },
}
