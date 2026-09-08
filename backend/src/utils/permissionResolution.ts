import type { Rule } from '@prisma/client';
import { baselineAllow } from './baselineAllow';

export const ACTIONS = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT',
] as const;

export type PermissionAction = typeof ACTIONS[number];
export type PermissionSource =
  | 'ADMIN_BYPASS'
  | 'DELEGATION'
  | 'RULE_ALLOW' | 'RULE_DENY'
  | 'BASELINE_ALLOW' | 'BASELINE_DENY'
  | 'CHUNG_ALLOW' | 'COMMON_ALLOW' | 'BASELINE_NO_DEPT';

export const ROLE_RANK: Record<string, number> = {
  EMPLOYEE: 0, TEAM_LEAD: 1, DEPARTMENT_HEAD: 2, ADMIN: 3,
};

export function raiseRole(base: string, candidate?: string | null): string {
  if (!candidate) return base;
  const a = ROLE_RANK[base] ?? -1;
  const b = ROLE_RANK[candidate] ?? -1;
  return b > a ? candidate : base;
}

export const CHUNG_NO_DEPT_ALLOW = new Set([
  'lookups', 'supply-requests', 'repair-requests',
  'tasks', 'work-plans', 'private-feedbacks', 'processes',
]);

/**
 * Common tier — available to EVERY authenticated user regardless of department.
 *
 * Standard ERP split: an account always keeps access to (a) its own records and
 * (b) the shared reference data every screen needs, while transactional data
 * stays department-gated. Without this tier a user who has not been assigned a
 * department yet cannot even change their own password or read their notifications.
 *
 * Deliberately EXCLUDED (would be a privilege leak if granted to all):
 *  - `users` — account management is ADMIN-only; self profile goes through /auth.
 *  - `attendances` — blanket READ would expose other people's timesheets; the
 *    narrow own-record bypass in requireRule already covers self-service.
 *  - `payrolls`, `employee-evaluations`, `invoices`, ... — department data.
 *
 * An explicit DENY rule still wins: this tier is consulted only after rule matching.
 */
export const COMMON_GRANTS: Record<string, ReadonlySet<string>> = {
  'login-history':     new Set(['READ']),
  'notifications':     new Set(['READ', 'UPDATE', 'DELETE']),
  'auth':              new Set(['READ', 'UPDATE']),
  'docs':              new Set(['READ']),
  'lookups':           new Set(['READ']),
  'system-settings':   new Set(['READ']),
  'departments':       new Set(['READ']),
  'positions':         new Set(['READ']),
  'private-feedbacks': new Set(['READ', 'CREATE', 'UPDATE']),
};

export function isCommonGrant(resourceCode: string, action: string): boolean {
  return COMMON_GRANTS[resourceCode]?.has(action) ?? false;
}

export interface PermissionContext {
  userId: string;
  role: string;
  effectiveRole: string;
  positionId: string | null;
  departmentIds: string[];
  subDepartmentId: string | null;
  subDepartmentIds: string[];
  delegations: Array<{ resourceCode: string; action: string; departmentId: string|null; subDepartmentId: string|null }>;
  allRules: Rule[];
}

export function delegationScopeMatches(
  delegation: { departmentId: string | null; subDepartmentId: string | null },
  departmentIds: string[], subDepartmentId: string | null,
): boolean {
  if (!delegation.departmentId && !delegation.subDepartmentId) return true;
  if (delegation.subDepartmentId) return delegation.subDepartmentId === subDepartmentId;
  if (delegation.departmentId) return departmentIds.includes(delegation.departmentId);
  return false;
}

export function matchRule(
  candidates: Rule[],
  ctx: { positionId: string|null; effectiveRole: string; departmentIds: string[]; subDepartmentIds: string[] },
): Rule | null {
  let m: Rule | null = null;
  if (ctx.positionId) {
    m = (candidates.find((r) => r.positionId === ctx.positionId && r.subDepartmentId !== null && ctx.subDepartmentIds.includes(r.subDepartmentId!)) as Rule | undefined) ?? null;
    if (!m) m = (candidates.find((r) => r.positionId === ctx.positionId && r.departmentId !== null && ctx.departmentIds.includes(r.departmentId!)) as Rule | undefined) ?? null;
    if (!m) m = (candidates.find((r) => r.positionId === ctx.positionId && r.scope === 'GLOBAL') as Rule | undefined) ?? null;
  }
  if (!m) {
    m = (candidates.find((r) => r.role === (ctx.effectiveRole as never) && r.subDepartmentId !== null && ctx.subDepartmentIds.includes(r.subDepartmentId!)) as Rule | undefined) ?? null;
    if (!m) m = (candidates.find((r) => r.role === (ctx.effectiveRole as never) && r.departmentId !== null && ctx.departmentIds.includes(r.departmentId!)) as Rule | undefined) ?? null;
    if (!m) m = (candidates.find((r) => r.role === (ctx.effectiveRole as never) && r.scope === 'GLOBAL') as Rule | undefined) ?? null;
  }
  if (!m) m = (candidates.find((r) => !r.positionId && !r.role && r.scope === 'GLOBAL') as Rule | undefined) ?? null;
  return m;
}

export function resolveOne(
  resourceCode: string, action: string,
  ctx: PermissionContext,
): { allow: boolean; source: PermissionSource } {
  if (ctx.role === 'ADMIN') return { allow: true, source: 'ADMIN_BYPASS' };
  const hasDel = ctx.delegations.some((d) => d.resourceCode === resourceCode && d.action === action && delegationScopeMatches(d, ctx.departmentIds, ctx.subDepartmentId));
  if (hasDel) return { allow: true, source: 'DELEGATION' };
  const cands = ctx.allRules.filter((r) => r.resourceCode === resourceCode && r.action === action);
  const matched = matchRule(cands, { positionId: ctx.positionId, effectiveRole: ctx.effectiveRole, departmentIds: ctx.departmentIds, subDepartmentIds: ctx.subDepartmentIds });
  if (matched) return { allow: matched.allow, source: matched.allow ? 'RULE_ALLOW' : 'RULE_DENY' };
  if (ctx.departmentIds.length === 0) {
    if (resourceCode === 'overtime-plans') return { allow: false, source: 'BASELINE_NO_DEPT' };
    if ((action === 'READ' || action === 'CREATE') && CHUNG_NO_DEPT_ALLOW.has(resourceCode)) return { allow: true, source: 'CHUNG_ALLOW' };
    // Common tier: some SYSTEM/HR writes are self-service or read-only reference data.
    // In the no-dept branch the user has no department peers, so we only allow the
    // whitelisted actions. Rating: prevents a blanket READ bypass for e.g. payrolls
    // while letting a fresh account (or a system account like admin@example.com with
    // departmentId NULL) read the reference data every screen depends on.
    if (isCommonGrant(resourceCode, action)) return { allow: true, source: 'COMMON_ALLOW' as PermissionSource };
    return { allow: false, source: 'BASELINE_NO_DEPT' };
  }
  // In-department — baseline already allows READ/UPDATE to every role except DELETE/APPROVE
  // gates. The COMMON tier is not needed here (department Rules already cover lookups
  // via department-mates), but a common resource stays allowed even for an
  // under-provisioned department that lacks an explicit rule row.
  if (isCommonGrant(resourceCode, action)) return { allow: true, source: 'COMMON_ALLOW' };
  const allow = baselineAllow(action, ctx.effectiveRole);
  return { allow, source: allow ? 'BASELINE_ALLOW' : 'BASELINE_DENY' };
}
