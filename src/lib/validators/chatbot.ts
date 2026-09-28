import { z } from 'zod'

export const chatbotSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['advisor', 'support']).default('advisor'),
})
