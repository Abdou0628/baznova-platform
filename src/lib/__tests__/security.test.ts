vi.mock('@/lib/db', () => ({
  db: {
    securityLog: {
      create: vi.fn(),
    },
  },
}))

import { scanInput, sanitizeString, detectSQLInjection, detectXSS } from '@/lib/security'

describe('scanInput', () => {
  describe('SQL injection payloads', () => {
    it('detects SELECT...FROM injection', () => {
      const result = scanInput("SELECT * FROM users")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects DROP TABLE injection', () => {
      const result = scanInput("DROP TABLE users")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects OR 1=1 injection', () => {
      const result = scanInput("' OR 1=1 --")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects INSERT INTO injection', () => {
      const result = scanInput("INSERT INTO users VALUES ('a','b')")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects UNION SELECT injection', () => {
      const result = scanInput("' UNION SELECT * FROM credentials --")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects SLEEP injection', () => {
      const result = scanInput("SLEEP(5)")
      expect(result.sqlInjection).toBe(true)
      expect(result.isClean).toBe(false)
    })
  })

  describe('XSS payloads', () => {
    it('detects script tag injection', () => {
      const result = scanInput('<script>alert("xss")</script>')
      expect(result.xss).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects self-closing script tag', () => {
      const result = scanInput('<script />')
      expect(result.xss).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects onerror event handler', () => {
      const result = scanInput('<img onerror="alert(1)" src="x">')
      expect(result.xss).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects javascript: protocol', () => {
      const result = scanInput('javascript:alert(1)')
      expect(result.xss).toBe(true)
      expect(result.isClean).toBe(false)
    })

    it('detects encoded script tag', () => {
      const result = scanInput('%3Cscript>alert(1)</script>')
      expect(result.xss).toBe(true)
      expect(result.isClean).toBe(false)
    })
  })

  describe('clean inputs', () => {
    it('returns isClean: true for normal text', () => {
      const result = scanInput('Hello, how are you?')
      expect(result.isClean).toBe(true)
      expect(result.sqlInjection).toBe(false)
      expect(result.xss).toBe(false)
    })

    it('returns isClean: true for email address', () => {
      const result = scanInput('user@example.com')
      expect(result.isClean).toBe(true)
    })

    it('returns isClean: true for numbers', () => {
      const result = scanInput('12345')
      expect(result.isClean).toBe(true)
    })

    it('returns isClean: true for JSON-like string without SQL keywords', () => {
      const result = scanInput('{"name": "John", "age": 30}')
      expect(result.isClean).toBe(true)
    })
  })
})

describe('sanitizeString', () => {
  it('encodes < to &lt;', () => {
    expect(sanitizeString('<hello>')).toBe('&lt;hello&gt;')
  })

  it('encodes > to &gt;', () => {
    expect(sanitizeString('a > b')).toBe('a &gt; b')
  })

  it('encodes " to &quot;', () => {
    expect(sanitizeString('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it("encodes ' to &#x27;", () => {
    expect(sanitizeString("it's")).toBe('it&#x27;s')
  })

  it('encodes / to &#x2F; when encodeSlash is true', () => {
    expect(sanitizeString('path/to/file', true)).toBe('path&#x2F;to&#x2F;file')
  })

  it('preserves / when encodeSlash is false', () => {
    expect(sanitizeString('path/to/file', false)).toBe('path/to/file')
  })

  it('preserves / by default (encodeSlash defaults to false)', () => {
    expect(sanitizeString('a/b/c')).toBe('a/b/c')
  })

  it('handles complex mixed input', () => {
    expect(sanitizeString('<img src="x" onerror="alert(1)">', true)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    )
  })
})

describe('detectSQLInjection', () => {
  it('detects OR 1=1 pattern', () => {
    expect(detectSQLInjection("' OR 1=1 --")).toBe(true)
  })

  it('detects AND 1=1 pattern', () => {
    expect(detectSQLInjection("' AND 1=1 --")).toBe(true)
  })

  it('detects semicolon terminator', () => {
    expect(detectSQLInjection('; DROP TABLE users')).toBe(true)
  })

  it('detects comment-based injection', () => {
    expect(detectSQLInjection('admin--')).toBe(true)
  })

  it('returns false for legitimate text containing "select"', () => {
    expect(detectSQLInjection('Please select your preferred option')).toBe(false)
  })

  it('returns false for legitimate text containing "drop"', () => {
    expect(detectSQLInjection('The package will drop tomorrow')).toBe(false)
  })

  it('returns false for normal user input', () => {
    expect(detectSQLInjection('john.doe@example.com')).toBe(false)
  })
})
