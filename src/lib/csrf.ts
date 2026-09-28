const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const csrfTokenStore = new Map<
  string,
  { createdAt: number; expiresAt: number }
>();

/**
 * Generate a new CSRF token, store it in memory with a 1-hour expiry,
 * and return the token string.
 */
export function generateCsrfToken(): string {
  const token = crypto.randomUUID();
  const now = Date.now();
  csrfTokenStore.set(token, {
    createdAt: now,
    expiresAt: now + CSRF_TOKEN_EXPIRY_MS,
  });
  return token;
}

/**
 * Validate a CSRF token. Returns true if the token exists in the store
 * and has not expired. A valid token is consumed (deleted) upon successful
 * validation to prevent replay attacks.
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const entry = csrfTokenStore.get(token);
  if (!entry) {
    return false;
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    // Token has expired – remove it
    csrfTokenStore.delete(token);
    return false;
  }

  // Token is valid – consume it (one-time use)
  csrfTokenStore.delete(token);
  return true;
}

/**
 * Remove all expired tokens from the store. Call this periodically
 * (e.g. via a setInterval) to prevent unbounded memory growth.
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, entry] of csrfTokenStore) {
    if (now > entry.expiresAt) {
      csrfTokenStore.delete(token);
    }
  }
}

// Auto-clean expired tokens every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);
