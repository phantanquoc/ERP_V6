/**
 * Tests for Rule Matrix: requireRule middleware, ruleService, and scope validation.
 *
 * All DB access is mocked — no running Postgres/Redis needed.
 */

// ─── Mocks (must be hoisted before imports) ────────────────────────────────

const mockPrisma: any = {
  rule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  resource: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  ruleAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  delegation: {
    findMany: jest.fn(),
  },
  employee: {
    findUnique: jest.fn(),
  },
  position: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  userSecondaryDepartment: {
    findMany: jest.fn(),
  },
  // Owner-scope delegates
  customerFeedback: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('@utils/cache', () => ({
  __esModule: true,
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheDelPattern: jest.fn().mockResolvedValue(undefined),
  CACHE_KEYS: { DEPARTMENTS: 'cache:departments', SYSTEM_SETTINGS: 'cache:system-settings' },
}));

import { requireRule, delegationScopeMatches, RESOURCE_TO_MODEL } from '@middlewares/requireRule';
import * as ruleService from '@services/ruleService';
import { baselineAllow } from '@utils/baselineAllow';
import { ValidationError, ConflictError } from '@utils/errors';

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

function makeJwtUser(overrides: Partial<import('@types').JwtPayload> = {}): import('@types').JwtPayload {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: 'EMPLOYEE',
    departmentId: 'dept-1',
    subDepartmentId: null,
    ...overrides,
  } as import('@types').JwtPayload;
}

function makeReq(user: import('@types').JwtPayload, params: Record<string, string> = {}) {
  return { user, headers: {}, params } as any;
}

function resetMocks() {
  jest.clearAllMocks();
  // Default: no position, no secondary deps, no delegations, no rules
  mockPrisma.employee.findUnique.mockResolvedValue(null);
  mockPrisma.position.findUnique.mockResolvedValue(null);
  mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
  mockPrisma.delegation.findMany.mockResolvedValue([]);
  mockPrisma.rule.findMany.mockResolvedValue([]);
  mockPrisma.resource.findMany.mockResolvedValue([]);
  mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices', label: 'Invoices' });
  mockPrisma.rule.findFirst.mockResolvedValue(null);
  mockPrisma.rule.findUnique.mockResolvedValue(null);
}

// ─── delegationScopeMatches unit tests ───────────────────────────────────

describe('delegationScopeMatches', () => {
  it('GLOBAL delegation (both null) matches any user', () => {
    expect(delegationScopeMatches({ departmentId: null, subDepartmentId: null }, ['dept-1'], null)).toBe(true);
    expect(delegationScopeMatches({ departmentId: null, subDepartmentId: null }, [], null)).toBe(true);
  });

  it('DEPARTMENT delegation matches when departmentId in user list', () => {
    expect(delegationScopeMatches({ departmentId: 'dept-1', subDepartmentId: null }, ['dept-1'], null)).toBe(true);
    expect(delegationScopeMatches({ departmentId: 'dept-2', subDepartmentId: null }, ['dept-1'], null)).toBe(false);
  });

  it('DEPARTMENT delegation matches via secondary department', () => {
    expect(delegationScopeMatches({ departmentId: 'dept-2', subDepartmentId: null }, ['dept-1', 'dept-2'], null)).toBe(true);
  });

  it('SUB_DEPARTMENT delegation matches only exact subDepartmentId', () => {
    expect(delegationScopeMatches({ departmentId: null, subDepartmentId: 'sub-1' }, ['dept-1'], 'sub-1')).toBe(true);
    expect(delegationScopeMatches({ departmentId: null, subDepartmentId: 'sub-1' }, ['dept-1'], 'sub-2')).toBe(false);
    expect(delegationScopeMatches({ departmentId: null, subDepartmentId: 'sub-1' }, ['dept-1'], null)).toBe(false);
  });
});

// ─── baselineAllow unit tests ────────────────────────────────────────────

