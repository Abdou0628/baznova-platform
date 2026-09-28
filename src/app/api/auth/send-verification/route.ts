import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import type { CVLanguage } from '@/lib/i18n'
import crypto from 'crypto'

const TOKEN_EXPIRY_MINUTES = 30
const SITE_URL = process.env.NEXTAUTH_URL || 'https://hirenova.com'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch user from DB
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Read preferred language from body (fallback to 'fr')
    let language: CVLanguage = 'fr'
    try {
      const body = await request.json()
      if (body?.language && ['fr', 'en', 'ar', 'es'].includes(body.language)) {
        language = body.language as CVLanguage
      }
    } catch {
      // No body or invalid JSON — use default language
    }

    // Generate a secure random token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

    // Store token in DB
    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpires: expiresAt,
      },
    })

    // Send verification email
    const sent = await sendVerificationEmail(
      user.email,
      user.name || '',
      language,
      token,
      SITE_URL
    )

    if (!sent) {
      console.error('[send-verification] Failed to send email to', user.email)
      // Token is still stored — user can retry
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    })
  } catch (error) {
    console.error('[send-verification] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
