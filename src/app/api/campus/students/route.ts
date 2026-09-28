import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, logAudit, AUDIT_ACTIONS } from '@/lib/hnsa'

// GET /api/campus/students
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) return NextResponse.json({ success: false, error: auth.reason }, { status: auth.statusCode })

    const students = await db.campusStudent.findMany({
      include: {
        user: { select: { name: true, email: true } },
        university: { select: { name: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    await logAudit({
      actorId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: 'CAMPUS_STUDENTS_VIEWED',
      resource: 'campus_students',
      resourceId: 'all',
      outcome: 'success',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/campus/students',
      method: 'GET',
      statusCode: 200,
      details: `Admin ${auth.email} viewed all campus students (${students.length} records)`,
    })

    return NextResponse.json({ success: true, data: students })
  } catch (error) {
    console.error('[campus/students] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 })
  }
}
