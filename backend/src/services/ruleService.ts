import prisma from '@config/database';
import { cacheGet, cacheSet, cacheDel } from '@utils/cache';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import type { Rule } from '@prisma/client';

const RULE_CACHE_KEY = 'cache:rules:all';
const RESOURCE_CACHE_KEY = 'cache:resources:all';
const RESOURCE_CACHE_TTL = 3600;
void RULE_CACHE_KEY;

function invalidateRuleCache(): Promise<void> {
  return cacheDel(RULE_CACHE_KEY);
}

// ─── Resource helpers ────────────────────────────────────────────────────────
export async function listResources() {
  const cached = await cacheGet('cache:resources:all');
  if (cached) return cached as unknown[];
  const rows = await prisma.resource.findMany({ orderBy: { sortOrder: 'asc' } });
  await cacheSet(RESOURCE_CACHE_KEY, rows, RESOURCE_CACHE_TTL);
  return rows;
}

export async function invalidateResourceCache(): Promise<void> {
  await cacheDel(RESOURCE_CACHE_KEY);
}

// ─── Rule CRUD ───────────────────────────────────────────────────────────────
export interface RuleFilters {
  resourceCode?: string;
  action?: string;
  scope?: string;
  departmentId?: string;
  subDepartmentId?: string;
  positionId?: string;
  role?: string;
  isActive?: boolean;
}

export async function listRules(filters: RuleFilters = {}) {
  const where: Record<string, unknown> = {};
  if (filters.resourceCode) where.resourceCode = filters.resourceCode;
  if (filters.action) where.action = filters.action as never;
  if (filters.scope) where.scope = filters.scope as never;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.subDepartmentId) where.subDepartmentId = filters.subDepartmentId;
  if (filters.positionId) where.positionId = filters.positionId;
  if (filters.role) where.role = filters.role as never;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  return prisma.rule.findMany({ where: where as never, orderBy: [{ resourceCode: 'asc' }, { action: 'asc' }], include: { resource: true } });
}

export async function getRuleById(id: string) {
  const rule = await prisma.rule.findUnique({ where: { id }, include: { resource: true } });
  if (!rule) throw new NotFoundError('Không tìm thấy rule');
  return rule;
}

export interface CreateRuleInput {
  resourceCode: string;
  action: string;
  scope: string;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  positionId?: string | null;
  role?: string | null;
  allow: boolean;
  isActive?: boolean;
  responsibilityId?: string | null;
  actorId?: string | null;
}

function validateScopeFields(input: CreateRuleInput): void {
  if (input.scope === 'DEPARTMENT' && !input.departmentId) {
    throw new ValidationError('DEPARTMENT scope yêu cầu departmentId');
  }
  if (input.scope === 'SUB_DEPARTMENT' && !input.subDepartmentId) {
    throw new ValidationError('SUB_DEPARTMENT scope yêu cầu subDepartmentId');
  }
}

export async function createRule(input: CreateRuleInput) {
  validateScopeFields(input);
  const resource = await prisma.resource.findUnique({ where: { code: input.resourceCode } });
  if (!resource) throw new NotFoundError(`Resource không tồn tại: ${input.resourceCode}`);

  const existing = await prisma.rule.findFirst({
    where: {
      resourceCode: input.resourceCode,
      action: input.action as never,
      scope: input.scope as never,
      departmentId: input.departmentId ?? null,
      subDepartmentId: input.subDepartmentId ?? null,
      positionId: input.positionId ?? null,
      role: (input.role as never) ?? null,
      isActive: true,
    },
  });
  if (existing) throw new ConflictError('Rule đã tồn tại cho scope này');

  const rule = await prisma.rule.create({
    data: {
      resourceCode: input.resourceCode,
      action: input.action as never,
      scope: input.scope as never,
      departmentId: input.departmentId ?? null,
      subDepartmentId: input.subDepartmentId ?? null,
      positionId: input.positionId ?? null,
      role: (input.role as never) ?? null,
      allow: input.allow,
      isActive: input.isActive ?? true,
      responsibilityId: input.responsibilityId ?? null,
    },
  });

  await prisma.ruleAuditLog.create({
    data: { ruleId: rule.id, actorId: input.actorId ?? null, action: 'CREATE', after: rule as unknown as object },
  });
  await invalidateRuleCache();
  return rule;
}

