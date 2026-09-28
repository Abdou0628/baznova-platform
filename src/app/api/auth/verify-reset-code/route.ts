import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { scanInput, sanitizeString, logSecurityEvent } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email et code requis' },
        { status: 400 }
      )
    }

    // Security scan
    const emailScan = scanInput(email)
    if (!emailScan.isClean) {
      await logSecurityEvent({
        type: emailScan.sqlInjection ? 'sql_injection_attempt' : 'xss_attempt',
        severity: 'high',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        path: '/api/auth/verify-reset-code',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
        email: email?.toLowerCase().trim(),
        details: { field: 'email' },
      }).catch(() => {})
      return NextResponse.json(
        { success: false, error: 'Invalid input detected' },
        { status: 400 }
      )
    }

    normalizedEmail = sanitizeString(email.toLowerCase().trim())

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, resetCode: true, resetCodeExpires: true, name: true, plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Aucun compte trouvé avec cet email', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check code exists
    if (!user.resetCode || !user.resetCodeExpires) {
      return NextResponse.json(
        { success: false, error: 'Aucun code de vérification en attente. Veuillez demander un nouveau code.', code: 'NO_CODE' },
        { status: 400 }
      )
    }

    // Check code not expired
    if (new Date() > user.resetCodeExpires) {
      // Clear expired code
      await db.user.update({
        where: { id: user.id },
        data: { resetCode: null, resetCodeExpires: null },
      })
      return NextResponse.json(
        { success: false, error: 'Le code a expiré. Veuillez demander un nouveau code.', code: 'CODE_EXPIRED' },
        { status: 400 }
      )
    }

    // Check code matches
    if (user.resetCode !== code) {
      return NextResponse.json(
        { success: false, error: 'Code incorrect. Veuillez réessayer.', code: 'WRONG_CODE' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      name: user.name,
      plan: user.plan,
    })
  } catch (error) {
    console.error('Verify reset code error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
