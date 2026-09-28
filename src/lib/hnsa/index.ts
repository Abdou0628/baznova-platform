/**
 * HNSA — HireNova Security Architecture
 *
 * Barrel export for all HNSA security modules.
 * This file will be extended by other agents adding new security pillars.
 *
 * @module hnsa
 */

export { logAudit, getAuditTrail, AUDIT_ACTIONS } from './audit';
export type {
  AuditFilters,
  AuditRecord,
  AuditTrailResult,
  LogAuditParams,
} from './audit';
export { secureAIInput, validateAIOutput, checkAIAbuseLimit, logAIEvent } from './ai-gateway';
export type {
  SecureAIInputResult,
  ValidateAIOutputResult,
  CheckAIAbuseLimitResult,
  LogAIEventParams,
} from './ai-gateway';
export { verifyResourceOwnership, checkPermission, requireAuth, authorizeRequest, RBAC_PERMISSIONS } from './zero-trust';
export type { Role, ResourceAction, PermissionSet } from './zero-trust';
export { recordFailedLogin, recordSuccessfulLogin, isAccountLocked, unlockAccount, getLockoutStatus } from './brute-force';
export type {
  RecordFailedLoginResult,
  IsAccountLockedResult,
  LockoutStatus,
} from './brute-force';
export { scanRequestBody } from './body-scanner';
export { withAuth } from './with-auth';
export { generateTOTPSecret, generateTOTP, verifyTOTP, generateOTPAuthURI } from './totp';
export {
  encryptField,
  decryptField,
  isEncrypted,
  sensitiveFields,
  encryptSensitiveData,
  decryptSensitiveData,
} from './field-encryption';
export { encryptBeforeWrite, decryptAfterRead, getSensitiveFieldNames, isFieldEncrypted } from './encryption-middleware';
export {
  forwardToSIEM,
  batchForwardToSIEM,
  createSIEMEvent,
  getLocalSIEMEvents,
  getLocalSIEMBufferSize,
} from './siem';
export type {
  SIEMEvent,
  SIEMEventType,
  SIEMSeverity,
  CreateSIEMEventParams,
} from './siem';
export {
  getEntitlements,
  hasModuleAccess,
  hasFeatureAccess,
  getAccessibleModules,
  getMissingModules,
  getUpgradePath,
  getAILevel,
  getMonthlyLimits,
  canPerformAction,
  resolveCanonicalPlan,
  getAllPlans,
} from '../entitlement-engine';
export type {
  AILevel,
  PlanEntitlements,
  MonthlyLimits,
  UpgradePath,
} from '../entitlement-engine';
export {
  trackAIUsage,
  getUserAIUsage,
  getUserAIUsageWithPlan,
  checkAIAccess,
  getAIUsageSummary,
  getUserAIUsageDetail,
  estimateAICost,
} from '../ai-usage-engine';
export type {
  AIUsageRecord,
  AIUsageQuota,
  UserAIUsage,
  AIUsageSummary,
} from '../ai-usage-engine';
