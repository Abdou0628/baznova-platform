import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, AUDIT_ACTIONS } from '@/lib/hnsa'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey } = body
    if (!apiKey) return NextResponse.json({ success: false, error: { code: 400, message: 'apiKey requis' } }, { status: 400 })

    const subscriber = await db.apiSubscriber.findUnique({ where: { apiKey }, select: { id: true, name: true, plan: true, status: true, creditsUsed: true, creditsLimit: true } })
    if (!subscriber) {
      await logAudit({
        actorId: 'anonymous',
        actorEmail: 'unknown',
        actorRole: 'anonymous',
        action: AUDIT_ACTIONS.SECURITY.SUSPICIOUS_ACTIVITY,
        resource: 'api_subscriber',
        resourceId: apiKey,
        outcome: 'failure',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        path: '/api/api-portal/verify',
        method: 'POST',
        statusCode: 401,
        details: `Invalid API key verification attempt`,
      })

      return NextResponse.json({ success: false, error: { code: 401, message: 'Clé invalide' } }, { status: 401 })
    }

    await logAudit({
      actorId: subscriber.id,
      actorEmail: subscriber.name,
      actorRole: 'api_subscriber',
      action: 'API_KEY_VERIFIED',
      resource: 'api_subscriber',
      resourceId: subscriber.id,
      outcome: 'success',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/api-portal/verify',
      method: 'POST',
      statusCode: 200,
      details: `API key verified for subscriber ${subscriber.name} (plan: ${subscriber.plan})`,
    })

    return NextResponse.json({ success: true, data: subscriber })
  } catch {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur' } }, { status: 500 })
  }
}
