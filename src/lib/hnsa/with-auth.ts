/**
 * HNSA — Auth Route Wrapper
 * 
 * Helper to wrap authenticated API routes with HNSA Zero Trust authorization.
 * Usage in route handlers:
 * 
 *   const auth = await withAuth(req, { resourceType: 'resume', resourceId: body.resumeId, action: 'update:own' });
 *   if (!auth.authorized) return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode });
 *   // auth.userId, auth.role, auth.email available
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authorizeRequest } from './zero-trust';
import type { Session } from 'next-auth';

interface WithAuthOptions {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  requiredRole?: string;
}

export async function withAuth(
  request: NextRequest,
  options: WithAuthOptions = {}
): Promise<{
  authorized: boolean;
  reason: string;
  statusCode: number;
  session: Session | null;
  userId?: string;
  role?: string;
  email?: string;
}> {
  const session = await getServerSession();
  
  if (!options.resourceType || !options.resourceId) {
    // Simple auth check (no resource ownership)
    if (!session?.user?.email) {
      return { authorized: false, reason: 'Authentication required', statusCode: 401, session: null };
    }
    return {
      authorized: true,
      reason: 'OK',
      statusCode: 200,
      session,
      userId: session.user.id as string,
      role: (session.user as Record<string, unknown>).role as string,
      email: session.user.email,
    };
  }

  const result = await authorizeRequest({
    session,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    action: options.action || 'read:own',
    requiredRole: options.requiredRole,
  });

  return {
    authorized: result.authorized,
    reason: result.reason,
    statusCode: result.statusCode,
    session,
    userId: session?.user?.id as string | undefined,
    role: (session?.user as Record<string, unknown>).role as string | undefined,
    email: session?.user?.email,
  };
}
