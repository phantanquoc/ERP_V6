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
  | 'CHUNG_ALLOW' | 'BASELINE_NO_DEPT';

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
    return { allow: false, source: 'BASELINE_NO_DEPT' };
  }
  const allow = baselineAllow(action, ctx.effectiveRole);
  return { allow, source: allow ? 'BASELINE_ALLOW' : 'BASELINE_DENY' };
}