describe('baselineAllow', () => {
  it('EMPLOYEE deny DELETE and APPROVE/REJECT', () => {
    expect(baselineAllow('DELETE', 'EMPLOYEE')).toBe(false);
    expect(baselineAllow('APPROVE', 'EMPLOYEE')).toBe(false);
    expect(baselineAllow('REJECT', 'EMPLOYEE')).toBe(false);
  });

  it('EMPLOYEE allow CREATE/READ/UPDATE/EXPORT/IMPORT', () => {
    expect(baselineAllow('CREATE', 'EMPLOYEE')).toBe(true);
    expect(baselineAllow('READ', 'EMPLOYEE')).toBe(true);
    expect(baselineAllow('UPDATE', 'EMPLOYEE')).toBe(true);
    expect(baselineAllow('EXPORT', 'EMPLOYEE')).toBe(true);
    expect(baselineAllow('IMPORT', 'EMPLOYEE')).toBe(true);
  });

  it('TEAM_LEAD allow APPROVE/REJECT but deny DELETE', () => {
    expect(baselineAllow('APPROVE', 'TEAM_LEAD')).toBe(true);
    expect(baselineAllow('REJECT', 'TEAM_LEAD')).toBe(true);
    expect(baselineAllow('DELETE', 'TEAM_LEAD')).toBe(false);
  });

  it('DEPARTMENT_HEAD allow DELETE and APPROVE', () => {
    expect(baselineAllow('DELETE', 'DEPARTMENT_HEAD')).toBe(true);
    expect(baselineAllow('APPROVE', 'DEPARTMENT_HEAD')).toBe(true);
    expect(baselineAllow('REJECT', 'DEPARTMENT_HEAD')).toBe(true);
  });

  it('ADMIN allow all', () => {
    expect(baselineAllow('DELETE', 'ADMIN')).toBe(true);
    expect(baselineAllow('APPROVE', 'ADMIN')).toBe(true);
    expect(baselineAllow('CREATE', 'ADMIN')).toBe(true);
  });
});

// ─── requireRule middleware ──────────────────────────────────────────────

