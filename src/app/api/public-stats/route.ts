import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple in-memory cache (30s TTL)
let cached: { data: Record<string, number>; ts: number } | null = null
const TTL = 30_000

export async function GET() {
  try {
    const now = Date.now()
    if (cached && now - cached.ts < TTL) {
      return NextResponse.json(cached.data)
    }

    const [cvCount, clCount, userCount, totalRatings, avgResult] = await Promise.all([
      db.resume.count(),
      db.coverLetter.count(),
      db.user.count(),
      db.satisfactionRating.count(),
      db.satisfactionRating.aggregate({ _avg: { rating: true } }),
    ])

    const data = {
      documents: cvCount + clCount,
      users: userCount,
      satisfiedUsers: totalRatings,
      avgRating: avgResult._avg.rating ? Math.round(avgResult._avg.rating * 10) / 10 : 0,
    }

    cached = { data, ts: now }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Public stats error:', error)
    return NextResponse.json({ documents: 0, users: 0, satisfiedUsers: 0, avgRating: 0 })
  }
}
