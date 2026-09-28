import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { withAuth, forwardToSIEM, createSIEMEvent } from '@/lib/hnsa'
import { encryptBeforeWrite, decryptAfterRead } from '@/lib/hnsa/encryption-middleware'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }
    const userId = auth.userId!

    const body = await request.json()
    const { name, companyName, industry, companyWebsite, image } = body as {
      name?: string
      companyName?: string
      industry?: string
      companyWebsite?: string
      image?: string
    }

    // Validate
    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Nom invalide (2-100 caractères)' } },
        { status: 400 }
      )
    }

    const updateData: Record<string, string> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (companyName !== undefined) updateData.companyName = companyName.trim()
    if (industry !== undefined) updateData.industry = industry.trim()
    if (companyWebsite !== undefined) updateData.companyWebsite = companyWebsite.trim()
    if (image !== undefined) updateData.image = image

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Aucune modification' } },
        { status: 400 }
      )
    }

    // Encrypt sensitive fields before writing
    let encryptedData: Record<string, string>
    try {
      encryptedData = encryptBeforeWrite(updateData)
    } catch (encErr) {
      forwardToSIEM(createSIEMEvent({
        type: 'FIELD_ENCRYPTION_ERROR',
        severity: 'critical',
        path: '/api/user/profile',
        userId,
        metadata: { error: encErr instanceof Error ? encErr.message : String(encErr) },
      })).catch(() => {})
      encryptedData = updateData
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: encryptedData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        companyName: true,
        industry: true,
        companyWebsite: true,
        plan: true,
        role: true,
        updatedAt: true,
      },
    })

    // Decrypt sensitive fields after reading
    const decrypted = decryptAfterRead(updated as unknown as Record<string, any>)

    return NextResponse.json({ success: true, data: decrypted })
  } catch (error) {
    console.error('[user/profile] Update error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne' } },
      { status: 500 }
    )
  }
}
