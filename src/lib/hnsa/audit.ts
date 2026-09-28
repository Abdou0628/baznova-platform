/**
 * HNSA — Immutable Audit Logging Library
 *
 * Provides non-blocking audit logging for all security-relevant actions
 * across the HireNova platform. Records are immutable once written.
 *
 * @module hnsa/audit
 */

import { db } from '@/lib/db';
import { forwardToSIEM, createSIEMEvent } from './siem';
import type { SIEMEventType, SIEMSeverity } from './siem';

// ===== Standard Audit Action Types =====

/**
 * Categorized constant of all standard audit action types used across HireNova.
 * Use these values when calling `logAudit()` to ensure consistent action naming.
 */
export const AUDIT_ACTIONS = {
  AUTH: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
    MFA_ENABLED: 'MFA_ENABLED',
    MFA_DISABLED: 'MFA_DISABLED',
    SESSION_REVOKED: 'SESSION_REVOKED',
  },
  DATA: {
    CV_CREATED: 'CV_CREATED',
    CV_UPDATED: 'CV_UPDATED',
    CV_DELETED: 'CV_DELETED',
    CV_VIEWED: 'CV_VIEWED',
    CL_CREATED: 'CL_CREATED',
    CL_DELETED: 'CL_DELETED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    LINKEDIN_ANALYZED: 'LINKEDIN_ANALYZED',
  },
  PAYMENT: {
    PAYMENT_INITIATED: 'PAYMENT_INITIATED',
    PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
    SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
    SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
    INVOICE_GENERATED: 'INVOICE_GENERATED',
  },
  ADMIN: {
    ADMIN_USER_MODIFIED: 'ADMIN_USER_MODIFIED',
    ADMIN_USER_UNLOCKED: 'ADMIN_USER_UNLOCKED',
    ADMIN_CONFIG_CHANGED: 'ADMIN_CONFIG_CHANGED',
    ADMIN_ROLE_CHANGED: 'ADMIN_ROLE_CHANGED',
  },
  SECURITY: {
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    IDOR_ATTEMPT: 'IDOR_ATTEMPT',
  },
} as const;

// ===== Types =====

/** Parameters accepted by the `logAudit` function. */
export interface LogAuditParams {
  /** User ID who performed the action (omit for system/anonymous actions). */
  actorId?: string | null;
  /** Email of the acting user (derived or provided). */
  actorEmail?: string | null;
  /** Role of the actor: candidate | employer | admin | system. */
  actorRole?: string | null;
  /** The action performed (prefer values from `AUDIT_ACTIONS`). */
  action: string;
  /** The resource type affected: user | resume | payment | etc. */
  resource: string;
  /** The ID of the affected resource, if applicable. */
  resourceId?: string | null;
  /** Result of the action: success | failure | denied | error. */
  outcome?: 'success' | 'failure' | 'denied' | 'error';
  /** Client IP address. Defaults to "unknown". */
  ip?: string;
  /** Client user-agent string. */
  userAgent?: string | null;
  /** Request path (e.g. "/api/auth/login"). */
  path?: string | null;
  /** HTTP method (GET, POST, etc.). */
  method?: string | null;
  /** HTTP response status code. */
  statusCode?: number | null;
  /** Optional JSON blob with extra context. Will be stringified automatically if an object. */
  details?: Record<string, unknown> | string | null;
  /** Session ID for correlation across multiple audit events. */
  sessionId?: string | null;
}

/** Pagination and filter options for `getAuditTrail`. */
export interface AuditFilters {
  /** Filter by actor (user) ID. */
  actorId?: string;
  /** Filter by action type (exact match). */
  action?: string;
  /** Filter by resource type. */
  resource?: string;
  /** Filter by resource ID. */
  resourceId?: string;
  /** Filter by outcome: success | failure | denied | error. */
  outcome?: string;
  /** Filter by actor email. */
  actorEmail?: string;
  /** Include only events created on or after this ISO date string. */
  startDate?: string;
  /** Include only events created on or before this ISO date string. */
  endDate?: string;
  /** Page number (1-based). Defaults to 1. */
  page?: number;
  /** Number of records per page. Defaults to 50, max 200. */
  limit?: number;
}

/** Shape of a single audit record returned from `getAuditTrail`. */
export interface AuditRecord {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  outcome: string;
  ip: string;
  userAgent: string | null;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  details: string | null;
  sessionId: string | null;
  createdAt: Date;
}

