/**
 * HNSA — TOTP (Time-based One-Time Password) Implementation
 *
 * RFC 6238 compliant TOTP using HMAC-SHA1.
 * No external dependencies.
 */
import { createHmac } from 'crypto'

/**
 * Generate a base32-encoded random secret (160 bits = 32 base32 chars).
 */
export function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

/**
 * Generate current TOTP code (6 digits).
 */
export function generateTOTP(secret: string, time?: number): string {
  const epoch = Math.floor((time ?? Date.now()) / 30000)
  return generateHOTP(secret, epoch)
}

/**
 * Verify a TOTP code with ±1 step window for clock drift.
 */
export function verifyTOTP(secret: string, code: string): boolean {
  const now = Math.floor(Date.now() / 30000)
  // Check current, previous, and next time step (window of 90 seconds)
  for (const offset of [-1, 0, 1]) {
    const hotp = generateHOTP(secret, now + offset)
    if (hotp === code) return true
  }
  return false
}

/**
 * Generate OTPAuth URI for QR code generation.
 */
export function generateOTPAuthURI(secret: string, email: string): string {
  return `otpauth://totp/HireNova:${encodeURIComponent(email)}?secret=${secret}&issuer=HireNova&algorithm=SHA1&digits=6&period=30`
}

// --- Internal ---

function generateHOTP(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key)
  hmac.update(counterBuf)
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  let result = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    result += BASE32_CHARS[parseInt(bits.slice(i, i + 5), 2)]
  }
  return result
}

function base32Decode(str: string): Buffer {
  let bits = ''
  for (const c of str.toUpperCase()) {
    const idx = BASE32_CHARS.indexOf(c)
    if (idx === -1) continue
    bits += idx.toString(2).padStart(5, '0')
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2)
  }
  return bytes
}
