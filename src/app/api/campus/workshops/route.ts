import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

const SEED_WORKSHOPS = [
  {
    title: 'AI-Powered Resume Building Masterclass',
    description: 'Learn how to leverage AI tools to create ATS-optimized resumes that stand out. Hands-on workshop with real examples.',
    speaker: 'Dr. Sarah Chen',
    date: '2026-02-15T10:00:00.000Z',
    duration: 90,
    capacity: 150,
    registeredCount: 87,
    type: 'workshop',
    language: 'EN',
    status: 'upcoming',
  },
  {
    title: "Construire un CV parfait avec l'IA",
    description: "Atelier pratique pour créer des CV optimisés ATS en utilisant les outils d'intelligence artificielle les plus récents.",
    speaker: 'Prof. Marc Dubois',
    date: '2026-02-20T14:00:00.000Z',
    duration: 120,
    capacity: 200,
    registeredCount: 134,
    type: 'workshop',
    language: 'FR',
    status: 'upcoming',
  },
  {
    title: 'بناء السيرة الذاتية باستخدام الذكاء الاصطناعي',
    description: 'ورشة عمل تفاعلية حول استخدام أدوات الذكاء الاصطناعي في إنشاء سير ذاتية احترافية ومحسنة لأنظمة ATS.',
    speaker: 'د. فاطمة الزهراء',
    date: '2026-03-01T10:00:00.000Z',
    duration: 90,
    capacity: 120,
    registeredCount: 65,
    type: 'webinar',
    language: 'AR',
    status: 'upcoming',
  },
  {
    title: 'Carrera Profesional en la Era de la IA',
    description: 'Taller intensivo sobre cómo la inteligencia artificial está transformando el mercado laboral y cómo prepararse.',
    speaker: 'Lic. Ana García',
    date: '2025-12-10T16:00:00.000Z',
    duration: 60,
    capacity: 180,
    registeredCount: 180,
    type: 'bootcamp',
    language: 'ES',
    status: 'completed',
  },
]

async function seedIfEmpty() {
  const count = await db.campusWorkshop.count()
  if (count > 0) return

  for (const w of SEED_WORKSHOPS) {
    await db.campusWorkshop.create({ data: w })
  }
  console.log('[campus/workshops] Seeded 4 demo workshops')
}

// GET /api/campus/workshops
export async function GET() {
  try {
    await seedIfEmpty()
    const workshops = await db.campusWorkshop.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json({ success: true, data: workshops })
  } catch (error) {
    console.error('[campus/workshops] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch workshops' }, { status: 500 })
  }
}

// POST /api/campus/workshops — Create
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { title, description, speaker, date, duration, capacity, type, language, status } = body
    if (!title?.trim() || !date) {
      return NextResponse.json({ success: false, error: 'Title and date required' }, { status: 400 })
    }
    const ws = await db.campusWorkshop.create({
      data: {
        title: title.trim(),
        description: description || '',
        speaker: speaker || '',
        date: new Date(date),
        duration: typeof duration === 'number' ? duration : 60,
        capacity: typeof capacity === 'number' ? capacity : 100,
        type: type || 'workshop',
        language: language || '',
        status: status || 'upcoming',
      },
    })
    return NextResponse.json({ success: true, data: ws })
  } catch (error) {
    console.error('[campus/workshops] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create workshop' }, { status: 500 })
  }
}

// PUT /api/campus/workshops?id=xxx — Update
export async function PUT(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })

    const body = await req.json()
    const { title, description, speaker, date, duration, capacity, type, language, status } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = String(title).trim()
    if (description !== undefined) data.description = String(description)
    if (speaker !== undefined) data.speaker = String(speaker)
    if (date !== undefined) data.date = new Date(date)
    if (duration !== undefined) data.duration = Number(duration)
    if (capacity !== undefined) data.capacity = Number(capacity)
    if (type !== undefined) data.type = String(type)
    if (language !== undefined) data.language = String(language)
    if (status !== undefined) data.status = String(status)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    const ws = await db.campusWorkshop.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: ws })
  } catch (error) {
    console.error('[campus/workshops] PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update workshop' }, { status: 500 })
  }
}

// PATCH /api/campus/workshops?id=xxx — Register
export async function PATCH(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })

    const body = await req.json()
    if (body.action === 'register') {
      const ws = await db.campusWorkshop.findUnique({ where: { id }, select: { registeredCount: true, capacity: true } })
      if (!ws) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      if (ws.registeredCount >= ws.capacity) {
        return NextResponse.json({ success: false, error: 'Workshop is full' }, { status: 400 })
      }
      const updated = await db.campusWorkshop.update({
        where: { id },
        data: { registeredCount: { increment: 1 } },
      })
      return NextResponse.json({ success: true, data: updated })
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[campus/workshops] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/campus/workshops?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    await db.campusWorkshop.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[campus/workshops] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete workshop' }, { status: 500 })
  }
}
