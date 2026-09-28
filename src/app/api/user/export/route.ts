import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = session.user.id
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        resumes: true,
        coverLetters: true,
        applications: true,
        careerAssessments: true,
        coachSessions: true,
        coachGoals: true,
        interviewSessions: { include: { messages: true } },
        linkedInAnalyses: true,
        mobilityProfiles: true,
        satisfactionRatings: true,
        userConsents: true,
      },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Remove sensitive fields
    const { password, resetCode, resetCodeExpires, ...safeUser } = user

    return new NextResponse(JSON.stringify(safeUser, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="hirenova-data-export.json"',
      },
    })
  } catch (error) {
    console.error('Data export failed:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
