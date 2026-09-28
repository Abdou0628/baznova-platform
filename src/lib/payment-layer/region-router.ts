/**
 * BazNova Payment Abstraction Layer — Region Router
 *
 * The brain that decides which provider to use based on:
 *   1. Development mode → dev_simulator (no real charges)
 *   2. Country/currency → geographic region → provider
 *   3. Plan type / payment method → enterprise routing
 *   4. Provider availability → graceful fallback chain
 *
 * Routes:
 *   INTERNATIONAL: Stripe (EUR, USD, GBP)
 *   MOROCCO:       PayMob (MAD) — with PayZone fallback
 *   AFRICA:        PayMob (XOF, XAF)
 *   ENTERPRISE:    Invoice / wire transfer
 *   FUTURE:        placeholder for new PSP
 *   DEV:           dev_simulator (always works, no real charges)
 *
 * @module payment-layer/region-router
 */

import type {
  CheckoutRequest,
  PaymentRegion,
  PaymentProviderId,
  RegionProviderConfig,
  RoutingDecision,
  ClientType,
} from './types';

// ── African country codes (ISO 3166-1 alpha-2) ──────────────────────────────
// Excludes Morocco (MA) which has its own region
const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
  'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
  'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
  'ML', 'MR', 'MU', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SN', 'SC',
  'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG',
  'ZM', 'ZW',
]);

// ── Default region → provider configuration ─────────────────────────────────
// This can be overridden via environment variables or database config
const DEFAULT_REGION_CONFIGS: RegionProviderConfig[] = [
  {
    region: 'international',
    primaryProvider: 'stripe',
    fallbackProvider: 'lemonsqueezy',
    currencies: ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'SAR', 'AED'],
    countries: ['FR', 'DE', 'ES', 'IT', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH',
                'GB', 'IE', 'US', 'CA', 'AU', 'SA', 'AE', 'NZ', 'SE', 'NO',
                'DK', 'FI', 'PL', 'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI'],
  },
  {
    region: 'morocco',
    primaryProvider: 'paymob',
    fallbackProvider: 'payzone',
    currencies: ['MAD'],
    countries: ['MA'],
  },
  {
    region: 'africa',
    primaryProvider: 'paymob',
    fallbackProvider: 'payzone',
    currencies: ['XOF', 'XAF'],
    countries: [...AFRICAN_COUNTRIES],
  },
  {
    region: 'enterprise',
    primaryProvider: 'invoice',
    currencies: ['EUR', 'USD', 'GBP', 'MAD'],
    countries: [], // enterprise is not country-specific
  },
  {
    region: 'future',
    primaryProvider: 'dev_simulator',
    currencies: [],
    countries: [],
  },
];

// ── Provider availability checks ────────────────────────────────────────────

/**
 * Check if Stripe is configured (has a valid secret key).
 */
function isStripeAvailable(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!(key && key.startsWith('sk_'));
}

/**
 * Check if LemonSqueezy is configured.
 */
function isLemonSqueezyAvailable(): boolean {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LS_STORE_ID;
  return !!(apiKey && storeId && !storeId.startsWith('variant_'));
}

/**
 * Check if PayMob is configured.
 */
function isPaymobAvailable(): boolean {
  return !!(
    process.env.PAYMOB_API_KEY &&
    process.env.PAYMOB_INTEGRATION_ID &&
    process.env.PAYMOB_IFRAME_ID
  );
}

/**
 * Check if a provider is available based on its configuration.
 */
function isProviderAvailable(providerId: PaymentProviderId): boolean {
  switch (providerId) {
    case 'stripe':
      return isStripeAvailable();
    case 'paymob':
      return isPaymobAvailable();
    case 'lemonsqueezy':
      return isLemonSqueezyAvailable();
    case 'invoice':
      return true; // Invoice is always available (no external API)
    case 'dev_simulator':
      return true; // Dev simulator is always available
    case 'payzone':
      return false; // Not yet implemented — always falls back
    default:
      return false;
  }
}

// ── Main Routing Function ───────────────────────────────────────────────────

/**
 * Route a checkout request to the appropriate provider based on
 * region, currency, country, and provider availability.
 *
 * Priority order:
 *   1. Dev mode → dev_simulator (unless a real Stripe key exists)
 *   2. Morocco (MA / MAD) → PayMob
 *   3. Africa (XOF / XAF / African country) → PayMob
 *   4. Enterprise (plan contains 'enterprise' or bank_transfer) → Invoice
 *   5. International → Stripe → LemonSqueezy → dev_simulator
 *
 * @param request - The checkout request from the frontend
 * @returns RoutingDecision with provider, region, and reason
 */
