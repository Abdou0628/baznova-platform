/**
 * BazNova Payment Abstraction Layer — Provider Factory
 *
 * Factory that creates the right provider instance based on provider ID.
 * Adding a new provider = implementing IPaymentProvider + registering here.
 * ZERO changes to calling code required.
 *
 * @module payment-layer/provider-factory
 */

import type { IPaymentProvider, PaymentProviderId } from './types';

import { stripeProvider } from './providers/stripe.provider';
import { paymobProvider } from './providers/paymob.provider';
import { lemonSqueezyProvider } from './providers/lemonsqueezy.provider';
import { invoiceProvider } from './providers/invoice.provider';
import { devSimulatorProvider } from './providers/dev-simulator.provider';

// ── Provider Registry ───────────────────────────────────────────────────────
// Each provider is a singleton — created once, reused forever.
const PROVIDER_REGISTRY: Record<PaymentProviderId, IPaymentProvider> = {
  stripe: stripeProvider,
  paymob: paymobProvider,
  lemonsqueezy: lemonSqueezyProvider,
  invoice: invoiceProvider,
  dev_simulator: devSimulatorProvider,
  payzone: devSimulatorProvider, // PayZone not yet implemented — falls back to dev_simulator
};

/**
 * Get a payment provider instance by ID.
 *
 * This is the ONLY way to obtain a provider instance.
 * All calling code uses this factory — never imports a specific provider directly.
 *
 * @param providerId - The provider identifier
 * @returns The provider instance implementing IPaymentProvider
 * @throws Error if the provider ID is unknown
 *
 * @example
 * ```ts
 * const provider = getProvider('stripe');
 * const result = await provider.createCheckout(params);
 * ```
 */
export function getProvider(providerId: PaymentProviderId): IPaymentProvider {
  const provider = PROVIDER_REGISTRY[providerId];

  if (!provider) {
    throw new Error(
      `Unknown payment provider: '${providerId}'. ` +
      `Available providers: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`
    );
  }

  return provider;
}

/**
 * Get all registered provider instances.
 * Useful for admin dashboards or health checks.
 */
export function getAllProviders(): IPaymentProvider[] {
  return Object.values(PROVIDER_REGISTRY);
}

/**
 * Check if a provider is registered in the factory.
 */
export function isProviderRegistered(providerId: string): providerId is PaymentProviderId {
  return providerId in PROVIDER_REGISTRY;
}
