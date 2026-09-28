import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgName, orgType, contactName, email, phone, country, website, plan, message } = body

    if (!orgName?.trim() || !contactName?.trim() || !email?.trim()) {
      return NextResponse.json({ success: false, error: 'Nom de l\'organisation, contact et email requis.' }, { status: 400 })
    }

    await db.communityInquiry.create({
      data: {
        orgName: orgName.trim(),
        orgType: orgType || 'enterprise',
        contactName: contactName.trim(),
        workEmail: email.trim(),
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        website: website?.trim() || null,
        plan: plan || 'community_partner',
        message: message?.trim() || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[community] inquiry error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
