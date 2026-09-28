import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const assessment = await db.careerAssessment.findUnique({ where: { id } })
      if (!assessment) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ assessment })
    }

    // Get all assessments for the current user (or latest 10 if not logged in)
    const assessments = auth.authorized
      ? await db.careerAssessment.findMany({
          where: { user: { email: auth.email! } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : await db.careerAssessment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        })

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('[career/assessment GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    const body = await req.json()
    const { answers, language } = body

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
    }

    // Derive target role and level from answers
    const domainMap: Record<number, string> = { 0: 'Software Developer', 1: 'Digital Marketer', 2: 'Finance Analyst', 3: 'UX Designer' }
    const levelMap: Record<number, string> = { 0: 'Junior', 1: 'Mid-level', 2: 'Senior', 3: 'Expert' }

    const targetRole = domainMap[answers[0]] || 'Professional'
    const currentLevel = levelMap[answers[1]] || 'Mid-level'

    // Calculate a basic readiness score from answers (0-100)
    const levelScore = [25, 45, 65, 85][answers[1]] ?? 50
    const leadershipScore = [10, 30, 55, 80][answers[4]] ?? 25
    const teamworkScore = [80, 60, 40, 20][answers[6]] ?? 50
    const methodScore = [50, 60, 70, 40][answers[5]] ?? 50
    const toolScore = [35, 40, 60, 50][answers[10]] ?? 40
    const budgetScore = [20, 40, 60, 80][answers[11]] ?? 30
    const score = Math.round(
      (levelScore * 0.25 + leadershipScore * 0.2 + teamworkScore * 0.15 +
       methodScore * 0.15 + toolScore * 0.1 + budgetScore * 0.15)
    )

    // Find user if logged in
    let userId: string | undefined
    if (auth.authorized && auth.email) {
      const user = await db.user.findUnique({ where: { email: auth.email } })
      userId = user?.id
    }

    const assessment = await db.careerAssessment.create({
      data: {
        userId,
        answers: JSON.stringify(answers),
        targetRole,
        currentLevel,
        score,
        language: language || 'fr',
      },
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('[career/assessment POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
