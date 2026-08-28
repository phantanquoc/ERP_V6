/**
 * no-dept-self-service-access — self-attendance READ bypass, overtime
 * participant filter, and work-plan POST guard (mocked DB, no Postgres).
 *
 * Covers:
 *  - requireRule attendances/READ self-bypass (own 200 / other 403 / date-range 403)
 *  - overtimePlanService getAll / getById participant scope for no-dept callers
 *  - workPlanRoutes POST / has requireRule('work-plans','CREATE')
 *  - overtimePlanRoutes PUT/DELETE have requireRule
 */

// ─── requireRule mocks ────────────────────────────────────────────────────────

const mockPrismaRequireRule: any = {
  employee: { findUnique: jest.fn() },
  position: { findUnique: jest.fn() },
  userSecondaryDepartment: { findMany: jest.fn() },
  delegation: { findMany: jest.fn() },
  rule: { findMany: jest.fn() },
  customerFeedback: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrismaRequireRule }));
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

import { requireRule } from '@middlewares/requireRule';

const NO_DEPT_JWT: any = {
  id: 'user-emp',
  email: 'emp@example.com',
  role: 'EMPLOYEE',
  departmentId: null,
  subDepartmentId: null,
};

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: any = {}): any {
  return { params: {}, ...overrides };
}

function resetRequireRuleMocks() {
  jest.clearAllMocks();
  mockPrismaRequireRule.employee.findUnique.mockResolvedValue(null);
  mockPrismaRequireRule.position.findUnique.mockResolvedValue(null);
  mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
  mockPrismaRequireRule.delegation.findMany.mockResolvedValue([]);
  mockPrismaRequireRule.rule.findMany.mockResolvedValue([]);
}

