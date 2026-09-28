/**
 * BazNova — Server-side Layer 2 Anti-Bot Verification System
 *
 * Works alongside security.ts (input scanning) and rate-limit.ts (API rate limiting)
 * to provide comprehensive registration protection against automated bots.
 */

import { db } from '@/lib/db'
import crypto from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface AntiBotVerificationResult {
  passed: boolean
  score: number
  checks: {
    captchaValid: boolean
    emailReputation: number
    disposableEmail: boolean
    ipVelocity: { attempts: number; maxAttempts: number; score: number }
    fingerprintOk: boolean
    behavioralScore: number
    honeypotClean: boolean
  }
  flags: string[]
  blockReason?: string
}

interface IpVelocityEntry {
  timestamps: number[]
}

interface FingerprintEntry {
  timestamps: number[]
  flagged: boolean
}

// ============================================================================
// Disposable Email Domains (100+)
// ============================================================================

const DISPOSABLE_DOMAINS = new Set([
  // guerrillamail
  'guerrillamail.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'sharklasers.com', 'guerrillamail.net', 'guerrillamail.org', 'spam4.me',
  // mailinator
  'mailinator.com', 'mailinator2.com', 'mailinator.org', 'mailinator.net',
  'notmailinator.com', 'mailinater.com', 'mailinator.us',
  // tempmail
  'tempmail.com', 'temp-mail.org', 'tempmail.io', 'temp-mail.io',
  'mytemp.email', 'tempail.com', 'tempmailaddress.com',
  // throwaway
  'throwaway.email', 'throwawaymail.com', 'throwam.com', 'throwawaymailaddress.com',
  // 10minutemail
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  // other major disposable providers
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'jetable.org', 'mailcatch.com',
  'maildrop.cc', 'mailnesia.com', 'mailnull.com', 'mailzilla.org',
  'mintemail.com', 'mohmal.com', 'mytrashmail.com', 'nomail.xl.cx',
  'nospam.ze.tc', 'trashmail.com', 'trashmail.io',
  'trashymail.com', 'wegwerfmail.de', 'wegwerfemail.de', 'discard.email',
  'dispostable.com', 'harakirimail.com', 'inboxkitten.com', 'mailsac.com',
  'mailscrap.com', 'mailtest.com', 'meltmail.com', 'tempinbox.com',
  'fakeinbox.com', 'filzmail.com', 'incognitomail.org',
  'mailexpire.com', 'mailmoat.com', 'mt2015.com',
  'nomail2.me', 'objectmail.com', 'proxymail.eu', 'rcpt.at',
  'reallymymail.com', 'recode.me', 'regbypass.com', 'rmqkr.net',
  'royal.net', 'safersignup.de', 'safetymail.info', 'safetypost.de',
  'saynotospams.com', 'scbox.one', 'schafmail.de', 'selfdestructingmail.com',
  'sendspamhere.com', 'shitmail.org', 'skeefmail.com',
  'slopsbox.com', 'smellfear.com', 'snakemail.com', 'sofimail.com',
  'sogetthis.com', 'spamavert.com', 'spambob.com', 'spambob.net',
  'spambog.com', 'spambog.de', 'spambox.us', 'spambox.io',
  'spamcannon.com', 'spamcannon.net', 'spamday.com',
  'spamfree24.com', 'spamfree24.de', 'spamgourmet.com',
  'spamherelots.com', 'spamhole.com', 'spamify.com', 'spaminator.de',
  'spamlot.com', 'spammotel.com', 'spamobox.com', 'spamthisplease.com',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net',
  'tempmail.altapps.org', 'tempmail.blue', 'tempmail.ninja', 'tempmail.plus',
  'tempmail.pro', 'tempmail.run', 'tempmail2.com', 'tempmailo.com',
  'trash-me.com', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trashmail.org', 'trashmail.ws', 'emailondeck.com',
  'crazymailing.com', 'fakeemail.com', 'generator.email', 'guerrillamail.de',
  'burnermail.io', 'mail.tm', 'tempmailo.org', 'tempmail.nu',
])

// ============================================================================
// Email Domain Reputation
// ============================================================================

