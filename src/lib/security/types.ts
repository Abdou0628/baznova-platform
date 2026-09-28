/**
 * HireNova Security Architecture (HNSA) — Core Types
 *
 * Implements the CTO's 8-pillar security architecture:
 *   1. Identity & Access Management
 *   2. Zero Trust
 *   3. Application Security
 *   4. API Security
 *   5. Payment Security
 *   6. Data Security
 *   7. Infrastructure Security
 *   8. Security Monitoring & Incident Response
 *
 * Principle: Assume Breach — even if one layer is compromised,
 * the attacker cannot take control of the entire platform.
 */

// ─── Security Event Types ──────────────────────────────────────────────────

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGIN_BLOCKED'
  | 'AUTH_LOGOUT'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_FAILED'
  | 'AUTH_SUSPICIOUS_LOGIN'
  | 'AUTH_CREDENTIAL_STUFFING_DETECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_BLOCKED'
  | 'INPUT_VALIDATION_FAILED'
  | 'PROMPT_INJECTION_DETECTED'
  | 'AI_OUTPUT_SANITIZED'
  | 'AI_ABUSE_DETECTED'
  | 'ACCESS_CONTROL_VIOLATION'
  | 'IDOR_ATTEMPT_DETECTED'
  | 'BRUTE_FORCE_DETECTED'
  | 'ANOMALY_API_VOLUME'
  | 'ANOMALY_PAYMENT_PATTERN'
  | 'ANOMALY_AI_USAGE'
  | 'ANOMALY_MASS_ACCOUNT_CREATION'
  | 'ANOMALY_MASS_CV_ACCESS'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_UNKNOWN_PROVIDER'
  | 'PAYMENT_ORPHANED_EVENT'
  | 'SECURITY_CONFIG_CHANGED'
  | 'AUDIT_LOG_TAMPER_ATTEMPT'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export type SecurityPillar =
  | 'identity'
  | 'zero_trust'
  | 'application'
  | 'api'
  | 'payment'
  | 'data'
  | 'infrastructure'
  | 'monitoring'

// ─── Security Event Record ─────────────────────────────────────────────────

export interface SecurityEvent {
  id: string
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
  timestamp: string
  resolved: boolean
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Whether to block entirely after limit or just warn */
  blockOnExceed: boolean
  /** Custom key extractor (e.g., userId instead of IP) */
  keyExtractor?: (request: SecurityRequest) => string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// ─── Request Context ───────────────────────────────────────────────────────

export interface SecurityRequest {
  ip: string
  userAgent: string
  userId?: string
  sessionId?: string
  method: string
  path: string
  headers: Record<string, string>
  body?: unknown
}

// ─── Input Validation ──────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  sanitized: string
  threats: SecurityThreat[]
}

export interface SecurityThreat {
  type: 'xss' | 'sql_injection' | 'prompt_injection' | 'command_injection' | 'path_traversal' | 'csrf' | 'ssrf'
  severity: SecuritySeverity
  pattern: string
  description: string
  position: number
}

// ─── AI Security ────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  isSafe: boolean
  threats: {
    promptInjection: boolean
    dataExtraction: boolean
    instructionManipulation: boolean
    contentPolicyViolation: boolean
  }
  riskScore: number // 0-100
  sanitizedInput: string
  warnings: string[]
}

// ─── Anomaly Detection ─────────────────────────────────────────────────────

export interface AnomalyResult {
  isAnomaly: boolean
  anomalyType?: string
  score: number // 0-100
  details: string
  action: 'allow' | 'warn' | 'block'
}

// ─── Security Health ────────────────────────────────────────────────────────

export interface SecurityHealth {
  status: 'healthy' | 'degraded' | 'critical'
  activeThreats: number
  blockedRequests24h: number
  totalEvents24h: number
  criticalEvents24h: number
  topThreatTypes: { type: SecurityEventType; count: number }[]
  lastIncident?: string
  pillarStatus: Record<SecurityPillar, 'ok' | 'warning' | 'critical'>
}

// ─── Error Classes ──────────────────────────────────────────────────────────

export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly pillar: SecurityPillar,
    public readonly severity: SecuritySeverity = 'high',
    public readonly cause?: unknown,
  ) {
    super(`[HNSA][${pillar}] ${message}`)
    this.name = 'SecurityError'
  }
}

export class RateLimitExceededError extends SecurityError {
  constructor(
    public readonly limit: number,
    public readonly windowMs: number,
  ) {
      super(
        `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
        'api',
        'medium',
      )
      this.name = 'RateLimitExceededError'
    }
}

export class InputValidationError extends SecurityError {
  constructor(
    message: string,
    public readonly threats: SecurityThreat[],
  ) {
      super(message, 'application', 'high', threats)
      this.name = 'InputValidationError'
    }
}

export class PromptInjectionError extends SecurityError {
  constructor(message: string) {
    super(message, 'application', 'critical')
    this.name = 'PromptInjectionError'
  }
}

export class AccessControlError extends SecurityError {
  constructor(
    message: string,
    public readonly resource: string,
    public readonly requiredPermission?: string,
  ) {
      super(message, 'zero_trust', 'high')
      this.name = 'AccessControlError'
    }
}
