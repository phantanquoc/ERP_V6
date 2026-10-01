/**
 * Technician gating for YCKT/YCSC:
 *  - any role (EMPLOYEE included) in Kỹ thuật — primary OR secondary department — may process
 *  - non-technical users are blocked; ADMIN bypasses
 *  - delete only DEPARTMENT_HEAD / ADMIN (EMPLOYEE cannot delete even their own record)
 */

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  department: { findFirst: jest.fn() },
};
jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import { requireTechnical, denyEmployeeDelete, isTechnicalMember } from '@middlewares/technicalAccess';

const TECH_DEPT = 'dept-tech';
const QUALITY_DEPT = 'dept-quality';

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function setUser(departmentId: string | null, secondary: string[] = []) {
  mockPrisma.user.findUnique.mockResolvedValue({
    departmentId,
    secondaryDepartments: secondary.map((d) => ({ departmentId: d })),
  });
  mockPrisma.department.findFirst.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(where.id.in.includes(TECH_DEPT) ? { id: TECH_DEPT } : null),
  );
}

beforeEach(() => jest.clearAllMocks());

describe('isTechnicalMember', () => {
  it('true for primary Kỹ thuật', async () => {
    setUser(TECH_DEPT);
    await expect(isTechnicalMember('u1')).resolves.toBe(true);
  });

  it('true when Kỹ thuật is only a SECONDARY department', async () => {
    setUser(QUALITY_DEPT, [TECH_DEPT]);
    await expect(isTechnicalMember('u1')).resolves.toBe(true);
  });

  it('false for a user outside Kỹ thuật', async () => {
    setUser(QUALITY_DEPT);
    await expect(isTechnicalMember('u1')).resolves.toBe(false);
  });

  it('false for a user without any department', async () => {
    setUser(null);
    await expect(isTechnicalMember('u1')).resolves.toBe(false);
    expect(mockPrisma.department.findFirst).not.toHaveBeenCalled();
  });
});

describe('requireTechnical', () => {
  it.each([
    ['EMPLOYEE primary Kỹ thuật', 'EMPLOYEE', TECH_DEPT, []],
    ['EMPLOYEE with Kỹ thuật as secondary', 'EMPLOYEE', QUALITY_DEPT, [TECH_DEPT]],
    ['TEAM_LEAD with Kỹ thuật as secondary', 'TEAM_LEAD', QUALITY_DEPT, [TECH_DEPT]],
  ])('allows %s', async (_label, role, primary, secondary) => {
    setUser(primary as string, secondary as string[]);
    const next = jest.fn();
    const res = mockRes();
    await requireTechnical({ user: { id: 'u1', role } } as never, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a DEPARTMENT_HEAD of another department', async () => {
    setUser(QUALITY_DEPT);
    const next = jest.fn();
    const res = mockRes();
    await requireTechnical({ user: { id: 'u1', role: 'DEPARTMENT_HEAD' } } as never, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('ADMIN bypasses without a DB lookup', async () => {
    const next = jest.fn();
    await requireTechnical({ user: { id: 'a', role: 'ADMIN' } } as never, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('denyEmployeeDelete', () => {
  it.each(['EMPLOYEE', 'TEAM_LEAD'])('blocks %s (even as owner, even in Kỹ thuật)', async (role) => {
    setUser(TECH_DEPT);
    const next = jest.fn();
    const res = mockRes();
    await denyEmployeeDelete({ user: { id: 'u1', role }, effectiveRole: role } as never, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows the Kỹ thuật DEPARTMENT_HEAD (primary or secondary) and ADMIN', async () => {
    setUser(TECH_DEPT);
    const n1 = jest.fn();
    await denyEmployeeDelete({ user: { id: 'u1', role: 'DEPARTMENT_HEAD' }, effectiveRole: 'DEPARTMENT_HEAD' } as never, mockRes(), n1);
    setUser(QUALITY_DEPT, [TECH_DEPT]);
    const n3 = jest.fn();
    await denyEmployeeDelete({ user: { id: 'u3', role: 'DEPARTMENT_HEAD' }, effectiveRole: 'DEPARTMENT_HEAD' } as never, mockRes(), n3);
    const n2 = jest.fn();
    await denyEmployeeDelete({ user: { id: 'a', role: 'ADMIN' } } as never, mockRes(), n2);
    expect(n1).toHaveBeenCalled();
    expect(n3).toHaveBeenCalled();
    expect(n2).toHaveBeenCalled();
  });

  it('blocks a DEPARTMENT_HEAD of another department', async () => {
    setUser(QUALITY_DEPT);
    const next = jest.fn();
    const res = mockRes();
    await denyEmployeeDelete({ user: { id: 'u2', role: 'DEPARTMENT_HEAD' }, effectiveRole: 'DEPARTMENT_HEAD' } as never, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
