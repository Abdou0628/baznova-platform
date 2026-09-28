/**
 * HNSA — AI Security Gateway
 *
 * Wraps all LLM calls with security controls:
 * - Prompt injection detection
 * - PII redaction before sending to LLM
 * - Input length limits
 * - Output PII validation
 * - Per-user rate limiting
 * - Abuse logging to AISecurityEvent table
 *
 * @module hnsa/ai-gateway
 */

import { db } from '@/lib/db';
import { createHash } from 'crypto';

// ===== Constants =====

/** Maximum allowed input length in characters. */
const MAX_INPUT_LENGTH = 10_000;

/** Maximum AI calls per user per minute. */
const RATE_LIMIT_PER_MINUTE = 20;

/** Maximum AI calls per user per hour. */
const RATE_LIMIT_PER_HOUR = 100;

/** Duration of a rate-limit window in milliseconds. */
const MINUTE_MS = 60_000;

/** Duration of an hourly rate-limit window in milliseconds. */
const HOUR_MS = 3_600_000;

// ===== PII Patterns =====

/**
 * Compiled regex patterns for Personally Identifiable Information detection.
 * Each entry maps a human-readable label to a RegExp.
 */
const PII_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp }> = [
  {
    label: 'email',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  {
    label: 'phone_international',
    regex: /(?:\+?1\s?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
  },
  {
    label: 'phone_moroccan',
    regex: /(?:\+212|00212)?\s?[67]\d{8}/g,
  },
  {
    label: 'credit_card',
    regex: /(?:\d[\s-]?){12,19}/g,
  },
  {
    label: 'iban',
    regex: /[A-Z]{2}\d{2}\s?[A-Z0-9]{4,}\s?(?:[A-Z0-9]{4}\s?){1,6}[A-Z0-9]{0,4}/g,
  },
  {
    label: 'cin_moroccan',
    regex: /\b[A-Z]{1,2}\d{5,6}\b/g,
  },
];

// ===== Prompt Injection Patterns =====

/**
 * Compiled regex patterns for common prompt injection techniques.
 * Matches are case-insensitive.
 */
const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /ignore\s+(all\s+)?(previous|prior|above)?\s*(instructions?|prompts?|rules?|directives?)/i,
  /you\s+are\s+now\s+(?:a|an|the)/i,
  /system\s+prompt/i,
  /forget\s+(your|the|all)\s+(instructions?|rules?|training|prompt)/i,
  /pretend\s+(?:you\s+are|to\s+be|that\s+you)/i,
  /act\s+as\s+(?:if\s+you\s+(?:are|were)|a|an)/i,
  /roleplay\s+as/i,
  /\{[\s\S]*?"(?:system|instructions?|prompt)":[\s\S]*?\}/i,
  /```(?:system|instructions?|prompt)[\s\S]*?```/i,
  /[A-Za-z0-9+/]{20,}={0,2}/, // base64-encoded instructions
  /<(?:system|instructions?|prompt)>[\s\S]*?<\/\1>/i,
  /jailbreak/i,
  /dan\s+\d+\.?\d*/i, // DAN jailbreak variants
  /\[INST\][\s\S]*?<\/INST>/i, // LLaMA-style injection
];

// ===== Rate Limit Store =====

/** Shape of a per-user rate-limit bucket. */
interface RateLimitBucket {
  /** Array of timestamps (ms) of AI calls within the minute window. */
  minuteCalls: number[];
  /** Array of timestamps (ms) of AI calls within the hour window. */
  hourCalls: number[];
}

/**
 * In-memory rate-limit store keyed by userId.
 * Map is periodically pruned to avoid unbounded memory growth.
 */
const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * Prune expired entries from the rate-limit store.
 * Called on every `checkAIAbuseLimit` invocation to keep memory bounded.
 */
function pruneRateLimitStore(): void {
  const now = Date.now();
  for (const [userId, bucket] of rateLimitStore.entries()) {
    const recentMinute = bucket.minuteCalls.filter(
      (t) => now - t < MINUTE_MS,
    );
    const recentHour = bucket.hourCalls.filter((t) => now - t < HOUR_MS);
    if (recentMinute.length === 0 && recentHour.length === 0) {
      rateLimitStore.delete(userId);
    } else {
      bucket.minuteCalls = recentMinute;
      bucket.hourCalls = recentHour;
    }
  }
}

// ===== Types =====

/** Result of securing an AI input. */
export interface SecureAIInputResult {
  /** The sanitized input string with PII redacted. */
  sanitized: string;
  /** Whether the input was blocked entirely. */
  blocked: boolean;
  /** Human-readable reason the input was blocked (if `blocked` is true). */
  blockReason?: string;
  /** List of PII types detected in the input (e.g. 'email', 'phone_moroccan'). */
  piiDetected: string[];
}

/** Result of validating an AI output. */
export interface ValidateAIOutputResult {
  /** Whether the output is clean (no PII leaks detected). */
  clean: boolean;
  /** List of PII types found in the output. */
  piiFound: string[];
}

/** Result of checking the AI abuse limit for a user. */
export interface CheckAIAbuseLimitResult {
  /** Whether the user is allowed to make another AI call. */
  allowed: boolean;
  /** If `allowed` is false, milliseconds until the user can retry. */
  retryAfterMs: number;
}

/** Parameters for logging an AI security event. */
export interface LogAIEventParams {
  /** User ID who triggered the event. */
  userId?: string;
  /** Action type (e.g. 'ai_prompt_sent', 'ai_abuse_blocked'). */
  action: string;
  /** Severity level: 'info' | 'warning' | 'critical'. */
  severity?: string;
  /** SHA-256 hash of the input prompt (for deduplication). */
  inputHash?: string;
  /** Length of the input prompt in characters. */
  inputLength?: number;
  /** Length of the AI output in characters. */
  outputLength?: number;
  /** Model identifier (e.g. 'gpt-4', 'claude-3'). */
  model?: string;
  /** Number of tokens consumed. */
  tokensUsed?: number;
  /** Whether the request was blocked. */
  blocked?: boolean;
  /** Reason the request was blocked. */
  blockReason?: string;
  /** Client IP address. */
  ip?: string;
}

// ===== Internal Helpers =====

/**
 * Compute a SHA-256 hash of the given input string.
 * Used for input deduplication in security event logs.
 *
 * @param input - The string to hash.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashInput(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Detect all PII types present in the given text.
 *
 * @param text - The text to scan for PII.
 * @returns Array of PII labels found (e.g. ['email', 'phone_moroccan']).
 */
function detectPII(text: string): string[] {
  const found: string[] = [];
  for (const { label, regex } of PII_PATTERNS) {
    regex.lastIndex = 0; // Reset regex state
    if (regex.test(text)) {
      found.push(label);
    }
  }
  return found;
}

/**
 * Redact all detected PII in the given text.
 * Each match is replaced with a labelled placeholder like `[REDACTED_EMAIL]`.
 *
 * @param text - The text containing potential PII.
 * @returns The text with all PII replaced by redaction placeholders.
 */
function redactPII(text: string): string {
  let result = text;
  for (const { label, regex } of PII_PATTERNS) {
    regex.lastIndex = 0;
    const tag = `[REDACTED_${label.toUpperCase()}]`;
    result = result.replace(regex, tag);
  }
  return result;
}

/**
 * Check whether the given text contains prompt injection patterns.
 *
 * @param text - The input text to inspect.
 * @returns The first matched injection description, or `null` if clean.
 */
function detectPromptInjection(text: string): string | null {
  const descriptions: string[] = [
    'Attempt to ignore previous instructions',
    'Role-switching directive detected',
    'System prompt reference detected',
    'Memory/training forget directive',
    'Pretend/roleplay directive detected',
    'Act-as directive detected',
    'Roleplay directive detected',
    'JSON system instruction injection',
    'Fenced code block injection',
    'Base64-encoded instruction detected',
    'XML tag instruction injection',
    'Jailbreak keyword detected',
    'DAN jailbreak variant detected',
    'LLaMA-style injection tag detected',
  ];

  for (let i = 0; i < INJECTION_PATTERNS.length; i++) {
    const pattern = INJECTION_PATTERNS[i]!;
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return descriptions[i] ?? 'Suspicious pattern detected';
    }
  }
  return null;
}

