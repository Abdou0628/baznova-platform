import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const adminEmail = process.env.ADMIN_EMAIL
    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const planFilter = searchParams.get('plan') || ''
    const statusFilter = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (search) where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ]
    if (planFilter) where.plan = planFilter
    if (statusFilter) where.status = statusFilter

    const [subscribers, total] = await Promise.all([
      db.apiSubscriber.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, company: true, industry: true,
          plan: true, status: true, creditsUsed: true, creditsLimit: true,
          createdAt: true, updatedAt: true,
          _count: { select: { usageLogs: true } },
        },
      }),
      db.apiSubscriber.count({ where }),
    ])

    return NextResponse.json({ subscribers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin API Subscribers Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.email !== process.env.ADMIN_EMAIL) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { id, status, plan, creditsLimit } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (plan) updateData.plan = plan
    if (creditsLimit !== undefined) updateData.creditsLimit = creditsLimit

    const updated = await db.apiSubscriber.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ subscriber: updated })
  } catch (error) {
    console.error('Admin API Subscribers PATCH Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.email !== process.env.ADMIN_EMAIL) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await db.apiSubscriber.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin API Subscribers DELETE Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
