import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

// POST /api/sso/login — Initiate SSO login by checking email domain
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_EMAIL', message: 'Email is required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const domain = emailLower.split('@')[1]

    if (!domain) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL', message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find matching SSO configuration for this domain
    const allConfigs = await db.enterpriseSSO.findMany({
      where: { status: 'active' },
    })

    let matchedConfig: { id: string; companyName: string; providerType: string; authorizationUrl: string | null; clientId: string | null; issuerUrl: string | null; scopes: string } | null = null

    for (const config of allConfigs) {
      const domains: string[] = JSON.parse(config.domains)
      if (domains.some((d: string) => domain === d.toLowerCase() || domain.endsWith('.' + d.toLowerCase()))) {
        matchedConfig = {
          id: config.id,
          companyName: config.companyName,
          providerType: config.providerType,
          authorizationUrl: config.authorizationUrl,
          clientId: config.clientId,
          issuerUrl: config.issuerUrl,
          scopes: config.scopes,
        }
        break
      }
    }

    if (!matchedConfig) {
      return NextResponse.json({
        success: false,
        error: 'NO_SSO_CONFIG',
        message: `No enterprise SSO configuration found for domain: ${domain}`,
        domain,
      })
    }

    // Generate a state for CSRF protection
    const state = nanoid(32)

    // Build the authorization URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/sso/callback`

    let authUrl = ''

    if (matchedConfig.authorizationUrl && matchedConfig.clientId) {
      // Custom authorization URL (e.g., Azure AD, Okta, etc.)
      const params = new URLSearchParams({
        client_id: matchedConfig.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: matchedConfig.scopes,
        state: state,
        login_hint: emailLower,
      })
      authUrl = `${matchedConfig.authorizationUrl}?${params.toString()}`
    } else if (matchedConfig.issuerUrl && matchedConfig.clientId) {
      // Standard OIDC discovery
      const params = new URLSearchParams({
        client_id: matchedConfig.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: matchedConfig.scopes,
        state: state,
        login_hint: emailLower,
      })
      authUrl = `${matchedConfig.issuerUrl}/authorize?${params.toString()}`
    } else {
      return NextResponse.json({
        success: false,
        error: 'SSO_NOT_CONFIGURED',
        message: 'SSO provider is not fully configured. Please contact your administrator.',
      })
    }

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      companyName: matchedConfig.companyName,
      providerType: matchedConfig.providerType,
    })
  } catch (error) {
    console.error('[SSO Login Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'SSO login failed' },
      { status: 500 }
    )
  }
}
