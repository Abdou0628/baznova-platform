/**
 * @module hnsa/encryption-middleware
 * @description Application-level encryption helpers for transparent field encryption.
 *
 * These wrapper functions provide a convenient API for routes to encrypt data
 * before writing to the database and decrypt after reading. Only fields listed
 * in `sensitiveFields` (from `field-encryption.ts`) are processed.
 *
 * **Usage pattern:**
 * ```ts
 * // BEFORE db write:
 * const encrypted = encryptBeforeWrite(data);
 * await db.model.create({ data: encrypted });
 *
 * // AFTER db read:
 * const record = await db.model.findFirst({ ... });
 * const plain = decryptAfterRead(record);
 * ```
 */

import {
  encryptSensitiveData,
  decryptSensitiveData,
  isEncrypted,
  sensitiveFields,
} from './field-encryption';
import { forwardToSIEM, createSIEMEvent } from './siem';

/**
 * Encrypt sensitive fields in a data object before writing to DB.
 * Call this BEFORE db.model.create() or db.model.update().
 * Only encrypts fields that are present in the data object and listed in `sensitiveFields`.
 *
 * @param data - Plain object containing fields to potentially encrypt
 * @returns A new object with sensitive fields encrypted (original is not mutated)
 */
export function encryptBeforeWrite<T extends Record<string, any>>(data: T): T {
  try {
    return encryptSensitiveData({ ...data }) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[HNSA encryption-middleware] encryptBeforeWrite failed:', message);
    forwardToSIEM(
      createSIEMEvent({
        type: 'FIELD_ENCRYPTION_ERROR',
        severity: 'critical',
        path: 'encryption-middleware',
        metadata: { operation: 'encryptBeforeWrite', error: message },
      })
    ).catch(() => {});
    // Return unencrypted copy as safe fallback — data is still saved, just not encrypted
    return { ...data };
  }
}

/**
 * Decrypt sensitive fields in a DB record after reading.
 * Call this AFTER db.model.findXxx().
 * Handles both single objects and arrays of objects.
 *
 * @param record - A single DB record or array of records
 * @returns Decrypted copy (original is not mutated)
 */
export function decryptAfterRead<T extends Record<string, any>>(record: T): T;
export function decryptAfterRead<T extends Record<string, any>>(records: T[]): T[];
export function decryptAfterRead<T extends Record<string, any>>(
  input: T | T[]
): T | T[] {
  try {
    if (Array.isArray(input)) {
      return input.map((r) => decryptSensitiveData({ ...r }) as T);
    }
    return decryptSensitiveData({ ...input }) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[HNSA encryption-middleware] decryptAfterRead failed:', message);
    forwardToSIEM(
      createSIEMEvent({
        type: 'FIELD_ENCRYPTION_ERROR',
        severity: 'critical',
        path: 'encryption-middleware',
        metadata: { operation: 'decryptAfterRead', error: message },
      })
    ).catch(() => {});
    // Return original as safe fallback
    return input;
  }
}

/**
 * Get the list of sensitive field names for documentation/logging.
 */
export function getSensitiveFieldNames(): string[] {
  return Array.from(sensitiveFields);
}

/**
 * Check if a specific field value is encrypted.
 */
export function isFieldEncrypted(value: string): boolean {
  return isEncrypted(value);
}
