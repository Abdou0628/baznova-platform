/**
 * HNSA — Request Body Scanner
 * 
 * Scans API request bodies for SQL injection and XSS patterns.
 * Used in API routes since Next.js middleware cannot read request body.
 */

import { scanInput } from '@/lib/security';

/**
 * Scan a request body for malicious patterns.
 * Recursively scans all string values in objects and arrays.
 * Returns { clean: boolean, sqlInjection: boolean, xss: boolean, field?: string }
 */
export function scanRequestBody(body: unknown): {
  clean: boolean;
  sqlInjection: boolean;
  xss: boolean;
  field?: string;
} {
  return scanValue(body);
}

function scanValue(value: unknown, path: string = 'root'): {
  clean: boolean;
  sqlInjection: boolean;
  xss: boolean;
  field?: string;
} {
  if (typeof value === 'string') {
    const result = scanInput(value);
    if (!result.isClean) {
      return {
        clean: false,
        sqlInjection: result.sqlInjection,
        xss: result.xss,
        field: path,
      };
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const result = scanValue(value[i], `${path}[${i}]`);
      if (!result.clean) return result;
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const result = scanValue(val, `${path}.${key}`);
      if (!result.clean) return result;
    }
  }
  return { clean: true, sqlInjection: false, xss: false };
}
