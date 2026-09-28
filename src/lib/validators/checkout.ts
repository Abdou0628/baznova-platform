import { z } from 'zod'

export const checkoutSchema = z.object({
  planType: z.enum(['starter', 'pro', 'career_plus', 'employer', 'annual']),
  currency: z.enum(['eur', 'usd', 'gbp', 'mad']).default('eur'),
})
