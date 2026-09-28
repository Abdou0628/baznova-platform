/**
 * BazNova Payment Ledger — Event Sourcing
 *
 * Immutable financial record. Every state transition creates an event.
 * If a problem occurs, the entire payment history can be reconstructed
 * by replaying events in chronological order.
 *
 * Uses Prisma for persistence. The ledger is append-only —
 * events are never modified or deleted.
 *
 * Idempotency: uses providerEventId to prevent duplicate processing.
 */

import { db } from '@/lib/db'
import type { PaymentState, PaymentEventType, PaymentEventRecord } from './types'
import { PaymentStateMachine } from './state-machine'
import { OrchestratorError } from './types'

// ─── In-Memory Idempotency Cache ─────────────────────────────────────────────
// Tracks provider event IDs already processed within this server instance.
// Prevents double-processing even before DB check.

const _processedEvents = new Map<string, boolean>()
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function isEventProcessed(providerEventId: string): boolean {
  return _processedEvents.has(providerEventId)
}

function markEventProcessed(providerEventId: string): void {
  _processedEvents.set(providerEventId, true)
  // Periodic cleanup (simple approach — in production, use a proper TTL cache)
  setTimeout(() => _processedEvents.delete(providerEventId), IDEMPOTENCY_TTL_MS)
}

// ─── Payment Record Operations ─────────────────────────────────────────────

export interface CreatePaymentInput {
  userId: string
  email: string
  planId: string
  providerId: string
  amount: number
  currency: string
  idempotencyKey: string
  metadata?: Record<string, string>
}

/**
 * Create a new payment record in CREATED state.
 */
export async function createPaymentRecord(input: CreatePaymentInput) {
  return db.orchestratorPaymentRecord.create({
    data: {
      userId: input.userId,
      email: input.email,
      planId: input.planId,
      providerId: input.providerId,
      amount: input.amount,
      currency: input.currency,
      state: 'CREATED',
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  })
}

/**
 * Get a payment record by ID.
 */
export async function getPaymentRecord(id: string) {
  return db.orchestratorPaymentRecord.findUnique({
    where: { id },
  })
}

/**
 * Get a payment record by idempotency key.
 */
export async function getPaymentByIdempotencyKey(key: string) {
  return db.orchestratorPaymentRecord.findUnique({
    where: { idempotencyKey: key },
  })
}

// ─── Event Sourcing ────────────────────────────────────────────────────────

/**
 * Record a state transition event. This is the ONLY way to change payment state.
 *
 * Flow:
 *   1. Validate the transition via state machine
 *   2. Check idempotency (if providerEventId given)
 *   3. Append event to ledger (immutable)
 *   4. Update payment record state
 *
 * Returns the new state after transition.
 */
export async function recordEvent(params: {
  paymentRecordId: string
  eventType: PaymentEventType
  providerId: string
  providerEventId?: string
  amount?: number
  currency?: string
  metadata?: Record<string, string>
}): Promise<PaymentState> {
  const { paymentRecordId, eventType, providerId, providerEventId, amount, currency, metadata } = params

  // 1. Fetch current payment
  const payment = await getPaymentRecord(paymentRecordId)
  if (!payment) {
    throw new OrchestratorError(
      `Payment record not found: ${paymentRecordId}`,
      'LEDGER_ERROR',
    )
  }

  const currentState = payment.state as PaymentState

  // 2. Idempotency check — if this provider event was already processed, return current state
  if (providerEventId) {
    if (isEventProcessed(providerEventId)) {
      console.log(`[Ledger] Idempotency hit: ${providerEventId} already processed`)
      return currentState
    }

    // Check DB for previously processed event
    const existingEvent = await db.orchestratorPaymentEvent.findUnique({
      where: { providerEventId },
    })
    if (existingEvent) {
      console.log(`[Ledger] DB idempotency hit: ${providerEventId}`)
      markEventProcessed(providerEventId)
      return currentState
    }
  }

  // 3. Validate transition via state machine
  let newState: PaymentState
  try {
    newState = PaymentStateMachine.transition(currentState, eventType)
  } catch (err) {
    // Log but don't throw for idempotent duplicate events
    if (currentState === newState && providerEventId) {
      return currentState
    }
    throw err
  }

  // 4. Append event to ledger (immutable record)
  await db.orchestratorPaymentEvent.create({
    data: {
      paymentRecordId,
      eventType,
      previousState: currentState,
      newState,
      providerId,
      providerEventId: providerEventId ?? null,
      amount: amount ?? null,
      currency: currency ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  // 5. Update payment record
  await db.orchestratorPaymentRecord.update({
    where: { id: paymentRecordId },
    data: { state: newState },
  })

  // 6. Mark as processed in memory
  if (providerEventId) {
    markEventProcessed(providerEventId)
  }

  console.log(`[Ledger] ${paymentRecordId}: ${currentState} → ${newState} (${eventType})`)

  return newState
}

/**
 * Get all events for a payment record, ordered chronologically.
 * This reconstructs the complete payment history.
 */
export async function getPaymentEvents(paymentRecordId: string): Promise<PaymentEventRecord[]> {
  const events = await db.orchestratorPaymentEvent.findMany({
    where: { paymentRecordId },
    orderBy: { createdAt: 'asc' },
  })
  return events.map(e => ({
    id: e.id,
    paymentRecordId: e.paymentRecordId,
    eventType: e.eventType as PaymentEventType,
    previousState: e.previousState as PaymentState,
    newState: e.newState as PaymentState,
    providerId: e.providerId,
    providerEventId: e.providerEventId ?? undefined,
    amount: e.amount ?? undefined,
    currency: e.currency ?? undefined,
    metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
    createdAt: e.createdAt.toISOString(),
  }))
}

/**
 * Get the latest payment record for a user.
 */
export async function getLatestPaymentForUser(userId: string) {
  return db.orchestratorPaymentRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all payment records for a user.
 */
export async function getPaymentsForUser(userId: string) {
  return db.orchestratorPaymentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

/**
 * Log a security/audit event. Separate from payment events —
 * this is for compliance and monitoring.
 */
export async function logAuditEvent(params: {
  action: string
  userId?: string
  providerId?: string
  paymentRecordId?: string
  details: string
  metadata?: Record<string, string>
}) {
  await db.orchestratorAuditLog.create({
    data: {
      action: params.action,
      userId: params.userId ?? null,
      providerId: params.providerId ?? null,
      paymentRecordId: params.paymentRecordId ?? null,
      details: params.details,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  })
}
