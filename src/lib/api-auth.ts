import { db } from '@/lib/db'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getAuth(request: Request) {
  return getServerSession(authOptions)
}

export function generateApiKey(): string {
  const bytes = crypto.randomBytes(24)
  return `hnv_live_${bytes.toString('hex')}`
}

export function generateApiSecret(): string {
  const bytes = crypto.randomBytes(32)
  return `hnv_sec_${bytes.toString('hex')}`
}

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export async function validateApiKey(apiKey: string) {
  const subscriber = await db.apiSubscriber.findUnique({ where: { apiKey } })
  if (!subscriber) return { valid: false, error: { code: 401, message: 'Clé API invalide' } }
  if (subscriber.status !== 'active') return { valid: false, error: { code: 403, message: 'Abonnement suspendu' } }
  
  // Monthly credit reset
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${now.getMonth()}`
  if (subscriber.lastResetDate !== currentMonth) {
    await db.apiSubscriber.update({ where: { id: subscriber.id }, data: { creditsUsed: 0, lastResetDate: currentMonth } })
    subscriber.creditsUsed = 0
  }

  // Credit check (enterprise = unlimited)
  if (subscriber.plan !== 'enterprise' && subscriber.creditsUsed >= subscriber.creditsLimit) {
    return { valid: false, error: { code: 402, message: 'Crédits insuffisants' } }
  }

  return { valid: true, subscriber }
}

export async function recordUsage(subscriberId: string, endpoint: string, credits: number, status: string = 'success', errorMessage?: string, ip?: string) {
  await db.apiUsageLog.create({ data: { subscriberId, endpoint, credits, status, errorMessage, ip } })
  if (status === 'success') {
    await db.apiSubscriber.update({ where: { id: subscriberId }, data: { creditsUsed: { increment: credits } } })
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}