const MAJOR_PROVIDERS = new Set([
  'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'protonmail.com',
])

const FREE_PROVIDERS = new Set([
  'zoho.com', 'mail.com', 'gmx.com', 'gmx.net', 'icloud.com',
  'yandex.com', 'tutanota.com', 'tuta.io', 'fastmail.com', 'aol.com',
  'live.com', 'msn.com', 'inbox.com', 'mail.ru', 'proton.me',
])

function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().split('@')
  return parts.length === 2 ? parts[1] : ''
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  return DISPOSABLE_DOMAINS.has(domain)
}

export function getEmailDomainReputation(email: string): number {
  const domain = getEmailDomain(email)
  if (DISPOSABLE_DOMAINS.has(domain)) return 0
  if (MAJOR_PROVIDERS.has(domain)) return 100
  if (FREE_PROVIDERS.has(domain)) return 80
  // Unknown / custom domains — likely corporate
  return 90
}

// ============================================================================
// In-Memory IP Velocity Tracking
// ============================================================================

const ipVelocityStore = new Map<string, IpVelocityEntry>()

const IP_MAX_REGISTRATIONS_24H = 3
const IP_MAX_ATTEMPTS_1H = 5
const IP_WINDOW_24H_MS = 24 * 60 * 60 * 1000
const IP_WINDOW_1H_MS = 60 * 60 * 1000

function pruneOldTimestamps(entries: number[], windowMs: number): number[] {
  const now = Date.now()
  return entries.filter((ts) => now - ts < windowMs)
}

export function getIpVelocity(ip: string): {
  attempts: number
  maxAttempts: number
  score: number
} {
  let entry = ipVelocityStore.get(ip)
  if (!entry) {
    entry = { timestamps: [] }
    ipVelocityStore.set(ip, entry)
  }

  const recent24h = pruneOldTimestamps(entry.timestamps, IP_WINDOW_24H_MS)
  const recent1h = pruneOldTimestamps(recent24h, IP_WINDOW_1H_MS)
  entry.timestamps = recent24h

  // Use the stricter of the two limits for score calculation
  const ratio24h = recent24h.length / IP_MAX_REGISTRATIONS_24H
  const ratio1h = recent1h.length / IP_MAX_ATTEMPTS_1H
  const maxRatio = Math.max(ratio24h, ratio1h)
  const score = Math.max(0, Math.round(100 * (1 - maxRatio)))

  return {
    attempts: recent24h.length,
    maxAttempts: IP_MAX_REGISTRATIONS_24H,
    score,
  }
}

export function recordIpAttempt(ip: string): void {
  let entry = ipVelocityStore.get(ip)
  if (!entry) {
    entry = { timestamps: [] }
    ipVelocityStore.set(ip, entry)
  }
  entry.timestamps.push(Date.now())
}

function isIpVelocityBlocked(ip: string): boolean {
  let entry = ipVelocityStore.get(ip)
  if (!entry) return false
  const recent24h = pruneOldTimestamps(entry.timestamps, IP_WINDOW_24H_MS)
  entry.timestamps = recent24h
  if (recent24h.length >= IP_MAX_REGISTRATIONS_24H) return true
  const recent1h = pruneOldTimestamps(recent24h, IP_WINDOW_1H_MS)
  return recent1h.length >= IP_MAX_ATTEMPTS_1H
}

// ============================================================================
// In-Memory Fingerprint Tracking
// ============================================================================

const fingerprintStore = new Map<string, FingerprintEntry>()

const FINGERPRINT_MAX_ACCOUNTS_24H = 2
const FINGERPRINT_WINDOW_MS = 24 * 60 * 60 * 1000

export function checkFingerprint(
  fingerprintHash: string
): { ok: boolean; count: number; previouslyFlagged: boolean } {
  if (!fingerprintHash) return { ok: true, count: 0, previouslyFlagged: false }

  let entry = fingerprintStore.get(fingerprintHash)
  if (!entry) {
    entry = { timestamps: [], flagged: false }
    fingerprintStore.set(fingerprintHash, entry)
  }

  entry.timestamps = pruneOldTimestamps(entry.timestamps, FINGERPRINT_WINDOW_MS)
  const count = entry.timestamps.length

  return {
    ok: count < FINGERPRINT_MAX_ACCOUNTS_24H && !entry.flagged,
    count,
    previouslyFlagged: entry.flagged,
  }
}

