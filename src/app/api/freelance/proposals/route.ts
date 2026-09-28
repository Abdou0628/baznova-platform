import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const missionId = searchParams.get('missionId')

    if (missionId) {
      // Get proposals for a specific mission (check if user already applied)
      const proposals = await db.freelanceProposal.findMany({
        where: { missionId },
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ proposals })
    }

    // Get user's own proposals with mission info
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId

    const proposals = await db.freelanceProposal.findMany({
      where,
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            category: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('Freelance proposals GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { missionId, userId, coverLetter, proposedRate, estimatedDelivery } = body

    if (!missionId || !coverLetter || !proposedRate || !estimatedDelivery) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if already applied
    const existing = await db.freelanceProposal.findFirst({
      where: { missionId, userId: userId || undefined },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already applied', proposalId: existing.id }, { status: 409 })
    }

    const proposal = await db.freelanceProposal.create({
      data: {
        missionId,
        userId: userId || null,
        coverLetter,
        proposedRate: Number(proposedRate),
        estimatedDelivery,
      },
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    console.error('Freelance proposals POST error:', error)
    return NextResponse.json({ error: 'Failed to submit proposal' }, { status: 500 })
  }
}