describe('requireRule middleware', () => {
  beforeEach(resetMocks);

  it('ADMIN bypass — calls next without DB Rule check', async () => {
    const req = makeReq(makeJwtUser({ role: 'ADMIN' }));
    const res = mockRes();
    const next = jest.fn();
    await requireRule('invoices', 'DELETE')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is missing', async () => {
    const req = { headers: {}, params: {} } as any;
    const res = mockRes();
    const next = jest.fn();
    await requireRule('invoices', 'READ')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // Priority: delegation → explicit Rule → owner-scope → baseline
  describe('priority: delegation first', () => {
    it('allows when delegation matches (global scope)', async () => {
      const user = makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      // Delegation: global scope granting EMPLOYEE access to invoices/DELETE
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: null, resourceCode: 'invoices', action: 'DELETE' },
      ]);
      // Even though an explicit deny Rule exists, delegation wins
      mockPrisma.rule.findMany.mockResolvedValue([
        { resourceCode: 'invoices', action: 'DELETE', scope: 'GLOBAL', positionId: null, role: 'EMPLOYEE', departmentId: null, subDepartmentId: null, allow: false },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies when delegation exists but scope does not match', async () => {
      const user = makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: 'sub-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      // Delegation scoped to dept-2 — should NOT match
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: 'dept-2', subDepartmentId: null, resourceCode: 'invoices', action: 'DELETE' },
      ]);
      mockPrisma.rule.findMany.mockResolvedValue([]);
      // Baseline denies EMPLOYEE DELETE
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('SUB_DEPARTMENT delegation only matches exact subDepartment', async () => {
      const user = makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: 'sub-1' });
      const req2 = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: 'sub-2', resourceCode: 'invoices', action: 'READ' },
      ]);
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'READ')(req2, res, next);
      // No delegation match + no Rule + baseline allows READ → next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('priority: explicit Rule (position > role, narrow scope wins)', () => {
    it('position-specific SUB_DEPARTMENT rule wins over DEPARTMENT rule', async () => {
      const user = makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: 'sub-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.employee.findUnique.mockResolvedValue({ positionId: 'pos-1', subDepartmentId: 'sub-1' });
      mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'EMPLOYEE' });
      mockPrisma.rule.findMany.mockResolvedValue([
        { resourceCode: 'invoices', action: 'DELETE', scope: 'DEPARTMENT', positionId: 'pos-1', departmentId: 'dept-1', subDepartmentId: null, role: null, allow: false },
        { resourceCode: 'invoices', action: 'DELETE', scope: 'SUB_DEPARTMENT', positionId: 'pos-1', departmentId: null, subDepartmentId: 'sub-1', role: null, allow: true },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('explicit deny Rule blocks even when baseline would allow', async () => {
      const user = makeJwtUser({ role: 'DEPARTMENT_HEAD', departmentId: 'dept-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      // GLOBAL deny for DEPARTMENT_HEAD on invoices/CREATE
      mockPrisma.rule.findMany.mockResolvedValue([
        { resourceCode: 'invoices', action: 'CREATE', scope: 'GLOBAL', positionId: null, role: 'DEPARTMENT_HEAD', departmentId: null, subDepartmentId: null, allow: false },
      ]);
      await requireRule('invoices', 'CREATE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('role-based rule fallback when no position-specific rule', async () => {
      const user = makeJwtUser({ role: 'TEAM_LEAD', departmentId: 'dept-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      // No position, so role-based GLOBAL allow
      mockPrisma.rule.findMany.mockResolvedValue([
        { resourceCode: 'invoices', action: 'APPROVE', scope: 'GLOBAL', positionId: null, role: 'TEAM_LEAD', departmentId: null, subDepartmentId: null, allow: true },
      ]);
      await requireRule('invoices', 'APPROVE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('owner-scope: UPDATE/DELETE fallback to owner check', () => {
    it('allows DELETE when baseline denies but user is owner', async () => {
      const user = makeJwtUser({ id: 'user-owner', role: 'EMPLOYEE', departmentId: 'dept-1' });
      const res = mockRes();
      const next = jest.fn();
      const deleteReq = makeReq(user, { id: 'inv-1' });
      mockPrisma.invoice.findUnique.mockResolvedValue({ createdById: 'user-owner' });
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'DELETE')(deleteReq, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies DELETE when user is not owner and no Rule allows', async () => {
      const user = makeJwtUser({ id: 'user-other', role: 'EMPLOYEE', departmentId: 'dept-1' });
      const req = makeReq(user, { id: 'inv-1' });
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.invoice.findUnique.mockResolvedValue({ createdById: 'user-owner' });
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('denies DELETE when resource has no owner mapping', async () => {
      const user = makeJwtUser({ id: 'user-1', role: 'EMPLOYEE', departmentId: 'dept-1' });
      const req = makeReq(user, { id: 'rec-1' });
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      // resourceCode 'unknown-resource' has no entry in RESOURCE_TO_MODEL
      await requireRule('unknown-resource', 'DELETE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('uses baseline allow without owner check when action is not UPDATE/DELETE', async () => {
      const user = makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1' });
      const req = makeReq(user);
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      // CREATE baseline allows EMPLOYEE — no owner check needed
      await requireRule('invoices', 'CREATE')(req, res, next);
      expect(next).toHaveBeenCalled();
      // Owner lookup should not have been called
      expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('baseline per role', () => {
    it('EMPLOYEE denied DELETE via baseline', async () => {
      const req = makeReq(makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1' }));
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('EMPLOYEE denied APPROVE via baseline', async () => {
      const req = makeReq(makeJwtUser({ role: 'EMPLOYEE', departmentId: 'dept-1' }));
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'APPROVE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('TEAM_LEAD allowed APPROVE via baseline', async () => {
      const req = makeReq(makeJwtUser({ role: 'TEAM_LEAD', departmentId: 'dept-1' }));
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'APPROVE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('TEAM_LEAD denied DELETE via baseline', async () => {
      const req = makeReq(makeJwtUser({ role: 'TEAM_LEAD', departmentId: 'dept-1' }));
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('DEPARTMENT_HEAD allowed DELETE via baseline', async () => {
      const req = makeReq(makeJwtUser({ role: 'DEPARTMENT_HEAD', departmentId: 'dept-1' }));
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.rule.findMany.mockResolvedValue([]);
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('effectiveRole from Position.defaultRole', () => {
    it('uses Position.defaultRole instead of JWT role', async () => {
      // JWT says EMPLOYEE but position says DEPARTMENT_HEAD — DELETE should pass
      const jwtUser = makeJwtUser({ id: 'user-pos', role: 'EMPLOYEE', departmentId: 'dept-1' });
      const req = makeReq(jwtUser);
      const res = mockRes();
      const next = jest.fn();
      mockPrisma.employee.findUnique.mockResolvedValue({ positionId: 'pos-head', subDepartmentId: null });
      mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'DEPARTMENT_HEAD' });
      await requireRule('invoices', 'DELETE')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

// ─── RESOURCE_TO_MODEL sanity ────────────────────────────────────────────

describe('RESOURCE_TO_MODEL', () => {
  it('contains expected resource codes', () => {
    expect(RESOURCE_TO_MODEL['invoices']).toBeDefined();
    expect(RESOURCE_TO_MODEL['customer-feedbacks']).toBeDefined();
    expect(RESOURCE_TO_MODEL['tasks']).toBeDefined();
  });
});

// ─── ruleService.getMatrix ───────────────────────────────────────────────

describe('ruleService.getMatrix', () => {
  beforeEach(resetMocks);

  it('filters by positionId when provided', async () => {
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices', isActive: true }]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    await ruleService.getMatrix({ positionId: 'pos-1' });
    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ positionId: 'pos-1' }) }),
    );
  });

  it('filters by subDepartmentId when provided (P1-07 fix)', async () => {
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices', isActive: true }]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    await ruleService.getMatrix({ positionId: 'pos-1', subDepartmentId: 'sub-1' });
    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ subDepartmentId: 'sub-1' }) }),
    );
  });

  it('filters by departmentId when provided', async () => {
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices', isActive: true }]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    await ruleService.getMatrix({ departmentId: 'dept-1' });
    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ departmentId: 'dept-1' }) }),
    );
  });

  it('returns resources, rules, actions', async () => {
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices', isActive: true }]);
    mockPrisma.rule.findMany.mockResolvedValue([
      { resourceCode: 'invoices', action: 'READ', scope: 'GLOBAL' } as any,
    ]);
    const result = await ruleService.getMatrix({});
    expect(result.resources).toHaveLength(1);
    expect(result.rules).toHaveLength(1);
    expect(result.actions).toContain('CREATE');
    expect(result.actions).toContain('DELETE');
  });

  it('calls resource.findMany with isActive:true filter', async () => {
    mockPrisma.resource.findMany.mockResolvedValue([]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    await ruleService.getMatrix({});
    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });
});

// ─── ruleService.getMyPermissions ────────────────────────────────────────

describe('ruleService.getMyPermissions', () => {
  beforeEach(resetMocks);

  it('ADMIN gets allow:true for all resources×actions', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', departmentId: 'dept-1', subDepartmentId: null });
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices' }, { code: 'orders' }] as any);
    const result = await ruleService.getMyPermissions('admin-1');
    // 2 resources × 8 actions
    expect(result).toHaveLength(16);
    expect(result.every((r) => r.allow === true)).toBe(true);
    expect(result.every((r) => r.source === 'ADMIN_BYPASS')).toBe(true);
  });

  it('delegation shadows baseline — DELEGATION source', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: null });
    mockPrisma.employee.findUnique.mockResolvedValue({ positionId: null, subDepartmentId: null, userId: 'user-1' });
    mockPrisma.position.findUnique.mockResolvedValue(null);
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices' }] as any);
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    mockPrisma.delegation.findMany.mockResolvedValue([
      { resourceCode: 'invoices', action: 'DELETE', departmentId: null, subDepartmentId: null, from: past, to: future, isActive: true },
    ]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    const result = await ruleService.getMyPermissions('user-1');
    const deleteEntry = result.find((r) => r.resourceCode === 'invoices' && r.action === 'DELETE');
    expect(deleteEntry).toBeDefined();
    expect(deleteEntry!.allow).toBe(true);
    expect(deleteEntry!.source).toBe('DELEGATION');
  });

  it('delegation with non-matching scope does not shadow', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: 'sub-1' });
    mockPrisma.employee.findUnique.mockResolvedValue({ positionId: null, subDepartmentId: 'sub-1', userId: 'user-1' });
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices' }] as any);
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    mockPrisma.delegation.findMany.mockResolvedValue([
      { resourceCode: 'invoices', action: 'DELETE', departmentId: 'dept-2', subDepartmentId: null, from: past, to: future, isActive: true },
    ]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    const result = await ruleService.getMyPermissions('user-1');
    const deleteEntry = result.find((r) => r.resourceCode === 'invoices' && r.action === 'DELETE');
    // Baseline denies EMPLOYEE DELETE
    expect(deleteEntry!.allow).toBe(false);
    expect(deleteEntry!.source).toBe('BASELINE_DENY');
  });

  it('falls back to baseline when no Rule or delegation', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: null });
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices' }] as any);
    mockPrisma.delegation.findMany.mockResolvedValue([]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    const result = await ruleService.getMyPermissions('user-1');
    const readEntry = result.find((r) => r.action === 'READ');
    const deleteEntry = result.find((r) => r.action === 'DELETE');
    expect(readEntry!.allow).toBe(true);
    expect(readEntry!.source).toBe('BASELINE_ALLOW');
    expect(deleteEntry!.allow).toBe(false);
    expect(deleteEntry!.source).toBe('BASELINE_DENY');
  });

  it('uses Position.defaultRole for baseline', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: null });
    mockPrisma.employee.findUnique.mockResolvedValue({ positionId: 'pos-head', userId: 'user-1' });
    mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'DEPARTMENT_HEAD' });
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([{ code: 'invoices' }] as any);
    mockPrisma.delegation.findMany.mockResolvedValue([]);
    mockPrisma.rule.findMany.mockResolvedValue([]);
    const result = await ruleService.getMyPermissions('user-1');
    const deleteEntry = result.find((r) => r.action === 'DELETE');
    // DEPARTMENT_HEAD baseline allows DELETE
    expect(deleteEntry!.allow).toBe(true);
  });
});