export function recordFingerprintAccount(fingerprintHash: string): void {
  if (!fingerprintHash) return
  let entry = fingerprintStore.get(fingerprintHash)
  if (!entry) {
    entry = { timestamps: [], flagged: false }
    fingerprintStore.set(fingerprintHash, entry)
  }
  entry.timestamps.push(Date.now())
}

export function flagFingerprint(fingerprintHash: string): void {
  if (!fingerprintHash) return
  let entry = fingerprintStore.get(fingerprintHash)
  if (!entry) {
    entry = { timestamps: [], flagged: false }
    fingerprintStore.set(fingerprintHash, entry)
  }
  entry.flagged = true
}

// ============================================================================
// Captcha Token Validation
// ============================================================================

const CAPTCHA_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Validate that a captchaToken is present and not expired.
 * The token is expected to be a base64-encoded JSON: { "ts": <epoch_ms> }
 * If it cannot be decoded or is expired, the captcha is invalid.
 */
function validateCaptchaToken(token: string): boolean {
  if (!token || token.length < 4) return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parsed: { ts?: number } = JSON.parse(decoded)
    if (typeof parsed.ts !== 'number') return false
    const age = Date.now() - parsed.ts
    return age >= 0 && age < CAPTCHA_MAX_AGE_MS
  } catch {
    return false
  }
}

// ============================================================================
// Honeypot Check
// ============================================================================

function isHoneypotClean(value: string): boolean {
  return !value || value.trim().length === 0
}

// ============================================================================
// In-Memory Store Cleanup (24h TTL)
// ============================================================================

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // every 10 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function cleanupInMemoryStores(): void {
  const now = Date.now()
  const cutoff = now - IP_WINDOW_24H_MS

  for (const [key, entry] of ipVelocityStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff)
    if (entry.timestamps.length === 0) ipVelocityStore.delete(key)
  }

  for (const [key, entry] of fingerprintStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff)
    if (entry.timestamps.length === 0 && !entry.flagged) fingerprintStore.delete(key)
  }
}

if (typeof globalThis !== 'undefined' && !cleanupTimer && typeof setInterval === 'function') {
  cleanupTimer = setInterval(cleanupInMemoryStores, CLEANUP_INTERVAL_MS)
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') cleanupTimer.unref()
}

// ============================================================================
// Tracking ID Generator
// ============================================================================

const TRACKING_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars, no 0/O/1/I/L
const TRACKING_ID_LENGTH = 7

export function generateTrackingId(): string {
  const bytes = crypto.randomBytes(TRACKING_ID_LENGTH)
  let result = 'HNV-'
  for (let i = 0; i < TRACKING_ID_LENGTH; i++) {
    result += TRACKING_ID_CHARS[bytes[i] % TRACKING_ID_CHARS.length]
  }
  return result
}

// ============================================================================
// Registration Attempt Logging
// ============================================================================

export async function logRegistrationAttempt(data: {
  email?: string
  ip: string
  fingerprintHash?: string
  captchaChallenge: string
  captchaAnswer?: string
  captchaCorrect: boolean
  behavioralScore: number
  totalTimeMs: number
  mouseMovements?: number
  keystrokes?: number
  verificationPassed: boolean
  blocked: boolean
  blockReason?: string
  userAgent?: string
}): Promise<void> {
  try {
    await db.registrationAttempt.create({
      data: {
        email: data.email ?? null,
        ip: data.ip,
        fingerprintHash: data.fingerprintHash ?? null,
        captchaChallenge: data.captchaChallenge,
        captchaAnswer: data.captchaAnswer ?? null,
        captchaCorrect: data.captchaCorrect,
        behavioralScore: data.behavioralScore,
        totalTimeMs: data.totalTimeMs,
        mouseMovements: data.mouseMovements ?? null,
        keystrokes: data.keystrokes ?? null,
        verificationPassed: data.verificationPassed,
        blocked: data.blocked,
        blockReason: data.blockReason ?? null,
        userAgent: data.userAgent ?? null,
      },
    })
  } catch (error) {
    console.error('[ANTI-BOT] Failed to log registration attempt:', error)
  }
}

