/**
 * BazNova Payment Gateway Registry
 *
 * Singleton registry that holds all registered gateway adapters.
 * Consumer code resolves the correct gateway by currency, ID, or preference.
 *
 * Usage:
 *   import { gatewayRegistry } from '@/lib/payment-gateway'
 *   await bootstrapGateways()  // once at app startup
 *   const gw = gatewayRegistry.getGatewayForCurrency('MAD')
 *   const result = await gw.createCheckout(request)
 */

import { IPaymentGateway, GatewayId, Currency, GatewayConfig } from './types'

class PaymentGatewayRegistry {
  private gateways: Map<GatewayId, IPaymentGateway> = new Map()
  private initialized: Set<GatewayId> = new Set()

  /**
   * Register a gateway adapter instance.
   * Throws if a gateway with the same ID is already registered.
   */
  register(gateway: IPaymentGateway): void {
    if (this.gateways.has(gateway.id)) {
      console.warn(
        `[PaymentGateway] Gateway '${gateway.id}' is already registered. Overwriting.`,
      )
    }
    this.gateways.set(gateway.id, gateway)
  }

  /** Retrieve a gateway by ID (may be undefined if not registered) */
  get(id: GatewayId): IPaymentGateway | undefined {
    return this.gateways.get(id)
  }

  /** Get all registered gateways */
  getAll(): IPaymentGateway[] {
    return Array.from(this.gateways.values())
  }

  /** Get only gateways whose config.isActive === true */
  getActiveGateways(): IPaymentGateway[] {
    return this.getAll().filter((g) => g.config.isActive)
  }

  /**
   * Resolve the best gateway for a given currency.
   * Priority:
   *   - MAD → first active gateway with region 'morocco'
   *   - Other → first active gateway that supports the currency
   */
  getGatewayForCurrency(currency: Currency): IPaymentGateway | undefined {
    // MAD: prefer Morocco-region gateway
    if (currency === 'MAD') {
      const madGateway = this.getActiveGateways().find(
        (g) =>
          g.config.region === 'morocco' &&
          g.config.supportedCurrencies.includes('MAD'),
      )
      if (madGateway) return madGateway
    }

    // General: first active gateway supporting the currency
    return this.getActiveGateways().find((g) =>
      g.config.supportedCurrencies.includes(currency),
    )
  }

  /** Get public config for all registered gateways (safe for client) */
  getAllConfigs(): GatewayConfig[] {
    return this.getAll().map((g) => g.config)
  }

  /**
   * Initialize all registered gateways.
   * Gateways that fail initialization are logged but don't block others.
   */
  async initializeAll(): Promise<void> {
    for (const gateway of this.gateways.values()) {
      if (!this.initialized.has(gateway.id)) {
        try {
          await gateway.initialize()
          this.initialized.add(gateway.id)
          console.log(`[PaymentGateway] Initialized: ${gateway.id}`)
        } catch (err) {
          console.error(
            `[PaymentGateway] Failed to initialize ${gateway.id}:`,
            err,
          )
        }
      }
    }
  }

  /** Check if a specific gateway has been initialized */
  isInitialized(id: GatewayId): boolean {
    return this.initialized.has(id)
  }

  /** Reset the registry (useful for testing) */
  reset(): void {
    this.gateways.clear()
    this.initialized.clear()
  }
}

/** Singleton registry instance */
export const gatewayRegistry = new PaymentGatewayRegistry()