import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const job = await db.jobListing.findUnique({ where: { id } })

    if (!job || job.employerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const applications = await db.application.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, resumes: { select: { id: true } } },
        },
      },
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Applicants error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