// ============================================================================
// Comprehensive Verification Function
// ============================================================================

export async function verifyRegistration(
  data: {
    email: string
    captchaToken: string
    behavioralScore: number
    totalTimeMs: number
    mouseMovements: number
    keystrokes: number
    honeypotValue: string
    fingerprintHash: string
  },
  ip: string
): Promise<AntiBotVerificationResult> {
  const flags: string[] = []
  let blockReason: string | undefined
  let shouldBlock = false

  // --- 1. Captcha Validation ---
  const captchaValid = validateCaptchaToken(data.captchaToken)
  if (!captchaValid) {
    flags.push('captcha_invalid_or_expired')
    shouldBlock = true
    blockReason = 'captcha_invalid_or_expired'
  }

  // --- 2. Email Reputation & Disposable Check ---
  const disposableEmail = isDisposableEmail(data.email)
  const emailReputation = getEmailDomainReputation(data.email)

  if (disposableEmail) {
    flags.push('disposable_email')
    shouldBlock = true
    blockReason = 'disposable_email'
  } else if (emailReputation < 50) {
    flags.push('low_email_reputation')
  }

  // --- 3. IP Velocity Check ---
  const ipVelocityBlocked = isIpVelocityBlocked(ip)
  const ipVelocity = getIpVelocity(ip)

  if (ipVelocityBlocked) {
    flags.push('ip_velocity_exceeded')
    shouldBlock = true
    blockReason = blockReason ?? 'rate_limit'
  } else if (ipVelocity.score < 50) {
    flags.push('ip_velocity_high')
  }

  // --- 4. Fingerprint Check ---
  const fpResult = checkFingerprint(data.fingerprintHash)
  const fingerprintOk = fpResult.ok

  if (!fingerprintOk) {
    flags.push('fingerprint_limit_exceeded')
    shouldBlock = true
    blockReason = blockReason ?? 'fingerprint_ban'
  }
  if (fpResult.previouslyFlagged) {
    flags.push('fingerprint_previously_flagged')
  }

  // --- 5. Behavioral Score ---
  const behavioralScore = data.behavioralScore

  if (behavioralScore < 20) {
    flags.push('behavior_suspicious')
    shouldBlock = true
    blockReason = blockReason ?? 'low_score'
  } else if (behavioralScore < 40) {
    flags.push('behavior_low_confidence')
  }

  // --- 6. Honeypot Check ---
  const honeypotClean = isHoneypotClean(data.honeypotValue)

  if (!honeypotClean) {
    flags.push('honeypot_triggered')
    shouldBlock = true
    blockReason = blockReason ?? 'honeypot_triggered'
    // Silently flag the fingerprint
    flagFingerprint(data.fingerprintHash)
  }

  // --- 7. Record attempt in in-memory stores ---
  recordIpAttempt(ip)
  if (!shouldBlock) {
    recordFingerprintAccount(data.fingerprintHash)
  }

  // --- 8. Compute overall score (weighted average) ---
  const captchaWeight = 0.25
  const emailWeight = 0.15
  const ipWeight = 0.20
  const fingerprintWeight = 0.15
  const behaviorWeight = 0.15
  const honeypotWeight = 0.10

  const captchaScore = captchaValid ? 100 : 0
  const fingerprintScore = fingerprintOk ? 100 : 0
  const honeypotScore = honeypotClean ? 100 : 0

  const overallScore = Math.round(
    captchaScore * captchaWeight +
    emailReputation * emailWeight +
    ipVelocity.score * ipWeight +
    fingerprintScore * fingerprintWeight +
    behavioralScore * behaviorWeight +
    honeypotScore * honeypotWeight
  )

  const passed = !shouldBlock && overallScore >= 40

  return {
    passed,
    score: overallScore,
    checks: {
      captchaValid,
      emailReputation,
      disposableEmail,
      ipVelocity,
      fingerprintOk,
      behavioralScore,
      honeypotClean,
    },
    flags,
    blockReason: shouldBlock ? blockReason : undefined,
  }
}
