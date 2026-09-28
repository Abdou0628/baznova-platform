import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent, type SecurityEventType, type SecuritySeverity } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type,
      severity,
      ip,
      path,
      method,
      userAgent,
      email,
      details,
    } = body as {
      type: SecurityEventType
      severity: SecuritySeverity
      ip: string
      path: string
      method: string
      userAgent?: string
      email?: string
      details?: Record<string, unknown>
    }

    if (!type || !severity || !ip || !path || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: type, severity, ip, path, method' },
        { status: 400 }
      )
    }

    await logSecurityEvent({
      type,
      severity,
      ip,
      path,
      method,
      userAgent: userAgent || request.headers.get('user-agent') || undefined,
      email,
      details,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Security check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
