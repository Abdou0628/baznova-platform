import { NextResponse } from 'next/server'

const SUPERVISOR_URL = 'http://localhost:3006/health'

export async function GET() {
  try {
    const res = await fetch(SUPERVISOR_URL, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({
      status: 'unreachable',
      uptime: 0,
      checks: [],
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
