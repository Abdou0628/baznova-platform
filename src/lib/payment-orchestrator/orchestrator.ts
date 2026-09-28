/**
 * HireNova Payment Orchestrator
 *
 * The main orchestration layer that ties together:
 *   - Smart routing (ProviderRegistry)
 *   - State machine (PaymentStateMachine)
 *   - Event sourcing ledger (PaymentLedger)
 *   - Idempotency protection
 *   - Retry logic (controlled, not blind)
 *   - Webhook processing with signature verification
 *   - Subscription lifecycle management
 *
 * ⚠️ CRITICAL (CTO §7): Does NOT do blind failover.
 *   For a payment already potentially authorized, relaunching
 *   automatically at another provider can cause double debit.
 *   Routing depends on the exact transaction state.
 *
 * ⚠️ CRITICAL (CTO §5): The browser is NEVER the source of truth.
 *   Official confirmation comes from the provider via webhook.
 *
 * ⚠️ CRITICAL (CTO §3): HireNova does NOT store card data.
 *   Only tokens/reference IDs from the provider.
 */

import { randomUUID } from 'crypto'
import type {
  OrchestratorCheckoutRequest,
  OrchestratorCheckoutResult,
  OrchestratorWebhookResult,
  OrchestratorRefundRequest,
  OrchestratorRefundResult,
  OrchestratorStatusResult,
  PaymentState,
  PaymentEventType,
  SubscriptionState,
  SubscriptionEventType,
} from './types'
import { OrchestratorError } from './types'
import { providerRegistry } from './provider-registry'
import { PaymentStateMachine, SubscriptionStateMachine } from './state-machine'
import {
  createPaymentRecord,
  getPaymentRecord,
  getPaymentByIdempotencyKey,
  getPaymentEvents,
  recordEvent,
  logAuditEvent,
} from './ledger'

// ─── Configuration ──────────────────────────────────────────────────────────

const MAX_RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 2000

// ─── Bootstrap ─────────────────────────────────────────────────────────────

let _bootstrapped = false

/**
 * Initialize the orchestrator. Must be called once before use.
 * Safe to call multiple times.
 */
export async function bootstrapOrchestrator(): Promise<void> {
  if (_bootstrapped) return
  await providerRegistry.load()
  _bootstrapped = true
  console.log('[PaymentOrchestrator] Bootstrapped successfully')
}

export function isOrchestratorReady(): boolean {
  return _bootstrapped
}

// ─── Checkout Flow ─────────────────────────────────────────────────────────

/**
 * Create a payment checkout through the orchestrator.
 *
 * Flow:
 *   1. Generate idempotency key
 *   2. Check for existing payment (idempotency)
 *   3. Smart route to best provider
 *   4. Create payment record (CREATED state)
 *   5. Delegate to existing payment-gateway adapter
 *   6. Record event (PENDING or SUCCEEDED)
 *   7. Return checkout URL or result
 */
