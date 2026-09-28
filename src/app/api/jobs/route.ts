import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '9')
    const keyword = searchParams.get('keyword') || ''
    const location = searchParams.get('location') || ''
    const type = searchParams.get('type') || ''
    const remote = searchParams.get('remote') === 'true'

    const where: any = { status: 'active' }
    if (keyword) where.title = { contains: keyword }
    if (location) where.location = { contains: location }
    if (type) where.type = type
    if (remote) where.isRemote = true

    const [jobs, total] = await Promise.all([
      db.jobListing.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      db.jobListing.count({ where })
    ])

    return NextResponse.json({ success: true, data: { jobs, total, page, limit } })
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur serveur' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ success: false, error: { code: 401, message: 'Auth requis' } }, { status: auth.statusCode })

    const user = await db.user.findUnique({ where: { email: auth.email! } })
    if (!user || user.role !== 'employer') return NextResponse.json({ success: false, error: { code: 403, message: 'Compte employeur requis' } }, { status: 403 })

    const body = await request.json()
    const { title, company, location, country, type, salaryMin, salaryMax, currency, description, requirements, skills, language, isRemote, isPaid } = body

    if (!title || !company || !description) return NextResponse.json({ success: false, error: { code: 400, message: 'Champs requis manquants' } }, { status: 400 })

    const job = await db.jobListing.create({
      data: {
        employerId: user.id, title, company: company || user.companyName || '', location: location || '', country: country || 'Maroc',
        type: type || 'CDI', salaryMin: salaryMin ? Number(salaryMin) : null, salaryMax: salaryMax ? Number(salaryMax) : null,
        currency: currency || 'MAD', description, requirements: requirements || '', skills: skills || '', language: language || 'fr',
        isRemote: !!isRemote, isPaid: !!isPaid
      }
    })

    // Auto-trigger candidate matching for subscribed employers
    if (user.plan && user.plan !== 'free') {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        fetch(`${baseUrl}/api/jobs/match-candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id })
        }).catch(() => { /* silent — matching is async best-effort */ })
      } catch { /* silent */ }
    }

    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 500, message: 'Erreur serveur' } }, { status: 500 })
  }
}
