import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100).optional(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message:
        'Password must contain at least one uppercase, one lowercase, and one digit',
    }),
  csrfToken: z.string().min(1),
  captchaToken: z.string().optional(),
})
