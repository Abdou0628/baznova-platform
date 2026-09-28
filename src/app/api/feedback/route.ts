import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, message, rating, userId, email, page } = body

    // Validate required fields
    if (!category || !message) {
      return NextResponse.json(
        { error: 'Category and message are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['bug', 'feature', 'general', 'ux']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: bug, feature, general, ux' },
        { status: 400 }
      )
    }

    // Validate message length
    if (typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      const r = Number(rating)
      if (isNaN(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
        return NextResponse.json(
          { error: 'Rating must be an integer between 1 and 5' },
          { status: 400 }
        )
      }
    }

    const feedback = await db.betaFeedback.create({
      data: {
        userId: userId || null,
        email: email || null,
        category,
        message: message.trim(),
        rating: rating ? Number(rating) : null,
        page: page || null,
        status: 'new',
      },
    })

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 })
  } catch (error) {
    console.error('[feedback] Error saving feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
