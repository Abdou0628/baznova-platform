import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { authOptions } from '@/lib/auth'

async function seedDemoTenants() {
  const count = await db.whiteLabelTenant.count()
  if (count > 0) return

  const demoUser = await db.user.findFirst()
  if (!demoUser) return

  await db.whiteLabelTenant.createMany({
    data: [
      {
        userId: demoUser.id,
        companyName: 'TechRecruit Pro',
        domain: 'careers.techrecruit.com',
        primaryColor: '#059669',
        logoUrl: '',
        enabledModules: JSON.stringify(['cv', 'cl', 'ats', 'jobs', 'interview']),
        plan: 'business',
        apiCalls: 12580,
        usersCount: 342,
        status: 'active',
      },
      {
        userId: demoUser.id,
        companyName: 'RH Solutions SARL',
        domain: 'recrutement.rhsolutions.ma',
        primaryColor: '#2563eb',
        logoUrl: '',
        enabledModules: JSON.stringify(['cv', 'cl', 'ats']),
        plan: 'starter',
        apiCalls: 3240,
        usersCount: 87,
        status: 'active',
      },
      {
        userId: demoUser.id,
        companyName: 'GlobalHR Enterprise',
        domain: 'platform.globalhr.com',
        primaryColor: '#7c3aed',
        logoUrl: '',
        enabledModules: JSON.stringify(['cv', 'cl', 'ats', 'jobs', 'interview', 'linkedin', 'recruiter', 'coach']),
        plan: 'enterprise',
        apiCalls: 45920,
        usersCount: 1280,
        status: 'active',
      },
    ],
  })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    await seedDemoTenants()

    const tenants = await db.whiteLabelTenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(tenants)
  } catch (error) {
    console.error('[GET /api/white-label/tenants]', error)
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await request.json()
    const { companyName, domain, primaryColor, logoUrl, enabledModules, plan } = body

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.whiteLabelTenant.create({
      data: {
        userId: session.user.id,
        companyName: companyName.trim(),
        domain: domain || '',
        primaryColor: primaryColor || '#059669',
        logoUrl: logoUrl || '',
        enabledModules: enabledModules || '[]',
        plan: plan || 'starter',
        apiCalls: Math.floor(Math.random() * 5000),
        usersCount: Math.floor(Math.random() * 200),
      },
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('[POST /api/white-label/tenants]', error)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
