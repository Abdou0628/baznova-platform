import { NextRequest, NextResponse } from 'next/server'

const SUPERVISOR_URL = 'http://localhost:3006/api/issues'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const severity = searchParams.get('severity') || ''
    const limit = searchParams.get('limit') || '50'

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (severity) params.set('severity', severity)
    if (limit) params.set('limit', limit)

    const url = `${SUPERVISOR_URL}?${params.toString()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ issues: [], total: 0 }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(SUPERVISOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Supervisor service unreachable' }, { status: 503 })
  }
}
