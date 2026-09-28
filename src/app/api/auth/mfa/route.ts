/**
 * HNSA — MFA Management API
 *
 * POST /api/auth/mfa  — action-based dispatch
 *   action=setup   — Generate TOTP secret + otpauth:// URI
 *   action=verify  — Verify TOTP code and enable MFA
 *   action=disable — Disable MFA (requires current TOTP code)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAudit, AUDIT_ACTIONS } from '@/lib/hnsa'
import {
  generateTOTPSecret,
  verifyTOTP,
  generateOTPAuthURI,
} from '@/lib/hnsa/totp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action // 'setup' | 'verify' | 'disable'

    switch (action) {
      case 'setup':
        return handleSetup(request, body)
      case 'verify':
        return handleVerify(request, body)
      case 'disable':
        return handleDisable(request, body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Setup — Generate TOTP secret and otpauth:// URI
// ---------------------------------------------------------------------------

async function handleSetup(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.mfaEnabled) {
    return NextResponse.json(
      { error: 'MFA already enabled. Disable first to reconfigure.' },
      { status: 400 },
    )
  }

  // Generate a new TOTP secret
  const secret = generateTOTPSecret()
  const otpauthUri = generateOTPAuthURI(secret, user.email)

  // Store the secret but keep MFA disabled until the user verifies a code
  await db.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret },
  })

  return NextResponse.json({ secret, otpauthUri })
}

// ---------------------------------------------------------------------------
// Verify — Confirm a TOTP code and enable MFA
// ---------------------------------------------------------------------------

async function handleVerify(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = body.code as string | undefined
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: 'A valid 6-digit code is required.' },
      { status: 400 },
    )
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
  })

  if (!user || !user.mfaSecret) {
    return NextResponse.json(
      { error: 'No MFA secret found. Run setup first.' },
      { status: 400 },
    )
  }

  if (user.mfaEnabled) {
    return NextResponse.json(
      { error: 'MFA is already enabled.' },
      { status: 400 },
    )
  }

  if (!verifyTOTP(user.mfaSecret, code)) {
    return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 401 })
  }

  // Enable MFA
  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  })

  // Audit log
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: session.user.role as string,
    action: AUDIT_ACTIONS.AUTH.MFA_ENABLED,
    resource: 'user',
    resourceId: user.id,
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent'),
    path: '/api/auth/mfa',
    method: 'POST',
    outcome: 'success',
  })

  return NextResponse.json({ enabled: true })
}

// ---------------------------------------------------------------------------
// Disable — Verify current code then disable MFA
// ---------------------------------------------------------------------------

async function handleDisable(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = body.code as string | undefined
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: 'A valid 6-digit code is required.' },
      { status: 400 },
    )
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json(
      { error: 'MFA is not enabled.' },
      { status: 400 },
    )
  }

  if (!verifyTOTP(user.mfaSecret, code)) {
    return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 401 })
  }

  // Disable MFA and clear secret
  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  })

  // Audit log
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: session.user.role as string,
    action: AUDIT_ACTIONS.AUTH.MFA_DISABLED,
    resource: 'user',
    resourceId: user.id,
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent'),
    path: '/api/auth/mfa',
    method: 'POST',
    outcome: 'success',
  })

  return NextResponse.json({ enabled: false })
}
