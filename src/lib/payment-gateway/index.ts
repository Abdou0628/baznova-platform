/**
 * BazNova Payment Gateway Abstraction Layer
 *
 * Main entry point. Re-exports all types, the registry, and helper functions.
 *
 * Usage in an API route:
 *   import { resolveGateway, bootstrapGateways } from '@/lib/payment-gateway'
 *   await bootstrapGateways()
 *   const gw = resolveGateway('MAD')
 *   const result = await gw.createCheckout(request)
 */

// ─── Types ────────────────────────────────────────────

export type {
  GatewayId,
  PaymentStatus,
  Currency,
  PlanId,
  GatewayConfig,
  PaymentRequest,
  PaymentResult,
  WebhookPayload,
  WebhookResult,
  RefundRequest,
  RefundResult,
  SubscriptionStatus,
  IPaymentGateway,
} from './types'

export {
  GatewayNotImplementedError,
  GatewayNotConfiguredError,
  GatewayError,
} from './types'

// ─── Registry ─────────────────────────────────────────

export { gatewayRegistry } from './registry'

// ─── Bootstrap ────────────────────────────────────────

import { gatewayRegistry } from './registry'
import type { GatewayId, Currency, GatewayConfig, IPaymentGateway } from './types'

// Adapter imports (lazy — only loaded when bootstrapGateways is called)
let _bootstrapped = false

/**
 * Instantiate and register all gateway adapters into the registry.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * Gateways that fail initialization (missing credentials) are still
 * registered but remain inactive in the registry.
 */
export async function bootstrapGateways(): Promise<void> {
  if (_bootstrapped) return

  // Import all adapters
  const { paymobGateway } = await import('./adapters/paymob.adapter')
  const { stripeGateway } = await import('./adapters/stripe.adapter')
  const { lemonsqueezyGateway } = await import('./adapters/lemonsqueezy.adapter')
  const { devGateway } = await import('./adapters/dev.adapter')
  const { payzoneGateway } = await import('./adapters/payzone.adapter')
  const { napsGateway } = await import('./adapters/naps.adapter')

  // Register all gateways (order matters for fallback resolution)
  gatewayRegistry.register(paymobGateway)
  gatewayRegistry.register(stripeGateway)
  gatewayRegistry.register(lemonsqueezyGateway)
  gatewayRegistry.register(payzoneGateway)
  gatewayRegistry.register(napsGateway)
  gatewayRegistry.register(devGateway)

  // Initialize all (failures are logged, not thrown)
  await gatewayRegistry.initializeAll()

  _bootstrapped = true
  console.log(
    `[PaymentGateway] Bootstrapped ${gatewayRegistry.getActiveGateways().length} active gateway(s): ${gatewayRegistry.getActiveGateways().map(g => g.id).join(', ')}`,
  )
}

// ─── Helper Functions ─────────────────────────────────

/**
 * Resolve the best gateway for a given currency, with an optional preferred gateway.
 *
 * Priority:
 *   1. preferredGateway (if active and supports the currency)
 *   2. currency-based routing (MAD → morocco region, else first international)
 *   3. dev fallback (always available)
 *
 * Returns undefined only if the registry is completely empty (should not happen after bootstrap).
 */
export function resolveGateway(
  currency: Currency,
  preferredGateway?: GatewayId,
): IPaymentGateway | undefined {
  // 1. Try the preferred gateway first
  if (preferredGateway) {
    const preferred = gatewayRegistry.get(preferredGateway)
    if (
      preferred &&
      preferred.config.isActive &&
      preferred.config.supportedCurrencies.includes(currency)
    ) {
      return preferred
    }
  }

  // 2. Currency-based routing
  const byCurrency = gatewayRegistry.getGatewayForCurrency(currency)
  if (byCurrency) return byCurrency

  // 3. Dev fallback (always active)
  const dev = gatewayRegistry.get('dev')
  if (dev?.config.isActive) return dev

  // 4. Last resort: any active gateway
  const anyActive = gatewayRegistry.getActiveGateways()[0]
  return anyActive || undefined
}

/**
 * Get the list of active gateway configs for the client.
 * This is safe to expose to the frontend (no secrets).
 */
export function getAvailableGateways(): GatewayConfig[] {
  return gatewayRegistry.getAllConfigs().filter((c) => c.isActive)
}

/**
 * Check if gateways have been bootstrapped.
 */
export function isBootstrapped(): boolean {
  return _bootstrapped
}
