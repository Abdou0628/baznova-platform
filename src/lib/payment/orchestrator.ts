/**
 * HireNova Payment Orchestrator — Main Orchestration Layer
 *
 * Core payment operations: create, status lookup, event recording,
 * status updates, and idempotency checks. All amounts are in CENTS.
 *
 * This module does NOT import from adapters — that's Phase 2.
 * It handles persistence and state machine validation only.
 *
 * @module payment/orchestrator
 */

import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { transitionPayment } from './state-machine';
import {
  PaymentStatus,
  PaymentEventType,
  STATUS_EVENT_MAP,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type RefundPaymentInput,
  type PaymentRecord,
  type PaymentEventRecord,
} from './types';
import { selectProvider } from './registry';

// ===== Create Payment =====

/**
 * Creates a new payment record with an idempotency key.
 *
 * If no provider is specified, the registry selects the best provider
 * based on country, currency, and payment method.
 *
 * @param input - Payment creation parameters
 * @returns The created payment result
 * @throws Error if a payment with the same idempotency key already exists
 *
 * @example
 * ```ts
 * const result = await createPayment({
 *   userId: 'user_123',
 *   amount: 2999, // €29.99 in cents
 *   currency: 'EUR',
 *   description: 'Pro Plan — Monthly',
 *   country: 'FR',
 *   paymentMethod: 'card',
 * });
 * ```
 */
export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  // Generate idempotency key if not provided
  const idempotencyKey = input.idempotencyKey ?? `pay_${randomUUID()}`;

  // Check for existing payment with same idempotency key
  const existing = await db.payment.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    throw new Error(
      `Payment already exists with idempotency key: ${idempotencyKey}`
    );
  }

  // Select provider via registry if not specified
  let provider = input.provider;
  if (!provider) {
    const decision = await selectProvider({
      country: input.country ?? 'INTL',
      currency: input.currency,
      paymentMethod: input.paymentMethod ?? 'card',
      amount: input.amount,
    });
    provider = decision?.provider ?? 'stripe';
  }

  // Parse expiration date
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : getDefaultExpiry();

  // Stringify metadata
  const metadataStr = input.metadata
    ? JSON.stringify(input.metadata)
    : undefined;

  // Create the payment record
  const payment = await db.payment.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      methodId: input.methodId,
      provider,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      idempotencyKey,
      expiresAt,
      metadata: metadataStr,
    },
  });

  // Fire the creation event
  await recordPaymentEvent(
    payment.id,
    PaymentEventType.PAYMENT_CREATED,
    undefined,
    undefined
  );

  return {
    id: payment.id,
    userId: payment.userId ?? '',
    provider: payment.provider as CreatePaymentResult['provider'],
    providerPaymentId: payment.providerPaymentId ?? undefined,
    amount: payment.amount,
    currency: payment.currency as CreatePaymentResult['currency'],
    status: payment.status as PaymentStatus,
    idempotencyKey: payment.idempotencyKey,
    description: payment.description,
    createdAt: payment.createdAt.toISOString(),
  };
}

// ===== Get Payment Status =====

/**
 * Retrieves a payment's current status and basic info.
 *
 * @param id - Payment ID (cuid)
 * @returns Payment record or null if not found
 */
export async function getPaymentStatus(
  id: string
): Promise<PaymentRecord | null> {
  return db.payment.findUnique({
    where: { id },
  });
}

/**
 * Retrieves a payment with its event history included.
 *
 * @param id - Payment ID (cuid)
 * @returns Payment record with events, or null if not found
 */
export async function getPaymentWithEvents(
  id: string
): Promise<(PaymentRecord & { events: PaymentEventRecord[] }) | null> {
  return db.payment.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// ===== Record Payment Event =====

/**
 * Appends an immutable event to a payment's timeline.
 *
 * Checks idempotency via `providerEventId` — if the same external
 * event has already been recorded, this is a no-op (idempotent).
 *
 * @param paymentId - Payment ID
 * @param eventType - The type of event to record
 * @param data - Optional event payload (will be JSON-stringified)
 * @param providerEventId - Optional external event ID for idempotency
 * @returns The created event record, or null if already processed
 *
 * @example
 * ```ts
 * await recordPaymentEvent(
 *   'pay_abc123',
 *   PaymentEventType.PAYMENT_SUCCEEDED,
 *   { chargeId: 'ch_xyz', receiptUrl: '...' },
 *   'evt_stripe_001'
 * );
 * ```
 */
export async function recordPaymentEvent(
  paymentId: string,
  eventType: PaymentEventType,
  data?: Record<string, unknown>,
  providerEventId?: string
): Promise<PaymentEventRecord | null> {
  // Idempotency check: skip if this provider event was already processed
  if (providerEventId) {
    const alreadyProcessed = await isEventProcessed(providerEventId);
    if (alreadyProcessed) {
      return null;
    }
  }

  // Get current payment status for statusFrom tracking
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });

  const statusFrom = payment?.status ?? undefined;
  const statusTo =
    Object.values(PaymentStatus).find(
      (s) => STATUS_EVENT_MAP[s] === eventType
    ) ?? eventType.replace('payment_', '');

  return db.paymentEvent.create({
    data: {
      paymentId,
      eventType,
      statusFrom,
      statusTo,
      providerEventId,
      data: data ? JSON.stringify(data) : undefined,
    },
  });
}

