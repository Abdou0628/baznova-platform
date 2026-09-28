import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const VALID_STATUSES = ['viewed', 'shortlisted', 'accepted', 'rejected'] as const

type ValidStatus = (typeof VALID_STATUSES)[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'employer') {
      return NextResponse.json({ error: 'Employer account required' }, { status: 403 })
    }

    const { id: applicationId } = await params

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { employerId: true } } },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.job.employerId !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to update this application' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const updatedApplication = await db.application.update({
      where: { id: applicationId },
      data: { status: status as ValidStatus },
      include: {
        candidate: { select: { id: true, name: true, email: true, image: true } },
        job: { select: { id: true, title: true, company: true } },
      },
    })

    return NextResponse.json({ application: updatedApplication })
  } catch (error) {
    console.error('Update application status error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
