import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MAX_SPOTS = 50

export async function GET() {
  try {
    const signupCount = await db.earlyAccessSignup.count()
    const remaining = Math.max(0, MAX_SPOTS - signupCount)

    return NextResponse.json({
      total: MAX_SPOTS,
      taken: signupCount,
      remaining,
      isFull: remaining === 0,
    })
  } catch (error) {
    console.error('[early-access/spots] Error counting signups:', error)
    // Fallback: return default values if DB is not available
    return NextResponse.json({
      total: MAX_SPOTS,
      taken: 0,
      remaining: MAX_SPOTS,
      isFull: false,
    })
  }
}