export async function updateRule(id: string, input: Partial<CreateRuleInput>) {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy rule');
  const before = { ...existing };

  const data: Record<string, unknown> = {};
  if (input.allow !== undefined) data.allow = input.allow;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.responsibilityId !== undefined) data.responsibilityId = input.responsibilityId;

  const updated = await prisma.rule.update({ where: { id }, data });
  await prisma.ruleAuditLog.create({
    data: { ruleId: id, actorId: input.actorId ?? null, action: 'UPDATE', before: before as unknown as object, after: updated as unknown as object },
  });
  await invalidateRuleCache();
  return updated;
}

export async function deleteRule(id: string, actorId?: string | null) {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy rule');
  await prisma.rule.delete({ where: { id } });
  await prisma.ruleAuditLog.create({
    data: { ruleId: null, actorId: actorId ?? null, action: 'DELETE', before: existing as unknown as object },
  });
  await invalidateRuleCache();
}

// ─── Matrix & my-permissions ─────────────────────────────────────────────────
const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT'] as const;

function baselineAllow(action: string, userRole: string): boolean {
  if (action === 'DELETE') return userRole === 'DEPARTMENT_HEAD' || userRole === 'ADMIN';
  if (action === 'APPROVE' || action === 'REJECT') return userRole === 'TEAM_LEAD' || userRole === 'DEPARTMENT_HEAD' || userRole === 'ADMIN';
  return true; // CREATE, READ, UPDATE, EXPORT, IMPORT
}

export async function getMatrix(params: { positionId?: string; departmentId?: string; subDepartmentId?: string }) {
  const resources = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const rules = await prisma.rule.findMany({
    where: {
      isActive: true,
      ...(params.positionId ? { positionId: params.positionId } : {}),
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    },
  });

  const ruleMap = new Map<string, Rule>();
  for (const r of rules) ruleMap.set(`${r.resourceCode}:${r.action}:${r.scope}:${r.departmentId ?? ''}:${r.subDepartmentId ?? ''}:${r.positionId ?? ''}:${r.role ?? ''}`, r);

  // For now, matrix is informational — enforcement is in requireRule middleware
  return { resources, rules, actions: ACTIONS };
}

