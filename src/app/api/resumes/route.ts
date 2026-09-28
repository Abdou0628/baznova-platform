import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/resumes — List user's resumes
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumes = await db.resume.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        targetJob: true,
        industry: true,
        language: true,
        templateStyle: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, resumes })
  } catch (error) {
    console.error('[resumes] GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/resumes — Delete a resume by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Resume ID required' }, { status: 400 })
    }

    // Verify ownership
    const resume = await db.resume.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (resume.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.resume.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[resumes] DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/resumes — Duplicate a resume by ID
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, action } = body

    if (!id || action !== 'duplicate') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify ownership and get full data
    const original = await db.resume.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (original.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Duplicate
    const { id: _id, createdAt: _c, updatedAt: _u, userId: _uid, ...data } = original
    const duplicate = await db.resume.create({
      data: {
        ...data,
        fullName: `${original.fullName} (copie)`,
      },
    })

    return NextResponse.json({
      success: true,
      resume: {
        id: duplicate.id,
        fullName: duplicate.fullName,
        targetJob: duplicate.targetJob,
        industry: duplicate.industry,
        language: duplicate.language,
        templateStyle: duplicate.templateStyle,
        createdAt: duplicate.createdAt,
      },
    })
  } catch (error) {
    console.error('[resumes] PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
