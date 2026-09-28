import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const [ratings, totalRatings, avgRating] = await Promise.all([
      db.satisfactionRating.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.satisfactionRating.count(),
      db.satisfactionRating.aggregate({
        _avg: { rating: true },
      }),
    ])

    // Breakdown by rating
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of ratings) {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1
    }

    // By type
    const cvRatings = ratings.filter((r) => r.type === 'cv')
    const clRatings = ratings.filter((r) => r.type === 'cover_letter')

    // Last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentRatings = await db.satisfactionRating.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    })

    const recentAvg = await db.satisfactionRating.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _avg: { rating: true },
    })

    return NextResponse.json({
      ratings,
      totalRatings,
      avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
      ratingCounts,
      cvCount: cvRatings.length,
      clCount: clRatings.length,
      recentCount: recentRatings,
      recentAvg: recentAvg._avg.rating ? Math.round(recentAvg._avg.rating * 10) / 10 : 0,
    })
  } catch (error) {
    console.error('Admin satisfaction error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