// ===== Exported Functions =====

/**
 * Secure an AI input by detecting prompt injections, redacting PII, and enforcing length limits.
 *
 * This is the main entry point that **all** LLM calls should pass through before
 * sending user input to any AI model.
 *
 * - If prompt injection is detected, the input is **blocked** entirely.
 * - If PII is found, it is **redacted** and the event is logged.
 * - If the input exceeds {@link MAX_INPUT_LENGTH}, it is **blocked**.
 * - All blocks and PII detections are logged to the `AISecurityEvent` table.
 *
 * @param input - The raw user input intended for an LLM.
 * @param userId - Optional user ID for rate-limiting and event correlation.
 * @returns A result object with the sanitized string and metadata.
 *
 * @example
 * ```ts
 * import { secureAIInput } from '@/lib/hnsa';
 *
 * const result = secureAIInput(userPrompt, session.user.id);
 * if (result.blocked) {
 *   return NextResponse.json({ error: result.blockReason }, { status: 429 });
 * }
 * // Use result.sanitized as the prompt to the LLM
 * ```
 */
export function secureAIInput(
  input: string,
  userId?: string,
): SecureAIInputResult {
  // 1. Length check
  if (input.length > MAX_INPUT_LENGTH) {
    void logAIEvent({
      userId,
      action: 'ai_abuse_blocked',
      severity: 'warning',
      inputHash: hashInput(input),
      inputLength: input.length,
      blocked: true,
      blockReason: 'Input exceeds maximum length',
    });
    return {
      sanitized: '',
      blocked: true,
      blockReason: `Input exceeds maximum length of ${MAX_INPUT_LENGTH.toLocaleString()} characters`,
      piiDetected: [],
    };
  }

  // 2. Prompt injection detection
  const injectionReason = detectPromptInjection(input);
  if (injectionReason) {
    void logAIEvent({
      userId,
      action: 'ai_prompt_injection_detected',
      severity: 'critical',
      inputHash: hashInput(input),
      inputLength: input.length,
      blocked: true,
      blockReason: injectionReason,
    });
    return {
      sanitized: '',
      blocked: true,
      blockReason: injectionReason,
      piiDetected: [],
    };
  }

  // 3. PII detection and redaction
  const piiDetected = detectPII(input);
  const sanitized = redactPII(input);

  // Log PII detection events (non-blocking)
  if (piiDetected.length > 0) {
    void logAIEvent({
      userId,
      action: 'ai_data_leak_prevented',
      severity: 'warning',
      inputHash: hashInput(input),
      inputLength: input.length,
      blocked: false,
      blockReason: `PII redacted: ${piiDetected.join(', ')}`,
    });
  }

  // 4. Log the successful prompt send
  void logAIEvent({
    userId,
    action: 'ai_prompt_sent',
    severity: 'info',
    inputHash: hashInput(sanitized),
    inputLength: sanitized.length,
  });

  return {
    sanitized,
    blocked: false,
    piiDetected,
  };
}

