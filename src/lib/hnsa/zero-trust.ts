/**
 * HNSA — Zero Trust Authorization
 *
 * Every authenticated request must pass:
 * 1. Am I authenticated? (session check)
 * 2. Do I have the right role? (RBAC)
 * 3. Does this resource belong to me? (resource ownership)
 * 4. Is this action allowed for my role? (permission check)
 *
 * @module hnsa/zero-trust
 */

import type { Session } from 'next-auth';
import { db } from '@/lib/db';
import { logAudit, AUDIT_ACTIONS } from './audit';

// ===== Types =====

/** Role values in the HireNova system. */
export type Role = 'candidate' | 'employer' | 'admin';

/** All possible resource-action combinations used in the RBAC matrix. */
export type ResourceAction =
  | 'create'
  | 'read:own'
  | 'read:all'
  | 'update:own'
  | 'update:all'
  | 'delete:own'
  | 'delete:all'
  | 'admin';

/** Defines which resources and actions a given role can access. */
export interface PermissionSet {
  /** List of resource types this role can interact with. `'*'` means all. */
  resources: string[];
  /** List of action patterns this role can perform. `'*'` means all. */
  actions: string[];
  /** Whether this role can access admin-only areas. */
  canAccessAdmin: boolean;
}

// ===== RBAC Permission Matrix =====

/**
 * Role-Based Access Control matrix defining permissions per role.
 *
 * - `candidate`: Can manage own resumes, cover letters, profile, payments, etc.
 * - `employer`: Can manage own job listings, view applications to their jobs, manage recruiters.
 * - `admin`: Full access to everything (`*` wildcard).
 */
export const RBAC_PERMISSIONS: Record<Role, PermissionSet> = {
  candidate: {
    resources: [
      'resume',
      'cover_letter',
      'profile',
      'payment',
      'subscription',
      'application',
      'interview',
      'career',
    ],
    actions: ['create', 'read:own', 'update:own', 'delete:own'],
    canAccessAdmin: false,
  },
  employer: {
    resources: [
      'job_listing',
      'application',
      'profile',
      'payment',
      'subscription',
      'recruiter',
      'company',
    ],
    actions: [
      'create',
      'read:own',
      'update:own',
      'delete:own',
      'read:all_applications_to_my_jobs',
    ],
    canAccessAdmin: false,
  },
  admin: {
    resources: ['*'],
    actions: ['*'],
    canAccessAdmin: true,
  },
};

// ===== Resource Ownership Map =====

/**
 * Maps a resource type string to the Prisma model name and the field that holds
 * the owner user ID. Used by `verifyResourceOwnership`.
 */
const RESOURCE_OWNERSHIP_MAP: Record<
  string,
  { model: string; userField: string }
> = {
  resume:              { model: 'resume',              userField: 'userId' },
  cover_letter:        { model: 'coverLetter',          userField: 'userId' },
  payment:             { model: 'payment',              userField: 'userId' },
  application:         { model: 'application',          userField: 'candidateId' },
  interview_session:   { model: 'interviewSession',     userField: 'userId' },
  linkedin_analysis:   { model: 'linkedInAnalysis',     userField: 'userId' },
  enrollment:          { model: 'enrollment',           userField: 'userId' },
  certification:       { model: 'certification',        userField: 'userId' },
  coach_session:       { model: 'coachSession',         userField: 'userId' },
  coach_goal:          { model: 'coachGoal',            userField: 'userId' },
  freelance_proposal:  { model: 'freelanceProposal',    userField: 'userId' },
  satisfaction_rating: { model: 'satisfactionRating',   userField: 'userId' },
  support_ticket:      { model: 'supportTicket',        userField: 'userId' },
  community_post:      { model: 'communityPost',        userField: 'userId' },
  community_reply:     { model: 'communityReply',       userField: 'userId' },
  mobility_profile:    { model: 'mobilityProfile',      userField: 'userId' },
  referral:            { model: 'referral',             userField: 'referrerId' },
  user_consent:        { model: 'userConsent',          userField: 'userId' },
};

// ===== Functions =====

/**
 * Verify that a specific resource belongs to a given user.
 *
 * Maps the `resourceType` to the correct Prisma model and userId field,
 * then queries the database to confirm ownership.
 *
 * If ownership check fails (resource doesn't exist or belongs to another user),
 * an IDOR attempt is logged to the SecurityAudit table.
 *
 * @param params - Ownership verification parameters.
 * @param params.userId - The ID of the user claiming ownership.
 * @param params.resourceType - The type of resource (e.g. 'resume', 'payment').
 * @param params.resourceId - The ID of the specific resource to check.
 * @returns `true` if the resource belongs to the user, `false` otherwise.
 *
 * @example
 * ```ts
 * const owns = await verifyResourceOwnership({
 *   userId: session.user.id,
 *   resourceType: 'resume',
 *   resourceId: 'clx123...',
 * });
 * if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * ```
 */
