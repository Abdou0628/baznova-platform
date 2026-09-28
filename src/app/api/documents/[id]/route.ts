import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

/**
 * GET /api/documents/[id]
 * Admin: download the PDF (returns binary).
 * Authenticated user: download their own document (if userId matches).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await withAuth(request, { resourceType: 'resume', resourceId: id, action: 'read:own' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }
    if (!doc.pdfBase64) {
      return NextResponse.json({ error: 'PDF non généré' }, { status: 404 })
    }

    const pdfBuffer = Buffer.from(doc.pdfBase64, 'base64')

    const typeLabels: Record<string, string> = {
      invoice: 'facture',
      quote: 'devis',
      agreement: 'contrat',
      receipt: 'recu',
      credit_note: 'avoir',
    }
    const filename = `${typeLabels[doc.type] || 'document'}-${doc.number}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[documents/[id]] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
