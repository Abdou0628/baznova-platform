import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from '@/lib/hnsa';

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: auth.statusCode }
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        cvCountThisMonth: true,
        clCountThisMonth: true,
        lastResetMonth: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}