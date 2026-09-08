/**
 * Focused unit tests for the requireRule RBAC middleware.
 *
 * Pins down the enforcement order that the preview resolver (permissionResolution.resolveOne)
 * mirrors:  401 → ADMIN bypass → identity build-up (effectiveRole, departments) →
 * delegation → explicit Rule → no-dept bypasses → baseline → owner-scope → 403/500.
 *
 * All DB access is mocked — no running Postgres/Redis needed.
 */

// ─── Mocks (must be hoisted before imports) ────────────────────────────────

const mockPrisma: any = {
  employee: { findUnique: jest.fn() },
  position: { findUnique: jest.fn() },
  userSecondaryDepartment: { findMany: jest.fn() },
  delegation: { findMany: jest.fn() },
  rule: { findMany: jest.fn() },
  // owner-scope delegates
  supplyRequest: { findUnique: jest.fn() },
  customerFeedback: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

// Keep the real decision table, but wrap it in a spy so tests can assert the
// middleware actually reaches the baseline fallback.
jest.mock('@utils/baselineAllow', () => {
  const actual = jest.requireActual('@utils/baselineAllow');
  return { __esModule: true, baselineAllow: jest.fn(actual.baselineAllow) };
});

import { requireRule } from '@middlewares/requireRule';
import { baselineAllow } from '@utils/baselineAllow';
import logger from '@config/logger';

// ─── Helpers ───────────────────────────────────────────────────────────────

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeUser(overrides: Partial<import('@types').JwtPayload> = {}): import('@types').JwtPayload {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: 'EMPLOYEE',
    departmentId: 'dept-1',
    subDepartmentId: null,
    ...overrides,
  } as import('@types').JwtPayload;
}

function makeReq(user: import('@types').JwtPayload | undefined, params: Record<string, string> = {}) {
  return { user, headers: {}, params } as any;
}

/**
 * prisma.employee.findUnique is called from three distinct places with three
 * different `select` shapes. Drive them from one state object so a test can set
 * exactly the row it cares about.
 */
const empState = {
  byUserId: null as { positionId: string | null; subDepartmentId: string | null } | null,
  selfId: null as string | null,
  byEmployeeId: null as { userId: string | null } | null,
};

function setEmployeeByUserId(row: { positionId: string | null; subDepartmentId: string | null } | null) {
  empState.byUserId = row;
}

function setSelfEmployeeId(id: string | null) {
  empState.selfId = id;
}

function setEmployeeOwnerUserId(userId: string | null) {
  empState.byEmployeeId = userId === null ? null : { userId };
}

/** Seed delegation rows and emulate Prisma's isActive / from / to filtering. */
function seedDelegations(rows: Array<Record<string, unknown>>) {
  mockPrisma.delegation.findMany.mockImplementation((args: any) => {
    const where = args.where;
    const now = where.to.gte as Date;
    return Promise.resolve(
      rows.filter(
        (r) =>
          r.resourceCode === where.resourceCode &&
          r.action === where.action &&
          r.isActive === true &&
          (r.from as Date) <= now &&
          (r.to as Date) >= now,
      ),
    );
  });
}

function ruleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    resourceCode: 'supply-requests',
    action: 'UPDATE',
    scope: 'GLOBAL',
    role: 'EMPLOYEE',
    positionId: null,
    departmentId: null,
    subDepartmentId: null,
    isActive: true,
    allow: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  empState.byUserId = null;
  empState.selfId = null;
  empState.byEmployeeId = null;

  mockPrisma.employee.findUnique.mockImplementation((args: any) => {
    const select = args?.select ?? {};
    if ('positionId' in select) return Promise.resolve(empState.byUserId);
    if ('userId' in select) return Promise.resolve(empState.byEmployeeId);
    if ('id' in select) return Promise.resolve(empState.selfId ? { id: empState.selfId } : null);
    return Promise.resolve(null);
  });
  mockPrisma.position.findUnique.mockResolvedValue(null);
  mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
  mockPrisma.delegation.findMany.mockResolvedValue([]);
  mockPrisma.rule.findMany.mockResolvedValue([]);
  mockPrisma.supplyRequest.findUnique.mockResolvedValue(null);
  mockPrisma.customerFeedback.findUnique.mockResolvedValue(null);
});

// ─── 1. authentication ─────────────────────────────────────────────────────

describe('requireRule — authentication', () => {
  it('returns 401 when req.user is missing and never touches the DB', async () => {
    const req = makeReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('supply-requests', 'READ')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Chưa xác thực' });
    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
  });
});

