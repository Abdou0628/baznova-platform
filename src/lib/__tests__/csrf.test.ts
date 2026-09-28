import { generateCsrfToken, validateCsrfToken, cleanupExpiredTokens } from '@/lib/csrf'

describe('generateCsrfToken', () => {
  it('returns a string', () => {
    const token = generateCsrfToken()
    expect(typeof token).toBe('string')
  })

  it('returns a non-empty UUID string', () => {
    const token = generateCsrfToken()
    expect(token.length).toBeGreaterThan(0)
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('returns unique tokens on each call', () => {
    const token1 = generateCsrfToken()
    const token2 = generateCsrfToken()
    expect(token1).not.toBe(token2)
  })
})

describe('validateCsrfToken', () => {
  it('returns true for a valid token', () => {
    const token = generateCsrfToken()
    expect(validateCsrfToken(token)).toBe(true)
  })

  it('consumes the token (second validation fails)', () => {
    const token = generateCsrfToken()
    expect(validateCsrfToken(token)).toBe(true)
    expect(validateCsrfToken(token)).toBe(false)
  })

  it('returns false for an invalid (never generated) token', () => {
    expect(validateCsrfToken('nonexistent-token-id')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(validateCsrfToken('')).toBe(false)
  })

  it('returns false for an expired token', () => {
    vi.useFakeTimers()
    const token = generateCsrfToken()
    // Advance past 1 hour expiry
    vi.advanceTimersByTime(61 * 60 * 1000)
    expect(validateCsrfToken(token)).toBe(false)
    vi.useRealTimers()
  })
})

describe('cleanupExpiredTokens', () => {
  it('removes expired tokens from the store', () => {
    vi.useFakeTimers()
    const token = generateCsrfToken()
    // Advance past 1 hour expiry
    vi.advanceTimersByTime(61 * 60 * 1000)
    cleanupExpiredTokens()
    // Token should no longer be valid after cleanup
    expect(validateCsrfToken(token)).toBe(false)
    vi.useRealTimers()
  })
})
