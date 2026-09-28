import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    let profile = await db.communityProfile.findUnique({
      where: { userId: auth.email },
      include: { user: { select: { name: true, image: true, email: true } } },
    })

    // Auto-create profile if not exists
    if (!profile) {
      profile = await db.communityProfile.create({
        data: {
          userId: auth.email,
          bio: '',
          skills: '[]',
          badges: '["early-adopter"]',
          reputation: 10,
        },
        include: { user: { select: { name: true, image: true, email: true } } },
      })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('GET /api/marketplace/profile error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { bio, skills } = body

    const profile = await db.communityProfile.upsert({
      where: { userId: auth.email },
      create: {
        userId: auth.email,
        bio: bio || '',
        skills: skills || '[]',
        badges: '["early-adopter"]',
        reputation: 10,
      },
      update: {
        ...(bio !== undefined && { bio }),
        ...(skills !== undefined && { skills }),
      },
      include: { user: { select: { name: true, image: true, email: true } } },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('PUT /api/marketplace/profile error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
