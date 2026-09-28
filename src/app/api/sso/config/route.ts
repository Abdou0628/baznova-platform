import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/sso/config — List all SSO configurations (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Admin-only
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const configs = await db.enterpriseSSO.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const result = configs.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      domains: JSON.parse(c.domains),
      providerType: c.providerType,
      clientId: c.clientId ? '***' : null,
      issuerUrl: c.issuerUrl,
      authorizationUrl: c.authorizationUrl,
      scopes: c.scopes,
      status: c.status,
      maxUsers: c.maxUsers,
      planOverride: c.planOverride,
      fieldMapping: JSON.parse(c.fieldMapping),
      metadata: c.metadata ? JSON.parse(c.metadata) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ success: true, configs: result })
  } catch (error) {
    console.error('[SSO Config GET Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch SSO configurations' },
      { status: 500 }
    )
  }
}

// POST /api/sso/config — Create a new SSO configuration (admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await req.json()
    const { companyName, domains, providerType, clientId, clientSecret, issuerUrl, authorizationUrl, tokenUrl, userInfoUrl, scopes, fieldMapping, maxUsers, planOverride } = body

    if (!companyName || !domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Company name and at least one domain are required' },
        { status: 400 }
      )
    }

    // Validate domains format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
    for (const domain of domains) {
      if (!domainRegex.test(domain)) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: `Invalid domain format: ${domain}` },
          { status: 400 }
        )
      }
    }

    const config = await db.enterpriseSSO.create({
      data: {
        companyName,
        domains: JSON.stringify(domains),
        providerType: providerType || 'azure_ad',
        clientId: clientId || null,
        clientSecret: clientSecret || null,
        issuerUrl: issuerUrl || null,
        authorizationUrl: authorizationUrl || null,
        tokenUrl: tokenUrl || null,
        userInfoUrl: userInfoUrl || null,
        scopes: scopes || 'openid profile email',
        fieldMapping: fieldMapping ? JSON.stringify(fieldMapping) : '{}',
        maxUsers: maxUsers || 0,
        planOverride: planOverride || null,
        status: 'active',
      },
    })

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        companyName: config.companyName,
        domains: JSON.parse(config.domains),
        providerType: config.providerType,
        status: config.status,
        createdAt: config.createdAt,
      },
    })
  } catch (error) {
    console.error('[SSO Config POST Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create SSO configuration' },
      { status: 500 }
    )
  }
}

// PUT /api/sso/config — Update an SSO configuration (admin only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
    }

    const existing = await db.enterpriseSSO.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    // Build update payload
    const data: Record<string, unknown> = {}
    if (updateData.companyName) data.companyName = updateData.companyName
    if (updateData.domains) data.domains = JSON.stringify(updateData.domains)
    if (updateData.providerType) data.providerType = updateData.providerType
    if (updateData.clientId !== undefined) data.clientId = updateData.clientId
    if (updateData.clientSecret !== undefined) data.clientSecret = updateData.clientSecret
    if (updateData.issuerUrl !== undefined) data.issuerUrl = updateData.issuerUrl
    if (updateData.authorizationUrl !== undefined) data.authorizationUrl = updateData.authorizationUrl
    if (updateData.tokenUrl !== undefined) data.tokenUrl = updateData.tokenUrl
    if (updateData.userInfoUrl !== undefined) data.userInfoUrl = updateData.userInfoUrl
    if (updateData.scopes !== undefined) data.scopes = updateData.scopes
    if (updateData.fieldMapping) data.fieldMapping = JSON.stringify(updateData.fieldMapping)
    if (updateData.maxUsers !== undefined) data.maxUsers = updateData.maxUsers
    if (updateData.planOverride !== undefined) data.planOverride = updateData.planOverride
    if (updateData.status !== undefined) data.status = updateData.status

    const updated = await db.enterpriseSSO.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        companyName: updated.companyName,
        domains: JSON.parse(updated.domains),
        providerType: updated.providerType,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('[SSO Config PUT Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update SSO configuration' },
      { status: 500 }
    )
  }
}

// DELETE /api/sso/config — Delete an SSO configuration (admin only)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
    }

    await db.enterpriseSSO.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SSO Config DELETE Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete SSO configuration' },
      { status: 500 }
    )
  }
}
