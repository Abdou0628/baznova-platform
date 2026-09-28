/**
 * HireNova Payment State Machine
 *
 * Enforces valid state transitions per CTO specification.
 * A payment cannot jump from CREATED directly to SUCCEEDED —
 * it must go through the defined lifecycle.
 *
 * State Diagram:
 *   CREATED → PENDING → AUTHORIZED → CAPTURED → SUCCEEDED
 *                                               ↘ FAILED
 *                 ↘ CANCELLED
 *                 ↘ EXPIRED
 *   SUCCEEDED → REFUNDED / PARTIALLY_REFUNDED
 */

import type { PaymentState, PaymentEventType, SubscriptionState, SubscriptionEventType } from './types'
import { OrchestratorError } from './types'

// ─── Payment State Transitions ──────────────────────────────────────────────

/**
 * Defines which events can fire from which state, and what the resulting state is.
 * Key = current state, Value = map of event → next state.
 *
 * This is the single source of truth for payment lifecycle.
 */
export const PAYMENT_TRANSITIONS: Record<
  PaymentState,
  Partial<Record<PaymentEventType, PaymentState>>
> = {
  CREATED: {
    payment_created: 'CREATED',
    payment_pending: 'PENDING',
    payment_failed: 'FAILED',
    payment_cancelled: 'CANCELLED',
  },
  PENDING: {
    payment_authorized: 'AUTHORIZED',
    payment_captured: 'CAPTURED',
    payment_succeeded: 'SUCCEEDED',
    payment_failed: 'FAILED',
    payment_cancelled: 'CANCELLED',
    payment_expired: 'EXPIRED',
    payment_retry_attempted: 'PENDING',
  },
  AUTHORIZED: {
    payment_captured: 'CAPTURED',
    payment_succeeded: 'SUCCEEDED',
    payment_failed: 'FAILED',
    payment_cancelled: 'CANCELLED',
    payment_expired: 'EXPIRED',
  },
  CAPTURED: {
    payment_succeeded: 'SUCCEEDED',
    payment_failed: 'FAILED',
  },
  SUCCEEDED: {
    payment_refunded: 'REFUNDED',
    payment_partially_refunded: 'PARTIALLY_REFUNDED',
  },
  FAILED: {
    // Terminal state — no outgoing transitions (except retry via new payment)
  },
  CANCELLED: {
    // Terminal state
  },
  EXPIRED: {
    // Terminal state
  },
  REFUNDED: {
    // Terminal state
  },
  PARTIALLY_REFUNDED: {
    payment_refunded: 'REFUNDED',
    payment_partially_refunded: 'PARTIALLY_REFUNDED',
  },
}

/** States that are considered "terminal" — no further transitions allowed */
export const TERMINAL_PAYMENT_STATES: PaymentState[] = [
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
]

/** States where the payment has been successfully completed */
export const SUCCESS_PAYMENT_STATES: PaymentState[] = [
  'CAPTURED',
  'SUCCEEDED',
]

/** States where the payment is still in-flight */
export const INFLIGHT_PAYMENT_STATES: PaymentState[] = [
  'CREATED',
  'PENDING',
  'AUTHORIZED',
  'CAPTURED',
]

// ─── Subscription State Transitions ─────────────────────────────────────────

export const SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionState,
  Partial<Record<SubscriptionEventType, SubscriptionState>>
> = {
  TRIALING: {
    subscription_activated: 'ACTIVE',
    subscription_cancelled: 'CANCELLED',
    subscription_expired: 'EXPIRED',
  },
  ACTIVE: {
    subscription_renewed: 'ACTIVE',
    subscription_past_due: 'PAST_DUE',
    subscription_cancelled: 'CANCELLED',
    subscription_expired: 'EXPIRED',
    subscription_paused: 'PAUSED',
    subscription_plan_changed: 'ACTIVE',
  },
  PAST_DUE: {
    subscription_activated: 'ACTIVE',
    subscription_cancelled: 'CANCELLED',
    subscription_expired: 'EXPIRED',
    subscription_renewed: 'ACTIVE',
  },
  CANCELLED: {
    // Terminal — can be re-activated by creating new subscription
  },
  EXPIRED: {
    // Terminal
  },
  PAUSED: {
    subscription_resumed: 'ACTIVE',
    subscription_cancelled: 'CANCELLED',
    subscription_expired: 'EXPIRED',
  },
}

// ─── State Machine Class ────────────────────────────────────────────────────

export class PaymentStateMachine {
  /**
   * Validate and compute the next state for a payment transition.
   * Throws if the transition is invalid.
   */
  static transition(
    currentState: PaymentState,
    event: PaymentEventType,
  ): PaymentState {
    const allowed = PAYMENT_TRANSITIONS[currentState]
    if (!allowed) {
      throw new OrchestratorError(
        `Unknown payment state: ${currentState}`,
        'UNKNOWN',
      )
    }

    const nextState = allowed[event]
    if (!nextState) {
      throw new OrchestratorError(
        `Invalid transition: ${currentState} + ${event} is not allowed. ` +
        `Allowed events from ${currentState}: [${Object.keys(allowed).join(', ')}]`,
        'INVALID_STATE_TRANSITION',
      )
    }

    return nextState
  }

  /**
   * Check if a transition would be valid without throwing.
   */
  static canTransition(
    currentState: PaymentState,
    event: PaymentEventType,
  ): boolean {
    try {
      this.transition(currentState, event)
      return true
    } catch {
      return false
    }
  }

  /** Check if a state is terminal */
  static isTerminal(state: PaymentState): boolean {
    return TERMINAL_PAYMENT_STATES.includes(state)
  }

  /** Check if a state represents a successful payment */
  static isSuccess(state: PaymentState): boolean {
    return SUCCESS_PAYMENT_STATES.includes(state)
  }

  /** Check if a payment is still in-flight (not yet terminal) */
  static isInflight(state: PaymentState): boolean {
    return INFLIGHT_PAYMENT_STATES.includes(state)
  }

  /** Get all events that can fire from a given state */
  static getAvailableEvents(currentState: PaymentState): PaymentEventType[] {
    return Object.keys(PAYMENT_TRANSITIONS[currentState] ?? {}) as PaymentEventType[]
  }
}

export class SubscriptionStateMachine {
  static transition(
    currentState: SubscriptionState,
    event: SubscriptionEventType,
  ): SubscriptionState {
    const allowed = SUBSCRIPTION_TRANSITIONS[currentState]
    if (!allowed) {
      throw new OrchestratorError(
        `Unknown subscription state: ${currentState}`,
        'UNKNOWN',
      )
    }

    const nextState = allowed[event]
    if (!nextState) {
      throw new OrchestratorError(
        `Invalid subscription transition: ${currentState} + ${event} is not allowed. ` +
        `Allowed events from ${currentState}: [${Object.keys(allowed).join(', ')}]`,
        'SUBSCRIPTION_ERROR',
      )
    }

    return nextState
  }

  static canTransition(
    currentState: SubscriptionState,
    event: SubscriptionEventType,
  ): boolean {
    try {
      this.transition(currentState, event)
      return true
    } catch {
      return false
    }
  }

  static isActive(state: SubscriptionState): boolean {
    return state === 'ACTIVE' || state === 'TRIALING'
  }
}
