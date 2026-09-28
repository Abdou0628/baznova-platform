import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* Academic email domain patterns for auto-verification */
const ACADEMIC_PATTERNS = [
  /\.ac\.ma$/i, /\.univ\.ma$/i, /\.uae\.ac\.ma$/i, /\.uh[12]\.ac\.ma$/i,
  /\.ensam\.ma$/i, /\.emi\.ac\.ma$/i, /\.inpt\.ac\.ma$/i, /\.ensa\.ac\.ma$/i,
  /\.um5\.ac\.ma$/i, /\.um6p\.ma$/i, /\.ueuromed\.org$/i,
  /\.ac\.fr$/i, /\.univ-paris\.fr$/i, /\.ens\.fr$/i, /\.polytechnique\.fr$/i,
  /\.ac\.uk$/i, /\.ox\.ac\.uk$/i, /\.cam\.ac\.uk$/i,
  /\.edu$/i, /\.edu\.sa$/i, /\.edu\.ae$/i, /\.edu\.kw$/i,
  /\.edu\.qa$/i, /\.edu\.bh$/i, /\.edu\.om$/i,
  /\.edu\.eg$/i, /\.edu\.tn$/i, /\.edu\.dz$/i,
  /\.edu\./i, /\.ac\./i,
]

const isAcademicEmail = (email: string) => ACADEMIC_PATTERNS.some(p => p.test(email))

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, userEmail, academicEmail, documentBase64, documentName } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    if (!academicEmail && !documentBase64) {
      return NextResponse.json({ error: 'At least one proof required' }, { status: 400 })
    }

    // Check current student status
    const user = await db.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.studentStatus === 'verified') {
      return NextResponse.json({
        autoVerified: true,
        message: 'Already verified',
        studentStatus: 'verified',
      })
    }

    // Auto-verification via academic email domain
    if (academicEmail && isAcademicEmail(academicEmail)) {
      await db.user.update({
        where: { id: userId },
        data: {
          studentStatus: 'verified',
          studentEmail: academicEmail,
          studentVerifiedAt: new Date(),
          // If user was on free plan, upgrade to starter with student flag
          ...(user.plan === 'free' ? { plan: 'starter' } : {}),
        },
      })

      return NextResponse.json({
        autoVerified: true,
        message: 'Auto-verified via academic email',
        studentStatus: 'verified',
      })
    }

    // Manual review: save proof + mark as pending
    const updateData: Record<string, unknown> = {
      studentStatus: 'pending',
      studentEmail: academicEmail || null,
    }

    if (documentBase64) {
      // Store document reference (in production, upload to S3/CDN)
      updateData.studentDocPath = `student-docs/${userId}/${documentName || 'document'}`
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({
      autoVerified: false,
      submitted: true,
      message: 'Verification submitted for manual review',
      studentStatus: 'pending',
    })
  } catch (error) {
    console.error('[Student Verify] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        studentStatus: true,
        studentEmail: true,
        studentVerifiedAt: true,
        plan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      studentStatus: user.studentStatus,
      studentEmail: user.studentEmail,
      studentVerifiedAt: user.studentVerifiedAt,
      isStudentPricing: user.studentStatus === 'verified',
      currentPlan: user.plan,
    })
  } catch (error) {
    console.error('[Student Verify] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
