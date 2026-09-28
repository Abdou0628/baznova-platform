import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

const SEED_UNIVERSITIES = [
  { name: 'Université Mohammed VI Polytechnique', country: 'Morocco', programs: '[["Engineering","AI & Data Science","Computer Science"]]', studentCount: 8500, status: 'active', contactEmail: 'partnerships@um6p.ma' },
  { name: 'Sorbonne Université', country: 'France', programs: '[["Computer Science","Mathematics","Physics"]]', studentCount: 55000, status: 'active', contactEmail: 'campus@sorbonne-universite.fr' },
  { name: 'University of Barcelona', country: 'Spain', programs: '[["Business","Engineering","Data Science"]]', studentCount: 63000, status: 'active', contactEmail: 'rel.internacionales@ub.edu' },
  { name: 'University of Toronto', country: 'Canada', programs: '[["Computer Science","AI","Engineering"]]', studentCount: 95000, status: 'active', contactEmail: 'partnerships@utoronto.ca' },
  { name: 'University of London', country: 'United Kingdom', programs: '[["Business","Law","Data Analytics"]]', studentCount: 120000, status: 'pending', contactEmail: 'campus@london.ac.uk' },
]

async function seedIfEmpty() {
  // FIX: Remplacé $queryRawUnsafe par db.campusUniversity.count() — pas de concaténation SQL
  const count = await db.campusUniversity.count()
  if (count > 0) return

  for (const u of SEED_UNIVERSITIES) {
    // FIX: Remplacé $executeRawUnsafe par db.campusUniversity.create() — paramètres bindés par Prisma
    await db.campusUniversity.create({
      data: {
        name: u.name,
        country: u.country,
        programs: u.programs,
        studentCount: u.studentCount,
        status: u.status,
        contactEmail: u.contactEmail,
      },
    })
  }
  console.log('[campus/universities] Seeded 5 demo universities')
}

// GET /api/campus/universities
export async function GET() {
  try {
    await seedIfEmpty()
    // FIX: Remplacé $queryRawUnsafe par db.campusUniversity.findMany() — aucun SQL brut
    const unis = await db.campusUniversity.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: unis })
  } catch (error) {
    console.error('[campus/universities] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch universities' }, { status: 500 })
  }
}

// POST /api/campus/universities — Create
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { name, country, programs, studentCount, status, contactEmail } = body
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }
    const programsStr = typeof programs === 'string' ? programs : JSON.stringify(programs || [])

    // FIX: Remplacé $queryRawUnsafe par db.campusUniversity.create() — les données utilisateur
    // sont passées comme paramètres bindés via Prisma, éliminant toute injection SQL.
    // L'ancien code faisait : template literal + replace(/'/g, "''") qui est insuffisant.
    const uni = await db.campusUniversity.create({
      data: {
        name: name.trim(),
        country: country || '',
        programs: programsStr,
        studentCount: typeof studentCount === 'number' ? studentCount : 0,
        status: status || 'active',
        contactEmail: contactEmail || '',
      },
    })
    return NextResponse.json({ success: true, data: uni })
  } catch (error) {
    console.error('[campus/universities] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create university' }, { status: 500 })
  }
}

// PUT /api/campus/universities?id=xxx — Update
export async function PUT(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })

    const body = await req.json()
    const { name, country, programs, studentCount, status, contactEmail } = body

    // FIX: Construit un objet de mise à jour typé au lieu de concaténer des fragments SQL.
    // L'ancien code construisait dynamiquement `SET name = '...', country = '...'`
    // avec des remplacements manuels d'apostrophes — vulnérable à l'injection SQL.
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (country !== undefined) updateData.country = country || ''
    if (programs !== undefined) updateData.programs = typeof programs === 'string' ? programs : JSON.stringify(programs)
    if (studentCount !== undefined) updateData.studentCount = studentCount
    if (status !== undefined) updateData.status = status
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail || ''

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    // FIX: Remplacé $queryRawUnsafe par db.campusUniversity.update() — Prisma bind automatiquement
    // les paramètres. L'ancien code injectait directement `id` et chaque valeur dans la requête SQL.
    const uni = await db.campusUniversity.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, data: uni })
  } catch (error) {
    console.error('[campus/universities] PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update university' }, { status: 500 })
  }
}

// DELETE /api/campus/universities?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })

    // FIX: Remplacé $executeRawUnsafe par db.campusUniversity.delete() — l'id est passé
    // via Prisma qui utilise des requêtes paramétrées. L'ancien code faisait :
    // `DELETE FROM ... WHERE id = '${id}'` — injection directe du paramètre utilisateur.
    await db.campusUniversity.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[campus/universities] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete university' }, { status: 500 })
  }
}

export async function PATCH() {
  return NextResponse.json({ success: true, message: 'Already seeded' })
}