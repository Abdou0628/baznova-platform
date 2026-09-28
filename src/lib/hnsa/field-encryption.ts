/**
 * @module hnsa/field-encryption
 * @description Field-level encryption utility for HireNova Security Architecture (HNSA).
 *
 * Provides AES-256-GCM encryption/decryption for sensitive fields at the application
 * layer. This is required because SQLite does not support native column-level encryption.
 *
 * **Encrypted format:** `hnsa:v1:<base64 iv>:<base64 ciphertext>:<base64 auth tag>`
 *
 * **Key management:**
 * - Production: `FIELD_ENCRYPTION_KEY` env var (32-byte hex string = 64 hex chars)
 * - Development: Deterministic fallback key derived from a static seed (NEVER use in production)
 *
 * @example
 * ```ts
 * import { encryptField, decryptField, encryptSensitiveData, decryptSensitiveData } from '@/lib/hnsa';
 *
 * // Encrypt a single field
 * const encrypted = encryptField('+1-555-0123');
 * // => 'hnsa:v1:abc123...:xyz789...:def456...'
 *
 * // Decrypt a single field
 * const plain = decryptField(encrypted);
 * // => '+1-555-0123'
 *
 * // Encrypt all sensitive fields in a data object
 * const safeData = encryptSensitiveData({
 *   name: 'John',
 *   phone: '+1-555-0123',
 *   email: 'john@example.com',
 * });
 * // => { name: 'John', phone: 'hnsa:v1:...', email: 'john@example.com' }
 * ```
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Format prefix for all HNSA-encrypted values */
const HNSA_PREFIX = 'hnsa:v1';

/** Separator used between format segments */
const SEPARATOR = ':';

/** Length of the AES-256-GCM initialization vector in bytes */
const IV_LENGTH = 12;

/** Length of the AES-256-GCM authentication tag in bytes */
const AUTH_TAG_LENGTH = 16;

/** Key length in bytes for AES-256 */
const KEY_BYTE_LENGTH = 32;

// ---------------------------------------------------------------------------
// Key resolution
// ---------------------------------------------------------------------------

/**
 * Derives the encryption key from environment or falls back to a deterministic
 * development key. The dev key is derived via SHA-256 from a static seed so
 * that it is reproducible across restarts but is **not** cryptographically
 * random and must never be used in production.
 *
 * @returns A 32-byte Buffer suitable for AES-256
 */
function resolveEncryptionKey(): Buffer {
  const envKey = process.env.FIELD_ENCRYPTION_KEY;

  if (envKey) {
    // Validate the key is a valid 64-character hex string (32 bytes)
    const hex = envKey.replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error(
        '[HNSA field-encryption] FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          `Received length: ${hex.length}`
      );
    }
    return Buffer.from(hex, 'hex');
  }

  // Deterministic dev fallback: SHA-256 of a static seed
  const devSeed = 'hirenova-dev-field-encryption-key-v1-do-not-use-in-prod';
  return createHash('sha256').update(devSeed).digest();
}

// ---------------------------------------------------------------------------
// Sensitive field registry
// ---------------------------------------------------------------------------

/**
 * Set of field paths that should be automatically encrypted/decrypted by
 * `encryptSensitiveData()` and `decryptSensitiveData()`.
 *
 * These represent personally identifiable information (PII) and other
 * sensitive data that should be encrypted at rest in SQLite.
 *
 * @example
 * ```ts
 * if (sensitiveFields.has('phone')) {
 *   console.log('phone is a sensitive field');
 * }
 * ```
 */
export const sensitiveFields: ReadonlySet<string> = new Set<string>([
  'phone',
  'address',
  'location',
  'companyName',
  'industry',
  'linkedinUrl',
  'ssn',
  'dateOfBirth',
  'passportNumber',
  'nationalId',
  'bankAccountNumber',
  'salary',
  'salaryExpectation',
]);

// ---------------------------------------------------------------------------
// Core encryption / decryption
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * The output format is: `hnsa:v1:<base64 iv>:<base64 ciphertext>:<base64 auth tag>`
 *
 * @param plaintext - The string value to encrypt. Must be non-empty.
 * @returns The encrypted string in HNSA format.
 * @throws {Error} If `plaintext` is empty or not a string.
 *
 * @example
 * ```ts
 * const encrypted = encryptField('+1-555-0123');
 * console.log(encrypted); // 'hnsa:v1:...'
 * ```
 */
export function encryptField(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error(
      '[HNSA field-encryption] encryptField requires a non-empty string.'
    );
  }

  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    HNSA_PREFIX,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    authTag.toString('base64url'),
  ].join(SEPARATOR);
}

/**
 * Decrypts an HNSA-encrypted string back to its original plaintext.
 *
 * @param ciphertext - An HNSA-formatted encrypted string (`hnsa:v1:...`).
 * @returns The original plaintext string.
 * @throws {Error} If the ciphertext format is invalid, the auth tag verification
 *   fails, or any other decryption error occurs.
 *
 * @example
 * ```ts
 * const plain = decryptField('hnsa:v1:abc:xyz:def');
 * console.log(plain); // original plaintext
 * ```
 */
