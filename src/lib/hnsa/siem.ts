/**
 * @module hnsa/siem
 * @description SIEM (Security Information and Event Management) integration for HireNova Security Architecture (HNSA).
 *
 * Provides structured security event forwarding to an external SIEM endpoint
 * via webhook, with an in-memory ring buffer fallback when no endpoint is configured.
 *
 * **Configuration (env vars):**
 * - `SIEM_WEBHOOK_URL` — External SIEM endpoint URL (optional)
 * - `SIEM_ENABLED` — Set to `'false'` to explicitly disable all SIEM forwarding (optional)
 *
 * @example
 * ```ts
 * import { forwardToSIEM, createSIEMEvent } from '@/lib/hnsa';
 *
 * // Create and forward a login success event
 * await forwardToSIEM({
 *   type: 'AUTH_SUCCESS',
 *   severity: 'info',
 *   userId: 'user_123',
 *   ip: '192.168.1.1',
 *   path: '/api/auth/callback/credentials',
 * });
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All supported SIEM event types for HireNova */
export type SIEMEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'ACCOUNT_LOCKOUT'
  | 'ACCOUNT_UNLOCK'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_CHALLENGE'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILURE'
  | 'REFUND_PROCESSED'
  | 'SUSPICIOUS_REQUEST'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATA_EXPORT'
  | 'DATA_DELETE'
  | 'ADMIN_ACTION'
  | 'API_ABUSE_DETECTED'
  | 'FIELD_ENCRYPTION_ERROR';

/** Severity levels for SIEM events */
export type SIEMSeverity = 'info' | 'warning' | 'critical';

/**
 * A structured SIEM event representing a security-relevant occurrence.
 *
 * @property eventId - Unique event identifier (CUID format)
 * @property timestamp - ISO 8601 timestamp of when the event was created
 * @property type - The category of security event
 * @property severity - Impact severity: info (informational), warning (suspicious), critical (severe)
 * @property source - Originating system identifier
 * @property userId - Optional ID of the user associated with this event
 * @property ip - Optional IP address of the request origin
 * @property userAgent - Optional user agent string of the client
 * @property path - Optional API path or route involved
 * @property metadata - Optional arbitrary key-value pairs with additional context
 */
export interface SIEMEvent {
  eventId: string;
  timestamp: string;
  type: SIEMEventType;
  severity: SIEMSeverity;
  source: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  metadata?: Record<string, any>;
}

/** Parameters for creating a SIEM event (auto-generates eventId and timestamp) */
export type CreateSIEMEventParams = Omit<SIEMEvent, 'eventId' | 'timestamp' | 'source'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIEM_SOURCE = 'hirenova-api';

/** Maximum number of events stored in the local ring buffer */
const LOCAL_BUFFER_MAX_SIZE = 1000;

/** Maximum number of events that can be sent in a single batch request */
const BATCH_MAX_SIZE = 50;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** In-memory ring buffer for events when no SIEM webhook is configured */
const localEventBuffer: SIEMEvent[] = [];

/**
 * Generates a CUID-like unique identifier.
 * Uses a simple timestamp + random approach for lightweight uniqueness.
 * In production, consider replacing with the `cuid` package if stronger guarantees are needed.
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const counter = (localEventBuffer.length % 36).toString(36);
  return `${timestamp}${random}${counter}`;
}

/**
 * Checks whether SIEM forwarding is enabled.
 *
 * SIEM is disabled if `SIEM_ENABLED` is explicitly set to `'false'`.
 * Otherwise, it is considered enabled (default).
 */
function isSIEMEnabled(): boolean {
  return process.env.SIEM_ENABLED !== 'false';
}

/**
 * Returns the configured SIEM webhook URL, or `null` if not set.
 */
function getSIEMWebhookURL(): string | null {
  const url = process.env.SIEM_WEBHOOK_URL;
  if (url && url.trim().length > 0) {
    return url.trim();
  }
  return null;
}

/**
 * Adds an event to the local in-memory ring buffer.
 * If the buffer exceeds `LOCAL_BUFFER_MAX_SIZE`, the oldest event is removed.
 */
