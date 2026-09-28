import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = session.user.id
    // Delete all user data in cascade order (child tables first)
    await db.jobNotification.deleteMany({ where: { userId } })
    await db.userConsent.deleteMany({ where: { userId } })
    await db.complianceCheck.deleteMany({ where: { userId } })
    await db.legalDocument.deleteMany({ where: { userId } })
    await db.satisfactionRating.deleteMany({ where: { userId } })
    await db.supportTicket.deleteMany({ where: { userId } })
    await db.coverLetter.deleteMany({ where: { userId } })
    await db.resume.deleteMany({ where: { userId } })
    await db.application.deleteMany({ where: { userId } })
    await db.careerAssessment.deleteMany({ where: { userId } })
    await db.coachGoal.deleteMany({ where: { userId } })
    await db.coachSession.deleteMany({ where: { userId } })
    await db.interviewMessage.deleteMany({ where: { interviewSession: { userId } } })
    await db.interviewSession.deleteMany({ where: { userId } })
    await db.linkedInAnalysis.deleteMany({ where: { userId } })
    await db.freelanceProposal.deleteMany({ where: { userId } })
    await db.communityReply.deleteMany({ where: { userId } })
    await db.communityPost.deleteMany({ where: { userId } })
    await db.communityProfile.deleteMany({ where: { userId } })
    await db.mobilityProfile.deleteMany({ where: { userId } })
    await db.emailLog.deleteMany({ where: { userId } })
    await db.referral.deleteMany({ where: { referredId: userId } })
    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
