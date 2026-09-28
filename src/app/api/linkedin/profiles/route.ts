import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/linkedin/profiles — List user's LinkedIn profiles
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const profiles = await db.linkedInProfile.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const result = profiles.map((p) => ({
      id: p.id,
      linkedinUrl: p.linkedinUrl,
      profileData: JSON.parse(p.profileData),
      importMethod: p.importMethod,
      status: p.status,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({ success: true, profiles: result })
  } catch (error) {
    console.error('[LinkedIn Profiles Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch LinkedIn profiles' },
      { status: 500 }
    )
  }
}

// DELETE /api/linkedin/profiles — Delete a LinkedIn profile
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
    }

    // Verify ownership
    const profile = await db.linkedInProfile.findUnique({
      where: { id },
    })

    if (!profile || profile.userId !== session.user.id) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    await db.linkedInProfile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[LinkedIn Delete Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete LinkedIn profile' },
      { status: 500 }
    )
  }
}
