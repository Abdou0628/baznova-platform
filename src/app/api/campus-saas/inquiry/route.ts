import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { institutionName, institutionType, contactName, workEmail, phone, country, website, studentsCount, plan, interestWhiteLabel, message } = body

    if (!institutionName?.trim() || !contactName?.trim() || !workEmail?.trim()) {
      return NextResponse.json({ success: false, error: 'Nom de l\'établissement, contact et email requis.' }, { status: 400 })
    }

    await db.campusInquiry.create({
      data: {
        institutionName: institutionName.trim(),
        institutionType: institutionType || 'university',
        contactName: contactName.trim(),
        workEmail: workEmail.trim(),
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        website: website?.trim() || null,
        studentsCount: studentsCount || null,
        plan: plan || 'campus_start',
        interestWhiteLabel: Boolean(interestWhiteLabel),
        message: message?.trim() || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[campus-saas] inquiry error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