/** Paginated result returned by `getAuditTrail`. */
export interface AuditTrailResult {
  records: AuditRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== SIEM Mapping =====

/** Maps audit actions to their corresponding SIEM event type and severity. */
const ACTION_TO_SIEM_MAP: Record<
  string,
  { type: SIEMEventType; severity: SIEMSeverity } | undefined
> = {
  LOGIN_SUCCESS: { type: 'AUTH_SUCCESS', severity: 'info' },
  LOGIN_FAILURE: { type: 'AUTH_FAILURE', severity: 'warning' },
  REGISTER: { type: 'AUTH_SUCCESS', severity: 'info' },
  PASSWORD_RESET_REQUESTED: { type: 'AUTH_SUCCESS', severity: 'info' },
  PASSWORD_RESET_COMPLETED: { type: 'AUTH_SUCCESS', severity: 'info' },
  MFA_ENABLED: { type: 'MFA_ENABLED', severity: 'info' },
  MFA_DISABLED: { type: 'MFA_DISABLED', severity: 'warning' },
  SESSION_REVOKED: { type: 'AUTH_SUCCESS', severity: 'info' },
  RATE_LIMIT_EXCEEDED: { type: 'RATE_LIMIT_EXCEEDED', severity: 'warning' },
  BRUTE_FORCE_DETECTED: { type: 'API_ABUSE_DETECTED', severity: 'critical' },
  ACCOUNT_LOCKED: { type: 'ACCOUNT_LOCKOUT', severity: 'critical' },
  ACCOUNT_UNLOCKED: { type: 'ACCOUNT_UNLOCK', severity: 'info' },
  SUSPICIOUS_ACTIVITY: { type: 'SUSPICIOUS_REQUEST', severity: 'critical' },
  IDOR_ATTEMPT: { type: 'SUSPICIOUS_REQUEST', severity: 'critical' },
  PAYMENT_INITIATED: { type: 'PAYMENT_INITIATED', severity: 'info' },
  PAYMENT_SUCCEEDED: { type: 'PAYMENT_SUCCESS', severity: 'info' },
  PAYMENT_FAILED: { type: 'PAYMENT_FAILURE', severity: 'warning' },
  PAYMENT_REFUNDED: { type: 'REFUND_PROCESSED', severity: 'info' },
  ADMIN_USER_MODIFIED: { type: 'ADMIN_ACTION', severity: 'warning' },
  ADMIN_USER_UNLOCKED: { type: 'ADMIN_ACTION', severity: 'info' },
  ADMIN_CONFIG_CHANGED: { type: 'ADMIN_ACTION', severity: 'warning' },
  ADMIN_ROLE_CHANGED: { type: 'ADMIN_ACTION', severity: 'warning' },
  CV_DELETED: { type: 'DATA_DELETE', severity: 'info' },
  CL_DELETED: { type: 'DATA_DELETE', severity: 'info' },
  PROFILE_UPDATED: { type: 'ADMIN_ACTION', severity: 'info' },
};

// ===== Functions =====

/**
 * Log a security audit event to the immutable SecurityAudit table.
 *
 * This function is **non-blocking** — it catches any database errors and logs them
 * to the console rather than throwing. This ensures that a failing audit log
 * never breaks the primary request flow.
 *
 * @param params - The audit event details. See {@link LogAuditParams}.
 *
 * @example
 * ```ts
 * import { logAudit, AUDIT_ACTIONS } from '@/lib/hnsa';
 *
 * await logAudit({
 *   actorId: user.id,
 *   actorEmail: user.email,
 *   actorRole: user.role,
 *   action: AUDIT_ACTIONS.AUTH.LOGIN_SUCCESS,
 *   resource: 'user',
 *   resourceId: user.id,
 *   ip: request.ip,
 *   userAgent: request.headers.get('user-agent'),
 * });
 * ```
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const details =
      params.details != null && typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : (params.details as string | null | undefined);

    await db.securityAudit.create({
      data: {
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        outcome: params.outcome ?? 'success',
        ip: params.ip ?? 'unknown',
        userAgent: params.userAgent ?? null,
        path: params.path ?? null,
        method: params.method ?? null,
        statusCode: params.statusCode ?? null,
        details: details ?? null,
        sessionId: params.sessionId ?? null,
      },
    });

    // Forward to SIEM (non-blocking, fire-and-forget)
    const siemMapping = ACTION_TO_SIEM_MAP[params.action];
    if (siemMapping) {
      forwardToSIEM(createSIEMEvent({
        type: siemMapping.type,
        severity: siemMapping.severity,
        userId: params.actorId ?? undefined,
        ip: params.ip,
        userAgent: params.userAgent ?? undefined,
        path: params.path ?? undefined,
        metadata: {
          action: params.action,
          resource: params.resource,
          outcome: params.outcome ?? 'success',
        },
      })).catch(() => {});
    }
  } catch (error) {
    // Non-blocking: never let audit logging break the request flow
    console.error('[HNSA] Failed to write audit log:', error);
  }
}

/**
 * Query the immutable audit trail with optional filtering and pagination.
 *
 * Results are ordered by `createdAt` descending (most recent first).
 *
 * @param filters - Optional filters and pagination. See {@link AuditFilters}.
 * @returns A paginated result with matching audit records. See {@link AuditTrailResult}.
 *
 * @example
 * ```ts
 * import { getAuditTrail } from '@/lib/hnsa';
 *
 * const result = await getAuditTrail({
 *   actorId: 'clxxx...',
 *   action: 'LOGIN_SUCCESS',
 *   startDate: '2025-01-01T00:00:00.000Z',
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export async function getAuditTrail(
  filters: AuditFilters = {},
): Promise<AuditTrailResult> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.outcome) where.outcome = filters.outcome;
  if (filters.actorEmail) where.actorEmail = filters.actorEmail;

  if (filters.startDate || filters.endDate) {
    const createdAt: Record<string, Date> = {};
    if (filters.startDate) createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) createdAt.lte = new Date(filters.endDate);
    where.createdAt = createdAt;
  }

  const [records, total] = await Promise.all([
    db.securityAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.securityAudit.count({ where }),
  ]);

  return {
    records: records as AuditRecord[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