export function decryptField(ciphertext: string): string {
  if (typeof ciphertext !== 'string' || !ciphertext.startsWith(HNSA_PREFIX)) {
    throw new Error(
      '[HNSA field-encryption] decryptField received invalid ciphertext format. ' +
        'Expected hnsa:v1:... prefix.'
    );
  }

  const key = resolveEncryptionKey();

  // Strip the 'hnsa:v1:' prefix to get '<iv>:<ciphertext>:<tag>'
  const remainder = ciphertext.slice(HNSA_PREFIX.length + 1);
  const parts = remainder.split(SEPARATOR);

  if (parts.length !== 3) {
    throw new Error(
      `[HNSA field-encryption] Invalid encrypted payload: expected 3 parts (iv:ciphertext:tag), got ${parts.length}.`
    );
  }

  const [ivB64, ciphertextB64, tagB64] = parts;

  let iv: Buffer;
  let encrypted: Buffer;
  let authTag: Buffer;

  try {
    iv = Buffer.from(ivB64, 'base64url');
    encrypted = Buffer.from(ciphertextB64, 'base64url');
    authTag = Buffer.from(tagB64, 'base64url');
  } catch {
    throw new Error(
      '[HNSA field-encryption] Failed to decode base64url segments.'
    );
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error(
      '[HNSA field-encryption] Decryption failed: auth tag verification failed or data corrupted.' +
        (err instanceof Error ? ` (${err.message})` : '')
    );
  }
}

/**
 * Checks whether a string value is already encrypted in HNSA format.
 *
 * This is useful to avoid double-encrypting values that are already protected.
 *
 * @param value - The string to check.
 * @returns `true` if the value starts with the HNSA encrypted prefix and has
 *   the correct segment count; `false` otherwise.
 *
 * @example
 * ```ts
 * isEncrypted('hnsa:v1:abc:xyz:def'); // true
 * isEncrypted('+1-555-0123');           // false
 * isEncrypted('');                     // false
 * ```
 */
export function isEncrypted(value: string): boolean {
  if (typeof value !== 'string' || !value.startsWith(HNSA_PREFIX + SEPARATOR)) {
    return false;
  }

  const remainder = value.slice(HNSA_PREFIX.length + 1);
  const parts = remainder.split(SEPARATOR);
  return parts.length === 3;
}

// ---------------------------------------------------------------------------
// Bulk helpers for data objects
// ---------------------------------------------------------------------------

/**
 * Encrypts all sensitive fields in a data object in-place.
 *
 * Only fields listed in `sensitiveFields` will be encrypted. Fields that are
 * already encrypted (detected via `isEncrypted()`) are skipped to prevent
 * double-encryption. Non-string values and empty strings are left unchanged.
 *
 * @param data - A plain object whose sensitive fields should be encrypted.
 * @returns The same object reference with sensitive fields replaced by their
 *   encrypted values. (Mutates in-place for performance; also returns the object.)
 *
 * @example
 * ```ts
 * const candidate = {
 *   name: 'Jane',
 *   phone: '+1-555-0123',
 *   address: '123 Main St',
 *   industry: 'Tech',
 * };
 *
 * encryptSensitiveData(candidate);
 * // candidate.phone === 'hnsa:v1:...'
 * // candidate.name === 'Jane' (not in sensitiveFields)
 * ```
 */
export function encryptSensitiveData(data: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (
      typeof value === 'string' &&
      value.length > 0 &&
      sensitiveFields.has(key) &&
      !isEncrypted(value)
    ) {
      try {
        data[key] = encryptField(value);
      } catch (err) {
        // Log but don't throw — one field failure shouldn't block the entire operation
        console.error(
          `[HNSA field-encryption] Failed to encrypt field "${key}":`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }
  return data;
}

/**
 * Decrypts all sensitive fields in a data object in-place.
 *
 * Only fields listed in `sensitiveFields` that are currently encrypted
 * (detected via `isEncrypted()`) will be decrypted. Unencrypted values are
 * left unchanged.
 *
 * @param data - A plain object whose sensitive fields should be decrypted.
 * @returns The same object reference with encrypted sensitive fields replaced by
 *   their plaintext values. (Mutates in-place for performance; also returns the object.)
 *
 * @example
 * ```ts
 * const row = await db.user.findFirst({ where: { id: '...' } });
 * decryptSensitiveData(row as Record<string, any>);
 * // row.phone === '+1-555-0123' (decrypted)
 * ```
 */
export function decryptSensitiveData(data: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (
      typeof value === 'string' &&
      sensitiveFields.has(key) &&
      isEncrypted(value)
    ) {
      try {
        data[key] = decryptField(value);
      } catch (err) {
        console.error(
          `[HNSA field-encryption] Failed to decrypt field "${key}":`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }
  return data;
}
