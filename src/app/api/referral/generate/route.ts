import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateReferralAgreement } from '@/lib/documents'
import { withAuth } from '@/lib/hnsa'

/**
 * Generate referral code and auto-generate referral agreement (contrat de parrainage)
 * with HireNova logo + electronic signature.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const userId = auth.userId

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur introuvable' } },
        { status: 404 }
      )
    }

    let code = user.referralCode

    if (!code) {
      const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
      code = `HN-${shortId}`

      let attempts = 0
      while (attempts < 10) {
        const existing = await db.user.findUnique({ where: { referralCode: code } })
        if (!existing) break
        code = `HN-${shortId}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
        attempts++
      }

      await db.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
    }

    const origin = req.headers.get('origin') || 'https://hirenova.app'
    const shareUrl = `${origin}/?ref=${code}`

    // Auto-generate referral agreement (contrat de parrainage)
    let agreement = null
    try {
      // Check if user already has a referral agreement
      const existingAgreement = await db.document.findFirst({
        where: {
          userId,
          type: 'referral_agreement',
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!existingAgreement) {
        agreement = await generateReferralAgreement({
          userId,
          userName: user.name || 'Utilisateur',
          userEmail: user.email,
          referralCode: code,
          rewardType: 'FREE_MONTH',
          rewardValue: '1',
        })
        console.log(`[referral/generate] Agreement ${agreement.number} generated for user ${userId}`)
      } else {
        agreement = { id: existingAgreement.id, number: existingAgreement.number }
      }
    } catch (agreementErr) {
      console.error('[referral/generate] Agreement generation failed:', agreementErr instanceof Error ? agreementErr.message : agreementErr)
      // Don't block — user can still get their code
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode: code,
        shareUrl,
        shareLinks: {
          whatsapp: `https://wa.me/?text=${encodeURIComponent("Découvrez HireNova — Générez des CV professionnels avec l'IA ! Utilisez mon code de parrainage : " + code + "\n\n" + shareUrl)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Découvrez @HireNova — CV IA professionnel en 60 secondes !")}&url=${encodeURIComponent(shareUrl)}`,
          email: `mailto:?subject=${encodeURIComponent('Invitation à rejoindre HireNova')}&body=${encodeURIComponent("Salut !\n\nDécouvre HireNova, la plateforme qui génère des CV professionnels avec l'IA.\n\nMon code de parrainage : " + code + "\n\n" + shareUrl)}`,
        },
        agreement: agreement ? {
          number: agreement.number,
          downloadUrl: `/api/documents/${agreement.id}`,
        } : null,
      },
    })
  } catch (error) {
    console.error('[Referral Generate Error]', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 }
    )
  }
}
