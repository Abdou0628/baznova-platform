import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/sso/callback — Handle IdP callback and create/update user
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, state, providerType, email, name, sub } = body

    if (!email) {
      return NextResponse.json(
        { error: 'MISSING_EMAIL', message: 'Email is required from IdP' },
        { status: 400 }
      )
    }

    // In production, you would exchange the `code` for tokens via the IdP's token endpoint
    // For now, we accept the user info directly from the IdP callback
    const emailLower = email.toLowerCase().trim()

    // Find the SSO config that matches this user's domain
    const domain = emailLower.split('@')[1]
    const allConfigs = await db.enterpriseSSO.findMany({ where: { status: 'active' } })
    let matchedConfig: { companyName: string; planOverride: string | null } | null = null

    for (const config of allConfigs) {
      const domains: string[] = JSON.parse(config.domains)
      if (domains.some((d: string) => domain === d.toLowerCase() || domain.endsWith('.' + d.toLowerCase()))) {
        matchedConfig = {
          companyName: config.companyName,
          planOverride: config.planOverride,
        }
        break
      }
    }

    if (!matchedConfig) {
      return NextResponse.json(
        { error: 'NO_SSO_CONFIG', message: 'No SSO configuration found for this email domain' },
        { status: 403 }
      )
    }

    // Find or create the user
    let user = await db.user.findUnique({ where: { email: emailLower } })

    if (user) {
      // Update existing user
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          image: null,
          companyName: matchedConfig.companyName,
          ...(matchedConfig.planOverride && user.plan === 'free' ? { plan: matchedConfig.planOverride } : {}),
        },
      })
    } else {
      // Create new SSO user (no password — SSO only)
      user = await db.user.create({
        data: {
          email: emailLower,
          name: name || emailLower.split('@')[0],
          password: null, // SSO users don't have passwords
          plan: matchedConfig.planOverride || 'enterprise',
          role: 'candidate',
          companyName: matchedConfig.companyName,
        },
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        companyName: user.companyName,
        isSSO: true,
      },
    })
  } catch (error) {
    console.error('[SSO Callback Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'SSO authentication failed' },
      { status: 500 }
    )
  }
}

// GET /api/sso/callback — Check if an email domain has SSO configured
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'MISSING_EMAIL' }, { status: 400 })
    }

    const domain = email.toLowerCase().trim().split('@')[1]
    const allConfigs = await db.enterpriseSSO.findMany({ where: { status: 'active' } })

    let found = false
    let companyName = ''
    let providerType = ''

    for (const config of allConfigs) {
      const domains: string[] = JSON.parse(config.domains)
      if (domains.some((d: string) => domain === d.toLowerCase() || domain.endsWith('.' + d.toLowerCase()))) {
        found = true
        companyName = config.companyName
        providerType = config.providerType
        break
      }
    }

    return NextResponse.json({
      success: true,
      hasSSO: found,
      companyName: found ? companyName : null,
      providerType: found ? providerType : null,
      domain,
    })
  } catch (error) {
    console.error('[SSO Check Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
