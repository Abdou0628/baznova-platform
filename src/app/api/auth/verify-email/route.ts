import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://hirenova.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${SITE_URL}/?verify=error`)
    }

    // Find user by verification token
    const user = await db.user.findFirst({
      where: { verificationToken: token },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        verificationTokenExpires: true,
      },
    })

    if (!user) {
      return NextResponse.redirect(`${SITE_URL}/?verify=error`)
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.redirect(`${SITE_URL}/?verify=success`)
    }

    // Check expiry
    if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      return NextResponse.redirect(`${SITE_URL}/?verify=expired`)
    }

    // Mark email as verified and clear token fields
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })

    return NextResponse.redirect(`${SITE_URL}/?verify=success`)
  } catch (error) {
    console.error('[verify-email] Error:', error)
    return NextResponse.redirect(`${SITE_URL}/?verify=error`)
  }
}
