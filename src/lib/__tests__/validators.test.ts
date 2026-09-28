import { registerSchema } from '@/lib/validators/auth'
import { chatbotSchema } from '@/lib/validators/chatbot'
import { checkoutSchema } from '@/lib/validators/checkout'

describe('registerSchema', () => {
  it('passes with valid data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(true)
  })

  it('fails when email is missing', () => {
    const result = registerSchema.safeParse({
      password: 'Password1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(false)
  })

  it('fails with weak password (no uppercase)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(false)
  })

  it('fails with weak password (no digit)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Passwordx',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(false)
  })

  it('fails with weak password (too short)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Pas1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(false)
  })

  it('fails with invalid email format', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Password1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional name field', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'John Doe',
      password: 'Password1',
      csrfToken: 'some-token',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional captchaToken field', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      csrfToken: 'some-token',
      captchaToken: 'recaptcha-abc123',
    })
    expect(result.success).toBe(true)
  })
})

describe('chatbotSchema', () => {
  it('passes with a valid message', () => {
    const result = chatbotSchema.safeParse({
      message: 'How do I write a CV?',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mode).toBe('advisor') // default value
    }
  })

  it('fails with an empty message', () => {
    const result = chatbotSchema.safeParse({
      message: '',
    })
    expect(result.success).toBe(false)
  })

  it('fails when message is missing', () => {
    const result = chatbotSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('fails with an invalid mode', () => {
    const result = chatbotSchema.safeParse({
      message: 'Hello',
      mode: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('passes with mode "support"', () => {
    const result = chatbotSchema.safeParse({
      message: 'I need help',
      mode: 'support',
    })
    expect(result.success).toBe(true)
  })

  it('fails with message exceeding 2000 characters', () => {
    const result = chatbotSchema.safeParse({
      message: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})

describe('checkoutSchema', () => {
  it('passes with a valid plan', () => {
    const result = checkoutSchema.safeParse({ planType: 'pro' })
    expect(result.success).toBe(true)
  })

  it('passes for all valid plan types', () => {
    for (const plan of ['starter', 'pro', 'career_plus', 'employer', 'annual'] as const) {
      const result = checkoutSchema.safeParse({ planType: plan })
      expect(result.success).toBe(true)
    }
  })

  it('fails with an invalid plan', () => {
    const result = checkoutSchema.safeParse({ planType: 'enterprise' })
    expect(result.success).toBe(false)
  })

  it('passes with a valid currency', () => {
    const result = checkoutSchema.safeParse({ planType: 'pro', currency: 'usd' })
    expect(result.success).toBe(true)
  })

  it('fails with an invalid currency', () => {
    const result = checkoutSchema.safeParse({ planType: 'pro', currency: 'jpy' })
    expect(result.success).toBe(false)
  })

  it('defaults currency to "eur" when not provided', () => {
    const result = checkoutSchema.safeParse({ planType: 'starter' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('eur')
    }
  })
})