/**
 * Validate an AI output for PII leaks.
 *
 * Checks whether the LLM response contains any personally identifiable information
 * (emails, phone numbers, credit cards, etc.) that should not be returned to the user.
 *
 * @param output - The raw text returned by the LLM.
 * @param userId - Optional user ID for event correlation.
 * @returns A result indicating whether the output is clean and what PII was found.
 *
 * @example
 * ```ts
 * import { validateAIOutput } from '@/lib/hnsa';
 *
 * const validation = validateAIOutput(aiResponse, session.user.id);
 * if (!validation.clean) {
 *   // Redact or strip PII before returning to the user
 *   console.warn('PII leak detected in AI output:', validation.piiFound);
 * }
 * ```
 */
export function validateAIOutput(
  output: string,
  userId?: string,
): ValidateAIOutputResult {
  const piiFound = detectPII(output);

  if (piiFound.length > 0) {
    void logAIEvent({
      userId,
      action: 'ai_data_leak_prevented',
      severity: 'warning',
      inputHash: hashInput(output),
      outputLength: output.length,
      blocked: false,
      blockReason: `PII in output: ${piiFound.join(', ')}`,
    });
  }

  void logAIEvent({
    userId,
    action: 'ai_response_received',
    severity: 'info',
    outputLength: output.length,
  });

  return {
    clean: piiFound.length === 0,
    piiFound,
  };
}

