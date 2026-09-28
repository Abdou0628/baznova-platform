import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { scanInput, sanitizeString, logSecurityEvent } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword, code } = body

    // Security scan on inputs
    const emailScan = email ? scanInput(email) : null
    if (emailScan && !emailScan.isClean) {
      await logSecurityEvent({
        type: emailScan.sqlInjection ? 'sql_injection_attempt' : 'xss_attempt',
        severity: 'high',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        path: '/api/auth/reset-password',
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

    if (!email || !newPassword || !code) {
      return NextResponse.json(
        { success: false, error: 'Email, code et nouveau mot de passe sont requis' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    const normalizedEmail = sanitizeString(email.toLowerCase().trim())

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, plan: true, resetCode: true, resetCodeExpires: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Aucun compte trouvé avec cet email', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify code is still valid
    if (!user.resetCode || !user.resetCodeExpires) {
      return NextResponse.json(
        { success: false, error: 'Aucun code de vérification valide. Veuillez recommencer.', code: 'NO_CODE' },
        { status: 403 }
      )
    }

    if (new Date() > user.resetCodeExpires) {
      await db.user.update({
        where: { id: user.id },
        data: { resetCode: null, resetCodeExpires: null },
      })
      return NextResponse.json(
        { success: false, error: 'Le code a expiré. Veuillez demander un nouveau code.', code: 'CODE_EXPIRED' },
        { status: 403 }
      )
    }

    if (user.resetCode !== code) {
      return NextResponse.json(
        { success: false, error: 'Code invalide.', code: 'WRONG_CODE' },
        { status: 403 }
      )
    }

    // All checks passed — reset password
    const hashedPassword = await hash(newPassword, 12)

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