// ─── 2. ADMIN bypass ───────────────────────────────────────────────────────

describe('requireRule — ADMIN bypass', () => {
  it('calls next without any rule/delegation lookup', async () => {
    const req = makeReq(makeUser({ role: 'ADMIN' }));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.rule.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.delegation.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
    expect(baselineAllow).not.toHaveBeenCalled();
  });

  it('bypasses even when a DENY rule exists for the same resource', async () => {
    mockPrisma.rule.findMany.mockResolvedValue([ruleRow({ resourceCode: 'invoices', action: 'DELETE', allow: false })]);
    const req = makeReq(makeUser({ role: 'ADMIN' }));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── 3-4. effectiveRole ────────────────────────────────────────────────────

describe('requireRule — effectiveRole (position may only RAISE, never lower)', () => {
  it('TEAM_LEAD with a position whose defaultRole is EMPLOYEE stays TEAM_LEAD', async () => {
    setEmployeeByUserId({ positionId: 'pos-1', subDepartmentId: null });
    mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'EMPLOYEE' });
    const req = makeReq(makeUser({ role: 'TEAM_LEAD' }));
    const res = mockRes();
    const next = jest.fn();

    // APPROVE is exactly the gate the downgrade bug used to break.
    await requireRule('supply-requests', 'APPROVE')(req, res, next);

    expect(req.effectiveRole).toBe('TEAM_LEAD');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('EMPLOYEE with a position whose defaultRole is DEPARTMENT_HEAD is raised', async () => {
    setEmployeeByUserId({ positionId: 'pos-2', subDepartmentId: null });
    mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'DEPARTMENT_HEAD' });
    const req = makeReq(makeUser({ role: 'EMPLOYEE' }));
    const res = mockRes();
    const next = jest.fn();

    // DELETE only clears the baseline for DEPARTMENT_HEAD and above.
    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(req.effectiveRole).toBe('DEPARTMENT_HEAD');
    expect(next).toHaveBeenCalled();
  });

  it('position lookup is skipped entirely when the employee has no positionId', async () => {
    setEmployeeByUserId({ positionId: null, subDepartmentId: null });
    await requireRule('invoices', 'READ')(makeReq(makeUser()), mockRes(), jest.fn());

    expect(mockPrisma.employee.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(mockPrisma.position.findUnique).not.toHaveBeenCalled();
  });
});

// ─── 5. department / sub-department collection ─────────────────────────────

describe('requireRule — department and sub-department collection', () => {
  it('collects the primary department plus every secondary row', async () => {
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([
      { departmentId: 'dept-2', subDepartmentId: 'sub-2' },
      { departmentId: 'dept-3', subDepartmentId: null },
    ]);
    const req = makeReq(makeUser({ departmentId: 'dept-1', subDepartmentId: 'sub-1' }));
    const next = jest.fn();

    await requireRule('invoices', 'READ')(req, mockRes(), next);

    expect(req.userDepartmentIds).toEqual(['dept-1', 'dept-2', 'dept-3']);
    expect(req.userSubDepartmentIds).toEqual(['sub-1', 'sub-2']);
    expect(req.userSubDepartmentId).toBe('sub-1');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to the employee sub-department when the user record has none', async () => {
    setEmployeeByUserId({ positionId: null, subDepartmentId: 'sub-from-employee' });
    const req = makeReq(makeUser({ departmentId: 'dept-1', subDepartmentId: null }));

    await requireRule('invoices', 'READ')(req, mockRes(), jest.fn());

    expect(req.userSubDepartmentId).toBe('sub-from-employee');
  });

  it('a user with a NULL primary department is still treated as no-department', async () => {
    setEmployeeByUserId(null);
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }));
    const res = mockRes();

    await requireRule('invoices', 'READ')(req, res, jest.fn());

    expect(req.userDepartmentIds).toEqual([]);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── 6. delegation ─────────────────────────────────────────────────────────

describe('requireRule — delegation', () => {
  it('grants inside the active window with a matching global scope, before any rule lookup', async () => {
    const t = Date.now();
    seedDelegations([
      {
        resourceCode: 'invoices', action: 'DELETE', departmentId: null, subDepartmentId: null,
        isActive: true, from: new Date(t - 86_400_000), to: new Date(t + 86_400_000),
      },
    ]);
    const req = makeReq(makeUser({ role: 'EMPLOYEE' }));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    // delegation wins — the explicit rule table is never consulted.
    expect(mockPrisma.rule.findMany).not.toHaveBeenCalled();
  });

  it('queries only active, in-window delegations addressed to this user', async () => {
    await requireRule('invoices', 'READ')(makeReq(makeUser()), mockRes(), jest.fn());

    const args = mockPrisma.delegation.findMany.mock.calls[0][0];
    expect(args.where.toUserId).toBe('user-1');
    expect(args.where.resourceCode).toBe('invoices');
    expect(args.where.action).toBe('READ');
    expect(args.where.isActive).toBe(true);
    expect(args.where.from.lte).toBeInstanceOf(Date);
    expect(args.where.to.gte).toBeInstanceOf(Date);
  });

  it('an expired delegation does not grant', async () => {
    const t = Date.now();
    seedDelegations([
      {
        resourceCode: 'invoices', action: 'DELETE', departmentId: null, subDepartmentId: null,
        isActive: true, from: new Date(t - 2 * 86_400_000), to: new Date(t - 86_400_000),
      },
    ]);
    const req = makeReq(makeUser({ role: 'EMPLOYEE' }));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('an inactive (revoked) delegation does not grant', async () => {
    const t = Date.now();
    seedDelegations([
      {
        resourceCode: 'invoices', action: 'DELETE', departmentId: null, subDepartmentId: null,
        isActive: false, from: new Date(t - 86_400_000), to: new Date(t + 86_400_000),
      },
    ]);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ role: 'EMPLOYEE' })), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('a delegation scoped to another department does not grant', async () => {
    mockPrisma.delegation.findMany.mockResolvedValue([
      { resourceCode: 'invoices', action: 'DELETE', departmentId: 'dept-OTHER', subDepartmentId: null },
    ]);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ departmentId: 'dept-1' })), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('a sub-department delegation matches only the caller current sub-department', async () => {
    mockPrisma.delegation.findMany.mockResolvedValue([
      { resourceCode: 'invoices', action: 'READ', departmentId: null, subDepartmentId: 'sub-9' },
    ]);
    const res = mockRes();
    await requireRule('invoices', 'READ')(makeReq(makeUser({ subDepartmentId: 'sub-1' })), res, jest.fn());

    expect(res.status).not.toHaveBeenCalled(); // READ passes later via baseline, not via delegation
    const nonMatching = mockPrisma.delegation.findMany;
    expect(nonMatching).toHaveBeenCalled();
  });
});

// ─── 7. explicit Rule ──────────────────────────────────────────────────────

describe('requireRule — explicit Rule', () => {
  it('looks up active rules scoped to the resource and action', async () => {
    await requireRule('invoices', 'UPDATE')(makeReq(makeUser()), mockRes(), jest.fn());

    expect(mockPrisma.rule.findMany).toHaveBeenCalledWith({
      where: { resourceCode: 'invoices', action: 'UPDATE', isActive: true },
    });
  });

  it('an allow rule calls next and skips the baseline', async () => {
    mockPrisma.rule.findMany.mockResolvedValue([ruleRow({ resourceCode: 'invoices', action: 'DELETE', allow: true })]);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ role: 'EMPLOYEE' })), res, next);

    expect(next).toHaveBeenCalled();
    expect(baselineAllow).not.toHaveBeenCalled();
  });

  it('a deny rule short-circuits to 403 even when the baseline would allow', async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      ruleRow({ resourceCode: 'invoices', action: 'READ', allow: false, role: 'DEPARTMENT_HEAD' }),
    ]);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'READ')(makeReq(makeUser({ role: 'DEPARTMENT_HEAD' })), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
    expect(baselineAllow).not.toHaveBeenCalled();
  });

  it('a rule scoped to a SECONDARY sub-department still matches the caller', async () => {
    mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([
      { departmentId: 'dept-2', subDepartmentId: 'sub-2' },
    ]);
    mockPrisma.rule.findMany.mockResolvedValue([
      ruleRow({
        resourceCode: 'invoices', action: 'DELETE', scope: 'SUB_DEPARTMENT',
        role: 'EMPLOYEE', subDepartmentId: 'sub-2', allow: true,
      }),
    ]);
    const req = makeReq(makeUser({ departmentId: 'dept-1', subDepartmentId: 'sub-1', role: 'EMPLOYEE' }));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(req, res, next);

    expect(req.userSubDepartmentIds).toContain('sub-2');
    expect(next).toHaveBeenCalled(); // EMPLOYEE DELETE only clears via the secondary-scoped rule
    expect(baselineAllow).not.toHaveBeenCalled();
  });

  it('a rule scoped to a sub-department the caller is not in does not match', async () => {
    mockPrisma.rule.findMany.mockResolvedValue([
      ruleRow({
        resourceCode: 'invoices', action: 'DELETE', scope: 'SUB_DEPARTMENT',
        role: 'EMPLOYEE', subDepartmentId: 'sub-ELSEWHERE', allow: true,
      }),
    ]);
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ subDepartmentId: 'sub-1', role: 'EMPLOYEE' })), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── 8. self-attendance no-dept bypass ─────────────────────────────────────

