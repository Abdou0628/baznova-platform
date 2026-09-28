import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { authOptions } from '@/lib/auth'

// GET /api/formation/courses — list all courses (with optional filters)
export async function GET(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const level = searchParams.get('level') || ''
    const duration = searchParams.get('duration') || ''
    const language = searchParams.get('language') || ''
    const search = searchParams.get('search') || ''
    const featured = searchParams.get('featured') === 'true'

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (level) where.level = level
    if (language) where.language = language
    if (featured) where.featured = true
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (duration === 'short') {
      Object.assign(where, { duration: { lt: 5 } })
    } else if (duration === 'medium') {
      Object.assign(where, { duration: { gte: 5, lte: 15 } })
    } else if (duration === 'long') {
      Object.assign(where, { duration: { gt: 15 } })
    }

    const courses = await db.formationCourse.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Formation courses GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

// POST /api/formation/courses — create a course (admin) or seed
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const { title, description, category, level, duration, language, modules, rating, featured, seed } = body

    // Allow seeding (no auth required when seed=true)
    if (seed) {
      // Seed multiple courses
      if (Array.isArray(seed)) {
        const existing = await db.formationCourse.findMany({ select: { id: true } })
        if (existing.length > 0) {
          return NextResponse.json({ message: 'Courses already seeded', count: existing.length })
        }
        const created = []
        for (const c of seed) {
          const course = await db.formationCourse.create({ data: c })
          created.push(course)
        }
        return NextResponse.json({ message: 'Seeded', count: created.length, courses: created })
      }
    }

    // Admin-only course creation
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const course = await db.formationCourse.create({
      data: {
        title,
        description,
        category: category || 'general',
        level: level || 'beginner',
        duration: duration || 0,
        language: language || 'fr',
        modules: modules || '[]',
        rating: rating || 0,
        featured: featured || false,
      },
    })

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Formation courses POST error:', error)
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}
