import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { sendEmail, emailTemplates, scheduleOnboardingEmails } from '@/lib/email'

/**
 * POST /api/email/onboarding
 * Triggers onboarding email sequence for a user.
 * 
 * Body:
 * - step: 'welcome' | 'firstCV' | 'atsTips' | 'ecosystem' | 'proOffer' | 'all'
 * 
 * Requires authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Non authentifié' } },
        { status: auth.statusCode }
      )
    }

    const body = await request.json().catch(() => ({}))
    const step = body.step || 'welcome'

    const user = await db.user.findUnique({
      where: { email: auth.email! },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur introuvable' } },
        { status: 404 }
      )
    }

    const name = user.name || user.email.split('@')[0]

    // Schedule full sequence
    if (step === 'all') {
      const result = await scheduleOnboardingEmails(user.id, user.email, name)
      return NextResponse.json({ success: true, data: result })
    }

    // Send specific email
    const templateFn = emailTemplates[step as keyof typeof emailTemplates]
    if (!templateFn) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Template email invalide' } },
        { status: 400 }
      )
    }

    const template = templateFn(name)
    const sent = await sendEmail({ to: user.email, ...template })

    return NextResponse.json({
      success: true,
      data: { sent, step, to: user.email },
    })
  } catch (error) {
    console.error('[email/onboarding] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur envoi email' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/onboarding
 * Returns the onboarding sequence status for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Non authentifié' } },
        { status: auth.statusCode }
      )
    }

    const user = await db.user.findUnique({
      where: { email: auth.email! },
      select: { id: true, email: true, name: true, createdAt: true, plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur introuvable' } },
        { status: 404 }
      )
    }

    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const sequence = [
      { day: 0, step: 'welcome', title: 'Bienvenue', sent: daysSinceSignup >= 0 },
      { day: 1, step: 'firstCV', title: 'Premier CV', sent: daysSinceSignup >= 1 },
      { day: 3, step: 'atsTips', title: 'Astuces ATS', sent: daysSinceSignup >= 3 },
      { day: 7, step: 'ecosystem', title: 'Écosystème', sent: daysSinceSignup >= 7 },
      { day: 14, step: 'proOffer', title: 'Offre Pro', sent: daysSinceSignup >= 14 },
    ]

    return NextResponse.json({
      success: true,
      data: {
        user: { email: user.email, name: user.name, plan: user.plan },
        daysSinceSignup,
        sequence,
        nextEmail: sequence.find((s) => !s.sent) || null,
      },
    })
  } catch (error) {
    console.error('[email/onboarding] GET error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur' } },
      { status: 500 }
    )
  }
}
