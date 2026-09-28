import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'

/**
 * Public endpoint to resend a verification email.
 * Does NOT require authentication — only needs the email address.
 * Used after registration when the user is not yet logged in.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, language } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: max 3 resends per email per 15 min
    const rl = await rateLimit(`resend-verify:${normalizedEmail}`, {
      maxRequests: 3,
      windowMs: 15 * 60 * 1000,
    })
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before retrying.' },
        { status: 429 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json({ success: true, message: 'If the email exists, a verification link has been sent.' })
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await db.user.update({
      where: { id: user.id },
      data: { verificationToken: token, verificationTokenExpires: expiresAt },
    })

    const userLang = language && ['fr', 'en', 'ar', 'es'].includes(language) ? language : 'fr'
    await sendVerificationEmail(user.email, user.name || '', userLang, token, SITE_URL).catch((err) => {
      console.error('[resend-verification] Failed to send email:', err)
    })

    return NextResponse.json({ success: true, message: 'Verification email sent' })
  } catch (error) {
    console.error('[resend-verification] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
