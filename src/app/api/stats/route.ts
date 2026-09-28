import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

  try {
    const [cvCount, clCount, userCount] = await Promise.all([
      db.resume.count(),
      db.coverLetter.count(),
      db.user.count(),
    ])

    return NextResponse.json({
      cvCount,
      clCount,
      userCount,
      total: cvCount + clCount,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ cvCount: 0, clCount: 0, userCount: 0, total: 0 })
  }
}