/**
 * Check whether a user has exceeded the AI abuse rate limit.
 *
 * Enforces two sliding-window limits:
 * - **20 calls per minute** per user
 * - **100 calls per hour** per user
 *
 * If either limit is exceeded, the user must wait until the oldest call in the
 * exceeded window expires.
 *
 * @param userId - The user ID to check.
 * @returns Whether the user is allowed to proceed, and if not, when they can retry.
 *
 * @example
 * ```ts
 * import { checkAIAbuseLimit } from '@/lib/hnsa';
 *
 * const { allowed, retryAfterMs } = checkAIAbuseLimit(user.id);
 * if (!allowed) {
 *   return NextResponse.json(
 *     { error: `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s` },
 *     { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
 *   );
 * }
 * ```
 */
export function checkAIAbuseLimit(
  userId: string,
): CheckAIAbuseLimitResult {
  const now = Date.now();

  // Prune expired entries periodically
  pruneRateLimitStore();

  let bucket = rateLimitStore.get(userId);
  if (!bucket) {
    bucket = { minuteCalls: [], hourCalls: [] };
    rateLimitStore.set(userId, bucket);
  }

  // Filter to active windows
  const activeMinute = bucket.minuteCalls.filter((t) => now - t < MINUTE_MS);
  const activeHour = bucket.hourCalls.filter((t) => now - t < HOUR_MS);

  // Check per-minute limit
  if (activeMinute.length >= RATE_LIMIT_PER_MINUTE) {
    const oldestInMinute = Math.min(...activeMinute);
    const retryAfterMs = MINUTE_MS - (now - oldestInMinute);
    void logAIEvent({
      userId,
      action: 'ai_abuse_blocked',
      severity: 'warning',
      blocked: true,
      blockReason: 'Rate limit exceeded (per-minute)',
    });
    return { allowed: false, retryAfterMs };
  }

  // Check per-hour limit
  if (activeHour.length >= RATE_LIMIT_PER_HOUR) {
    const oldestInHour = Math.min(...activeHour);
    const retryAfterMs = HOUR_MS - (now - oldestInHour);
    void logAIEvent({
      userId,
      action: 'ai_abuse_blocked',
      severity: 'warning',
      blocked: true,
      blockReason: 'Rate limit exceeded (per-hour)',
    });
    return { allowed: false, retryAfterMs };
  }

  // Record this call
  activeMinute.push(now);
  activeHour.push(now);
  bucket.minuteCalls = activeMinute;
  bucket.hourCalls = activeHour;

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Log an AI security event to the `AISecurityEvent` table.
 *
 * This function is **non-blocking** — it catches any database errors and logs
 * them to the console rather than throwing, ensuring that a failing log never
 * breaks the primary request flow.
 *
 * @param params - The event details. See {@link LogAIEventParams}.
 *
 * @example
 * ```ts
 * import { logAIEvent, hashInput } from '@/lib/hnsa';
 *
 * await logAIEvent({
 *   userId: 'clxxx...',
 *   action: 'ai_prompt_sent',
 *   severity: 'info',
 *   inputHash: hashInput(prompt),
 *   inputLength: prompt.length,
 *   model: 'gpt-4',
 *   tokensUsed: 150,
 * });
 * ```
 */
export async function logAIEvent(
  params: LogAIEventParams,
): Promise<void> {
  try {
    await db.aISecurityEvent.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        severity: params.severity ?? 'info',
        inputHash: params.inputHash ?? null,
        inputLength: params.inputLength ?? null,
        outputLength: params.outputLength ?? null,
        model: params.model ?? null,
        tokensUsed: params.tokensUsed ?? null,
        blocked: params.blocked ?? false,
        blockReason: params.blockReason ?? null,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    // Non-blocking: never let security logging break the request flow
    console.error('[HNSA] Failed to write AI security event:', error);
  }
}