export async function getMyPermissions(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');
  if (user.role === 'ADMIN') {
    const resources = await prisma.resource.findMany({ where: { isActive: true } });
    return resources.flatMap(r => ACTIONS.map(a => ({ resourceCode: r.code, action: a, allow: true, source: 'ADMIN_BYPASS' })));
  }

  const employee = await prisma.employee.findUnique({ where: { userId } });
  const positionId = employee?.positionId ?? null;

  // Resolve position defaultRole
  let effectiveRole: string = user.role;
  if (positionId) {
    const pos = await prisma.position.findUnique({ where: { id: positionId }, select: { defaultRole: true } });
    if (pos?.defaultRole) effectiveRole = pos.defaultRole as string;
  }

  const secondaryDeps = await prisma.userSecondaryDepartment.findMany({ where: { userId } });
  const departmentIds = [user.departmentId, ...secondaryDeps.map(s => s.departmentId)].filter(Boolean) as string[];
  const subDepartmentId = user.subDepartmentId ?? employee?.subDepartmentId ?? null;

  const resources = await prisma.resource.findMany({ where: { isActive: true } });

  // Check delegations active now
  const now = new Date();
  const delegations = await prisma.delegation.findMany({
    where: { toUserId: userId, isActive: true, from: { lte: now }, to: { gte: now } },
  });
  const delegationSet = new Set(delegations.map(d => `${d.resourceCode}:${d.action}`));

  // Load relevant rules
  const allRules = await prisma.rule.findMany({ where: { isActive: true } });

  const result: Array<{ resourceCode: string; action: string; allow: boolean; source: string }> = [];
  for (const res of resources) {
    for (const action of ACTIONS) {
      // Priority: delegation → explicit Rule → baseline
      if (delegationSet.has(`${res.code}:${action}`)) {
        result.push({ resourceCode: res.code, action, allow: true, source: 'DELEGATION' });
        continue;
      }

      // Find matching Rule (most specific wins: position > role, subDept > dept > global)
      const candidates = allRules.filter(r => r.resourceCode === res.code && r.action === action);
      let matched: Rule | null = null;

      // Position-specific first
      if (positionId) {
        matched = candidates.find(r => r.positionId === positionId && r.subDepartmentId === subDepartmentId) ?? null;
        if (!matched) matched = candidates.find(r => r.positionId === positionId && r.departmentId && departmentIds.includes(r.departmentId)) ?? null;
        if (!matched) matched = candidates.find(r => r.positionId === positionId && r.scope === 'GLOBAL') ?? null;
      }
      // Fallback to role-based
      if (!matched) {
        matched = candidates.find(r => r.role === effectiveRole && r.subDepartmentId === subDepartmentId) ?? null;
        if (!matched) matched = candidates.find(r => r.role === effectiveRole && r.departmentId && departmentIds.includes(r.departmentId)) ?? null;
        if (!matched) matched = candidates.find(r => r.role === effectiveRole && r.scope === 'GLOBAL') ?? null;
      }
      // Generic global rule without position/role
      if (!matched) {
        matched = candidates.find(r => !r.positionId && !r.role && r.scope === 'GLOBAL') ?? null;
      }

      if (matched) {
        result.push({ resourceCode: res.code, action, allow: matched.allow, source: matched.allow ? 'RULE_ALLOW' : 'RULE_DENY' });
      } else {
        // Baseline fallback: check if resource belongs to user's department via Resource.group heuristic or allow all in-dept
        // For now, baseline applies if user has a department; otherwise deny
        const hasDept = departmentIds.length > 0;
        if (!hasDept) {
          result.push({ resourceCode: res.code, action, allow: false, source: 'BASELINE_NO_DEPT' });
        } else {
          const allow = baselineAllow(action, effectiveRole);
          result.push({ resourceCode: res.code, action, allow, source: allow ? 'BASELINE_ALLOW' : 'BASELINE_DENY' });
        }
      }
    }
  }
  return result;
}

// ─── Audit log ───────────────────────────────────────────────────────────────
export async function listRuleAuditLogs(params: { ruleId?: string; page?: number; limit?: number } = {}) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (params.ruleId) where.ruleId = params.ruleId;
  const [data, total] = await Promise.all([
    prisma.ruleAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.ruleAuditLog.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ─── Delegation ──────────────────────────────────────────────────────────────
export async function listDelegations(filters: { fromUserId?: string; toUserId?: string; isActive?: boolean } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.fromUserId) where.fromUserId = filters.fromUserId;
  if (filters.toUserId) where.toUserId = filters.toUserId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  return prisma.delegation.findMany({ where, orderBy: { createdAt: 'desc' }, include: { resource: true } });
}

export async function createDelegation(input: {
  fromUserId: string;
  toUserId: string;
  resourceCode: string;
  action: string;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  from: Date;
  to: Date;
  createdBy?: string | null;
}) {
  // Only DEPARTMENT_HEAD/ADMIN can delegate — check fromUser role
  const fromUser = await prisma.user.findUnique({ where: { id: input.fromUserId } });
  if (!fromUser || (fromUser.role !== 'DEPARTMENT_HEAD' && fromUser.role !== 'ADMIN')) {
    throw new ValidationError('Chỉ Trưởng phòng/ADMIN được ủy quyền');
  }
  const resource = await prisma.resource.findUnique({ where: { code: input.resourceCode } });
  if (!resource) throw new NotFoundError(`Resource không tồn tại: ${input.resourceCode}`);
  if (input.from >= input.to) throw new ValidationError('Khoảng thời gian ủy quyền không hợp lệ');

  return prisma.delegation.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      resourceCode: input.resourceCode,
      action: input.action as never,
      departmentId: input.departmentId ?? null,
      subDepartmentId: input.subDepartmentId ?? null,
      from: input.from,
      to: input.to,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function revokeDelegation(id: string) {
  const d = await prisma.delegation.findUnique({ where: { id } });
  if (!d) throw new NotFoundError('Không tìm thấy ủy quyền');
  return prisma.delegation.update({ where: { id }, data: { isActive: false } });
}

export { invalidateRuleCache, baselineAllow };
