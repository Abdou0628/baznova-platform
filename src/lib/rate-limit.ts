/**
 * In-memory sliding-window rate limiter for API routes.
 * Tracks requests per IP with configurable limits per route category.
 */

interface RateLimitEntry {
  timestamps: number[]
}

type RateLimitCategory = 'general' | 'auth' | 'generation'

const LIMITS: Record<RateLimitCategory, { maxRequests: number; windowMs: number }> = {
  general: { maxRequests: 30, windowMs: 60_000 },
  auth: { maxRequests: 5, windowMs: 60_000 },
  generation: { maxRequests: 3, windowMs: 60_000 },
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60_000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < 120_000) // Keep 2 min window
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

if (typeof globalThis !== 'undefined') {
  // Ensure cleanup runs only once
  if (!cleanupTimer && typeof setInterval === 'function') {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL)
    // Unref so it doesn't block process exit
    if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
      cleanupTimer.unref()
    }
  }
}

/**
 * Check rate limit for a given IP and category.
 * Returns { allowed, retryAfterMs } — if allowed is false, retryAfterMs tells
 * how many milliseconds until the next request will be accepted.
 */
export function checkRateLimit(
  ip: string,
  category: RateLimitCategory = 'general'
): { allowed: boolean; retryAfterMs: number } {
  const config = LIMITS[category]
  const key = `${ip}:${category}`
  const now = Date.now()

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Slide window: remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < config.windowMs)

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0]
    const retryAfterMs = oldest + config.windowMs - now
    return { allowed: false, retryAfterMs }
  }

  entry.timestamps.push(now)
  return { allowed: true, retryAfterMs: 0 }
}

/**
 * Generic rate limiter that works with any custom key (email, IP, etc.).
 * Returns { success, retryAfterMs }.
 */
export async function rateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number }
): Promise<{ success: boolean; retryAfterMs: number }> {
  const now = Date.now()
  let entry = store.get(`custom:${key}`)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(`custom:${key}`, entry)
  }
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < opts.windowMs)
  if (entry.timestamps.length >= opts.maxRequests) {
    const oldest = entry.timestamps[0]
    const retryAfterMs = oldest + opts.windowMs - now
    return { success: false, retryAfterMs }
  }
  entry.timestamps.push(now)
  return { success: true, retryAfterMs: 0 }
}

/**
 * Determine rate-limit category from a request path.
 */
export function getRateLimitCategory(pathname: string): RateLimitCategory {
  const authPaths = [
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/auth/send-reset-code',
    '/api/auth/verify-reset-code',
  ]

  const generationPaths = [
    '/api/generate-cv',
    '/api/generate-cover-letter',
    '/api/analyze-ats',
  ]

  if (authPaths.some((p) => pathname.startsWith(p))) return 'auth'
  if (generationPaths.some((p) => pathname.startsWith(p))) return 'generation'
  return 'general'
}
