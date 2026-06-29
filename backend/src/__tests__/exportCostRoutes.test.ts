/**
 * RBAC tests for ExportCost routes and Quotation DELETE route.
 *
 * Tests use the authorize middleware with mock requests so they run
 * without a database or running server.
 */
import { authorize } from '@middlewares/auth';
import type { JwtPayload } from '@types';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const makeReq = (role: string) => {
  const payload: JwtPayload = {
    id: `user-${role}`,
    email: `${role.toLowerCase()}@test.com`,
    role,
    departmentId: 'dept-1',
    subDepartmentId: null,
  };
  return { user: payload, headers: {} } as any;
};

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

// ─── ExportCost RBAC ──────────────────────────────────────────────────────────

describe('ExportCost RBAC — authorize middleware', () => {
  beforeEach(() => next.mockClear());

  // GET is open to all authenticated roles
  it('EMPLOYEE GET 200: authorize allows EMPLOYEE for read operations', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE');
    const req = makeReq('EMPLOYEE');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('TEAM_LEAD GET 200: authorize allows TEAM_LEAD for read operations', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE');
    const req = makeReq('TEAM_LEAD');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // POST is restricted to ADMIN and DEPARTMENT_HEAD
  it('EMPLOYEE POST 403: authorize blocks EMPLOYEE for write operations', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('EMPLOYEE');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TEAM_LEAD POST 403: authorize blocks TEAM_LEAD for write operations', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('TEAM_LEAD');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('DEPARTMENT_HEAD PATCH 200: authorize allows DEPARTMENT_HEAD to update', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('DEPARTMENT_HEAD');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // DELETE is ADMIN only
  it('TEAM_LEAD DELETE 403: authorize blocks TEAM_LEAD from deleting', () => {
    const middleware = authorize('ADMIN');
    const req = makeReq('TEAM_LEAD');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('EMPLOYEE DELETE 403: authorize blocks EMPLOYEE from deleting', () => {
    const middleware = authorize('ADMIN');
    const req = makeReq('EMPLOYEE');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('ADMIN DELETE 200: authorize allows ADMIN to delete', () => {
    const middleware = authorize('ADMIN');
    const req = makeReq('ADMIN');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── Quotation DELETE RBAC ────────────────────────────────────────────────────

describe('Quotation DELETE RBAC — authorize middleware', () => {
  beforeEach(() => next.mockClear());

  it('EMPLOYEE DELETE 403', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('EMPLOYEE');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('DEPARTMENT_HEAD DELETE 200', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('DEPARTMENT_HEAD');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('ADMIN DELETE 200', () => {
    const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const req = makeReq('ADMIN');
    const res = makeRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
