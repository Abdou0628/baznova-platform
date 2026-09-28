/**
 * HireNova Payment Orchestrator — State Machine
 *
 * Enforces strict state transitions for payment lifecycle.
 * No payment can move to an invalid state.
 *
 * @module payment/state-machine
 */

import {
  PaymentStatus,
  VALID_TRANSITIONS,
} from './types';

/**
 * Validates whether a payment can transition from `currentStatus` to `newStatus`.
 *
 * @param currentStatus - The payment's current status
 * @param newStatus - The desired new status
 * @returns `true` if the transition is valid, `false` otherwise
 *
 * @example
 * ```ts
 * transitionPayment(PaymentStatus.CREATED, PaymentStatus.PENDING) // true
 * transitionPayment(PaymentStatus.SUCCEEDED, PaymentStatus.PENDING) // false
 * ```
 */
export function transitionPayment(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  // Allow idempotent transitions (same status → same status)
  if (currentStatus === newStatus) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }

  return allowed.includes(newStatus);
}

/**
 * Returns all valid next statuses for a given payment status.
 *
 * @param status - The current payment status
 * @returns Array of allowed next statuses (may be empty for terminal states)
 *
 * @example
 * ```ts
 * getAllowedTransitions(PaymentStatus.CREATED)
 * // [PENDING, AUTHORIZED, FAILED, CANCELLED, EXPIRED]
 * ```
 */
export function getAllowedTransitions(status: PaymentStatus): PaymentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Checks if a payment status is terminal (no further transitions possible).
 *
 * Terminal statuses: FAILED, CANCELLED, EXPIRED, REFUNDED
 * Note: PARTIALLY_REFUNDED can still transition to REFUNDED, so it is not terminal.
 *
 * @param status - The payment status to check
 * @returns `true` if the status is terminal
 */
export function isTerminalStatus(status: PaymentStatus): boolean {
  const allowed = VALID_TRANSITIONS[status];
  // A status is terminal if it has no allowed transitions
  // (excluding the idempotent same-status case)
  return !allowed || allowed.length === 0;
}

/**
 * Checks if a payment in a given status can be refunded.
 *
 * Refundable statuses: SUCCEEDED, CAPTURED, PARTIALLY_REFUNDED
 *
 * @param status - The payment status to check
 * @returns `true` if the payment can be refunded (full or partial)
 */
export function isRefundableStatus(status: PaymentStatus): boolean {
  const allowed = VALID_TRANSITIONS[status];
  return (
    allowed !== undefined &&
    (allowed.includes(PaymentStatus.REFUNDED) ||
      allowed.includes(PaymentStatus.PARTIALLY_REFUNDED))
  );
}

/**
 * Checks if a payment in a given status supports partial refunds.
 *
 * Partially refundable statuses: SUCCEEDED, CAPTURED, PARTIALLY_REFUNDED
 * (PARTIALLY_REFUNDED can transition to REFUNDED for the remainder)
 *
 * @param status - The payment status to check
 * @returns `true` if a partial refund is possible from this status
 */
export function isPartiallyRefundableStatus(status: PaymentStatus): boolean {
  const allowed = VALID_TRANSITIONS[status];
  return (
    allowed !== undefined &&
    allowed.includes(PaymentStatus.PARTIALLY_REFUNDED)
  );
}