function pushToLocalBuffer(event: SIEMEvent): void {
  localEventBuffer.push(event);
  if (localEventBuffer.length > LOCAL_BUFFER_MAX_SIZE) {
    // Ring buffer: remove the oldest event
    localEventBuffer.shift();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a fully-formed `SIEMEvent` from partial parameters.
 *
 * Automatically generates `eventId` (CUID) and `timestamp` (ISO 8601),
 * and sets `source` to `'hirenova-api'`.
 *
 * @param params - Event parameters excluding auto-generated fields.
 * @returns A complete `SIEMEvent` ready for forwarding.
 *
 * @example
 * ```ts
 * const event = createSIEMEvent({
 *   type: 'AUTH_SUCCESS',
 *   severity: 'info',
 *   userId: 'user_123',
 * });
 * // event.eventId === 'lq5j2k3m...' (auto-generated)
 * // event.timestamp === '2025-01-15T10:30:00.000Z' (auto-generated)
 * // event.source === 'hirenova-api'
 * ```
 */
export function createSIEMEvent(params: CreateSIEMEventParams): SIEMEvent {
  return {
    eventId: generateCuid(),
    timestamp: new Date().toISOString(),
    source: SIEM_SOURCE,
    ...params,
  };
}

/**
 * Forwards a single security event to the configured SIEM endpoint.
 *
 * **Behavior:**
 * 1. If `SIEM_ENABLED` is `'false'`, the event is silently dropped.
 * 2. If `SIEM_WEBHOOK_URL` is set, the event is sent via HTTP POST as JSON.
 * 3. If no webhook is configured, the event is stored in the local in-memory
 *    ring buffer (accessible via `getLocalSIEMEvents()`).
 *
 * @param event - A complete `SIEMEvent` (use `createSIEMEvent()` to build one).
 * @returns A Promise that resolves when the event has been forwarded or stored.
 *
 * @example
 * ```ts
 * await forwardToSIEM(createSIEMEvent({
 *   type: 'AUTH_FAILURE',
 *   severity: 'warning',
 *   userId: 'user_456',
 *   ip: '10.0.0.1',
 *   path: '/api/auth/callback/credentials',
 *   metadata: { reason: 'invalid_password' },
 * }));
 * ```
 */
export async function forwardToSIEM(event: SIEMEvent): Promise<void> {
  // Check if SIEM is explicitly disabled
  if (!isSIEMEnabled()) {
    return;
  }

  const webhookURL = getSIEMWebhookURL();

  if (!webhookURL) {
    // No SIEM endpoint configured — store in local ring buffer
    pushToLocalBuffer(event);
    console.log(
      `[HNSA SIEM] (local buffer) ${event.type} [${event.severity}]` +
        (event.userId ? ` user=${event.userId}` : '') +
        (event.path ? ` path=${event.path}` : '')
    );
    return;
  }

  // Forward to external SIEM endpoint
  try {
    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      console.error(
        `[HNSA SIEM] Forward failed: ${response.status} ${response.statusText} for event ${event.eventId}`
      );
    }
  } catch (err) {
    console.error(
      `[HNSA SIEM] Forward error for event ${event.eventId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Forwards multiple security events to the SIEM endpoint in a single batch request.
 *
 * Events are sent as a JSON array in one HTTP POST request. If the batch
 * exceeds `BATCH_MAX_SIZE` (50), it is split into smaller chunks.
 *
 * **Fallback behavior** is the same as `forwardToSIEM()` — events go to the
 * local ring buffer if no webhook is configured.
 *
 * @param events - Array of `SIEMEvent` objects to forward.
 * @returns A Promise that resolves when all events have been forwarded or stored.
 *
 * @example
 * ```ts
 * const events = [
 *   createSIEMEvent({ type: 'AUTH_SUCCESS', severity: 'info', userId: 'u1' }),
 *   createSIEMEvent({ type: 'AUTH_FAILURE', severity: 'warning', userId: 'u2' }),
 * ];
 * await batchForwardToSIEM(events);
 * ```
 */
export async function batchForwardToSIEM(events: SIEMEvent[]): Promise<void> {
  // Check if SIEM is explicitly disabled
  if (!isSIEMEnabled()) {
    return;
  }

  if (events.length === 0) {
    return;
  }

  const webhookURL = getSIEMWebhookURL();

  if (!webhookURL) {
    // No SIEM endpoint — store all events in local buffer
    for (const event of events) {
      pushToLocalBuffer(event);
    }
    console.log(
      `[HNSA SIEM] (local buffer) batch of ${events.length} events stored`
    );
    return;
  }

  // Split into chunks of BATCH_MAX_SIZE and send each chunk
  for (let i = 0; i < events.length; i += BATCH_MAX_SIZE) {
    const chunk = events.slice(i, i + BATCH_MAX_SIZE);

    try {
      const response = await fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15_000), // 15s timeout for batch
      });

      if (!response.ok) {
        console.error(
          `[HNSA SIEM] Batch forward failed: ${response.status} ${response.statusText} for chunk ${i / BATCH_MAX_SIZE + 1}`
        );
      }
    } catch (err) {
      console.error(
        `[HNSA SIEM] Batch forward error for chunk ${i / BATCH_MAX_SIZE + 1}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

/**
 * Retrieves events from the local in-memory ring buffer.
 *
 * This is useful for debugging or when no external SIEM is configured.
 * Events are returned in chronological order (oldest first).
 *
 * @param limit - Maximum number of events to return. Defaults to all events in the buffer.
 * @returns An array of `SIEMEvent` objects from the local buffer.
 *
 * @example
 * ```ts
 * // Get the 10 most recent events
 * const recentEvents = getLocalSIEMEvents(10);
 *
 * // Get all buffered events
 * const allEvents = getLocalSIEMEvents();
 * ```
 */
export function getLocalSIEMEvents(limit?: number): SIEMEvent[] {
  if (limit !== undefined && limit >= 0) {
    // Return the last `limit` events (most recent)
    const start = Math.max(0, localEventBuffer.length - limit);
    return localEventBuffer.slice(start);
  }
  return [...localEventBuffer];
}

/**
 * Returns the current size of the local SIEM event buffer.
 *
 * @returns The number of events currently stored in the ring buffer.
 */
export function getLocalSIEMBufferSize(): number {
  return localEventBuffer.length;
}
