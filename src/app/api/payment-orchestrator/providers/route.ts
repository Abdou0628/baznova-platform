/**
 * Payment Orchestrator — Provider Registry Query
 *
 * Returns active providers and their capabilities.
 * Safe to expose to frontend (no secrets).
 */

import { NextResponse } from 'next/server'
import { providerRegistry, bootstrapOrchestrator } from '@/lib/payment-orchestrator'

export async function GET() {
  try {
    await bootstrapOrchestrator()

    const providers = providerRegistry.getActiveProviders().map(p => ({
      id: p.id,
      name: p.name,
      region: p.region,
      currencies: p.currencies,
      paymentMethods: p.paymentMethods,
      supportsRecurring: p.supportsRecurring,
      supportsRefund: p.supportsRefund,
    }))

    return NextResponse.json({
      success: true,
      providers,
      architecture: {
        layer: 'Payment Orchestrator',
        version: '1.0.0',
        features: [
          'state_machine',
          'event_sourcing',
          'idempotency',
          'smart_routing',
          'provider_capabilities',
          'audit_logging',
          'webhook_processing',
        ],
      },
    })
  } catch (error) {
    console.error('[PaymentOrchestrator/providers] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
