/**
 * BazNova Subscription Management — Core Types
 */

export type BazNovaPlan =
  | 'free'
  | 'starter'
  | 'pro'
  | 'career_plus'
  | 'employer'
  | 'enterprise'
  | 'annual'
  | 'api'
  | 'lifetime'

export interface PlanFeatures {
  planId: BazNovaPlan
  cvLimit: number // -1 = unlimited
  clLimit: number
  atsAccess: 'none' | 'basic' | 'detailed'
  templates: number
  formats: ('pdf' | 'word')[]
  watermark: boolean
  prioritySupport: boolean
  products: string[] // which BazNova products are accessible
}

export interface AccessCheckResult {
  allowed: boolean
  reason?: string
  remaining: number
  limit: number
  planId: BazNovaPlan
}

export interface SubscriptionEvent {
  id: string
  userId: string
  type:
    | 'activation'
    | 'upgrade'
    | 'downgrade'
    | 'cancellation'
    | 'payment_confirmed'
    | 'payment_failed'
    | 'refund'
  previousPlan: BazNovaPlan
  newPlan: BazNovaPlan
  gatewayId: string
  transactionId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
