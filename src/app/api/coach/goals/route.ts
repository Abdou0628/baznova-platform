import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/hnsa'

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const goals = await db.coachGoal.findMany({
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Coach goals GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { title, description, category, priority, deadline, language } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Generate AI action steps for the goal
    const zai = new ZAI()
    const langMap: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }
    const userLanguage = language || 'fr'

    const actionMessages = [
      {
        role: 'system',
        content: `You are a career coach. Generate 3-5 concise, actionable steps for achieving this career goal. Reply in ${langMap[userLanguage] || userLanguage}. Return ONLY a JSON array of strings, no other text. Example: ["Step 1 description", "Step 2 description"]`,
      },
      {
        role: 'user',
        content: `Goal: ${title}${description ? `\nDescription: ${description}` : ''}${category ? `\nCategory: ${category}` : ''}`,
      },
    ]

    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: actionMessages,
      temperature: 0.6,
      max_tokens: 200,
    })

    let actionSteps: string[] = ['Research and plan your approach', 'Set milestones with deadlines', 'Seek mentorship or guidance']
    try {
      const raw = res.choices?.[0]?.message?.content?.trim() || ''
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) actionSteps = parsed.slice(0, 5)
    } catch {
      // fallback to defaults
    }

    const goal = await db.coachGoal.create({
      data: {
        title: title.trim(),
        description: (description || '').trim(),
        category: category || 'general',
        priority: priority || 'medium',
        deadline: deadline ? new Date(deadline) : null,
        actionSteps: JSON.stringify(actionSteps),
      },
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Coach goals POST error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { id, title, description, category, priority, deadline, progress, completed } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (priority !== undefined) updateData.priority = priority
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress))
    if (completed !== undefined) {
      updateData.completed = completed
      if (completed) updateData.progress = 100
    }

    const goal = await db.coachGoal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Coach goals PUT error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.coachGoal.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Coach goals DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
