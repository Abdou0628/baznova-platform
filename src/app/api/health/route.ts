import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface CheckResult {
  status: 'up' | 'down';
  responseTime?: string;
  reason?: string;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // ── 1. Database connectivity ──
  const dbStart = Date.now();
  try {
    await db.user.count();
    checks.database = {
      status: 'up',
      responseTime: `${Date.now() - dbStart}ms`,
    };
  } catch (err: any) {
    checks.database = {
      status: 'down',
      responseTime: `${Date.now() - dbStart}ms`,
      reason: err?.message ?? 'Database query failed',
    };
  }

  // ── 2. AI availability (z-ai-web-dev-sdk import check) ──
  try {
    await import('z-ai-web-dev-sdk');
    checks.ai = { status: 'up' };
  } catch {
    checks.ai = { status: 'down', reason: 'z-ai-web-dev-sdk not importable' };
  }

  // ── 3. Stripe configuration ──
  const stripeKey = processEnv('STRIPE_SECRET_KEY');
  if (stripeKey && stripeKey.startsWith('sk_')) {
    checks.stripe = { status: 'up' };
  } else {
    checks.stripe = {
      status: 'down',
      reason: stripeKey
        ? 'STRIPE_SECRET_KEY does not start with sk_'
        : 'STRIPE_SECRET_KEY not configured',
    };
  }

  // ── 4. SMTP configuration ──
  const smtpHost = processEnv('SMTP_HOST');
  const smtpPass = processEnv('SMTP_PASS');
  if (smtpHost && smtpPass) {
    checks.smtp = { status: 'up' };
  } else {
    const missing: string[] = [];
    if (!smtpHost) missing.push('SMTP_HOST');
    if (!smtpPass) missing.push('SMTP_PASS');
    checks.smtp = {
      status: 'down',
      reason: `${missing.join(' and ')} not configured`,
    };
  }

  // ── 5. Determine overall status ──
  const dbDown = checks.database.status === 'down';
  const nonCriticalDown = ['stripe', 'smtp'].some(
    (k) => checks[k]?.status === 'down',
  );

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (dbDown) {
    status = 'unhealthy';
  } else if (nonCriticalDown) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  // ── 6. Build response ──
  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
    system: {
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    },
  };

  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}

/** Safe env accessor – returns empty string when undefined */
function processEnv(key: string): string {
  return process.env[key] ?? '';
}
