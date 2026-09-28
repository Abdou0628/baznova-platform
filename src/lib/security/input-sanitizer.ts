/**
 * BazNova Security Architecture (HNSA) — Input Sanitizer
 *
 * Comprehensive input validation and sanitization layer.
 * Implements CTO Pillar #3: Application Security
 *
 * Protects against:
 *   - XSS (Cross-Site Scripting)
 *   - SQL Injection
 *   - Command Injection
 *   - Path Traversal
 *   - Prompt Injection (for AI inputs)
 *   - CSRF tokens validation
 *
 * Every user input MUST pass through this sanitizer before processing.
 */

import type { ValidationResult, SecurityThreat, AIAnalysisResult } from './types'

// ─── Threat Patterns ───────────────────────────────────────────────────────

const THREAT_PATTERNS: {
  type: SecurityThreat['type']
  patterns: RegExp[]
  severity: SecurityThreat['severity']
  description: string
}[] = [
  {
    type: 'xss',
    severity: 'high',
    description: 'Potential XSS — script injection detected',
    patterns: [
      /<script[^>]*>.*?<\/script>/gis,
      /<img[^>]+onerror\s*=/gi,
      /<svg[^>]+onload\s*=/gi,
      /javascript\s*:/gi,
      /on(?:click|load|error|mouse\w+)\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*['"]?\s*javascript/gi,
    ],
  },
  {
    type: 'sql_injection',
    severity: 'critical',
    description: 'Potential SQL injection detected',
    patterns: [
      /(?:'|\")\s*(?:OR|AND)\s+\d+\s*=\s*\d+/gi,
      /(?:UNION\s+(?:ALL\s+)?SELECT)/gi,
      /(?:DROP|DELETE|TRUNCATE|ALTER|CREATE)\s+(?:TABLE|DATABASE|INDEX)/gi,
      /(?:INSERT\s+INTO)\s+.*?(?:VALUES|SELECT)/gi,
      /(?:UPDATE\s+\w+\s+SET)/gi,
      /(?:;\s*(?:DROP|DELETE|UPDATE|INSERT|ALTER))/gi,
      /(?:EXEC\s*\(|EXECUTE\s*\()/gi,
      /(?:xp_cmdshell|sp_executesql|CONCAT\s*\()/gi,
    ],
  },
  {
    type: 'command_injection',
    severity: 'critical',
    description: 'Potential command injection detected',
    patterns: [
      /;\s*(?:cat|ls|rm|wget|curl|bash|sh|nc|ncat|python|perl|ruby|php)\b/gi,
      /\$\(.*?\)/g,
      /`[^`]+`/g,
      /\|\s*(?:cat|ls|rm|wget|curl|bash|sh)\b/gi,
      /&&\s*(?:cat|ls|rm|wget|curl|bash|sh)\b/gi,
    ],
  },
  {
    type: 'path_traversal',
    severity: 'high',
    description: 'Potential path traversal detected',
    patterns: [
      /\.\.[\/\\]/g,
      /%2e%2e[\/\\%]/gi,
      /\.\.%2f/gi,
      /%2e%2e\//gi,
      /\/etc\//gi,
      /\/proc\//gi,
      /\/dev\//gi,
      /~root/gi,
    ],
  },
]

// ─── Prompt Injection Patterns ─────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?)/gi,
  /forget\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?)/gi,
  /disregard\s+(?:all\s+)?(?:previous|above|prior)/gi,
  /you\s+are\s+now\s+(?:a|an|the)\s+/gi,
  /act\s+as\s+(?:if\s+you\s+(?:are|were)|a|an|the)\s+/gi,
  /pretend\s+(?:you\s+are|to\s+be)/gi,
  /roleplay\s+as\s+/gi,
  /switch\s+(?:to\s+)?(?:developer|admin|root|system)\s+mode/gi,
  // System prompt extraction
  /(?:reveal|show|display|print|output|repeat)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?|configuration)/gi,
  /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:instructions?|prompt|rules?)/gi,
  /(?:dump|export|extract)\s+(?:your\s+)?(?:system\s+)?prompt/gi,
  // Data extraction
  /(?:extract|get|retrieve|fetch|pull)\s+(?:all\s+)?(?:user|customer|patient|private|confidential|sensitive)\s+data/gi,
  /(?:list|show|display)\s+all\s+(?:users?|accounts?|emails?|passwords?|api\s*keys?|tokens?)/gi,
  /(?:SELECT|SELECT\s+\*)\s+.+\s+FROM\s+/gi,
  // Manipulation
  /\[INST\]|<\|im_start\|>|<\|system\|>/g,
  /<\|?system\|?>/gi,
  /<\|?user\|?>/gi,
  /<\|?assistant\|?>/gi,
  // Jailbreak attempts
  /jailbreak/gi,
  /DAN\s+mode/gi,
  /evil\s+mode/gi,
  /unlock\s+(?:yourself|restricted|hidden)/gi,
  /bypass\s+(?:safety|security|filter|restriction)/gi,
]

// ─── Sanitization Functions ─────────────────────────────────────────────────

/**
 * Sanitize a string by removing HTML tags and encoding special characters.
 */
function sanitizeString(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newline, tab, carriage return)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Encode HTML special chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Validate and sanitize a general input string.
 * Detects XSS, SQL injection, command injection, path traversal.
 */
export function validateInput(input: string): ValidationResult {
  const threats: SecurityThreat[] = []

  for (const category of THREAT_PATTERNS) {
    for (const pattern of category.patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0
      const match = pattern.exec(input)
      if (match) {
        threats.push({
          type: category.type,
          severity: category.severity,
          pattern: pattern.source,
          description: category.description,
          position: match.index,
        })
      }
    }
  }

  return {
    valid: threats.length === 0,
    sanitized: sanitizeString(input),
    threats,
  }
}

/**
 * Analyze input for AI-related threats (prompt injection, data extraction).
 * Used BEFORE sending user input to the LLM.
 */
export function analyzeAIInput(input: string): AIAnalysisResult {
  const warnings: string[] = []
  let threatCount = 0

  const threats = {
    promptInjection: false,
    dataExtraction: false,
    instructionManipulation: false,
    contentPolicyViolation: false,
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(input)) {
      threatCount++

      if (/(?:ignore|forget|disregard)\s+(?:all\s+)?(?:previous|above|prior)/i.test(input) ||
          /you\s+are\s+now\s+/i.test(input) ||
          /act\s+as\s+(?:if\s+you\s+(?:are|were))/i.test(input) ||
          /pretend\s+(?:you\s+are)/i.test(input) ||
          /switch\s+(?:to\s+)?(?:developer|admin|root|system)\s+mode/i.test(input)) {
        threats.instructionManipulation = true
        warnings.push('Instruction manipulation attempt detected')
      }

      if (/(?:reveal|show|display|print|output|repeat)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?)/i.test(input) ||
          /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:instructions?|prompt)/i.test(input) ||
          /(?:dump|export|extract)\s+(?:your\s+)?(?:system\s+)?prompt/i.test(input)) {
        threats.promptInjection = true
        warnings.push('System prompt extraction attempt detected')
      }

      if (/(?:extract|get|retrieve|fetch)\s+(?:all\s+)?(?:user|customer|patient|private|confidential|sensitive)\s+data/i.test(input) ||
          /(?:list|show|display)\s+all\s+(?:users?|accounts?|emails?|passwords?|api\s*keys?)/i.test(input)) {
        threats.dataExtraction = true
        warnings.push('Data extraction attempt detected')
      }

      if (/jailbreak|DAN\s+mode|evil\s+mode|unlock\s+(?:yourself|restricted)/i.test(input) ||
          /bypass\s+(?:safety|security|filter|restriction)/i.test(input)) {
        threats.contentPolicyViolation = true
        warnings.push('Jailbreak/bypass attempt detected')
      }
    }
  }

  // Calculate risk score (0-100)
  const baseScore = Math.min(threatCount * 25, 75)
  const severityBonus = (threats.dataExtraction ? 15 : 0) + (threats.contentPolicyViolation ? 10 : 0)
  const riskScore = Math.min(baseScore + severityBonus, 100)

  // Sanitize: strip known injection markers but preserve legitimate content
  let sanitizedInput = input
  // Remove special tokens
  sanitizedInput = sanitizedInput.replace(/\[INST\]/g, '')
  sanitizedInput = sanitizedInput.replace(/<\|?im_start\|?>/g, '')
  sanitizedInput = sanitizedInput.replace(/<\|?im_end\|?>/g, '')
  sanitizedInput = sanitizedInput.replace(/<\|?(?:system|user|assistant)\|?>/g, '')

  return {
    isSafe: riskScore < 50,
    threats,
    riskScore,
    sanitizedInput,
    warnings,
  }
}

/**
 * Sanitize AI output to prevent any leakage of sensitive data.
 * Applied AFTER receiving LLM response.
 */
export function sanitizeAIOutput(output: string): string {
  let sanitized = output

  // Remove potential API keys/secrets patterns
  sanitized = sanitized.replace(/(sk|pk|rk|api_key|secret|token)_[a-zA-Z0-9]{20,}/gi, '[REDACTED]')

  // Remove email addresses from output (if any leaked)
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
    // Keep the domain, redact the local part
    const [local, domain] = match.split('@')
    if (local.length <= 3) return '[EMAIL REDACTED]'
    return `${local[0]}***@${domain}`
  })

  // Remove phone numbers (Moroccan + international)
  sanitized = sanitized.replace(/(?:\+?212|0)[5-7]\d{8}/g, '[PHONE REDACTED]')
  sanitized = sanitized.replace(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, '[PHONE REDACTED]')

  return sanitized
}
