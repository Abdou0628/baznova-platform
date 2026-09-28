/**
 * BazNova Provider Capability Registry
 *
 * Enhanced registry with full capability descriptors per CTO specification.
 * This wraps the existing PaymentGateway registry and adds:
 *   - Capability-based routing (country, currency, payment method, features)
 *   - Provider scoring for smart routing decisions
 *   - Database-backed configuration (can be updated without redeployment)
 *
 * ⚠️ Does NOT modify the existing payment-gateway registry.
 */

import type { ProviderCapabilities, RoutingContext, RoutingDecision, PaymentMethodType } from './types'
import { OrchestratorError } from './types'

// ─── Built-in Provider Definitions ──────────────────────────────────────────
// These are the defaults. They can be overridden from the database.

const BUILTIN_PROVIDERS: ProviderCapabilities[] = [
  {
    id: 'payzone',
    name: 'Payzone',
    currencies: ['MAD'],
    countries: ['MA'],
    region: 'morocco',
    paymentMethods: ['card', 'mobile_payment'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsTokenization: true,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    priority: 1,
    enabled: true,
  },
  {
    id: 'naps',
    name: 'NAPS (Banque Populaire)',
    currencies: ['MAD'],
    countries: ['MA'],
    region: 'morocco',
    paymentMethods: ['card', 'bank_transfer'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsTokenization: false,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    priority: 2,
    enabled: true,
  },
  {
    id: 'cmi',
    name: 'CMI (Centre Monétique Interbancaire)',
    currencies: ['MAD'],
    countries: ['MA'],
    region: 'morocco',
    paymentMethods: ['card'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsTokenization: true,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    priority: 3,
    enabled: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    currencies: ['EUR', 'USD', 'GBP', 'MAD'],
    countries: [], // global
    region: 'international',
    paymentMethods: ['card', 'bank_transfer', 'wallet', 'buy_now_pay_later'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsTokenization: true,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    minAmount: 50, // 0.50 EUR minimum
    priority: 10,
    enabled: true,
  },
  {
    id: 'paymob',
    name: 'PayMob',
    currencies: ['MAD'],
    countries: ['MA', 'EG', 'SA', 'AE'],
    region: 'africa',
    paymentMethods: ['card', 'mobile_payment', 'wallet'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsTokenization: false,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    priority: 4,
    enabled: true,
  },
  {
    id: 'lemonsqueezy',
    name: 'LemonSqueezy',
    currencies: ['EUR', 'USD', 'GBP'],
    countries: [], // global
    region: 'international',
    paymentMethods: ['card'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsTokenization: false,
    supportsWebhooks: true,
    supportsWebhookSignature: true,
    priority: 11,
    enabled: true,
  },
  {
    id: 'dev',
    name: 'Development Sandbox',
    currencies: ['EUR', 'USD', 'GBP', 'MAD'],
    countries: [],
    region: 'international',
    paymentMethods: ['card', 'bank_transfer', 'mobile_payment', 'wallet'],
    supportsRecurring: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsTokenization: false,
    supportsWebhooks: true,
    supportsWebhookSignature: false,
    priority: 999, // lowest priority
    enabled: true,
  },
]

// ─── Provider Registry Class ────────────────────────────────────────────────

class PaymentProviderRegistry {
  private providers: Map<string, ProviderCapabilities> = new Map()
  private loaded = false

  /**
   * Load providers. Merges built-in defaults with database overrides.
   * Safe to call multiple times — subsequent calls are no-ops unless forceReload.
   */
  async load(forceReload = false): Promise<void> {
    if (this.loaded && !forceReload) return

    // 1. Start with built-in providers
    for (const p of BUILTIN_PROVIDERS) {
      this.providers.set(p.id, { ...p })
    }

    // 2. Override from database (if table exists)
    try {
      const dbProviders = await this.loadFromDatabase()
      for (const dp of dbProviders) {
        const existing = this.providers.get(dp.id)
        if (existing) {
          // Merge: database fields override built-in
          this.providers.set(dp.id, { ...existing, ...dp, id: existing.id })
        } else {
          // New provider from database
          this.providers.set(dp.id, dp)
        }
      }
    } catch (err) {
      // Database table may not exist yet — that's OK, use built-ins
      console.warn('[ProviderRegistry] Could not load from database, using built-in defaults:', err)
    }

    this.loaded = true
    const activeCount = this.getActiveProviders().length
    console.log(`[ProviderRegistry] Loaded ${this.providers.size} providers (${activeCount} active)`)
  }

  private async loadFromDatabase(): Promise<ProviderCapabilities[]> {
    const { db } = await import('@/lib/db')
    const rows = await db.orchestratorProviderConfig.findMany({
      where: { enabled: true },
    })
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      currencies: JSON.parse(r.currencies) as string[],
      countries: JSON.parse(r.countries) as string[],
      region: r.region as ProviderCapabilities['region'],
      paymentMethods: JSON.parse(r.paymentMethods) as PaymentMethodType[],
      supportsRecurring: r.supportsRecurring,
      supportsRefund: r.supportsRefund,
      supportsPartialRefund: r.supportsPartialRefund,
      supportsTokenization: r.supportsTokenization,
      supportsWebhooks: r.supportsWebhooks,
      supportsWebhookSignature: r.supportsWebhookSignature,
      minAmount: r.minAmount ?? undefined,
      maxAmount: r.maxAmount ?? undefined,
      priority: r.priority,
      enabled: r.enabled,
    }))
  }

  /** Get a provider by ID */
  get(id: string): ProviderCapabilities | undefined {
    return this.providers.get(id)
  }

  /** Get all registered providers */
  getAll(): ProviderCapabilities[] {
    return Array.from(this.providers.values())
  }

  /** Get only active (enabled) providers */
  getActiveProviders(): ProviderCapabilities[] {
    return this.getAll().filter(p => p.enabled)
  }

  /** Get providers that support a specific currency */
  getProvidersForCurrency(currency: string): ProviderCapabilities[] {
    return this.getActiveProviders().filter(p =>
      p.currencies.includes(currency.toUpperCase()),
    )
  }

  /** Get providers for a specific country */
  getProvidersForCountry(country: string): ProviderCapabilities[] {
    const countryCode = country.toUpperCase()
    // First: providers explicitly listing this country
    const explicit = this.getActiveProviders().filter(p =>
      p.countries.includes(countryCode),
    )
    if (explicit.length > 0) return explicit

    // Second: providers with no country restriction (international)
    return this.getActiveProviders().filter(p =>
      p.countries.length === 0,
    )
  }

  // ─── Smart Routing (CTO Specification §7) ──────────────────────────────

  /**
   * Score-based smart routing.
   *
   * The router considers:
   *   - Currency match
   *   - Country match
   *   - Payment method support
   *   - Amount limits
   *   - Provider priority
   *   - Provider availability (active)
   *
   * ⚠️ IMPORTANT (CTO §7): For a payment already potentially authorized,
   * do NOT blindly failover to another provider — that can cause double debit.
   * Routing decisions should depend on the exact transaction state.
   */
  resolve(ctx: RoutingContext): RoutingDecision {
    const candidates = this.getActiveProviders()

    if (candidates.length === 0) {
      throw new OrchestratorError(
        'No active payment providers available',
        'NO_PROVIDER_AVAILABLE',
      )
    }

    // Score each provider
    const scored: RoutingDecision[] = candidates
      .map(provider => this.scoreProvider(provider, ctx))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
      throw new OrchestratorError(
        `No provider matches routing criteria: currency=${ctx.currency}, country=${ctx.country ?? 'any'}, method=${ctx.paymentMethod ?? 'any'}`,
        'NO_PROVIDER_AVAILABLE',
      )
    }

    // If a preferred provider is specified and it's in the top results, use it
    if (ctx.preferredProvider) {
      const preferred = scored.find(d => d.providerId === ctx.preferredProvider)
      if (preferred) {
        return { ...preferred, reason: 'preferred_provider' }
      }
    }

    const best = scored[0]
    return best
  }

  private scoreProvider(provider: ProviderCapabilities, ctx: RoutingContext): RoutingDecision {
    let score = 0
    const reasons: string[] = []

    // Currency match (essential)
    if (!provider.currencies.includes(ctx.currency.toUpperCase())) {
      return { providerId: provider.id, reason: 'no_currency', score: 0, capabilities: provider }
    }
    score += 30
    reasons.push('currency_match')

    // Country match (strong signal)
    if (ctx.country) {
      if (provider.countries.includes(ctx.country.toUpperCase())) {
        score += 25
        reasons.push('country_match')
      } else if (provider.countries.length === 0) {
        // International provider — still good, but less specific
        score += 10
        reasons.push('international_provider')
      } else {
        score += 0
      }
    }

    // Payment method match
    if (ctx.paymentMethod) {
      if (provider.paymentMethods.includes(ctx.paymentMethod)) {
        score += 20
        reasons.push('payment_method_match')
      } else {
        score -= 15
        reasons.push('no_payment_method')
      }
    }

    // Amount limits
    if (provider.minAmount !== undefined && ctx.amount < provider.minAmount) {
      score -= 50
      reasons.push('below_min_amount')
    }
    if (provider.maxAmount !== undefined && ctx.amount > provider.maxAmount) {
      score -= 50
      reasons.push('above_max_amount')
    }

    // Priority (lower = better, invert for scoring)
    score += Math.max(0, 25 - provider.priority)

    // Recurring support (for subscription plans)
    const recurringPlans = ['pro', 'annual', 'career_plus', 'employer', 'enterprise', 'api']
    if (recurringPlans.includes(ctx.planId) && provider.supportsRecurring) {
      score += 10
      reasons.push('supports_recurring')
    }

    return {
      providerId: provider.id,
      reason: reasons.join('+'),
      score,
      capabilities: provider,
    }
  }
}

/** Singleton provider registry */
export const providerRegistry = new PaymentProviderRegistry()