export function routeToProvider(request: CheckoutRequest): RoutingDecision {
  const isDev = process.env.NODE_ENV === 'development';
  const currency = request.currency.toUpperCase();
  const country = request.country?.toUpperCase();

  // ── 1. Dev mode shortcut ───────────────────────────────────────────────
  // In development without a real Stripe key, use dev_simulator
  if (isDev && !isStripeAvailable()) {
    return {
      provider: 'dev_simulator',
      region: 'international',
      reason: 'Development mode — no real Stripe key configured, using dev_simulator',
    };
  }

  // ── 2. Morocco ─────────────────────────────────────────────────────────
  if (country === 'MA' || currency === 'MAD') {
    const config = DEFAULT_REGION_CONFIGS.find(r => r.region === 'morocco')!;

    if (isProviderAvailable(config.primaryProvider)) {
      return {
        provider: config.primaryProvider,
        region: 'morocco',
        reason: `Morocco routing: country=${country || 'N/A'}, currency=${currency} → PayMob`,
      };
    }

    // Fallback to PayZone if PayMob is not available
    if (config.fallbackProvider && isProviderAvailable(config.fallbackProvider)) {
      return {
        provider: config.fallbackProvider,
        region: 'morocco',
        reason: `Morocco routing: PayMob unavailable, falling back to ${config.fallbackProvider}`,
      };
    }

    // Last resort: dev_simulator
    return {
      provider: 'dev_simulator',
      region: 'morocco',
      reason: 'Morocco routing: PayMob and PayZone unavailable, falling back to dev_simulator',
    };
  }

  // ── 3. Africa (excl. Morocco) ──────────────────────────────────────────
  const isAfricanCurrency = currency === 'XOF' || currency === 'XAF';
  const isAfricanCountry = country ? AFRICAN_COUNTRIES.has(country) : false;

  if (isAfricanCurrency || isAfricanCountry) {
    const config = DEFAULT_REGION_CONFIGS.find(r => r.region === 'africa')!;

    if (isProviderAvailable(config.primaryProvider)) {
      return {
        provider: config.primaryProvider,
        region: 'africa',
        reason: `Africa routing: country=${country || 'N/A'}, currency=${currency} → PayMob`,
      };
    }

    if (config.fallbackProvider && isProviderAvailable(config.fallbackProvider)) {
      return {
        provider: config.fallbackProvider,
        region: 'africa',
        reason: `Africa routing: PayMob unavailable, falling back to ${config.fallbackProvider}`,
      };
    }

    return {
      provider: 'dev_simulator',
      region: 'africa',
      reason: 'Africa routing: no provider available, falling back to dev_simulator',
    };
  }

  // ── 4. Client type routing (CTO directive) ────────────────────────────
  // Enterprise clients → Invoice provider regardless of region
  // B2B clients → Stripe (with invoice fallback for large amounts)
  const clientType: ClientType = request.clientType || 
    (request.planId.toLowerCase().includes('enterprise') ? 'enterprise' : 'b2c');

  if (clientType === 'enterprise') {
    return {
      provider: 'invoice',
      region: 'enterprise',
      reason: `Client type routing: enterprise client → Invoice provider (custom billing)`,
    };
  }

  if (clientType === 'b2b' && request.paymentMethod === 'bank_transfer') {
    return {
      provider: 'invoice',
      region: 'enterprise',
      reason: `Client type routing: B2B with bank_transfer → Invoice provider`,
    };
  }

  // ── 5. Enterprise plan / bank transfer ────────────────────────────────
  const isEnterprisePlan = request.planId.toLowerCase().includes('enterprise');
  const isBankTransfer = request.paymentMethod === 'bank_transfer';

  if (isEnterprisePlan || isBankTransfer) {
    return {
      provider: 'invoice',
      region: 'enterprise',
      reason: `Enterprise routing: planId=${request.planId}, paymentMethod=${request.paymentMethod || 'N/A'} → Invoice`,
    };
  }

  // ── 6. International (default) ─────────────────────────────────────────
  const config = DEFAULT_REGION_CONFIGS.find(r => r.region === 'international')!;

  if (isProviderAvailable(config.primaryProvider)) {
    return {
      provider: config.primaryProvider,
      region: 'international',
      reason: `International routing: country=${country || 'N/A'}, currency=${currency} → Stripe`,
    };
  }

  // Fallback to LemonSqueezy
  if (config.fallbackProvider && isProviderAvailable(config.fallbackProvider)) {
    return {
      provider: config.fallbackProvider,
      region: 'international',
      reason: `International routing: Stripe unavailable, falling back to LemonSqueezy`,
    };
  }

  // Last resort: dev_simulator
  return {
    provider: 'dev_simulator',
    region: 'international',
    reason: 'International routing: Stripe and LemonSqueezy unavailable, falling back to dev_simulator',
  };
}

// ── Utility exports ─────────────────────────────────────────────────────────

/**
 * Get all region configurations.
 * Useful for admin dashboards or debugging.
 */
export function getRegionConfigs(): RegionProviderConfig[] {
  return [...DEFAULT_REGION_CONFIGS];
}

/**
 * Get the list of available providers based on current environment.
 */
export function getAvailableProviders(): PaymentProviderId[] {
  const providers: PaymentProviderId[] = [];
  if (isStripeAvailable()) providers.push('stripe');
  if (isPaymobAvailable()) providers.push('paymob');
  if (isLemonSqueezyAvailable()) providers.push('lemonsqueezy');
  // invoice and dev_simulator are always available
  providers.push('invoice');
  providers.push('dev_simulator');
  return providers;
}

/**
 * Resolve the region for a given country/currency pair.
 * Useful for display purposes without routing to a provider.
 */
export function resolveRegion(country?: string, currency?: string): PaymentRegion {
  const c = country?.toUpperCase();
  const cur = currency?.toUpperCase();

  if (c === 'MA' || cur === 'MAD') return 'morocco';
  if (cur === 'XOF' || cur === 'XAF') return 'africa';
  if (c && AFRICAN_COUNTRIES.has(c)) return 'africa';

  return 'international';
}
