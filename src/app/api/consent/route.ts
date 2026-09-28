import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

// GET — Return current user's consent (if logged in) or null
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: true, data: null })
    }

    const consent = await db.userConsent.findUnique({
      where: { userId: auth.userId! }
    })

    return NextResponse.json({ success: true, data: consent })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}

// POST — Save or update user consent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      analyticsCookies,
      marketingCookies,
      newsletterConsent,
      newsletterJobs,
      newsletterProducts,
    } = body

    // Extract IP and User-Agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const auth = await withAuth(request)

    if (auth.authorized) {
      // Logged in — upsert to DB
      const consent = await db.userConsent.upsert({
        where: { userId: auth.userId! },
        update: {
          analyticsCookies: !!analyticsCookies,
          marketingCookies: !!marketingCookies,
          newsletterConsent: !!newsletterConsent,
          newsletterJobs: !!newsletterJobs,
          newsletterProducts: !!newsletterProducts,
          ipAddress,
          userAgent,
        },
        create: {
          userId: auth.userId!,
          analyticsCookies: !!analyticsCookies,
          marketingCookies: !!marketingCookies,
          newsletterConsent: !!newsletterConsent,
          newsletterJobs: !!newsletterJobs,
          newsletterProducts: !!newsletterProducts,
          ipAddress,
          userAgent,
        },
      })

      return NextResponse.json({ success: true, data: consent })
    }

    // Not logged in — just return success (localStorage handles cookie-only consent)
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}
