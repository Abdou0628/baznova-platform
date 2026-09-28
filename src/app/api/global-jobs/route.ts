import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || undefined
    const country = searchParams.get('country') || undefined
    const keyword = searchParams.get('keyword') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const where: Record<string, unknown> = { status: 'active' }

    if (region) {
      where.region = region
    }

    if (country) {
      where.country = country
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { company: { contains: keyword } },
        { description: { contains: keyword } },
        { skills: { contains: keyword } },
        { location: { contains: keyword } },
      ]
    }

    const [jobs, total] = await Promise.all([
      db.globalJobListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.globalJobListing.count({ where }),
    ])

    return NextResponse.json({
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching global jobs:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la récupération des offres' } },
      { status: 500 }
    )
  }
}
