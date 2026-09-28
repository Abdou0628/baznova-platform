import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://localhost:3006/api/agents/status', {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ agents: [] }, { status: 503 })
  }
}
