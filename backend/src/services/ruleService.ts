import prisma from '@config/database';
import { cacheGet, cacheSet, cacheDel } from '@utils/cache';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { baselineAllow } from '@utils/baselineAllow';

const RESOURCE_CACHE_KEY = 'cache:resources:all';
const RESOURCE_CACHE_TTL = 3600;

// ─── Resource helpers ────────────────────────────────────────────────────────
export async function listResources() {
  const cached = await cacheGet('cache:resources:all');
  if (cached) return cached as unknown[];
  const rows = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
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

export async function listRules(filters: RuleFilters & { q?: string; page?: number; limit?: number } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.resourceCode) where.resourceCode = filters.resourceCode;
  if (filters.action) where.action = filters.action as never;
  if (filters.scope) where.scope = filters.scope as never;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.subDepartmentId) where.subDepartmentId = filters.subDepartmentId;
  if (filters.positionId) where.positionId = filters.positionId;
  if (filters.role) where.role = filters.role as never;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  // Free-text search over the resource label (so admins can type "thu mua"
  // instead of remembering the resource code).
  if (filters.q) {
    const hit = await prisma.resource.findMany({
      where: { OR: [{ label: { contains: filters.q, mode: 'insensitive' } }, { code: { contains: filters.q, mode: 'insensitive' } }] },
      select: { code: true },
    });
    where.resourceCode = { in: hit.map((r) => r.code) };
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 100));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.rule.findMany({
      where: where as never,
      orderBy: [{ resourceCode: 'asc' }, { action: 'asc' }],
      include: { resource: true },
      skip,
      take: limit,
    }),
    prisma.rule.count({ where: where as never }),
  ]);

  // Resolve human-readable names in bulk (no N+1, no CUID fragments in the UI)
  const deptIds = [...new Set(rows.map((r) => r.departmentId).filter((v): v is string => !!v))];
  const subIds = [...new Set(rows.map((r) => r.subDepartmentId).filter((v): v is string => !!v))];
  const posIds = [...new Set(rows.map((r) => r.positionId).filter((v): v is string => !!v))];
  const [depts, subs, positions] = await Promise.all([
    deptIds.length ? prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true, code: true } }) : [],
    subIds.length ? prisma.subDepartment.findMany({ where: { id: { in: subIds } }, select: { id: true, name: true, code: true } }) : [],
    posIds.length ? prisma.position.findMany({ where: { id: { in: posIds } }, select: { id: true, name: true, code: true } }) : [],
  ]);
  const deptName = new Map(depts.map((d) => [d.id, d.name]));
  const subName = new Map(subs.map((d) => [d.id, d.name]));
  const posName = new Map(positions.map((d) => [d.id, d.name]));

  const data = rows.map((r) => ({
    ...r,
    resourceLabel: r.resource?.label ?? r.resourceCode,
    resourceGroup: r.resource?.group ?? '',
    departmentName: r.departmentId ? deptName.get(r.departmentId) ?? null : null,
    subDepartmentName: r.subDepartmentId ? subName.get(r.subDepartmentId) ?? null : null,
    positionName: r.positionId ? posName.get(r.positionId) ?? null : null,
    endpoints: endpointsFor(r.resourceCode),
  }));

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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

function validateScopeFields(input: CreateRuleInput | Partial<CreateRuleInput>): void {
  const scope = (input as CreateRuleInput).scope;
  // Required ids per scope
  if (scope === 'DEPARTMENT' && !input.departmentId) {
    throw new ValidationError('DEPARTMENT scope yêu cầu departmentId');
  }
  if (scope === 'SUB_DEPARTMENT' && !input.subDepartmentId) {
    throw new ValidationError('SUB_DEPARTMENT scope yêu cầu subDepartmentId');
  }
  // Reject stray ids
  if (scope === 'GLOBAL' && (input.departmentId || input.subDepartmentId)) {
    throw new ValidationError('GLOBAL scope không được kèm departmentId/subDepartmentId');
  }
  if (scope === 'DEPARTMENT' && input.subDepartmentId) {
    throw new ValidationError('DEPARTMENT scope không được kèm subDepartmentId');
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
  return rule;
}

export async function updateRule(id: string, input: Partial<CreateRuleInput>) {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy rule');
  // If scope-related fields are being changed, validate
  if (input.scope !== undefined || input.departmentId !== undefined || input.subDepartmentId !== undefined) {
    const merged: CreateRuleInput = {
      resourceCode: existing.resourceCode,
      action: existing.action,
      scope: (input.scope ?? existing.scope) as string,
      departmentId: (input.departmentId !== undefined ? input.departmentId : existing.departmentId) as string | null,
      subDepartmentId: (input.subDepartmentId !== undefined ? input.subDepartmentId : existing.subDepartmentId) as string | null,
      positionId: existing.positionId,
      role: existing.role as string | null,
      allow: existing.allow,
    };
    validateScopeFields(merged);
  }
  const before = { ...existing };

  const data: Record<string, unknown> = {};
  if (input.allow !== undefined) data.allow = input.allow;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.responsibilityId !== undefined) data.responsibilityId = input.responsibilityId;

  const updated = await prisma.rule.update({ where: { id }, data });
  await prisma.ruleAuditLog.create({
    data: { ruleId: id, actorId: input.actorId ?? null, action: 'UPDATE', before: before as unknown as object, after: updated as unknown as object },
  });
  return updated;
}