export async function verifyResourceOwnership(params: {
  /** The ID of the user claiming ownership. */
  userId: string;
  /** The type of resource (must be a key in RESOURCE_OWNERSHIP_MAP). */
  resourceType: string;
  /** The ID of the specific resource to check. */
  resourceId: string;
}): Promise<boolean> {
  const { userId, resourceType, resourceId } = params;

  const mapping = RESOURCE_OWNERSHIP_MAP[resourceType];
  if (!mapping) {
    // Unknown resource type — fail safe by denying
    return false;
  }

  try {
    const record: Record<string, unknown> = await (db as unknown as Record<string, { findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> }>)[mapping.model].findUnique({
      where: { id: resourceId },
      select: { [mapping.userField]: true },
    });

    if (!record) {
      // Resource doesn't exist — log IDOR attempt
      await logAudit({
        actorId: userId,
        action: AUDIT_ACTIONS.SECURITY.IDOR_ATTEMPT,
        resource: resourceType,
        resourceId,
        outcome: 'denied',
        details: {
          reason: 'resource_not_found',
          claimedUserId: userId,
        },
      });
      return false;
    }

    const ownerField = record[mapping.userField];
    if (!ownerField || ownerField !== userId) {
      // Resource belongs to another user — log IDOR attempt
      await logAudit({
        actorId: userId,
        action: AUDIT_ACTIONS.SECURITY.IDOR_ATTEMPT,
        resource: resourceType,
        resourceId,
        outcome: 'denied',
        details: {
          reason: 'ownership_mismatch',
          claimedUserId: userId,
          actualOwnerId: ownerField,
        },
      });
      return false;
    }

    return true;
  } catch (error) {
    // Fail safe: if DB query errors, deny access
    console.error(
      `[HNSA] verifyResourceOwnership error for ${resourceType}:${resourceId}:`,
      error,
    );
    return false;
  }
}

/**
 * Check if a role has permission for a specific resource + action combination.
 *
 * The `admin` role always returns `{ allowed: true }`.
 * For `candidate` and `employer` roles, this checks:
 * 1. Is the resource in the role's allowed list (or wildcard `*`)?
 * 2. Does the action match (including wildcard `*` and ownership suffixes)?
 *
 * @param params - Permission check parameters.
 * @param params.role - The role to check permissions for.
 * @param params.resource - The resource type being accessed.
 * @param params.action - The action being performed (e.g. 'read:own', 'create').
 * @param params.ownership - Ownership scope: 'own' for own resources, 'all' for all.
 * @returns An object with `allowed` flag and optional `reason` string when denied.
 *
 * @example
 * ```ts
 * const { allowed, reason } = checkPermission({
 *   role: 'candidate',
 *   resource: 'resume',
 *   action: 'read:own',
 * });
 * // { allowed: true }
 * ```
 */
export function checkPermission(params: {
  /** The role to check permissions for. */
  role: string;
  /** The resource type being accessed. */
  resource: string;
  /** The action being performed (e.g. 'read:own', 'create', 'admin'). */
  action: string;
  /** Ownership scope for the action. Defaults to 'own'. */
  ownership?: 'own' | 'all';
}): { allowed: boolean; reason?: string } {
  const { role, resource, action, ownership = 'own' } = params;

  // Admin role bypasses all permission checks
  if (role === 'admin') {
    return { allowed: true };
  }

  const permissionSet = RBAC_PERMISSIONS[role as Role];
  if (!permissionSet) {
    return { allowed: false, reason: `Unknown role: ${role}` };
  }

  // Check if resource is allowed
  const resourceAllowed =
    permissionSet.resources.includes('*') ||
    permissionSet.resources.includes(resource);
  if (!resourceAllowed) {
    return {
      allowed: false,
      reason: `Role '${role}' cannot access resource '${resource}'`,
    };
  }

  // Check if action is allowed
  const actionAllowed =
    permissionSet.actions.includes('*') ||
    permissionSet.actions.includes(action);
  if (!actionAllowed) {
    // Check if the action is an 'all' variant of a permitted 'own' action
    if (ownership === 'all') {
      const ownAction = action.replace(':all', ':own');
      const ownActionAllowed = permissionSet.actions.includes(ownAction);
      if (!ownActionAllowed) {
        return {
          allowed: false,
          reason: `Role '${role}' cannot perform action '${action}' on resource '${resource}'`,
        };
      }
      // 'own' is allowed but 'all' is not — still deny unless explicitly listed
      return {
        allowed: false,
        reason: `Role '${role}' cannot perform '${action}' (only '${ownAction}')`,
      };
    }
    return {
      allowed: false,
      reason: `Role '${role}' cannot perform action '${action}' on resource '${resource}'`,
    };
  }

  return { allowed: true };
}