// ===== Update Payment Status =====

/**
 * Updates a payment's status after validating the state transition.
 * Automatically fires the corresponding event and updates timestamps.
 *
 * @param paymentId - Payment ID
 * @param newStatus - The desired new status
 * @param providerData - Optional raw provider response (JSON-stringified)
 * @param providerPaymentId - Optional external payment ID from the provider
 * @returns Updated payment record
 * @throws Error if the state transition is invalid
 * @throws Error if the payment is not found
 *
 * @example
 * ```ts
 * await updatePaymentStatus('pay_abc123', PaymentStatus.SUCCEEDED, {
 *   chargeId: 'ch_xyz',
 * });
 * ```
 */
export async function updatePaymentStatus(
  paymentId: string,
  newStatus: PaymentStatus,
  providerData?: Record<string, unknown>,
  providerPaymentId?: string
): Promise<PaymentRecord> {
  // Fetch current payment
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const currentStatus = payment.status as PaymentStatus;

  // Validate state transition
  const valid = transitionPayment(currentStatus, newStatus);
  if (!valid) {
    throw new Error(
      `Invalid payment status transition: ${currentStatus} → ${newStatus}`
    );
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status: newStatus,
    providerData: providerData ? JSON.stringify(providerData) : payment.providerData,
  };

  // Update external payment ID if provided
  if (providerPaymentId) {
    updateData.providerPaymentId = providerPaymentId;
  }

  // Update timestamps based on status
  if (newStatus === PaymentStatus.CAPTURED || newStatus === PaymentStatus.SUCCEEDED) {
    updateData.capturedAt = new Date();
  }
  if (newStatus === PaymentStatus.REFUNDED) {
    updateData.refundedAt = new Date();
    updateData.refundedAmount = payment.amount; // Full refund
  }

  // Perform the update
  const updated = await db.payment.update({
    where: { id: paymentId },
    data: updateData,
  });

  // Fire the corresponding event
  const eventType = STATUS_EVENT_MAP[newStatus];
  await recordPaymentEvent(
    paymentId,
    eventType,
    providerData ?? undefined,
    undefined
  );

  return updated;
}

/**
 * Updates a payment's status and refund amount for partial refunds.
 *
 * @param paymentId - Payment ID
 * @param refundAmount - Amount refunded in cents
 * @param providerData - Optional raw provider response
 * @returns Updated payment record
 * @throws Error if the transition is invalid or payment not found
 */
export async function updatePaymentPartialRefund(
  paymentId: string,
  refundAmount: number,
  providerData?: Record<string, unknown>
): Promise<PaymentRecord> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const currentStatus = payment.status as PaymentStatus;
  const newStatus = PaymentStatus.PARTIALLY_REFUNDED;

  // Validate transition
  const valid = transitionPayment(currentStatus, newStatus);
  if (!valid) {
    throw new Error(
      `Invalid payment status transition: ${currentStatus} → ${newStatus}`
    );
  }

  const newRefundedAmount = payment.refundedAmount + refundAmount;

  const updated = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      refundedAt: new Date(),
      providerData: providerData ? JSON.stringify(providerData) : payment.providerData,
    },
  });

  // Fire event
  await recordPaymentEvent(
    paymentId,
    PaymentEventType.PAYMENT_PARTIALLY_REFUNDED,
    { refundAmount, totalRefunded: newRefundedAmount, ...providerData },
    undefined
  );

  return updated;
}

// ===== Idempotency Check =====

/**
 * Checks whether a provider event has already been processed.
 * Used for webhook idempotency — prevents duplicate processing.
 *
 * @param providerEventId - External event ID from the payment provider
 * @returns `true` if the event has already been recorded
 */
export async function isEventProcessed(
  providerEventId: string
): Promise<boolean> {
  const event = await db.paymentEvent.findFirst({
    where: { providerEventId },
    select: { id: true },
  });
  return event !== null;
}

// ===== Helper: Refund =====

/**
 * Validates a refund request and returns the payment if refundable.
 *
 * @param input - Refund parameters
 * @returns The payment record if refund is valid
 * @throws Error if payment not found or not refundable
 */
export async function validateRefund(
  input: RefundPaymentInput
): Promise<PaymentRecord> {
  const payment = await db.payment.findUnique({
    where: { id: input.paymentId },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${input.paymentId}`);
  }

  const status = payment.status as PaymentStatus;

  // Import here to avoid circular dependency with state-machine
  const { isRefundableStatus: isRefundable } = await import('./state-machine');

  if (!isRefundable(status)) {
    throw new Error(
      `Payment ${input.paymentId} with status ${status} is not refundable`
    );
  }

  // Validate partial refund amount
  if (input.amount !== undefined) {
    const maxRefund = payment.amount - payment.refundedAmount;
    if (input.amount > maxRefund) {
      throw new Error(
        `Refund amount ${input.amount} exceeds maximum refundable ${maxRefund}`
      );
    }
    if (input.amount <= 0) {
      throw new Error('Refund amount must be positive');
    }
  }

  return payment;
}

// ===== Internal Helpers =====

/**
 * Returns a default payment expiry date (30 minutes from now).
 */
function getDefaultExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
}
