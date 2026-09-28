import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('[GET /api/white-label/config]', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await request.json()
    const { id, companyName, domain, primaryColor, logoUrl, enabledModules, plan, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const tenant = await db.whiteLabelTenant.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(domain !== undefined && { domain }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(enabledModules !== undefined && { enabledModules }),
        ...(plan !== undefined && { plan }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('[PUT /api/white-label/config]', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
