import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const success = await unlockAccount(email, auth.userId!)
    if (!success) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ unlocked: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unlock account' }, { status: 500 })
  }
}
