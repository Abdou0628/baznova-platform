import { checkRateLimit, getRateLimitCategory } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the general limit (30)', () => {
    const ip = '192.168.1.1'
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit(ip, 'general')
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks after the general limit is exceeded', () => {
    const ip = '192.168.1.2'
    // Use up all 30 requests
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip, 'general')
    }
    // 31st should be blocked
    const result = checkRateLimit(ip, 'general')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('calculates correct retryAfterMs', () => {
    const ip = '192.168.1.3'
    // Use up all auth limit (5)
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, 'auth')
    }
    const blocked = checkRateLimit(ip, 'auth')
    expect(blocked.allowed).toBe(false)
    // retryAfterMs should be close to 60000ms (1 minute window)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000)
  })

  it('respects different windows for general vs generation', () => {
    const ip = '192.168.1.4'
    // General allows 30 requests
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit(ip, 'general').allowed).toBe(true)
    }
    // Generation should still allow requests (separate category)
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(ip, 'generation').allowed).toBe(true)
    }
    // Generation limit (3) should now be exceeded
    expect(checkRateLimit(ip, 'generation').allowed).toBe(false)
  })

  it('allows requests again after window expires', () => {
    vi.useRealTimers()
    const ip = '192.168.1.5'
    // Use up all auth requests
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, 'auth')
    }
    expect(checkRateLimit(ip, 'auth').allowed).toBe(false)

    vi.useFakeTimers()
    // Advance time past the 60s window
    vi.advanceTimersByTime(61_000)
    // Should now be allowed again
    const result = checkRateLimit(ip, 'auth')
    expect(result.allowed).toBe(true)
  })

  it('returns retryAfterMs of 0 when allowed', () => {
    const result = checkRateLimit('192.168.1.6', 'general')
    expect(result.allowed).toBe(true)
    expect(result.retryAfterMs).toBe(0)
  })
})

describe('getRateLimitCategory', () => {
  it('returns "auth" for auth paths', () => {
    expect(getRateLimitCategory('/api/auth/register')).toBe('auth')
    expect(getRateLimitCategory('/api/auth/reset-password')).toBe('auth')
    expect(getRateLimitCategory('/api/auth/send-reset-code')).toBe('auth')
    expect(getRateLimitCategory('/api/auth/verify-reset-code')).toBe('auth')
  })

  it('returns "generation" for generation paths', () => {
    expect(getRateLimitCategory('/api/generate-cv')).toBe('generation')
    expect(getRateLimitCategory('/api/generate-cover-letter')).toBe('generation')
    expect(getRateLimitCategory('/api/analyze-ats')).toBe('generation')
    expect(getRateLimitCategory('/api/chatbot')).toBe('generation')
  })

  it('returns "general" for other paths', () => {
    expect(getRateLimitCategory('/api/users')).toBe('general')
    expect(getRateLimitCategory('/api/jobs')).toBe('general')
    expect(getRateLimitCategory('/api/some/other/path')).toBe('general')
  })
})
