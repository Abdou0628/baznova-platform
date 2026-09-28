import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const job = await db.globalJobListing.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            industry: true,
            companyWebsite: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Offre non trouvée' } },
        { status: 404 }
      )
    }

    // Increment views count
    await db.globalJobListing.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        viewsCount: job.viewsCount + 1,
        applicationCount: job._count.applications,
        _count: undefined,
      },
    })
  } catch (error) {
    console.error('Error fetching global job:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la récupération de l\'offre' } },
      { status: 500 }
    )
  }
}