/**
 * Extract user identity from a NextAuth session.
 *
 * If the session is null or missing a user, returns an unauthenticated result.
 * For the role field, looks up the user in the database since NextAuth session
 * does not include the role by default.
 *
 * @param session - The NextAuth session object (may be null).
 * @returns An object with authentication status and user details.
 *
 * @example
 * ```ts
 * const auth = requireAuth(session);
 * if (!auth.authenticated) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * console.log(auth.userId, auth.role);
 * ```
 */
export async function requireAuth(session: Session | null): Promise<{
  /** Whether the user is authenticated. */
  authenticated: boolean;
  /** The user's ID. Empty string if not authenticated. */
  userId: string;
  /** The user's role (candidate | employer | admin). Empty string if not authenticated. */
  role: string;
  /** The user's email. Empty string if not authenticated. */
  email: string;
}> {
  const unauthenticated = {
    authenticated: false,
    userId: '',
    role: '',
    email: '',
  };

  if (!session?.user?.id) {
    return unauthenticated;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return unauthenticated;
    }

    return {
      authenticated: true,
      userId: user.id,
      role: user.role,
      email: user.email,
    };
  } catch (error) {
    console.error('[HNSA] requireAuth DB lookup failed:', error);
    return unauthenticated;
  }
}

/**
 * Authorize a request using the Zero Trust model.
 *
 * This is the **main function** that API routes should call. It combines all
 * four checks in order:
 *
 * 1. **Authentication** — Is the session valid? (returns 401)
 * 2. **Role check** — Does the user have the required role? (returns 403)
 * 3. **Resource ownership** — Does the resource belong to this user? (returns 404 to avoid leaking existence)
 * 4. **Permission check** — Is this action allowed for the user's role? (returns 403)
 *
 * Admin users skip the role check (unless a specific requiredRole is set)
 * and always pass the ownership and permission checks.
 *
 * @param params - Authorization parameters.
 * @param params.session - The NextAuth session (may be null).
 * @param params.resourceType - The type of resource being accessed.
 * @param params.resourceId - The ID of the specific resource.
 * @param params.action - The action being performed.
 * @param params.requiredRole - Optional. If set, non-admin users must have this exact role.
 * @returns Authorization result with `authorized` flag, `reason`, and HTTP `statusCode`.
 *
 * @example
 * ```ts
 * // In an API route handler:
 * const authz = await authorizeRequest({
 *   session,
 *   resourceType: 'resume',
 *   resourceId: params.id,
 *   action: 'update:own',
 * });
 * if (!authz.authorized) {
 *   return NextResponse.json({ error: authz.reason }, { status: authz.statusCode });
 * }
 * // ... proceed with the request
 * ```
 */
export async function authorizeRequest(params: {
  /** The NextAuth session (may be null). */
  session: Session | null;
  /** The type of resource being accessed (e.g. 'resume', 'payment'). */
  resourceType: string;
  /** The ID of the specific resource. */
  resourceId: string;
  /** The action being performed (e.g. 'read:own', 'update:own', 'delete:own'). */
  action: string;
  /** Optional. If set, non-admin users must have this exact role. */
  requiredRole?: string;
}): Promise<{
  /** Whether the request is fully authorized. */
  authorized: boolean;
  /** Human-readable reason when authorization is denied. */
  reason: string;
  /** Suggested HTTP status code for the denial response. */
  statusCode: number;
}> {
  const { session, resourceType, resourceId, action, requiredRole } = params;

  // ── Step 1: Authentication check ──
  const auth = await requireAuth(session);
  if (!auth.authenticated) {
    return {
      authorized: false,
      reason: 'Authentication required',
      statusCode: 401,
    };
  }

  const { userId, role } = auth;

  // ── Step 2: Role check (if requiredRole is specified) ──
  if (requiredRole && role !== 'admin' && role !== requiredRole) {
    return {
      authorized: false,
      reason: `This action requires the '${requiredRole}' role`,
      statusCode: 403,
    };
  }

  // ── Step 3: Admin bypass ──
  if (role === 'admin') {
    return { authorized: true, reason: '', statusCode: 200 };
  }

  // ── Step 4: Resource ownership check ──
  const ownsResource = await verifyResourceOwnership({
    userId,
    resourceType,
    resourceId,
  });
  if (!ownsResource) {
    // Return 404 instead of 403 to avoid leaking resource existence (IDOR protection)
    return {
      authorized: false,
      reason: 'Resource not found',
      statusCode: 404,
    };
  }

  // ── Step 5: Permission check (RBAC) ──
  const ownership: 'own' | 'all' = action.includes(':all') ? 'all' : 'own';
  const perm = checkPermission({ role, resource: resourceType, action, ownership });
  if (!perm.allowed) {
    return {
      authorized: false,
      reason: perm.reason ?? 'Permission denied',
      statusCode: 403,
    };
  }

  // All checks passed
  return { authorized: true, reason: '', statusCode: 200 };
}