export async function deleteRule(id: string, actorId?: string | null) {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy rule');
  await prisma.rule.delete({ where: { id } });
  await prisma.ruleAuditLog.create({
    data: { ruleId: null, actorId: actorId ?? null, action: 'DELETE', before: existing as unknown as object },
  });
}

// ─── Matrix & permissions ────────────────────────────────────────────────────
// All permission reasoning lives in @utils/permissionResolution so that what the
// UI previews is byte-for-byte what requireRule enforces. This file only loads
// data and shapes responses.
import {
  ACTIONS,
  raiseRole,
  resolveOne,
  type PermissionContext,
} from '@utils/permissionResolution';
import { endpointsFor, GROUP_LABELS } from '@routes/endpointMap';

/**
 * Load everything needed to evaluate permissions for one user.
 * Identity comes from auth.users (the access-control record); the HR employee
 * row contributes only `positionId` (for position-scoped rules) and acts as a
 * last-resort fallback for subDepartmentId.
 */
export async function buildPermissionContext(userId: string): Promise<PermissionContext> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');

  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { positionId: true, subDepartmentId: true },
  });
  const positionId = employee?.positionId ?? null;

  let positionDefaultRole: string | null = null;
  if (positionId) {
    const pos = await prisma.position.findUnique({ where: { id: positionId }, select: { defaultRole: true } });
    positionDefaultRole = (pos?.defaultRole as string | null) ?? null;
  }
  // A position may only RAISE the effective role, never lower it.
  const effectiveRole = raiseRole(user.role, positionDefaultRole);

  const secondaryDeps = await prisma.userSecondaryDepartment.findMany({ where: { userId } });
  const departmentIds: string[] = [user.departmentId, ...secondaryDeps.map((s) => s.departmentId)].filter((v): v is string => !!v);
  const subDepartmentId: string | null = (user.subDepartmentId ?? employee?.subDepartmentId ?? null) as string | null;
  const subDepartmentIds: string[] = [
    user.subDepartmentId,
    employee?.subDepartmentId,
    ...secondaryDeps.map((s) => s.subDepartmentId),
  ].filter((v): v is string => !!v);

  const now = new Date();
  const delegations = await prisma.delegation.findMany({
    where: { toUserId: userId, isActive: true, from: { lte: now }, to: { gte: now } },
    select: { resourceCode: true, action: true, departmentId: true, subDepartmentId: true },
  });
  const allRules = await prisma.rule.findMany({ where: { isActive: true } });

  return {
    userId,
    role: user.role,
    effectiveRole,
    positionId,
    departmentIds,
    subDepartmentId,
    subDepartmentIds,
    delegations: delegations.map((d) => ({
      resourceCode: d.resourceCode,
      action: d.action as string,
      departmentId: d.departmentId,
      subDepartmentId: d.subDepartmentId,
    })),
    allRules,
  };
}

export async function getMatrix(params: { positionId?: string; departmentId?: string; subDepartmentId?: string }) {
  const resources = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const rules = await prisma.rule.findMany({
    where: {
      isActive: true,
      ...(params.positionId ? { positionId: params.positionId } : {}),
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      ...(params.subDepartmentId ? { subDepartmentId: params.subDepartmentId } : {}),
    },
    include: { resource: true },
  });
  return { resources, rules, actions: ACTIONS };
}

