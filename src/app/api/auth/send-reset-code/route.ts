import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { scanInput, sanitizeString, logSecurityEvent } from '@/lib/security'
import { sendResetCodeEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import type { CVLanguage } from '@/lib/i18n'

const CODE_EXPIRY_MINUTES = 15

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
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
        path: '/api/auth/send-reset-code',
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

    const normalizedEmail = sanitizeString(email.toLowerCase().trim())

    // Rate limit: max 3 reset code requests per email per 15 minutes
    const rateLimitResult = await rateLimit(`reset-code:${normalizedEmail}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Trop de demandes. Veuillez réessayer dans quelques minutes.' },
        { status: 429 }
      )
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Aucun compte trouvé avec cet email', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Generate 6-digit code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    // Store code in database
    await db.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpires: expiresAt,
      },
    })

    // Send reset code email
    let language: CVLanguage = 'fr'
    if (body?.language && ['fr', 'en', 'ar', 'es'].includes(body.language)) {
      language = body.language as CVLanguage
    }

    await sendResetCodeEmail(
      user.email,
      user.name || '',
      code,
      language
    ).catch((err) => {
      console.error('[send-reset-code] Failed to send reset email:', err instanceof Error ? err.message : String(err))
    })

    // Dev mode: log the code for debugging
    console.log(`[send-reset-code] Code for ${user.email}: ${code} (expires in ${CODE_EXPIRY_MINUTES} min)`)

    return NextResponse.json({
      success: true,
      message: 'Code de vérification envoyé',
      code,
      expiresIn: CODE_EXPIRY_MINUTES,
    })
  } catch (error) {
    console.error('Send reset code error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