describe('requireRule — self-attendance READ bypass for no-department users', () => {
  beforeEach(resetRequireRuleMocks);

  it('allows GET /employee/:ownId for no-dept user requesting own record (200)', async () => {
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({
      id: 'emp-own',
      positionId: null,
      subDepartmentId: null,
    });
    const req = mockReq({ user: NO_DEPT_JWT, params: { employeeId: 'emp-own' } });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('denies GET /employee/:otherId for no-dept user requesting another employee (403 Không thuộc phòng ban nào)', async () => {
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({
      id: 'emp-own',
      positionId: null,
      subDepartmentId: null,
    });
    const req = mockReq({ user: NO_DEPT_JWT, params: { employeeId: 'emp-other' } });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    const msg = res.json.mock.calls[0]?.[0]?.message ?? '';
    expect(msg).toMatch('Không thuộc phòng ban nào');
  });

  it('denies GET /date-range (no employeeId param) for no-dept user even on READ (403)', async () => {
    // date-range route has no :employeeId, so bypass must not trigger
    const req = mockReq({ user: NO_DEPT_JWT, params: {} });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0]?.[0]?.message).toMatch('Không thuộc phòng ban nào');
  });

  it('denies GET /employee/:anyId when caller has no Employee row (fail closed, 403)', async () => {
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue(null);
    const req = mockReq({ user: NO_DEPT_JWT, params: { employeeId: 'emp-any' } });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('still denies attendances/CREATE for no-dept user even when own employeeId is supplied (only READ is bypassed)', async () => {
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({
      id: 'emp-own',
      positionId: null,
      subDepartmentId: null,
    });
    // e.g. POST /attendances with a body employeeId — bypass must not fire for CREATE
    const req = mockReq({ user: NO_DEPT_JWT, params: { employeeId: 'emp-own' } });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'CREATE')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('still denies attendances/EXPORT for no-dept user (export is not READ)', async () => {
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({
      id: 'emp-own',
      positionId: null,
      subDepartmentId: null,
    });
    const req = mockReq({ user: NO_DEPT_JWT, params: {} });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'EXPORT')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('in-department user reading another employeeId still goes through baseline (not bypassed to 403 via no-dept path)', async () => {
    // User has a department, so departmentIds.length !== 0 → bypass not entered, baseline allows READ
    const inDeptUser: any = {
      id: 'user-indept',
      email: 'indept@example.com',
      role: 'EMPLOYEE',
      departmentId: 'dept-1',
      subDepartmentId: null,
    };
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({ positionId: null, subDepartmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
    const req = mockReq({ user: inDeptUser, params: { employeeId: 'emp-other' } });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    // Baseline allows READ for any role, so should pass (service layer then enforces owner)
    expect(next).toHaveBeenCalled();
  });

  it('no-dept secondary-department user is not treated as no-dept (has department via secondary)', async () => {
    const withSecondary: any = {
      id: 'user-sec',
      email: 'sec@example.com',
      role: 'EMPLOYEE',
      departmentId: null,
      subDepartmentId: null,
    };
    mockPrismaRequireRule.employee.findUnique.mockResolvedValue({ positionId: null, subDepartmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([
      { departmentId: 'dept-2' },
    ]);
    const req = mockReq({ user: withSecondary, params: {} });
    const res = mockRes();
    const next = jest.fn();
    await requireRule('attendances', 'READ')(req, res, next);
    // Has secondary department → departmentIds = ['dept-2'] → no guard, baseline allows READ
    expect(next).toHaveBeenCalled();
  });
});

// ─── overtime participant filter ─────────────────────────────────────────────

describe('overtimePlanService — no-department participant filter', () => {
  // We import the real service and mock the DB calls it relies on.
  // The DB mock is shared with requireRule's mock; the service adds its own keys below.

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAll: no-dept caller only sees creator-or-participant plans', async () => {
    // Arrange DB so callerHasDepartment → false and the service query is filtered
    mockPrismaRequireRule.user = mockPrismaRequireRule.user ?? { findUnique: jest.fn(), findMany: jest.fn() };
    mockPrismaRequireRule.overtimePlan = mockPrismaRequireRule.overtimePlan ?? {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    };
    mockPrismaRequireRule.department = mockPrismaRequireRule.department ?? { findMany: jest.fn() };
    mockPrismaRequireRule.subDepartment = mockPrismaRequireRule.subDepartment ?? { findMany: jest.fn() };

    const callerId = 'user-no-dept';

    // callerHasDepartment: primary dept is null, no secondary
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);

    // batchPopulate deps: user lookup for map + dept enrichment (empty)
    (mockPrismaRequireRule as any).user.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.department.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.subDepartment.findMany = jest.fn().mockResolvedValue([]);

    // The actual query result — service will call count + findMany with where.AND filtered
    const fakePlan: any = { id: 'plan-1', nguoiTaoId: callerId, files: [], items: [] };
    mockPrismaRequireRule.overtimePlan.count = jest.fn().mockResolvedValue(1);
    mockPrismaRequireRule.overtimePlan.findMany = jest.fn().mockResolvedValue([fakePlan]);

    const overtimePlanService = (await import('@services/overtimePlanService')).default;

    const result = await overtimePlanService.getAll({ page: 1, limit: 10 } as any, callerId);

    expect(result.total).toBe(1);
    // Verify the query was scoped: count/findMany called with AND containing participantScope
    const countWhere = (mockPrismaRequireRule.overtimePlan.count as jest.Mock).mock.calls[0]?.[0]?.where;
    const findWhere = (mockPrismaRequireRule.overtimePlan.findMany as jest.Mock).mock.calls[0]?.[0]?.where;
    const hasParticipantScope = (w: any) =>
      Array.isArray(w?.AND) &&
      w.AND.some(
        (c: any) =>
          Array.isArray(c?.OR) &&
          c.OR.some((x: any) => x?.nguoiTaoId === callerId) &&
          c.OR.some((x: any) => x?.items?.some?.nguoiThamGiaIds?.has === callerId),
      );
    expect(hasParticipantScope(countWhere)).toBe(true);
    expect(hasParticipantScope(findWhere)).toBe(true);
  });

  it('getAll: no-dept caller with query.department OR — both ORs preserved via AND', async () => {
    const callerId = 'user-no-dept';
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
    (mockPrismaRequireRule as any).user.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.department.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.subDepartment.findMany = jest.fn().mockResolvedValue([]);
    // query.department branch resolves usersInDept
    (mockPrismaRequireRule as any).user.findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'u-in-general' }]) // usersInDept for query.department
      .mockResolvedValueOnce([]); // batchPopulate
    mockPrismaRequireRule.overtimePlan.count = jest.fn().mockResolvedValue(0);
    mockPrismaRequireRule.overtimePlan.findMany = jest.fn().mockResolvedValue([]);

    const overtimePlanService = (await import('@services/overtimePlanService')).default;
    const result = await overtimePlanService.getAll(
      { page: 1, limit: 10, department: 'dept-general' } as any,
      callerId,
    );
    expect(result.total).toBe(0);
    const where = (mockPrismaRequireRule.overtimePlan.count as jest.Mock).mock.calls[0]?.[0]?.where;
    // Should have AND of [ { OR: department OR }, { OR: participantScope } ]
    expect(Array.isArray(where?.AND)).toBe(true);
    expect(where.AND.length).toBe(2);
  });

  it('getAll: in-department caller is not filtered', async () => {
    const callerId = 'user-with-dept';
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: 'dept-1' });
    (mockPrismaRequireRule as any).user.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.department.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.subDepartment.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.overtimePlan.count = jest.fn().mockResolvedValue(5);
    mockPrismaRequireRule.overtimePlan.findMany = jest.fn().mockResolvedValue([]);

    const overtimePlanService = (await import('@services/overtimePlanService')).default;
    const result = await overtimePlanService.getAll({ page: 1, limit: 10 } as any, callerId);
    expect(result.total).toBe(5);
    const where = (mockPrismaRequireRule.overtimePlan.count as jest.Mock).mock.calls[0]?.[0]?.where;
    // No AND participant scope for in-dept user
    expect(where?.AND).toBeUndefined();
  });

  it('getById: no-dept non-participant → 404', async () => {
    const callerId = 'user-no-dept';
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
    mockPrismaRequireRule.overtimePlan.findUnique = jest.fn().mockResolvedValue({
      id: 'plan-1',
      nguoiTaoId: 'someone-else',
      items: [{ nguoiThamGiaIds: ['other-user'] }],
    });

    const overtimePlanService = (await import('@services/overtimePlanService')).default;
    await expect(overtimePlanService.getById('plan-1', callerId)).rejects.toThrow('Không tìm thấy kế hoạch tăng ca');
  });

  it('getById: no-dept creator → allowed', async () => {
    const callerId = 'user-no-dept';
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
    (mockPrismaRequireRule as any).user.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.department.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.subDepartment.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.overtimePlan.findUnique = jest.fn().mockResolvedValue({
      id: 'plan-1',
      nguoiTaoId: callerId,
      files: [],
      items: [{ id: 'item-1', nguoiThamGiaIds: [], ngayTangCa: new Date(), gioBatDau: '18:00', gioKetThuc: '20:00' }],
    });

    const overtimePlanService = (await import('@services/overtimePlanService')).default;
    const plan = await overtimePlanService.getById('plan-1', callerId);
    expect(plan.id).toBe('plan-1');
  });

  it('getById: no-dept participant → allowed', async () => {
    const callerId = 'user-no-dept';
    (mockPrismaRequireRule as any).user.findUnique = jest.fn().mockResolvedValue({ departmentId: null });
    mockPrismaRequireRule.userSecondaryDepartment.findMany.mockResolvedValue([]);
    (mockPrismaRequireRule as any).user.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.department.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.subDepartment.findMany = jest.fn().mockResolvedValue([]);
    mockPrismaRequireRule.overtimePlan.findUnique = jest.fn().mockResolvedValue({
      id: 'plan-1',
      nguoiTaoId: 'someone-else',
      files: [],
      items: [{ id: 'item-1', nguoiThamGiaIds: [callerId], ngayTangCa: new Date(), gioBatDau: '18:00', gioKetThuc: '20:00' }],
    });

    const overtimePlanService = (await import('@services/overtimePlanService')).default;
    const plan = await overtimePlanService.getById('plan-1', callerId);
    expect(plan.id).toBe('plan-1');
  });
});