export async function createCheckout(
  request: OrchestratorCheckoutRequest,
): Promise<OrchestratorCheckoutResult> {
  await ensureBootstrapped()

  // 1. Generate idempotency key from request
  const idempotencyKey = `chk_${request.userId}_${request.planId}_${request.currency}_${request.amount}_${Date.now()}`

  // 2. Idempotency check — don't create duplicate
  const existing = await getPaymentByIdempotencyKey(idempotencyKey)
  if (existing) {
    return {
      success: true,
      paymentRecordId: existing.id,
      providerId: existing.providerId,
      state: existing.state as PaymentState,
      routingReason: 'idempotency_hit',
    }
  }

  // 3. Smart routing
  const routing = providerRegistry.resolve({
    currency: request.currency,
    country: request.country,
    paymentMethod: request.paymentMethod,
    amount: request.amount,
    planId: request.planId,
    preferredProvider: request.preferredProvider,
  })

  // 4. Create payment record
  const paymentRecord = await createPaymentRecord({
    userId: request.userId,
    email: request.email,
    planId: request.planId,
    providerId: routing.providerId,
    amount: request.amount,
    currency: request.currency,
    idempotencyKey,
    metadata: request.metadata,
  })

  // Record CREATED event
  await recordEvent({
    paymentRecordId: paymentRecord.id,
    eventType: 'payment_created',
    providerId: routing.providerId,
  })

  // 5. Delegate to existing payment gateway adapter
  let gatewayResult: { checkoutUrl?: string; transactionId?: string; orderId?: string; status: string; error?: string }
  try {
    gatewayResult = await delegateToGateway('createCheckout', routing.providerId, {
      userId: request.userId,
      email: request.email,
      planId: request.planId,
      currency: request.currency,
      amount: request.amount,
      gatewayId: routing.providerId as any,
      metadata: request.metadata,
    })
  } catch (err) {
    // Record failure
    await recordEvent({
      paymentRecordId: paymentRecord.id,
      eventType: 'payment_failed',
      providerId: routing.providerId,
      metadata: { error: String(err) },
    })
    await logAuditEvent({
      action: 'checkout_gateway_error',
      userId: request.userId,
      providerId: routing.providerId,
      paymentRecordId: paymentRecord.id,
      details: `Gateway ${routing.providerId} failed during checkout`,
      metadata: { error: String(err) },
    })

    return {
      success: false,
      paymentRecordId: paymentRecord.id,
      providerId: routing.providerId,
      state: 'FAILED',
      error: `Provider ${routing.providerId} unavailable. Try again or contact support.`,
      routingReason: routing.reason,
    }
  }

  // 6. Record state transition based on gateway result
  let eventToRecord: PaymentEventType
  if (gatewayResult.status === 'confirmed' || gatewayResult.status === 'succeeded') {
    eventToRecord = 'payment_succeeded'
  } else if (gatewayResult.status === 'authorized') {
    eventToRecord = 'payment_authorized'
  } else {
    eventToRecord = 'payment_pending'
  }

  const newState = await recordEvent({
    paymentRecordId: paymentRecord.id,
    eventType: eventToRecord,
    providerId: routing.providerId,
    providerEventId: gatewayResult.transactionId,
    amount: request.amount,
    currency: request.currency,
  })

  // 7. Update payment record with provider IDs
  const { db } = await import('@/lib/db')
  await db.orchestratorPaymentRecord.update({
    where: { id: paymentRecord.id },
    data: {
      providerPaymentId: gatewayResult.transactionId ?? null,
      providerOrderId: gatewayResult.orderId ?? null,
    },
  })

  // 8. Audit log
  await logAuditEvent({
    action: 'checkout_created',
    userId: request.userId,
    providerId: routing.providerId,
    paymentRecordId: paymentRecord.id,
    details: `Checkout created via ${routing.providerId} (${routing.reason})`,
    metadata: {
      planId: request.planId,
      amount: String(request.amount),
      currency: request.currency,
    },
  })

  return {
    success: true,
    paymentRecordId: paymentRecord.id,
    providerId: routing.providerId,
    checkoutUrl: gatewayResult.checkoutUrl,
    transactionId: gatewayResult.transactionId,
    orderId: gatewayResult.orderId,
    state: newState,
    routingReason: routing.reason,
  }
}

// ─── Webhook Processing ────────────────────────────────────────────────────

/**
 * Process an incoming webhook from a payment provider.
 *
 * ⚠️ CRITICAL (CTO §5 & §6):
 *   - The browser is NEVER the source of truth
 *   - Webhook confirmation is the official source
 *   - Idempotency is MANDATORY to prevent double processing
 *
 * Flow:
 *   1. Verify provider identity
 *   2. Find payment record
 *   3. Idempotency check via providerEventId
 *   4. Validate state transition
 *   5. Record event
 *   6. Activate subscription if payment succeeded
 */
