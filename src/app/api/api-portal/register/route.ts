import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKey, generateApiSecret, hashSecret } from '@/lib/api-auth'
import { withAuth, logAudit, AUDIT_ACTIONS } from '@/lib/hnsa'

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) return NextResponse.json({ success: false, error: { code: auth.statusCode, message: auth.reason } }, { status: auth.statusCode })

    const body = await request.json()
    const { name, email, company, industry, website, phone, plan } = body
    if (!name || !email || !company) return NextResponse.json({ success: false, error: { code: 400, message: 'name, email, company requis' } }, { status: 400 })

    const existing = await db.apiSubscriber.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ success: false, error: { code: 409, message: 'Email déjà enregistré' } }, { status: 409 })

    const apiKey = generateApiKey()
    const apiSecret = generateApiSecret()
    const creditsLimit = plan === 'enterprise' ? 999999 : plan === 'business' ? 500 : 100

    await db.apiSubscriber.create({
      data: { name, email, company, industry, website, phone, apiKey, apiSecretHash: hashSecret(apiSecret), plan: plan || 'starter', creditsLimit }
    })

    await logAudit({
      actorId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: AUDIT_ACTIONS.ADMIN.ADMIN_USER_MODIFIED,
      resource: 'api_subscriber',
      resourceId: email,
      outcome: 'success',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/api-portal/register',
      method: 'POST',
      statusCode: 200,
      details: `Admin ${auth.email} created API subscriber for ${email} (plan: ${plan || 'starter'})`,
    })

    return NextResponse.json({ success: true, data: { apiKey, apiSecret } })
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur serveur' } }, { status: 500 })
  }
}