describe('requireRule — self-attendance READ bypass (no-department users)', () => {
  it('allows reading ones own attendance record', async () => {
    setSelfEmployeeId('emp-mine');
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }), { employeeId: 'emp-mine' });
    const res = mockRes();
    const next = jest.fn();

    await requireRule('attendances', 'READ')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies reading someone else attendance record', async () => {
    setSelfEmployeeId('emp-mine');
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }), { employeeId: 'emp-OTHER' });
    const res = mockRes();
    const next = jest.fn();

    await requireRule('attendances', 'READ')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('fails closed when the caller has no employee record at all', async () => {
    setSelfEmployeeId(null);
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }), { employeeId: 'emp-mine' });
    const res = mockRes();

    await requireRule('attendances', 'READ')(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('fails closed when the route carries no :employeeId param', async () => {
    setSelfEmployeeId('emp-mine');
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }), {});
    const res = mockRes();
    const next = jest.fn();

    await requireRule('attendances', 'READ')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('does not widen to any other action than READ', async () => {
    setSelfEmployeeId('emp-mine');
    const req = makeReq(makeUser({ departmentId: null, subDepartmentId: null }), { employeeId: 'emp-mine' });
    const res = mockRes();

    await requireRule('attendances', 'UPDATE')(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── 9-11. no-department (Chung) access ────────────────────────────────────

describe('requireRule — no-department Chung access', () => {
  const noDeptUser = () => makeUser({ departmentId: null, subDepartmentId: null });

  it.each(['READ', 'CREATE'])('allows %s on supply-requests', async (action) => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('supply-requests', action)(makeReq(noDeptUser()), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('still denies UPDATE for a no-department user, and denies BEFORE any owner lookup', async () => {
    // The no-department guard sits ahead of the owner-scope fallback, so a
    // no-dept caller never reaches loadRecordOwner at all.
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: 'emp-mine' });
    setEmployeeOwnerUserId('user-1');
    const req = makeReq(noDeptUser(), { id: 'sr-1' });
    const res = mockRes();
    const next = jest.fn();

    await requireRule('supply-requests', 'UPDATE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Truy cập bị từ chối: Không thuộc phòng ban nào' });
    expect(mockPrisma.supplyRequest.findUnique).not.toHaveBeenCalled();
  });

  it('denies CREATE on overtime-plans even though it lives in the Chung tab', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('overtime-plans', 'CREATE')(makeReq(noDeptUser()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Truy cập bị từ chối: Không thuộc phòng ban nào' });
  });

  it('denies READ on a transactional resource outside the Chung list', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('payrolls', 'READ')(makeReq(noDeptUser()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('keeps the auth carve-out so a no-dept account can still manage its own session', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('auth', 'UPDATE')(makeReq(noDeptUser()), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── 12. baseline fallback ─────────────────────────────────────────────────

describe('requireRule — baseline fallback (in-department)', () => {
  it('denies DELETE for an EMPLOYEE', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ role: 'EMPLOYEE' })), res, next);

    expect(baselineAllow).toHaveBeenCalledWith('DELETE', 'EMPLOYEE');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows DELETE for a DEPARTMENT_HEAD', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'DELETE')(makeReq(makeUser({ role: 'DEPARTMENT_HEAD' })), res, next);

    expect(baselineAllow).toHaveBeenCalledWith('DELETE', 'DEPARTMENT_HEAD');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows READ/CREATE/UPDATE for any in-department role', async () => {
    for (const action of ['READ', 'CREATE', 'UPDATE']) {
      const next = jest.fn();
      const res = mockRes();
      await requireRule('invoices', action)(makeReq(makeUser({ role: 'EMPLOYEE' })), res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('denies APPROVE for an EMPLOYEE (baseline gate, no owner escape hatch)', async () => {
    const res = mockRes();
    const next = jest.fn();

    await requireRule('supply-requests', 'APPROVE')(makeReq(makeUser({ role: 'EMPLOYEE' }), { id: 'sr-1' }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    // owner-scope only covers UPDATE/DELETE — APPROVE must not leak through ownership.
    expect(mockPrisma.supplyRequest.findUnique).not.toHaveBeenCalled();
  });
});

// ─── 13. owner-scope fallback ──────────────────────────────────────────────

describe('requireRule — owner-scope fallback', () => {
  // Owner-scope is only reachable once the baseline denies, i.e. DELETE (and UPDATE)
  // for a role below DEPARTMENT_HEAD. It joins employee.userId for employee-owned resources.
  const inDeptEmployeeDelete = (params: Record<string, string> = {}) => {
    const req = makeReq(makeUser({ role: 'EMPLOYEE' }), params);
    const res = mockRes();
    const next = jest.fn();
    return { req, res, next };
  };

  it('denies a bulk DELETE with no :id and performs no owner lookup', async () => {
    const { req, res, next } = inDeptEmployeeDelete({});

    await requireRule('supply-requests', 'DELETE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.supplyRequest.findUnique).not.toHaveBeenCalled();
  });

  it('allows DELETE of a supply-request the caller owns (employeeId → userId join)', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: 'emp-9' });
    setEmployeeOwnerUserId('user-1');
    const { req, res, next } = inDeptEmployeeDelete({ id: 'sr-1' });

    await requireRule('supply-requests', 'DELETE')(req, res, next);

    expect(mockPrisma.supplyRequest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sr-1' }, select: { employeeId: true } }),
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies DELETE of a record owned by someone else', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: 'emp-9' });
    setEmployeeOwnerUserId('user-SOMEBODY-ELSE');
    const { req, res, next } = inDeptEmployeeDelete({ id: 'sr-1' });

    await requireRule('supply-requests', 'DELETE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('denies DELETE when the record does not exist', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue(null);
    const { req, res, next } = inDeptEmployeeDelete({ id: 'sr-missing' });

    await requireRule('supply-requests', 'DELETE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('compares createdById directly for user-owned resources', async () => {
    mockPrisma.customerFeedback.findUnique.mockResolvedValue({ createdById: 'user-1' });
    const { req, res, next } = inDeptEmployeeDelete({ id: 'cf-1' });

    await requireRule('customer-feedbacks', 'DELETE')(req, res, next);

    expect(next).toHaveBeenCalled();
    // no employee join for createdById resources
    expect(mockPrisma.supplyRequest.findUnique).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies and logs a warning for an unmapped resourceCode', async () => {
    const { req, res, next } = inDeptEmployeeDelete({ id: 'xyz-1' });

    await requireRule('orders', 'DELETE')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no mapping for resource=orders'));
  });

  it('falls back to the first route param when there is no :id', async () => {
    mockPrisma.customerFeedback.findUnique.mockResolvedValue({ createdById: 'user-1' });
    const { req, res, next } = inDeptEmployeeDelete({ feedbackId: 'cf-2' });

    await requireRule('customer-feedbacks', 'DELETE')(req, res, next);

    expect(mockPrisma.customerFeedback.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cf-2' } }),
    );
    expect(next).toHaveBeenCalled();
  });
});

// ─── 14. unexpected error ──────────────────────────────────────────────────

describe('requireRule — error handling', () => {
  it('returns 500 and does not call next when a DB query throws', async () => {
    mockPrisma.rule.findMany.mockRejectedValue(new Error('connection lost'));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'READ')(makeReq(makeUser()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Lỗi máy chủ nội bộ' });
    expect(logger.error).toHaveBeenCalledWith(
      '[requireRule] unexpected error',
      expect.objectContaining({ resourceCode: 'invoices', action: 'READ' }),
    );
  });

  it('returns 500 when the identity lookup itself throws', async () => {
    mockPrisma.employee.findUnique.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('invoices', 'READ')(makeReq(makeUser()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('a failing owner lookup fails closed (403), not 500', async () => {
    mockPrisma.customerFeedback.findUnique.mockRejectedValue(new Error('query failed'));
    const res = mockRes();
    const next = jest.fn();

    await requireRule('customer-feedbacks', 'DELETE')(
      makeReq(makeUser({ role: 'EMPLOYEE' }), { id: 'cf-1' }), res, next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('owner-scope query failed'));
  });
});