/** Flat list form (kept for backwards compatibility with the existing "Quyền của tôi" tab). */
export async function getMyPermissions(userId: string) {
  const ctx = await buildPermissionContext(userId);
  const resources = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

  const out: Array<{
    resourceCode: string; resourceLabel: string; group: string;
    action: string; allow: boolean; source: string; endpoints: string[];
  }> = [];
  for (const res of resources) {
    for (const action of ACTIONS) {
      const r = resolveOne(res.code, action, ctx);
      out.push({
        resourceCode: res.code,
        resourceLabel: res.label,
        group: res.group,
        action,
        allow: r.allow,
        source: r.source,
        endpoints: endpointsFor(res.code),
      });
    }
  }
  return out;
}

export interface EffectivePermissionQuery {
  userId?: string;
  role?: string;
  departmentId?: string;
  subDepartmentId?: string;
  positionId?: string;
}

/**
 * Compute the effective permission grid for EITHER a real user (?userId) or a
 * hypothetical role/department/sub-department/position combination. Returns the
 * data already grouped by resource group so the client renders a grid instead
 * of 624 flat rows.
 */
export async function getEffectivePermissions(q: EffectivePermissionQuery) {
  let ctx: PermissionContext;
  let identityName = '';

  if (q.userId) {
    ctx = await buildPermissionContext(q.userId);
    const u = await prisma.user.findUnique({ where: { id: q.userId }, select: { firstName: true, lastName: true, email: true } });
    identityName = u ? `${u.lastName} ${u.firstName} (${u.email})`.trim() : q.userId;
  } else {
    // Synthetic context — no user, no delegations. Lets an admin answer
    // "what would a TEAM_LEAD in Bộ phận thu mua be able to do?".
    const role = (q.role ?? 'EMPLOYEE') as string;
    let positionDefaultRole: string | null = null;
    if (q.positionId) {
      const pos = await prisma.position.findUnique({ where: { id: q.positionId }, select: { defaultRole: true } });
      positionDefaultRole = (pos?.defaultRole as string | null) ?? null;
    }
    const departmentIds = q.departmentId ? [q.departmentId] : [];
    const subDepartmentIds = q.subDepartmentId ? [q.subDepartmentId] : [];
    ctx = {
      userId: '',
      role,
      effectiveRole: raiseRole(role, positionDefaultRole),
      positionId: q.positionId ?? null,
      departmentIds,
      subDepartmentId: q.subDepartmentId ?? null,
      subDepartmentIds,
      delegations: [],
      allRules: await prisma.rule.findMany({ where: { isActive: true } }),
    };
  }

  const resources = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

  // Resolve human-readable names for the identity header (no CUID fragments in UI)
  const deptIds = [...new Set(ctx.departmentIds)];
  const subIds = [...new Set(ctx.subDepartmentIds)];
  const [depts, subDepts, position] = await Promise.all([
    deptIds.length ? prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true, code: true } }) : [],
    subIds.length ? prisma.subDepartment.findMany({ where: { id: { in: subIds } }, select: { id: true, name: true, code: true } }) : [],
    ctx.positionId ? prisma.position.findUnique({ where: { id: ctx.positionId }, select: { id: true, name: true, code: true, defaultRole: true } }) : null,
  ]);
  const deptNameById = new Map(depts.map((d) => [d.id, d.name]));
  const subNameById = new Map(subDepts.map((s) => [s.id, s.name]));

  // Build grouped grid
  const byGroup = new Map<string, Array<{
    code: string; label: string; endpoints: string[];
    actions: Record<string, { allow: boolean; source: string }>;
  }>>();
  for (const res of resources) {
    const actions: Record<string, { allow: boolean; source: string }> = {};
    for (const action of ACTIONS) {
      actions[action] = resolveOne(res.code, action, ctx);
    }
    const arr = byGroup.get(res.group) ?? [];
    arr.push({ code: res.code, label: res.label, endpoints: endpointsFor(res.code), actions });
    byGroup.set(res.group, arr);
  }

  const groups = [...byGroup.entries()].map(([group, resList]) => ({
    group,
    groupName: GROUP_LABELS[group] ?? group,
    resources: resList,
  }));

  return {
    identity: {
      userId: ctx.userId || undefined,
      name: identityName || undefined,
      role: ctx.role,
      effectiveRole: ctx.effectiveRole,
      roleRaised: ctx.effectiveRole !== ctx.role,
      positionName: position?.name ?? null,
      positionDefaultRole: position?.defaultRole ?? null,
      departments: ctx.departmentIds.map((id) => ({ id, name: deptNameById.get(id) ?? id })),
      subDepartments: ctx.subDepartmentIds.map((id) => ({ id, name: subNameById.get(id) ?? id })),
    },
    actions: ACTIONS,
    groups,
    groupLabels: GROUP_LABELS,
  };
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

export { baselineAllow };
