import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { getAutonomousSystemStats } from '@/lib/autonomous/agent-brain'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }

  try {
    const stats = await getAutonomousSystemStats()
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    console.error('[Autonomous Status]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch autonomous system status' }, { status: 500 })
  }
}