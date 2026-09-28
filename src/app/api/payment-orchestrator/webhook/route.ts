/**
 * Payment Orchestrator — Webhook Handler
 *
 * Processes webhooks from ANY registered provider.
 * Implements idempotency: duplicate events are silently acknowledged.
 * Implements state machine validation: invalid transitions are logged.
 *
 * ⚠️ CRITICAL (CTO §5): The browser is NEVER the source of truth.
 *     Official confirmation comes from the provider via webhook.
 *
 * ⚠️ CRITICAL (CTO §6): Idempotency is MANDATORY.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processWebhook, bootstrapOrchestrator, logAuditEvent } from '@/lib/payment-orchestrator'

export async function POST(request: NextRequest) {
  try {
    // Get provider ID and event ID from query params
    const providerId = request.nextUrl.searchParams.get('provider')
    const providerEventId = request.nextUrl.searchParams.get('event_id')
    const eventType = request.nextUrl.searchParams.get('event_type')
    const signature = request.headers.get('x-signature')
      ?? request.headers.get('x-webhook-signature')
      ?? undefined

    if (!providerId || !providerEventId) {
      return NextResponse.json(
        { error: 'Missing provider or event_id parameter' },
        { status: 400 },
      )
    }

    // Parse body
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      rawBody = await request.text()
    }

    await bootstrapOrchestrator()

    const result = await processWebhook({
      providerId,
      providerEventId,
      eventType: eventType ?? 'unknown',
      rawBody,
      signature,
    })

    // Always return 200 to prevent provider retries for already-processed events
    return NextResponse.json({
      success: true,
      paymentRecordId: result.paymentRecordId,
      newState: result.newState,
      subscriptionActivated: result.subscriptionActivated,
    })
  } catch (error) {
    console.error('[PaymentOrchestrator/webhook] Error:', error)

    // Still return 200 for idempotent events to prevent retries
    // But log the error for investigation
    const { bootstrapOrchestrator: boot } = await import('@/lib/payment-orchestrator')
    await boot()
    try {
      await logAuditEvent({
        action: 'webhook_error',
        providerId: request.nextUrl.searchParams.get('provider') ?? 'unknown',
        details: `Webhook processing error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } catch {
      // Audit log failure should not block the response
    }

    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 200 })
  }
}