// ─── ruleService Rule scope validation ───────────────────────────────────

describe('ruleService Rule scope validation', () => {
  beforeEach(resetMocks);

  it('GLOBAL with stray departmentId → 400', async () => {
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'GLOBAL',
        departmentId: 'dept-1',
        allow: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('GLOBAL with stray subDepartmentId → 400', async () => {
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'GLOBAL',
        subDepartmentId: 'sub-1',
        allow: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('DEPARTMENT without departmentId → 400', async () => {
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'DEPARTMENT',
        allow: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('DEPARTMENT with stray subDepartmentId → 400', async () => {
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'DEPARTMENT',
        departmentId: 'dept-1',
        subDepartmentId: 'sub-1',
        allow: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('SUB_DEPARTMENT without subDepartmentId → 400', async () => {
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'SUB_DEPARTMENT',
        allow: true,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('valid GLOBAL without ids succeeds (no scope error)', async () => {
    const mockRule = { id: 'rule-1', resourceCode: 'invoices', action: 'READ', scope: 'GLOBAL' };
    mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices' });
    mockPrisma.rule.findFirst.mockResolvedValue(null);
    mockPrisma.rule.create.mockResolvedValue(mockRule as any);
    mockPrisma.ruleAuditLog.create.mockResolvedValue({} as any);
    const result = await ruleService.createRule({
      resourceCode: 'invoices',
      action: 'READ',
      scope: 'GLOBAL',
      allow: true,
    });
    expect(result).toEqual(mockRule);
  });

  it('updateRule validates scope when scope field changes', async () => {
    mockPrisma.rule.findUnique.mockResolvedValue({
      id: 'rule-1',
      resourceCode: 'invoices',
      action: 'READ',
      scope: 'GLOBAL',
      departmentId: null,
      subDepartmentId: null,
      positionId: null,
      role: null,
      allow: true,
    } as any);
    // Try to change to DEPARTMENT without providing departmentId
    await expect(
      ruleService.updateRule('rule-1', { scope: 'DEPARTMENT' } as any),
    ).rejects.toThrow(ValidationError);
  });
});

// ─── Global duplicate ────────────────────────────────────────────────────

describe('Global duplicate prevention', () => {
  beforeEach(resetMocks);

  it('duplicate GLOBAL rule with same resource/action/role/position → 409', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices' });
    mockPrisma.rule.findFirst.mockResolvedValue({ id: 'existing-rule' } as any);
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'READ',
        scope: 'GLOBAL',
        role: 'EMPLOYEE',
        allow: true,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('duplicate GLOBAL with same position → 409', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices' });
    mockPrisma.rule.findFirst.mockResolvedValue({ id: 'existing-rule' } as any);
    await expect(
      ruleService.createRule({
        resourceCode: 'invoices',
        action: 'DELETE',
        scope: 'GLOBAL',
        positionId: 'pos-1',
        allow: true,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('findFirst is called with null normalization for duplicate check', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices' });
    mockPrisma.rule.findFirst.mockResolvedValue(null);
    mockPrisma.rule.create.mockResolvedValue({ id: 'new-rule' } as any);
    mockPrisma.ruleAuditLog.create.mockResolvedValue({} as any);
    await ruleService.createRule({
      resourceCode: 'invoices',
      action: 'READ',
      scope: 'GLOBAL',
      allow: true,
    });
    expect(mockPrisma.rule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resourceCode: 'invoices',
          departmentId: null,
          subDepartmentId: null,
          positionId: null,
          role: null,
        }),
      }),
    );
  });
});

// ─── Audit log ───────────────────────────────────────────────────────────

describe('Rule audit log', () => {
  beforeEach(resetMocks);

  it('createRule writes RuleAuditLog with CREATE action', async () => {
    mockPrisma.resource.findUnique.mockResolvedValue({ code: 'invoices' });
    mockPrisma.rule.findFirst.mockResolvedValue(null);
    const mockRule = { id: 'rule-new', resourceCode: 'invoices', action: 'READ', scope: 'GLOBAL', allow: true };
    mockPrisma.rule.create.mockResolvedValue(mockRule as any);
    mockPrisma.ruleAuditLog.create.mockResolvedValue({} as any);
    await ruleService.createRule({
      resourceCode: 'invoices',
      action: 'READ',
      scope: 'GLOBAL',
      allow: true,
      actorId: 'actor-1',
    });
    expect(mockPrisma.ruleAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ruleId: 'rule-new', actorId: 'actor-1', action: 'CREATE' }),
      }),
    );
  });

  it('updateRule writes RuleAuditLog with UPDATE and before/after', async () => {
    const existing = { id: 'rule-1', resourceCode: 'invoices', action: 'READ', scope: 'GLOBAL', departmentId: null, subDepartmentId: null, positionId: null, role: null, allow: true };
    mockPrisma.rule.findUnique.mockResolvedValue(existing as any);
    const updated = { ...existing, allow: false };
    mockPrisma.rule.update.mockResolvedValue(updated as any);
    mockPrisma.ruleAuditLog.create.mockResolvedValue({} as any);
    await ruleService.updateRule('rule-1', { allow: false, actorId: 'actor-1' } as any);
    expect(mockPrisma.ruleAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ruleId: 'rule-1', actorId: 'actor-1', action: 'UPDATE' }),
      }),
    );
    const callArg = mockPrisma.ruleAuditLog.create.mock.calls[0][0];
    expect(callArg.data.before).toBeDefined();
    expect(callArg.data.after).toBeDefined();
  });

  it('deleteRule writes RuleAuditLog with DELETE and before', async () => {
    const existing = { id: 'rule-1', resourceCode: 'invoices', action: 'READ', scope: 'GLOBAL', allow: true };
    mockPrisma.rule.findUnique.mockResolvedValue(existing as any);
    mockPrisma.rule.delete.mockResolvedValue(existing as any);
    mockPrisma.ruleAuditLog.create.mockResolvedValue({} as any);
    await ruleService.deleteRule('rule-1', 'actor-1');
    expect(mockPrisma.ruleAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ruleId: null, actorId: 'actor-1', action: 'DELETE' }),
      }),
    );
    const callArg = mockPrisma.ruleAuditLog.create.mock.calls[0][0];
    expect(callArg.data.before).toBeDefined();
  });
});

// ─── listResources ───────────────────────────────────────────────────────

describe('ruleService.listResources', () => {
  beforeEach(resetMocks);

  it('filters by isActive:true', async () => {
    const { cacheGet } = await import('@utils/cache');
    // cache miss
    (cacheGet as jest.Mock).mockResolvedValue(null);
    mockPrisma.resource.findMany.mockResolvedValue([]);
    await ruleService.listResources();
    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });
});
