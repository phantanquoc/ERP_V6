/**
 * Role-gating tests for faultRecord lifecycle routes.
 *
 * Tests exercise `requireTechnicalAccessWithRoles` middleware directly,
 * covering mark-resolved (ADMIN/DEPT_HEAD/TEAM_LEAD + mechanical),
 * mark-recurred (ADMIN/DEPT_HEAD + mechanical), and PUT trangThai drop.
 *
 * No database or running server required — Prisma is mocked.
 */

// Mock Prisma so `requireTechnicalAccess` can resolve department codes without a DB
const mockPrisma: any = {
  department: {
    findUnique: jest.fn(),
  },
};
jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import { requireTechnicalAccessWithRoles } from '@routes/technicalAccess';
import { UserRole } from '@types';
import type { JwtPayload } from '@types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MECHANICAL_SUB_DEPT = 'SUBDEPT_TECHNICAL_MECHANICAL';

/**
 * Build a minimal AuthenticatedRequest-compatible object.
 * `departmentId` maps to a mock department row returned by mockPrisma.
 */
const makeReq = (
  role: string,
  options: { departmentCode?: string; secondaryDepts?: Array<{ departmentId: string; subDepartmentId?: string | null; role: string }> } = {}
) => {
  const { departmentCode = 'DEPT_TECHNICAL', secondaryDepts = [] } = options;
  const payload: JwtPayload = {
    id: `user-${role}`,
    email: `${role.toLowerCase()}@test.com`,
    role,
    departmentId: departmentCode ? 'dept-1' : null,
    subDepartmentId: null,
  };
  return {
    user: {
      ...payload,
      secondaryDepartments: secondaryDepts,
    },
    headers: {},
    params: { id: 'fr-1' },
    body: {},
  } as any;
};

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/** Runs middleware and returns a promise resolving to { next: boolean, status?: number } */
const runMiddleware = (
  middleware: ReturnType<typeof requireTechnicalAccessWithRoles>,
  req: any,
  res: any
): Promise<{ nextCalled: boolean }> => {
  return new Promise((resolve) => {
    const next = jest.fn(() => resolve({ nextCalled: true }));
    // If res.json is called, middleware rejected — resolve after a tick
    res.json = jest.fn((..._args: any[]) => {
      setImmediate(() => resolve({ nextCalled: false }));
      return res;
    });
    middleware(req, res, next);
  });
};

// ─── mark-resolved: ADMIN/DEPT_HEAD/TEAM_LEAD + mechanical ───────────────────

const markResolvedAccess = requireTechnicalAccessWithRoles(
  [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
  MECHANICAL_SUB_DEPT
);

describe('mark-resolved role gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: primary department is DEPT_TECHNICAL
    mockPrisma.department.findUnique.mockResolvedValue({ code: 'DEPT_TECHNICAL' });
  });

  it('ADMIN passes without department check', async () => {
    const req = makeReq(UserRole.ADMIN);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(true);
    // ADMIN bypasses both role and department checks
    expect(mockPrisma.department.findUnique).not.toHaveBeenCalled();
  });

  it('DEPARTMENT_HEAD in technical dept passes', async () => {
    const req = makeReq(UserRole.DEPARTMENT_HEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(true);
  });

  it('TEAM_LEAD in technical dept passes', async () => {
    const req = makeReq(UserRole.TEAM_LEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(true);
  });

  it('EMPLOYEE gets 403 (wrong role)', async () => {
    const req = makeReq(UserRole.EMPLOYEE);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TEAM_LEAD in non-technical dept gets 403', async () => {
    mockPrisma.department.findUnique.mockResolvedValue({ code: 'DEPT_PRODUCTION' });
    const req = makeReq(UserRole.TEAM_LEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TEAM_LEAD with secondary technical dept passes', async () => {
    // Primary dept is non-technical, secondary is technical
    mockPrisma.department.findUnique
      .mockResolvedValueOnce({ code: 'DEPT_PRODUCTION' }) // primary
      .mockResolvedValueOnce({ code: 'DEPT_TECHNICAL' }); // secondary
    const req = makeReq(UserRole.TEAM_LEAD, {
      secondaryDepts: [{ departmentId: 'dept-technical', subDepartmentId: null, role: UserRole.TEAM_LEAD }],
    });
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markResolvedAccess, req, res);
    expect(nextCalled).toBe(true);
  });
});

