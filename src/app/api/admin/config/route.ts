import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ adminEmail: '' })
    }

    if (!process.env.ADMIN_EMAIL) {
      return NextResponse.json({ adminEmail: '' })
    }
    return NextResponse.json({ adminEmail: process.env.ADMIN_EMAIL })
  } catch {
    return NextResponse.json({ adminEmail: '' })
  }
}