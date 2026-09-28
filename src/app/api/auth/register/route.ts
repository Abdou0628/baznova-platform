import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { scanInput, sanitizeString, logSecurityEvent } from "@/lib/security";
import { scheduleOnboardingEmails, sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import type { CVLanguage } from "@/lib/i18n";

function getClientIP(request: Request): string {
  const headers = request.headers as Record<string, string | null>;
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = headers["x-real-ip"];
  if (realIP) return realIP;
  return "127.0.0.1";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, language } = body;

    // Input sanitization & security scan
    if (email) {
      const scanResult = scanInput(email);
      if (!scanResult.isClean) {
        await logSecurityEvent({
          type: scanResult.sqlInjection ? "sql_injection_attempt" : "xss_attempt",
          severity: "high",
          ip: getClientIP(request),
          path: "/api/auth/register",
          method: "POST",
          userAgent: request.headers.get("user-agent") || undefined,
          email: email.toLowerCase().trim(),
          details: { field: "email", sqlInjection: scanResult.sqlInjection, xss: scanResult.xss },
        }).catch(() => {});
        return NextResponse.json(
          { success: false, error: "Invalid input detected" },
          { status: 400 }
        );
      }
    }

    if (name) {
      const scanResult = scanInput(name);
      if (!scanResult.isClean) {
        await logSecurityEvent({
          type: scanResult.sqlInjection ? "sql_injection_attempt" : "xss_attempt",
          severity: "high",
          ip: getClientIP(request),
          path: "/api/auth/register",
          method: "POST",
          userAgent: request.headers.get("user-agent") || undefined,
          email: email?.toLowerCase().trim(),
          details: { field: "name", sqlInjection: scanResult.sqlInjection, xss: scanResult.xss },
        }).catch(() => {});
        return NextResponse.json(
          { success: false, error: "Invalid input detected" },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name && (name.trim().length < 2 || name.trim().length > 100)) {
      return NextResponse.json(
        { success: false, error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    // Rate limit: max 5 registrations per IP per hour
    const clientIP = getClientIP(request);
    const regRateLimit = await rateLimit(`register:${clientIP}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
    if (!regRateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Normalize email (before rate limit check)
    const normalizedEmail = sanitizeString(email.toLowerCase().trim());

    // Rate limit: max 3 registrations per email per hour
    const emailRateLimit = await rateLimit(`register-email:${normalizedEmail}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
    if (!emailRateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many attempts with this email. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name ? sanitizeString(name.trim()) : null,
        password: hashedPassword,
      },
    });

    // Trigger full onboarding email sequence (J0 welcome sent immediately, J1/J3/J7/J14 scheduled)
    const displayName = user.name || user.email.split("@")[0];
    scheduleOnboardingEmails(user.id, user.email, displayName).catch((err) => {
      console.error("[register] onboarding sequence failed:", err instanceof Error ? err.message : String(err));
    });

    // Send email verification link
    const { randomUUID } = await import('crypto');
    const verificationToken = randomUUID();
    const verificationTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await db.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpires },
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';
    const userLang: CVLanguage = language && ['fr', 'en', 'ar', 'es'].includes(language) ? language : 'fr';
    sendVerificationEmail(user.email, displayName, userLang, verificationToken, siteUrl).catch((err) => {
      console.error('[register] verification email failed:', err instanceof Error ? err.message : String(err));
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
