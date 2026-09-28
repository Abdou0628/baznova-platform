import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { db } from '@/lib/db'

// GET — Return user notifications with unread count
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const userId = auth.userId!

    const [notifications, unreadCount] = await Promise.all([
      db.jobNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.jobNotification.count({
        where: { userId, isRead: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}

// PATCH — Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const userId = auth.userId!
    const body = await request.json()

    if (body.markAll) {
      // Mark ALL as read
      await db.jobNotification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, data: { updated: true } })
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Mark specific IDs as read
      await db.jobNotification.updateMany({
        where: { id: { in: body.ids }, userId },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, data: { updated: true } })
    }

    return NextResponse.json(
      { success: false, error: { code: 400, message: 'Paramètres invalides' } },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    )
  }
}
