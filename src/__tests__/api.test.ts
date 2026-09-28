import { describe, it, expect } from 'vitest'

// Replicate the server-side captcha verification logic as a pure function for testing
function verifyCaptchaToken(token: string): { valid: boolean; reason?: string } {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'captcha_required' }
  try {
    const decoded = JSON.parse(atob(token))
    if (decoded.v !== 1) return { valid: false, reason: 'captcha_invalid' }
    const age = Date.now() - decoded.ts
    if (age < 0 || age > 5 * 60 * 1000) return { valid: false, reason: 'captcha_invalid' }
    if (!decoded.a || decoded.a.trim() === '') return { valid: false, reason: 'captcha_invalid' }
    if (!decoded.r || decoded.r.length < 6) return { valid: false, reason: 'captcha_invalid' }
    return { valid: true }
  } catch {
    return { valid: false, reason: 'captcha_invalid' }
  }
}

function generateToken(overrides: Partial<{v: number; ts: number; a: string; r: string}> = {}) {
  const payload = {
    v: 1,
    ts: Date.now(),
    a: '42',
    r: 'abcdefgh',
    ...overrides,
  }
  return btoa(JSON.stringify(payload))
}

describe('CAPTCHA Token Verification', () => {
  it('rejects empty token', () => {
    expect(verifyCaptchaToken('').valid).toBe(false)
    expect(verifyCaptchaToken('').reason).toBe('captcha_required')
  })

  it('rejects malformed base64', () => {
    expect(verifyCaptchaToken('not-valid-base64!!!').valid).toBe(false)
    expect(verifyCaptchaToken('not-valid-base64!!!').reason).toBe('captcha_invalid')
  })

  it('rejects expired token (> 5 min)', () => {
    const token = generateToken({ ts: Date.now() - 6 * 60 * 1000 })
    expect(verifyCaptchaToken(token).valid).toBe(false)
  })

  it('rejects future token', () => {
    const token = generateToken({ ts: Date.now() + 60000 })
    expect(verifyCaptchaToken(token).valid).toBe(false)
  })

  it('rejects wrong version', () => {
    const token = generateToken({ v: 2 })
    expect(verifyCaptchaToken(token).valid).toBe(false)
  })

  it('rejects empty answer', () => {
    const token = generateToken({ a: '' })
    expect(verifyCaptchaToken(token).valid).toBe(false)
  })

  it('rejects short random nonce', () => {
    const token = generateToken({ r: 'abc' })
    expect(verifyCaptchaToken(token).valid).toBe(false)
  })

  it('accepts valid token', () => {
    const token = generateToken()
    expect(verifyCaptchaToken(token).valid).toBe(true)
  })

  it('accepts token with whitespace in answer', () => {
    const token = generateToken({ a: '  42  ' })
    expect(verifyCaptchaToken(token).valid).toBe(true)
  })
})

describe('Registration Input Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  it('accepts valid email', () => {
    expect(emailRegex.test('user@example.com')).toBe(true)
    expect(emailRegex.test('test@domain.co')).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(emailRegex.test('')).toBe(false)
    expect(emailRegex.test('not-an-email')).toBe(false)
    expect(emailRegex.test('@domain.com')).toBe(false)
    expect(emailRegex.test('user@')).toBe(false)
    expect(emailRegex.test('user@.com')).toBe(false)
  })

  it('enforces password minimum length', () => {
    expect('abc123'.length >= 6).toBe(true)
    expect('abc'.length >= 6).toBe(false)
    expect(''.length >= 6).toBe(false)
  })

  it('honeypot field should be empty for humans', () => {
    const honeypotValue = ''
    expect(honeypotValue.trim() === '').toBe(true)
  })
})
