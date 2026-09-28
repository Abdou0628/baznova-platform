import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const job = await db.jobListing.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ success: false, error: { code: 404, message: 'Offre non trouvée' } }, { status: 404 })
    await db.jobListing.update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    return NextResponse.json({ success: true, data: { ...job, viewsCount: job.viewsCount + 1 } })
  } catch {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur' } }, { status: 500 })
  }
}
