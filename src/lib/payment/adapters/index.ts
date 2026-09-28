/**
 * HireNova Payment Adapter Factory
 *
 * Provides a centralized factory for obtaining payment adapter instances.
 * Adapter instances are cached for the lifetime of the process.
 *
 * Uses dynamic imports to avoid loading provider SDKs until they are needed,
 * preventing crashes when provider API keys are not configured.
 *
 * Usage:
 *   import { getAdapter } from '@/lib/payment/adapters';
 *   const adapter = getAdapter('stripe');
 *   const result = await adapter.createPayment({ ... });
 *
 * @module payment/adapters
 */

import type { PaymentProviderName } from '../types';
import type { PaymentAdapter, AdapterConfigChecker } from './base';

// ===== Adapter Registry (lazy loaders) =====

/**
 * Internal registry mapping provider names to their lazy loader.
 * Each entry contains a dynamic import function and a config checker.
 */
interface AdapterEntry {
  /** Dynamic import function that resolves to { adapter class, config checker } */
  loader: () => Promise<{ default?: PaymentAdapter; adapter?: PaymentAdapter; create: () => PaymentAdapter; isConfigured: AdapterConfigChecker }>;
  /** Whether the module has been loaded yet */
  loaded: boolean;
  /** Cached factory after first load */
  create?: () => PaymentAdapter;
  /** Cached config checker after first load */
  isConfigured?: AdapterConfigChecker;
}

/**
 * Map of all registered payment adapters with lazy loaders.
 * Modules are only loaded when first accessed.
 */
const ADAPTER_REGISTRY = new Map<PaymentProviderName, AdapterEntry>([
  ['stripe', {
    loader: () => import('./stripe').then(m => ({
      create: () => new (m as any).StripeAdapter(),
      isConfigured: (m as any).isStripeAdapterConfigured,
    })),
    loaded: false,
  }],
  ['paymob', {
    loader: () => import('./paymob').then(m => ({
      create: () => new (m as any).PaymobAdapter(),
      isConfigured: (m as any).isPaymobAdapterConfigured,
    })),
    loaded: false,
  }],
  ['lemonsqueezy', {
    loader: () => import('./lemonsqueezy').then(m => ({
      create: () => new (m as any).LemonSqueezyAdapter(),
      isConfigured: (m as any).isLemonSqueezyAdapterConfigured,
    })),
    loaded: false,
  }],
  ['payzone', {
    loader: () => import('./payzone').then(m => ({
      create: () => new (m as any).PayZoneAdapter(),
      isConfigured: (m as any).isPayZoneAdapterConfigured,
    })),
    loaded: false,
  }],
  ['naps', {
    loader: () => import('./naps').then(m => ({
      create: () => new (m as any).NapsAdapter(),
      isConfigured: (m as any).isNapsAdapterConfigured,
    })),
    loaded: false,
  }],
  ['cmi', {
    loader: () => import('./cmi').then(m => ({
      create: () => new (m as any).CmiAdapter(),
      isConfigured: (m as any).isCmiAdapterConfigured,
    })),
    loaded: false,
  }],
]);

// ===== Adapter Cache =====

/**
 * Singleton cache of adapter instances.
 * Lazily created on first access per provider.
 */
const adapterCache = new Map<PaymentProviderName, PaymentAdapter>();

// ===== Internal: Load adapter module lazily =====

/**
 * Loads the adapter module on first access and caches the factory/config checker.
 */
async function loadAdapterEntry(entry: AdapterEntry): Promise<void> {
  if (entry.loaded) return;

  const loaded = await entry.loader();
  entry.create = loaded.create;
  entry.isConfigured = loaded.isConfigured;
  entry.loaded = true;
}

// ===== Public API =====

/**
 * Get a payment adapter instance for the specified provider.
 *
 * Adapter instances are cached — subsequent calls return the same instance.
 * Throws if the provider is not registered or not configured.
 *
 * @param providerName - The payment provider to get an adapter for
 * @returns A configured PaymentAdapter instance
 * @throws {Error} If the provider is not registered or not configured
 *
 * @example
 * ```ts
 * const stripeAdapter = await getAdapter('stripe');
 * const result = await stripeAdapter.createPayment({
 *   amount: 900,
 *   currency: 'EUR',
 *   description: 'Pro Plan - Monthly',
 * });
 * ```
 */
export async function getAdapter(providerName: PaymentProviderName): Promise<PaymentAdapter> {
  // Return cached instance if available
  const cached = adapterCache.get(providerName);
  if (cached) return cached;

  // Look up adapter registry entry
  const entry = ADAPTER_REGISTRY.get(providerName);
  if (!entry) {
    throw new Error(
      `Payment adapter not found for provider: "${providerName}". ` +
      `Available providers: ${Array.from(ADAPTER_REGISTRY.keys()).join(', ')}`,
    );
  }

  // Load module lazily
  await loadAdapterEntry(entry);

  // Check configuration
  if (!entry.isConfigured!()) {
    throw new Error(
      `Payment provider "${providerName}" is not configured. ` +
      `Please set the required environment variables.`,
    );
  }

  // Create and cache instance
  const adapter = entry.create!();
  adapterCache.set(providerName, adapter);

  return adapter;
}

/**
 * Check if a specific provider adapter is available and configured.
 * Does NOT trigger module loading for unconfigured providers.
 *
 * @param providerName - The payment provider to check
 * @returns true if the adapter is registered and configured
 */
export async function isAdapterAvailable(providerName: PaymentProviderName): Promise<boolean> {
  const entry = ADAPTER_REGISTRY.get(providerName);
  if (!entry) return false;

  // Load module to check configuration
  await loadAdapterEntry(entry);
  return entry.isConfigured!();
}

/**
 * Get a list of all registered adapter names.
 *
 * @returns Array of provider names (not filtered by configuration status)
 */
export function getRegisteredAdapterNames(): PaymentProviderName[] {
  return Array.from(ADAPTER_REGISTRY.keys());
}

/**
 * Get a list of all currently configured and available adapters.
 * Only checks providers that are quick to validate.
 *
 * @returns Array of provider names that are properly configured
 */
export async function getAvailableAdapterNames(): Promise<PaymentProviderName[]> {
  const result: PaymentProviderName[] = [];
  for (const [name, entry] of ADAPTER_REGISTRY.entries()) {
    await loadAdapterEntry(entry);
    if (entry.isConfigured!()) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Clear the adapter cache.
 * Useful for testing or when configuration changes at runtime.
 */
export function clearAdapterCache(): void {
  adapterCache.clear();
}

/**
 * Get an adapter instance without throwing if not configured.
 * Returns null if the provider is not registered or not configured.
 *
 * @param providerName - The payment provider to get an adapter for
 * @returns PaymentAdapter instance or null
 */
export async function getAdapterOrNull(
  providerName: PaymentProviderName,
): Promise<PaymentAdapter | null> {
  try {
    return await getAdapter(providerName);
  } catch {
    return null;
  }
}

// ===== Re-exports =====

export type { PaymentAdapter } from './base';
export type {
  CreatePaymentAdapterInput,
  CreateSubscriptionInput,
  AdapterPaymentResult,
  AdapterRefundResult,
} from './base';
export { type AdapterConfigChecker } from './base';
