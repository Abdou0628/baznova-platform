/**
 * BazNova Security Architecture (HNSA) — Zero Trust Access Control
 *
 * Implements CTO Pillar #2: Zero Trust
 *
 * Key principle: "L'utilisateur est connecté, donc il peut tout faire" is WRONG.
 * Every request must be authorized, regardless of authentication state.
 *
 * Flow:
 *   User → Authenticated? → Has permission? → Resource belongs to user? → Action allowed
 *
 * CTO: Protection against Broken Access Control (OWASP #1)
 * CTO: Protection against IDOR/BOLA
 */

// ─── Permission Types ──────────────────────────────────────────────────────

export type Permission =
  | 'cv:read'
  | 'cv:create'
  | 'cv:update'
  | 'cv:delete'
  | 'cv:export'
  | 'document:read'
  | 'document:create'
  | 'document:delete'
  | 'ats:analyze'
  | 'letter:generate'
  | 'linkedin:analyze'
  | 'interview:access'
  | 'career:access'
  | 'coach:access'
  | 'formation:access'
  | 'jobs:read'
  | 'jobs:create'
  | 'jobs:apply'
  | 'freelance:read'
  | 'freelance:create'
  | 'admin:read'
  | 'admin:write'
  | 'admin:users'
  | 'admin:stats'
  | 'api:access'
  | 'billing:read'
  | 'billing:manage'
  | 'profile:read'
  | 'profile:update'
  | 'referral:read'
  | 'referral:create'

// ─── Plan → Permission Mapping ─────────────────────────────────────────────

const PLAN_PERMISSIONS: Record<string, Permission[]> = {
  free: [
    'cv:read', 'cv:create',
    'document:read',
    'jobs:read', 'jobs:apply',
    'freelance:read',
    'profile:read', 'profile:update',
    'referral:read', 'referral:create',
    'billing:read',
  ],
  starter: [
    'cv:read', 'cv:create',
    'document:read', 'document:create',
    'ats:analyze',
    'letter:generate',
    'jobs:read', 'jobs:apply',
    'freelance:read',
    'profile:read', 'profile:update',
    'referral:read', 'referral:create',
    'billing:read',
    'api:access',
  ],
  pro: [
    'cv:read', 'cv:create', 'cv:update', 'cv:delete', 'cv:export',
    'document:read', 'document:create', 'document:delete',
    'ats:analyze',
    'letter:generate',
    'linkedin:analyze',
    'interview:access',
    'career:access',
    'coach:access',
    'formation:access',
    'jobs:read', 'jobs:create', 'jobs:apply',
    'freelance:read', 'freelance:create',
    'profile:read', 'profile:update',
    'referral:read', 'referral:create',
    'billing:read',
    'api:access',
  ],
  career_plus: [
    'cv:read', 'cv:create', 'cv:update', 'cv:delete', 'cv:export',
    'document:read', 'document:create', 'document:delete',
    'ats:analyze',
    'letter:generate',
    'linkedin:analyze',
    'interview:access',
    'career:access',
    'coach:access',
    'formation:access',
    'jobs:read', 'jobs:create', 'jobs:apply',
    'freelance:read', 'freelance:create',
    'profile:read', 'profile:update',
    'referral:read', 'referral:create',
    'billing:read',
    'api:access',
  ],
  employer: [
    'cv:read',
    'jobs:read', 'jobs:create',
    'freelance:read', 'freelance:create',
    'profile:read', 'profile:update',
    'billing:read',
  ],
  enterprise: [
    // All permissions
  ],
  annual: [
    'cv:read', 'cv:create', 'cv:update', 'cv:delete', 'cv:export',
    'document:read', 'document:create', 'document:delete',
    'ats:analyze',
    'letter:generate',
    'linkedin:analyze',
    'interview:access',
    'career:access',
    'coach:access',
    'formation:access',
    'jobs:read', 'jobs:create', 'jobs:apply',
    'freelance:read', 'freelance:create',
    'profile:read', 'profile:update',
    'referral:read', 'referral:create',
    'billing:read',
    'api:access',
  ],
  api: [
    'api:access',
    'billing:read',
    'profile:read',
  ],
}

const ADMIN_PERMISSIONS: Permission[] = [
  'admin:read', 'admin:write', 'admin:users', 'admin:stats',
  'cv:read', 'cv:create', 'cv:update', 'cv:delete', 'cv:export',
  'document:read', 'document:create', 'document:delete',
  'ats:analyze', 'letter:generate', 'linkedin:analyze',
  'interview:access', 'career:access', 'coach:access', 'formation:access',
  'jobs:read', 'jobs:create', 'jobs:apply',
  'freelance:read', 'freelance:create',
  'profile:read', 'profile:update',
  'billing:read', 'billing:manage',
  'api:access', 'referral:read', 'referral:create',
]

// ─── Access Control Functions ───────────────────────────────────────────────

/**
 * Check if a user with a given plan has a specific permission.
 */
export function hasPermission(plan: string, permission: Permission): boolean {
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free
  return permissions.includes(permission)
}

/**
 * Check if a user is an admin (has admin permissions).
 */
export function isAdmin(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'admin' || role === 'SUPER_ADMIN'
}

/**
 * Get all permissions for a given plan.
 */
export function getPermissionsForPlan(plan: string): Permission[] {
  return PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free
}

/**
 * Check resource ownership (IDOR protection).
 * CTO: user_id=123 must NEVER access /api/users/124/documents
 *
 * @param resourceOwnerId The owner ID of the resource being accessed
 * @param requestUserId The ID of the user making the request
 * @param userRole The role of the requesting user (admins bypass)
 */
export function checkResourceOwnership(
  resourceOwnerId: string,
  requestUserId: string,
  userRole?: string | null,
): boolean {
  // Admins can access any resource
  if (isAdmin(userRole)) return true

  // User can only access their own resources
  return resourceOwnerId === requestUserId
}

/**
 * Full Zero Trust check:
 *   1. Is authenticated?
 *   2. Has permission for this action?
 *   3. Resource belongs to user? (if resourceOwnerId provided)
 */
export function zeroTrustCheck(params: {
  userId?: string | null
  userRole?: string | null
  userPlan?: string | null
  requiredPermission: Permission
  resourceOwnerId?: string
}): { allowed: boolean; reason?: string } {
  const { userId, userRole, userPlan, requiredPermission, resourceOwnerId } = params

  // 1. Authentication check
  if (!userId) {
    return { allowed: false, reason: 'NOT_AUTHENTICATED' }
  }

  // 2. Admin bypass
  if (isAdmin(userRole)) {
    // Admins still need resource ownership for sensitive actions
    if (resourceOwnerId && !checkResourceOwnership(resourceOwnerId, userId, userRole)) {
      // Admin accessing another user's resource — log this
      return { allowed: true, reason: 'ADMIN_CROSS_ACCESS' }
    }
    return { allowed: true }
  }

  // 3. Permission check
  const plan = userPlan || 'free'
  if (!hasPermission(plan, requiredPermission)) {
    return { allowed: false, reason: `PERMISSION_DENIED: plan '${plan}' lacks '${requiredPermission}'` }
  }

  // 4. Resource ownership check (IDOR protection)
  if (resourceOwnerId) {
    if (!checkResourceOwnership(resourceOwnerId, userId, userRole)) {
      return { allowed: false, reason: 'IDOR_BLOCKED: resource does not belong to user' }
    }
  }

  return { allowed: true }
}