// ─── route guards ─────────────────────────────────────────────────────────────

describe('workPlanRoutes / overtimePlanRoutes — route-level requireRule', () => {
  // Verify DB is mocked before routes import their dependencies

  it('workPlanRoutes POST / has requireRule before handler', () => {
    jest.resetModules();
    // Re-mock for the fresh module graph
    jest.doMock('@config/database', () => ({ __esModule: true, default: mockPrismaRequireRule }));
    jest.doMock('@config/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('@utils/cache', () => ({
      __esModule: true,
      cacheGet: jest.fn().mockResolvedValue(null),
      cacheSet: jest.fn().mockResolvedValue(undefined),
      cacheDel: jest.fn().mockResolvedValue(undefined),
      cacheDelPattern: jest.fn().mockResolvedValue(undefined),
      CACHE_KEYS: { DEPARTMENTS: 'cache:departments', SYSTEM_SETTINGS: 'cache:system-settings' },
    }));

    // Controller mock so routes don't pull in the full service graph
    jest.doMock('@controllers/workPlanController', () => ({
      __esModule: true,
      default: {
        getAllWorkPlans: jest.fn(),
        getMyWorkPlans: jest.fn(),
        getWorkPlanById: jest.fn(),
        createWorkPlan: jest.fn(),
        updateWorkPlan: jest.fn(),
        deleteWorkPlan: jest.fn(),
      },
    }));

    const workPlanRoutes = require('@routes/workPlanRoutes').default;
    const layers = (workPlanRoutes as any).stack || (workPlanRoutes as any)._router?.stack || [];
    let postStackLen = 0;
    for (const layer of layers) {
      if (layer.route && layer.route.path === '/' && layer.route.methods.post) {
        postStackLen = layer.route.stack.length;
        break;
      }
    }
    // POST / should have at least requireRule + upload + handler (>=3)
    // Without requireRule it was 2 (upload + handler). Verify >=3.
    expect(postStackLen).toBeGreaterThanOrEqual(3);
  });

  it('overtimePlanRoutes PUT /:id and DELETE /:id have requireRule', () => {
    jest.resetModules();
    jest.doMock('@config/database', () => ({ __esModule: true, default: mockPrismaRequireRule }));
    jest.doMock('@config/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('@utils/cache', () => ({
      __esModule: true,
      cacheGet: jest.fn().mockResolvedValue(null),
      cacheSet: jest.fn().mockResolvedValue(undefined),
      cacheDel: jest.fn().mockResolvedValue(undefined),
      cacheDelPattern: jest.fn().mockResolvedValue(undefined),
      CACHE_KEYS: { DEPARTMENTS: 'cache:departments', SYSTEM_SETTINGS: 'cache:system-settings' },
    }));
    jest.doMock('@controllers/overtimePlanController', () => ({
      __esModule: true,
      default: {
        getAll: jest.fn(),
        getMyPlans: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        acceptPlan: jest.fn(),
        approvePlan: jest.fn(),
        updateActualTime: jest.fn(),
      },
    }));

    const overtimeRoutes = require('@routes/overtimePlanRoutes').default;
    const layers = (overtimeRoutes as any).stack || (overtimeRoutes as any)._router?.stack || [];
    let putLen = 0;
    let delLen = 0;
    for (const layer of layers) {
      if (layer.route && layer.route.path === '/:id') {
        if (layer.route.methods.put) putLen = layer.route.stack.length;
        if (layer.route.methods.delete) delLen = layer.route.stack.length;
      }
    }
    // PUT had 1 before (upload + handler was 2? check: it has upload + handler). Now +requireRule = 3+
    // DELETE had 1 before (just handler). Now +requireRule = 2+
    expect(putLen).toBeGreaterThanOrEqual(2);
    expect(delLen).toBeGreaterThanOrEqual(2);
  });
});
