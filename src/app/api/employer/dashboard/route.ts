import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: { code: auth.statusCode, message: auth.reason } }, { status: auth.statusCode })
    }
    const user = await db.user.findUnique({ where: { email: auth.email! } })
    if (!user || user.role !== 'employer') return NextResponse.json({ success: false, error: { code: 403, message: 'Employeur requis' } }, { status: 403 })

    const [postedJobs, applications] = await Promise.all([
      db.jobListing.count({ where: { employerId: user.id } }),
      db.application.count({ where: { job: { employerId: user.id } } })
    ])

    return NextResponse.json({ success: true, data: { postedJobs, totalApplications: applications } })
  } catch {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur' } }, { status: 500 })
  }
}
