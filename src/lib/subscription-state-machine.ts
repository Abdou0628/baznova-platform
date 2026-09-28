// ─── HireNova Subscription State Machine ─────────────────────────────────
// Strict state transition enforcement for subscription lifecycle.
// SERVER-ONLY — do not import in client components.
//
// Reuses GRACE_PERIOD_DAYS from billing-safety.ts for consistency.
// ─────────────────────────────────────────────────────────────────────────────

import { GRACE_PERIOD_DAYS } from './billing-safety'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type SubscriptionState =
  | 'active'
  | 'renewal_pending'
  | 'payment_failed'
  | 'grace_period'
  | 'expired'
  | 'cancelled'
  | 'reactivated'

export type SubscriptionEvent =
  | 'subscribe'
  | 'renew'
  | 'payment_success'
  | 'payment_failed'
  | 'expire_grace'
  | 'cancel'
  | 'reactivate'
  | 'upgrade'
  | 'downgrade'

// ═══════════════════════════════════════════════════════════════════════════════
// Transition Table
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSITIONS: Record<SubscriptionState, SubscriptionEvent[]> = {
  active: ['renew', 'payment_failed', 'cancel', 'upgrade', 'downgrade'],
  renewal_pending: ['payment_success', 'payment_failed'],
  payment_failed: ['payment_success', 'cancel', 'expire_grace'],
  grace_period: ['payment_success', 'cancel', 'expire_grace'],
  expired: ['reactivate', 'subscribe'],
  cancelled: ['reactivate', 'subscribe'],
  reactivated: ['cancel', 'upgrade', 'downgrade', 'payment_failed'],
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event → Result State Mapping
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_RESULTS: Partial<Record<SubscriptionState, Partial<Record<SubscriptionEvent, SubscriptionState>>>> = {
  active: {
    renew: 'active',
    payment_failed: 'payment_failed',
    cancel: 'cancelled',
    upgrade: 'active',
    downgrade: 'active',
  },
  renewal_pending: {
    payment_success: 'active',
    payment_failed: 'payment_failed',
  },
  payment_failed: {
    payment_success: 'active',
    cancel: 'cancelled',
    expire_grace: 'grace_period',
  },
  grace_period: {
    payment_success: 'active',
    cancel: 'cancelled',
    expire_grace: 'expired',
  },
  expired: {
    reactivate: 'reactivated',
    subscribe: 'active',
  },
  cancelled: {
    reactivate: 'reactivated',
    subscribe: 'active',
  },
  reactivated: {
    cancel: 'cancelled',
    upgrade: 'reactivated',
    downgrade: 'reactivated',
    payment_failed: 'payment_failed',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determines the current subscription state based on user data.
 *
 * Logic mirrors billing-safety.getSubscriptionStatus but uses
 * the SubscriptionState type from this state machine.
 *
 * - `plan === 'free'` → `'expired'`
 * - No `planExpiresAt` and plan is not free → `'active'`
 * - `planExpiresAt` in the future → `'active'`
 * - `planExpiresAt` in the past but within grace window → `'grace_period'`
 * - `planExpiresAt` in the past and past grace window → `'expired'`
 */
export function getSubscriptionState(user: {
  plan: string
  updatedAt: Date
  planExpiresAt?: Date | null
  gracePeriodUntil?: Date | null
}): SubscriptionState {
  if (user.plan === 'free') {
    return 'expired'
  }

  // No expiry set → active indefinitely (perpetual / manual)
  if (!user.planExpiresAt) {
    return 'active'
  }

  const now = Date.now()
  const expiresAt = new Date(user.planExpiresAt).getTime()

  // Still within subscription period
  if (expiresAt > now) {
    return 'active'
  }

  // Past expiry — check grace period
  const graceUntil = user.gracePeriodUntil
    ? new Date(user.gracePeriodUntil).getTime()
    : expiresAt + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000

  if (now <= graceUntil) {
    return 'grace_period'
  }

  return 'expired'
}

/**
 * Checks whether a transition from `currentState` via `event` is valid.
 */
export function canTransition(
  currentState: SubscriptionState,
  event: SubscriptionEvent,
): boolean {
  const allowed = TRANSITIONS[currentState]
  if (!allowed) return false
  return allowed.includes(event)
}

/**
 * Executes a state transition. Throws if the transition is invalid.
 *
 * @throws {Error} If the transition is not allowed from the current state.
 */
export function transition(
  currentState: SubscriptionState,
  event: SubscriptionEvent,
): SubscriptionState {
  if (!canTransition(currentState, event)) {
    throw new Error(
      `Invalid subscription transition: ${currentState} + ${event} is not allowed. ` +
      `Allowed events from ${currentState}: [${(TRANSITIONS[currentState] ?? []).join(', ')}]`,
    )
  }

  const resultState = EVENT_RESULTS[currentState]?.[event]
  if (!resultState) {
    // This should never happen if TRANSITIONS and EVENT_RESULTS are in sync,
    // but we guard against it.
    throw new Error(
      `Missing transition result for ${currentState} + ${event}. State machine is misconfigured.`,
    )
  }

  return resultState
}

/**
 * Returns all valid events for a given state.
 */
export function getValidEvents(state: SubscriptionState): SubscriptionEvent[] {
  return TRANSITIONS[state] ?? []
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns a human-readable, localized label for a subscription state.
 */
export function getStateLabel(state: SubscriptionState, locale: string = 'fr'): string {
  const labels: Record<SubscriptionState, Record<string, string>> = {
    active: {
      fr: 'Actif',
      en: 'Active',
      ar: 'نشط',
      es: 'Activo',
    },
    renewal_pending: {
      fr: 'Renouvellement en cours',
      en: 'Renewal pending',
      ar: 'تجديد قيد الانتظار',
      es: 'Renovación pendiente',
    },
    payment_failed: {
      fr: 'Paiement échoué',
      en: 'Payment failed',
      ar: 'فشل الدفع',
      es: 'Pago fallido',
    },
    grace_period: {
      fr: 'Période de grâce',
      en: 'Grace period',
      ar: 'فترة سماح',
      es: 'Período de gracia',
    },
    expired: {
      fr: 'Expiré',
      en: 'Expired',
      ar: 'منتهي الصلاحية',
      es: 'Expirado',
    },
    cancelled: {
      fr: 'Annulé',
      en: 'Cancelled',
      ar: 'ملغى',
      es: 'Cancelado',
    },
    reactivated: {
      fr: 'Réactivé',
      en: 'Reactivated',
      ar: 'إعادة تنشيط',
      es: 'Reactivado',
    },
  }

  return labels[state]?.[locale] || labels[state]?.['fr'] || state
}

/**
 * Returns a Tailwind-compatible color class for UI rendering.
 * - Green for positive states (active, reactivated)
 * - Yellow for warning states (renewal_pending, payment_failed, grace_period)
 * - Red for negative states (expired)
 * - Gray for neutral states (cancelled)
 */
export function getStateColor(state: SubscriptionState): string {
  const colors: Record<SubscriptionState, string> = {
    active: 'text-emerald-600 dark:text-emerald-400',
    renewal_pending: 'text-yellow-600 dark:text-yellow-400',
    payment_failed: 'text-yellow-600 dark:text-yellow-400',
    grace_period: 'text-orange-600 dark:text-orange-400',
    expired: 'text-red-600 dark:text-red-400',
    cancelled: 'text-gray-500 dark:text-gray-400',
    reactivated: 'text-emerald-600 dark:text-emerald-400',
  }
  return colors[state]
}

/**
 * Returns a Tailwind-compatible background color for badges.
 */
export function getStateBgColor(state: SubscriptionState): string {
  const colors: Record<SubscriptionState, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    renewal_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    payment_failed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    grace_period: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
    reactivated: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  }
  return colors[state]
}

/**
 * Returns a suggested "next action" description for the user,
 * localized if possible.
 */
export function getNextAction(state: SubscriptionState, locale: string = 'fr'): string {
  const actions: Record<SubscriptionState, Record<string, string>> = {
    active: {
      fr: 'Votre abonnement est actif. Profitez de tous vos modules.',
      en: 'Your subscription is active. Enjoy all your modules.',
      ar: 'اشتراكك نشط. استمتع بجميع وحداتك.',
      es: 'Tu suscripción está activa. Disfruta de todos tus módulos.',
    },
    renewal_pending: {
      fr: 'Votre renouvellement est en cours de traitement.',
      en: 'Your renewal is being processed.',
      ar: 'جاري معالجة تجديد اشتراكك.',
      es: 'Tu renovación se está procesando.',
    },
    payment_failed: {
      fr: 'Le dernier paiement a échoué. Veuillez mettre à jour votre moyen de paiement.',
      en: 'The last payment failed. Please update your payment method.',
      ar: 'فشل آخر دفع. يرجى تحديث طريقة الدفع الخاصة بك.',
      es: 'El último pago falló. Por favor actualiza tu método de pago.',
    },
    grace_period: {
      fr: `Vous avez ${GRACE_PERIOD_DAYS} jours pour mettre à jour votre paiement avant la perte d'accès.`,
      en: `You have ${GRACE_PERIOD_DAYS} days to update your payment before losing access.`,
      ar: `لديك ${GRACE_PERIOD_DAYS} أيام لتحديث الدفع قبل فقدان الوصول.`,
      es: `Tienes ${GRACE_PERIOD_DAYS} días para actualizar tu pago antes de perder el acceso.`,
    },
    expired: {
      fr: 'Votre abonnement a expiré. Renouvelez pour retrouver l\'accès à vos modules.',
      en: 'Your subscription has expired. Renew to regain access to your modules.',
      ar: 'انتهت صلاحية اشتراكك. جدده لاستعادة الوصول إلى وحداتك.',
      es: 'Tu suscripción ha expirado. Renueva para recuperar el acceso a tus módulos.',
    },
    cancelled: {
      fr: 'Votre abonnement a été annulé. Réactivez-le à tout moment.',
      en: 'Your subscription was cancelled. Reactivate it anytime.',
      ar: 'تم إلغاء اشتراكك. يمكنك إعادة تنشيطه في أي وقت.',
      es: 'Tu suscripción fue cancelada. Reactívala en cualquier momento.',
    },
    reactivated: {
      fr: 'Votre abonnement a été réactivé avec succès.',
      en: 'Your subscription has been successfully reactivated.',
      ar: 'تم إعادة تنشيط اشتراكك بنجاح.',
      es: 'Tu suscripción ha sido reactivada con éxito.',
    },
  }

  return actions[state]?.[locale] || actions[state]?.['fr'] || ''
}
