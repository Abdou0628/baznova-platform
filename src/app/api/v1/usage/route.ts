import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateApiKey } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
  if (!apiKey) return NextResponse.json({ success: false, error: { code: 401, message: 'Clé API manquante' } }, { status: 401 })

  const validation = await validateApiKey(apiKey)
  if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: validation.error?.code || 401 })

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const subscriber = await db.apiSubscriber.findUnique({ where: { apiKey } })
    if (!subscriber) return NextResponse.json({ success: false, error: { code: 401, message: 'Introuvable' } }, { status: 401 })

    const logs = await db.apiUsageLog.findMany({
      where: { subscriberId: subscriber.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit
    })

    return NextResponse.json({
      success: true,
      data: {
        creditsUsed: subscriber.creditsUsed,
        creditsLimit: subscriber.creditsLimit,
        plan: subscriber.plan,
        status: subscriber.status,
        logs
      }
    })
  } catch {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur' } }, { status: 500 })
  }
}
