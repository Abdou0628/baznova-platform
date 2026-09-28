vi.mock('@/lib/db', () => ({
  db: {
    apiSubscriber: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    apiUsageLog: {
      create: vi.fn(),
    },
  },
}))

import { generateApiKey, generateApiSecret, hashSecret, getClientIP } from '@/lib/api-auth'

describe('generateApiKey', () => {
  it('returns a string', () => {
    const key = generateApiKey()
    expect(typeof key).toBe('string')
  })

  it('starts with "hnv_live_" prefix', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^hnv_live_/)
  })

  it('has correct format: prefix + 48 hex chars', () => {
    const key = generateApiKey()
    // 24 random bytes = 48 hex characters
    const hexPart = key.replace('hnv_live_', '')
    expect(hexPart).toHaveLength(48)
    expect(hexPart).toMatch(/^[0-9a-f]{48}$/)
  })

  it('generates unique keys', () => {
    const key1 = generateApiKey()
    const key2 = generateApiKey()
    expect(key1).not.toBe(key2)
  })
})

describe('generateApiSecret', () => {
  it('returns a string starting with "hnv_sec_"', () => {
    const secret = generateApiSecret()
    expect(typeof secret).toBe('string')
    expect(secret).toMatch(/^hnv_sec_/)
  })

  it('has 64 hex chars after prefix (32 bytes)', () => {
    const secret = generateApiSecret()
    const hexPart = secret.replace('hnv_sec_', '')
    expect(hexPart).toHaveLength(64)
    expect(hexPart).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('hashSecret', () => {
  it('returns a SHA-256 hex string', () => {
    const hash = hashSecret('test-secret')
    expect(typeof hash).toBe('string')
    expect(hash).toHaveLength(64) // SHA-256 = 64 hex chars
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic (same input = same output)', () => {
    const hash1 = hashSecret('my-secret-value')
    const hash2 = hashSecret('my-secret-value')
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', () => {
    const hash1 = hashSecret('secret-a')
    const hash2 = hashSecret('secret-b')
    expect(hash1).not.toBe(hash2)
  })
})

describe('getClientIP', () => {
  it('returns the first IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('returns 127.0.0.1 when no x-forwarded-for header', () => {
    const request = new Request('http://localhost')
    expect(getClientIP(request)).toBe('127.0.0.1')
  })
})