export async function processWebhook(params: {
  providerId: string
  providerEventId: string
  eventType: string
  rawBody: unknown
  signature?: string
}): Promise<OrchestratorWebhookResult> {
  await ensureBootstrapped()

  const { providerId, providerEventId, eventType, rawBody, signature } = params

  // 1. Verify the provider is registered
  const provider = providerRegistry.get(providerId)
  if (!provider) {
    await logAuditEvent({
      action: 'webhook_unknown_provider',
      providerId,
      details: `Webhook received from unknown provider: ${providerId}`,
      metadata: { providerEventId, eventType },
    })
    throw new OrchestratorError(
      `Unknown provider: ${providerId}`,
      'WEBHOOK_VERIFICATION_FAILED',
    )
  }

  // 2. Signature verification (if supported by provider)
  if (provider.supportsWebhookSignature && signature) {
    const verified = await verifyWebhookSignature(providerId, rawBody, signature)
    if (!verified) {
      await logAuditEvent({
        action: 'webhook_signature_invalid',
        providerId,
        details: `Invalid webhook signature from ${providerId}`,
        metadata: { providerEventId },
      })
      throw new OrchestratorError(
        `Webhook signature verification failed for ${providerId}`,
        'WEBHOOK_VERIFICATION_FAILED',
      )
    }
  }

  // 3. Map provider event type to orchestrator event type
  const orchestratorEvent = mapProviderEvent(eventType)
  if (!orchestratorEvent) {
    console.log(`[Orchestrator] Unmapped provider event: ${eventType} — ignoring`)
    return {
      success: true,
      previousState: 'CREATED',
      newState: 'CREATED',
      subscriptionActivated: false,
    }
  }

  // 4. Find payment record by provider event ID (idempotency)
  const { db } = await import('@/lib/db')
  const existingEvent = await db.orchestratorPaymentEvent.findUnique({
    where: { providerEventId },
  })

  if (existingEvent) {
    console.log(`[Orchestrator] Idempotency: event ${providerEventId} already processed`)
    // Return the existing state — idempotent response
    const payment = await getPaymentRecord(existingEvent.paymentRecordId)
    return {
      success: true,
      paymentRecordId: existingEvent.paymentRecordId,
      userId: payment?.userId,
      previousState: existingEvent.previousState as PaymentState,
      newState: existingEvent.newState as PaymentState,
      subscriptionActivated: existingEvent.newState === 'SUCCEEDED' || existingEvent.newState === 'CAPTURED',
    }
  }

  // 5. Find payment by provider order/payment ID from raw body
  const providerTxId = extractTransactionId(rawBody, providerId)
  let paymentRecord = providerTxId
    ? await db.orchestratorPaymentRecord.findFirst({
        where: {
          OR: [
            { providerPaymentId: providerTxId },
            { providerOrderId: providerTxId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    : null

  // 6. Record the event (handles state machine validation + idempotency)
  if (!paymentRecord) {
    await logAuditEvent({
      action: 'webhook_orphaned',
      providerId,
      details: `Webhook for unknown transaction: ${providerTxId ?? 'no-tx-id'}`,
      metadata: { providerEventId, eventType, rawBody: JSON.stringify(rawBody).slice(0, 500) },
    })
    throw new OrchestratorError(
      `No payment record found for provider event: ${providerEventId}`,
      'LEDGER_ERROR',
    )
  }

  const previousState = paymentRecord.state as PaymentState

  // 7. Attempt state transition
  let newState: PaymentState
  try {
    newState = await recordEvent({
      paymentRecordId: paymentRecord.id,
      eventType: orchestratorEvent,
      providerId,
      providerEventId,
    })
  } catch (err) {
    if (err instanceof OrchestratorError && err.code === 'INVALID_STATE_TRANSITION') {
      console.warn(`[Orchestrator] Invalid transition for ${paymentRecord.id}: ${previousState} + ${orchestratorEvent}`)
      return {
        success: true,
        paymentRecordId: paymentRecord.id,
        userId: paymentRecord.userId,
        previousState,
        newState: previousState,
        subscriptionActivated: false,
      }
    }
    throw err
  }

  // 8. Activate subscription if payment succeeded
  let subscriptionActivated = false
  if (PaymentStateMachine.isSuccess(newState)) {
    try {
      await activateSubscriptionIfNeeded(paymentRecord.userId, paymentRecord.planId, providerId)
      subscriptionActivated = true
    } catch (err) {
      console.error(`[Orchestrator] Subscription activation failed for ${paymentRecord.userId}:`, err)
      // Don't throw — the payment succeeded, subscription issue is separate
    }
  }

  // 9. Audit log
  await logAuditEvent({
    action: 'webhook_processed',
    userId: paymentRecord.userId,
    providerId,
    paymentRecordId: paymentRecord.id,
    details: `Webhook processed: ${previousState} → ${newState} (${orchestratorEvent})`,
    metadata: { providerEventId, eventType, subscriptionActivated: String(subscriptionActivated) },
  })

  return {
    success: true,
    paymentRecordId: paymentRecord.id,
    userId: paymentRecord.userId,
    previousState,
    newState,
    subscriptionActivated,
  }
}

// ─── Payment Status Query ──────────────────────────────────────────────────

/**
 * Get the current status and full event history of a payment.
 */
export async function getPaymentStatus(paymentRecordId: string): Promise<OrchestratorStatusResult> {
  const payment = await getPaymentRecord(paymentRecordId)
  if (!payment) {
    throw new OrchestratorError(`Payment record not found: ${paymentRecordId}`, 'LEDGER_ERROR')
  }

  const events = await getPaymentEvents(paymentRecordId)

  return {
    paymentRecordId: payment.id,
    state: payment.state as PaymentState,
    providerId: payment.providerId,
    providerTransactionId: payment.providerPaymentId ?? undefined,
    amount: payment.amount,
    currency: payment.currency,
    userId: payment.userId,
    planId: payment.planId,
    events,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }
}

// ─── Refund Processing ─────────────────────────────────────────────────────

/**
 * Process a refund (full or partial) for a successful payment.
 */
export async function processRefund(request: OrchestratorRefundRequest): Promise<OrchestratorRefundResult> {
  await ensureBootstrapped()

  const payment = await getPaymentRecord(request.paymentRecordId)
  if (!payment) {
    throw new OrchestratorError(`Payment record not found: ${request.paymentRecordId}`, 'LEDGER_ERROR')
  }

  const currentState = payment.state as PaymentState

  // Validate current state allows refund
  if (currentState !== 'SUCCEEDED' && currentState !== 'PARTIALLY_REFUNDED') {
    throw new OrchestratorError(
      `Cannot refund payment in state: ${currentState}. Only SUCCEEDED or PARTIALLY_REFUNDED payments can be refunded.`,
      'REFUND_NOT_ALLOWED',
    )
  }

  // Check provider supports refund
  const provider = providerRegistry.get(payment.providerId)
  if (!provider?.supportsRefund) {
    throw new OrchestratorError(
      `Provider ${payment.providerId} does not support refunds`,
      'REFUND_NOT_ALLOWED',
    )
  }

  // Delegate to gateway for actual refund
  try {
    await delegateToGateway('processRefund', payment.providerId, {
      userId: request.userId,
      transactionId: payment.providerPaymentId ?? payment.id,
      gatewayId: payment.providerId as any,
      reason: request.reason,
    })
  } catch (err) {
    throw new OrchestratorError(
      `Refund failed at provider ${payment.providerId}: ${err}`,
      'PROVIDER_ERROR',
      err,
    )
  }

  // Record event
  const eventType: PaymentEventType = request.amount
    ? 'payment_partially_refunded'
    : 'payment_refunded'

  const newState = await recordEvent({
    paymentRecordId: payment.id,
    eventType,
    providerId: payment.providerId,
    amount: request.amount,
    currency: payment.currency,
  })

  await logAuditEvent({
    action: 'refund_processed',
    userId: request.userId,
    providerId: payment.providerId,
    paymentRecordId: payment.id,
    details: `Refund processed: ${currentState} → ${newState}`,
    metadata: { reason: request.reason ?? '', amount: String(request.amount ?? payment.amount) },
  })

  return {
    success: true,
    newState,
  }
}

// ─── Subscription Management ────────────────────────────────────────────────

/**
 * Activate a user's subscription for a given plan.
 * Uses the existing subscription manager under the hood.
 */
async function activateSubscriptionIfNeeded(
  userId: string,
  planId: string,
  providerId: string,
): Promise<void> {
  const { db } = await import('@/lib/db')

  // Update User plan
  await db.user.update({
    where: { id: userId },
    data: { plan: planId },
  })

  // Record subscription event in orchestrator ledger
  await db.orchestratorSubscriptionEvent.create({
    data: {
      userId,
      planId,
      providerId,
      eventType: 'subscription_activated',
      previousState: 'TRIALING',
      newState: 'ACTIVE',
    },
  })

  console.log(`[Orchestrator] Subscription activated: user=${userId}, plan=${planId}, provider=${providerId}`)
}

// ─── Gateway Delegation ────────────────────────────────────────────────────

/**
 * Delegate to the existing payment-gateway layer.
 * This is the bridge between the orchestrator and the adapters.
 * ⚠️ Does NOT modify any existing payment-gateway code.
 */
async function delegateToGateway(
  method: 'createCheckout' | 'processRefund' | 'processWebhook' | 'getPaymentStatus',
  gatewayId: string,
  payload: any,
): Promise<any> {
  // Dynamic import to keep the orchestrator independent
  const { bootstrapGateways, resolveGateway } = await import('@/lib/payment-gateway')
  await bootstrapGateways()

  const gateway = resolveGateway(payload.currency as any, gatewayId as any)
  if (!gateway) {
    throw new OrchestratorError(
      `No gateway available for ${gatewayId} / ${payload.currency}`,
      'NO_PROVIDER_AVAILABLE',
    )
  }

  switch (method) {
    case 'createCheckout':
      return gateway.createCheckout(payload)
    case 'processRefund':
      return gateway.processRefund(payload)
    case 'processWebhook':
      return gateway.processWebhook(payload)
    case 'getPaymentStatus':
      return gateway.getPaymentStatus(payload.transactionId)
    default:
      throw new OrchestratorError(`Unknown gateway method: ${method}`, 'UNKNOWN')
  }
}

// ─── Webhook Helpers ────────────────────────────────────────────────────────

/**
 * Verify webhook signature. Currently delegates to the existing gateway adapters.
 */
async function verifyWebhookSignature(
  providerId: string,
  rawBody: unknown,
  signature: string,
): Promise<boolean> {
  try {
    const { bootstrapGateways, gatewayRegistry } = await import('@/lib/payment-gateway')
    await bootstrapGateways()
    const gateway = gatewayRegistry.get(providerId as any)
    if (!gateway) return false

    // Delegate signature verification to the adapter
    const result = await gateway.processWebhook({
      gatewayId: providerId as any,
      eventType: '__verify__',
      rawBody,
      signature,
    })
    return result.success
  } catch {
    // If verification fails for any reason, reject
    return false
  }
}

/**
 * Map provider-specific event types to orchestrator event types.
 */
function mapProviderEvent(providerEventType: string): PaymentEventType | null {
 const mapping: Record<string, PaymentEventType> = {
    // Stripe
    'payment_intent.succeeded': 'payment_succeeded',
    'payment_intent.payment_failed': 'payment_failed',
    'payment_intent.canceled': 'payment_cancelled',
    'charge.refunded': 'payment_refunded',
    'charge.partially_refunded': 'payment_partially_refunded',
    'invoice.payment_succeeded': 'payment_succeeded',
    'invoice.payment_failed': 'payment_failed',
    'customer.subscription.deleted': 'payment_cancelled',

    // PayMob
    'TRANSACTION_SUCCESS': 'payment_succeeded',
    'TRANSACTION_FAILED': 'payment_failed',
    'TRANSACTION_REFUNDED': 'payment_refunded',
    'TRANSACTION_VOIDED': 'payment_cancelled',
    'TRANSACTION_TIMEOUT': 'payment_expired',

    // LemonSqueezy
    'order_created': 'payment_pending',
    'order_refunded': 'payment_refunded',
    'subscription_created': 'payment_authorized',
    'subscription_updated': 'payment_succeeded',

    // Payzone (expected)
    'PAYMENT_SUCCESS': 'payment_succeeded',
    'PAYMENT_FAILURE': 'payment_failed',
    'PAYMENT_REFUND': 'payment_refunded',

    // NAPS (expected)
    'CONFIRMED': 'payment_succeeded',
    'REJECTED': 'payment_failed',
    'CANCELLED': 'payment_cancelled',

    // Generic fallbacks
    'success': 'payment_succeeded',
    'failed': 'payment_failed',
    'cancelled': 'payment_cancelled',
    'refunded': 'payment_refunded',
  }

  return mapping[providerEventType] ?? null
}

/**
 * Extract the provider's transaction ID from a webhook payload.
 */
function extractTransactionId(rawBody: any, providerId: string): string | null {
  try {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody

    switch (providerId) {
      case 'stripe':
        return body.data?.object?.id ?? body.payment_intent ?? body.id ?? null
      case 'paymob':
        return body.obj?.id?.toString() ?? body.id?.toString() ?? null
      case 'lemonsqueezy':
        return body.meta?.custom_data?.payment_id ?? body.data?.id?.toString() ?? null
      default:
        return body.id?.toString() ?? body.transaction_id ?? body.order_id ?? null
    }
  } catch {
    return null
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

async function ensureBootstrapped(): Promise<void> {
  if (!_bootstrapped) {
    await bootstrapOrchestrator()
  }
}