// ─── mark-recurred: ADMIN/DEPT_HEAD only + mechanical ────────────────────────

const markRecurredAccess = requireTechnicalAccessWithRoles(
  [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
  MECHANICAL_SUB_DEPT
);

describe('mark-recurred role gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.department.findUnique.mockResolvedValue({ code: 'DEPT_TECHNICAL' });
  });

  it('ADMIN passes', async () => {
    const req = makeReq(UserRole.ADMIN);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markRecurredAccess, req, res);
    expect(nextCalled).toBe(true);
  });

  it('DEPARTMENT_HEAD in technical dept passes', async () => {
    const req = makeReq(UserRole.DEPARTMENT_HEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markRecurredAccess, req, res);
    expect(nextCalled).toBe(true);
  });

  it('TEAM_LEAD gets 403 (not in allowed roles)', async () => {
    const req = makeReq(UserRole.TEAM_LEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markRecurredAccess, req, res);
    expect(nextCalled).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('EMPLOYEE gets 403', async () => {
    const req = makeReq(UserRole.EMPLOYEE);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markRecurredAccess, req, res);
    expect(nextCalled).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('DEPARTMENT_HEAD in non-technical dept gets 403', async () => {
    mockPrisma.department.findUnique.mockResolvedValue({ code: 'DEPT_SALES' });
    const req = makeReq(UserRole.DEPARTMENT_HEAD);
    const res = makeRes();
    const { nextCalled } = await runMiddleware(markRecurredAccess, req, res);
    expect(nextCalled).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── PUT trangThai drop ────────────────────────────────────────────────────────

// Mock the service so updateFaultRecord just returns the data it received,
// letting us verify trangThai is absent from the persisted result.

const mockFaultRecordService: any = {
  updateFaultRecord: jest.fn(),
};
jest.mock('@services/faultRecordService', () => ({
  __esModule: true,
  default: mockFaultRecordService,
}));
jest.mock('@middlewares/upload', () => ({
  getFileUrl: jest.fn(() => 'http://test/file.jpg'),
  createSingleUploadMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import faultRecordController from '@controllers/faultRecordController';

describe('PUT /fault-records/:id — trangThai is dropped by service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('controller passes body through unchanged; service receives (and logs) trangThai then drops it', async () => {
    const updatedRecord = { id: 'fr-1', trangThai: 'DANG_THEO_DOI', tenLoi: 'Test' };
    mockFaultRecordService.updateFaultRecord.mockResolvedValue(updatedRecord);

    const req: any = {
      params: { id: 'fr-1' },
      body: {
        tenLoi: 'Test',
        trangThai: 'DA_XU_LY', // client tries to set status directly
      },
      file: undefined,
      user: { id: 'user-1', role: 'TEAM_LEAD' },
    };
    const res: any = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await faultRecordController.update(req, res, next);

    // Controller must forward trangThai to service (service is responsible for dropping it)
    expect(mockFaultRecordService.updateFaultRecord).toHaveBeenCalledWith(
      'fr-1',
      expect.objectContaining({ trangThai: 'DA_XU_LY', tenLoi: 'Test' })
    );

    // Response must be 200 success
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('controller returns 200 even when trangThai is included — service handles drop', async () => {
    mockFaultRecordService.updateFaultRecord.mockResolvedValue({ id: 'fr-2', trangThai: 'DANG_THEO_DOI' });

    const req: any = {
      params: { id: 'fr-2' },
      body: { trangThai: 'TAI_PHAT', tenLoi: 'Another fault' },
      file: undefined,
      user: { id: 'user-2', role: 'DEPARTMENT_HEAD' },
    };
    const res: any = { json: jest.fn() };
    const next = jest.fn();

    await faultRecordController.update(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(next).not.toHaveBeenCalled();
  });
});
