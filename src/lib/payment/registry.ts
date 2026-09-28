/**
 * HireNova Payment Orchestrator — Provider Registry
 *
 * Manages available payment providers and routing logic.
 * Seeds the database with default providers and selects the best
 * provider based on country, currency, and payment method.
 *
 * @module payment/registry
 */

import { db } from '@/lib/db';
import type {
  Currency,
  CountryCode,
  PaymentMethodType,
  PaymentProviderName,
  PaymentProviderConfig,
  ProviderRoutingDecision,
} from './types';

// ===== Default Provider Definitions =====

interface SeedProvider {
  name: PaymentProviderName;
  displayName: string;
  country: string;
  currencies: Currency[];
  paymentMethods: PaymentMethodType[];
  supportsRecurring: boolean;
  supportsRefund: boolean;
  supportsTokenization: boolean;
  supportsWebhooks: boolean;
  priority: number;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Default payment providers seeded on first run.
 * Ordered by priority: lower number = higher priority.
 */
const DEFAULT_PROVIDERS: SeedProvider[] = [
  // ===== Morocco (MA) — MAD =====
  {
    name: 'payzone',
    displayName: 'PayZone',
    country: 'MA',
    currencies: ['MAD'],
    paymentMethods: ['card', 'mobile'],
    supportsRecurring: false,
    supportsRefund: false,
    supportsTokenization: false,
    supportsWebhooks: false,
    priority: 1,
    enabled: true,
    config: {},
  },
  {
    name: 'naps',
    displayName: 'NAPS (CMI)',
    country: 'MA',
    currencies: ['MAD'],
    paymentMethods: ['bank_transfer'],
    supportsRecurring: false,
    supportsRefund: false,
    supportsTokenization: false,
    supportsWebhooks: false,
    priority: 2,
    enabled: true,
    config: {},
  },
  {
    name: 'cmi',
    displayName: 'CMI Interbank',
    country: 'MA',
    currencies: ['MAD'],
    paymentMethods: ['card', 'mobile', 'bank_transfer'],
    supportsRecurring: false,
    supportsRefund: true,
    supportsTokenization: true,
    supportsWebhooks: true,
    priority: 3,
    enabled: true,
    config: {},
  },
  // ===== Europe / US / International =====
  {
    name: 'stripe',
    displayName: 'Stripe',
    country: 'EU',
    currencies: ['EUR', 'USD', 'GBP'],
    paymentMethods: ['card', 'bank_transfer', 'wallet'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsTokenization: true,
    supportsWebhooks: true,
    priority: 1,
    enabled: true,
    config: {},
  },
  // ===== Morocco fallback / International =====
  {
    name: 'paymob',
    displayName: 'PayMob',
    country: 'MA',
    currencies: ['MAD', 'USD'],
    paymentMethods: ['card', 'mobile', 'wallet'],
    supportsRecurring: false,
    supportsRefund: true,
    supportsTokenization: true,
    supportsWebhooks: true,
    priority: 4,
    enabled: true,
    config: {},
  },
  // ===== International (SaaS/Lemon Squeezy) =====
  {
    name: 'lemonsqueezy',
    displayName: 'Lemon Squeezy',
    country: 'INTL',
    currencies: ['EUR', 'USD'],
    paymentMethods: ['card'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsTokenization: false,
    supportsWebhooks: true,
    priority: 5,
    enabled: true,
    config: {},
  },
];

/**
 * Map of US/GB country codes to the EU provider (Stripe handles these).
 */
const COUNTRY_TO_REGION: Record<string, string> = {
  MA: 'MA',
  FR: 'EU',
  DE: 'EU',
  ES: 'EU',
  US: 'US',
  GB: 'US',
  SA: 'INTL',
  AE: 'INTL',
};

/**
 * Seeds the PaymentProvider table with default providers if not already present.
 * Safe to call multiple times — existing providers are not modified.
 *
 * @returns Number of providers created (0 if all already exist)
 */
export async function seedProviders(): Promise<number> {
  let created = 0;

  for (const seed of DEFAULT_PROVIDERS) {
    const existing = await db.paymentProvider.findUnique({
      where: { name: seed.name },
    });

    if (!existing) {
      await db.paymentProvider.create({
        data: {
          name: seed.name,
          displayName: seed.displayName,
          country: seed.country,
          currencies: JSON.stringify(seed.currencies),
          paymentMethods: JSON.stringify(seed.paymentMethods),
          supportsRecurring: seed.supportsRecurring,
          supportsRefund: seed.supportsRefund,
          supportsTokenization: seed.supportsTokenization,
          supportsWebhooks: seed.supportsWebhooks,
          priority: seed.priority,
          enabled: seed.enabled,
          config: JSON.stringify(seed.config),
        },
      });
      created++;
    }
  }

  return created;
}

/**
 * Retrieves all enabled providers matching the given context, sorted by priority.
 *
 * @param params - Optional filtering context
 * @param params.country - Filter by country/region code
 * @param params.currency - Filter by supported currency
 * @param params.paymentMethod - Filter by payment method type
 * @returns Array of matching providers sorted by priority (ascending)
 */
export async function getProvidersForContext(params?: {
  country?: string;
  currency?: string;
  paymentMethod?: string;
}): Promise<PaymentProviderConfig[]> {
  const providers = await db.paymentProvider.findMany({
    where: { enabled: true },
    orderBy: { priority: 'asc' },
  });

  return providers
    .filter((p) => {
      const currencies: string[] = safeJsonParse(p.currencies, []);
      const methods: string[] = safeJsonParse(p.paymentMethods, []);

      if (params?.country && p.country !== params.country && p.country !== 'INTL') {
        // INTL providers always match for any country context
        return false;
      }

      if (params?.currency && !currencies.includes(params.currency)) {
        return false;
      }

      if (params?.paymentMethod && !methods.includes(params.paymentMethod)) {
        return false;
      }

      return true;
    })
    .map(mapToConfig);
}

/**
 * Selects the best payment provider for the given context.
 * Uses priority-based routing with country/currency/method matching.
 *
 * Falls back to INTL providers if no country-specific match is found.
 *
 * @param params - Routing parameters
 * @param params.country - Buyer's country code
 * @param params.currency - Payment currency
 * @param params.paymentMethod - Payment method type
 * @param params.amount - Payment amount in cents (used for future rules, e.g. min amount per provider)
 * @returns The best matching provider decision, or null if no provider found
 *
 * @example
 * ```ts
 * const decision = await selectProvider({
 *   country: 'MA',
 *   currency: 'MAD',
 *   paymentMethod: 'card',
 *   amount: 9900,
 * });
 * // → { provider: 'payzone', priority: 1, ... }
 * ```
 */
export async function selectProvider(params: {
  country: CountryCode;
  currency: Currency;
  paymentMethod: PaymentMethodType;
  amount: number;
}): Promise<ProviderRoutingDecision | null> {
  const { country, currency, paymentMethod, amount } = params;

  // Determine region from country
  const region = COUNTRY_TO_REGION[country] || 'INTL';

  // Step 1: Try country/region-specific providers
  let providers = await getProvidersForContext({
    country: region,
    currency,
    paymentMethod,
  });

  // Step 2: If no matches, include INTL providers
  if (providers.length === 0) {
    providers = await getProvidersForContext({
      currency,
      paymentMethod,
    });
  }

  if (providers.length === 0) {
    return null;
  }

  // Step 3: Sort by priority (already sorted, but verify)
  providers.sort((a, b) => a.priority - b.priority);

  // Step 4: Future enhancement — amount-based rules, provider health checks, etc.
  // For now, pick the highest priority provider
  const selected = providers[0];

  return {
    country,
    currency,
    paymentMethod,
    provider: selected.name as PaymentProviderName,
    priority: selected.priority,
  };
}

/**
 * Checks whether a specific provider is currently enabled.
 *
 * @param name - Provider name (e.g. 'stripe', 'paymob')
 * @returns `true` if the provider exists and is enabled
 */
export async function isProviderEnabled(name: string): Promise<boolean> {
  const provider = await db.paymentProvider.findUnique({
    where: { name },
    select: { enabled: true },
  });
  return provider?.enabled ?? false;
}

// ===== Helpers =====

/**
 * Safely parse a JSON string, returning the fallback on failure.
 */
function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Maps a Prisma PaymentProvider row to the PaymentProviderConfig interface.
 */
function mapToConfig(row: {
  id: string;
  name: string;
  displayName: string;
  country: string;
  currencies: string;
  paymentMethods: string;
  supportsRecurring: boolean;
  supportsRefund: boolean;
  supportsTokenization: boolean;
  supportsWebhooks: boolean;
  priority: number;
  enabled: boolean;
  config: string;
  createdAt: Date;
  updatedAt: Date;
}): PaymentProviderConfig {
  return {
    id: row.id,
    name: row.name as PaymentProviderName,
    displayName: row.displayName,
    country: row.country,
    currencies: safeJsonParse(row.currencies, []),
    paymentMethods: safeJsonParse(row.paymentMethods, []),
    supportsRecurring: row.supportsRecurring,
    supportsRefund: row.supportsRefund,
    supportsTokenization: row.supportsTokenization,
    supportsWebhooks: row.supportsWebhooks,
    priority: row.priority,
    enabled: row.enabled,
    config: safeJsonParse(row.config, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
