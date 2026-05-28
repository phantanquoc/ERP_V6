import { authenticate, authorize } from '@middlewares/auth';
import { generateAccessToken } from '@utils/helpers';
import type { JwtPayload } from '@types';

const ADMIN_PAYLOAD: JwtPayload = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'ADMIN',
  departmentId: 'dept-1',
  subDepartmentId: null,
};

const DEPT_HEAD_PAYLOAD: JwtPayload = {
  id: 'head-1',
  email: 'head@example.com',
  role: 'DEPARTMENT_HEAD',
  departmentId: 'dept-2',
  subDepartmentId: null,
};

const TEAM_LEAD_PAYLOAD: JwtPayload = {
  id: 'lead-1',
  email: 'lead@example.com',
  role: 'TEAM_LEAD',
  departmentId: 'dept-3',
  subDepartmentId: 'sub-1',
};

const EMPLOYEE_PAYLOAD: JwtPayload = {
  id: 'emp-1',
  email: 'emp@example.com',
  role: 'EMPLOYEE',
  departmentId: 'dept-4',
  subDepartmentId: 'sub-2',
};

// Primary EMPLOYEE but TEAM_LEAD in a secondary department
const EMPLOYEE_WITH_SECONDARY_TEAM_LEAD: JwtPayload = {
  id: 'emp-2',
  email: 'emp2@example.com',
  role: 'EMPLOYEE',
  departmentId: 'dept-4',
  subDepartmentId: 'sub-2',
  secondaryDepartments: [
    { departmentId: 'dept-production', subDepartmentId: 'sub-warehouse', role: 'TEAM_LEAD' },
  ],
};

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides = {}) => ({
  headers: {},
  ...overrides,
} as any);

const mockNext = jest.fn();

function makeAuthReq(payload: JwtPayload) {
  const token = generateAccessToken(payload);
  return mockRequest({ headers: { authorization: `Bearer ${token}` }, user: payload });
}

// ─── Test: authenticate blocks unauthenticated requests ───

describe('Route auth enforcement', () => {
  beforeEach(() => mockNext.mockClear());

  describe('authenticate middleware', () => {
    it('blocks request without token (401)', () => {
      const req = mockRequest();
      const res = mockResponse();
      authenticate(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('passes request with valid token', () => {
      const token = generateAccessToken(ADMIN_PAYLOAD);
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      authenticate(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });
  });

  describe('authorize middleware — role enforcement', () => {
    const authorizeAdminOnly = authorize('ADMIN');
    const authorizeAdminDeptHead = authorize('ADMIN', 'DEPARTMENT_HEAD');
    const authorizeAdminDeptHeadTeamLead = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD');

    it('ADMIN passes all authorize checks', () => {
      const req = makeAuthReq(ADMIN_PAYLOAD);
      const res = mockResponse();

      authorizeAdminOnly(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      mockNext.mockClear();

      authorizeAdminDeptHead(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      mockNext.mockClear();

      authorizeAdminDeptHeadTeamLead(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('DEPARTMENT_HEAD passes ADMIN+DEPT_HEAD but not ADMIN-only', () => {
      const req = makeAuthReq(DEPT_HEAD_PAYLOAD);
      const res = mockResponse();

      authorizeAdminDeptHead(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      mockNext.mockClear();

      authorizeAdminOnly(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('TEAM_LEAD passes ADMIN+DEPT_HEAD+TEAM_LEAD but not ADMIN+DEPT_HEAD only', () => {
      const req = makeAuthReq(TEAM_LEAD_PAYLOAD);
      const res = mockResponse();

      authorizeAdminDeptHeadTeamLead(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      mockNext.mockClear();

      authorizeAdminDeptHead(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('EMPLOYEE is blocked by all authorize checks', () => {
      const req = makeAuthReq(EMPLOYEE_PAYLOAD);
      const res = mockResponse();

      authorizeAdminOnly(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      mockNext.mockClear();

      const res2 = mockResponse();
      authorizeAdminDeptHead(req, res2, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(403);
      mockNext.mockClear();

      const res3 = mockResponse();
      authorizeAdminDeptHeadTeamLead(req, res3, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res3.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Route-level middleware registration', () => {
    function getRouterLayers(router: any) {
      return router.stack || router._router?.stack || [];
    }

    function hasRouterLevelMiddleware(router: any, name: string): boolean {
      const layers = getRouterLayers(router);
      return layers.some((l: any) => !l.route && l.name === name);
    }

    function getRouteMiddlewareCount(router: any, method: string, path: string): number {
      const layers = getRouterLayers(router);
      for (const layer of layers) {
        if (layer.route && layer.route.path === path && layer.route.methods[method]) {
          return layer.route.stack.length;
        }
      }
      return 0;
    }

    it('debtRoutes has authenticate on router level', () => {
      const router = require('@routes/debtRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('supplierRoutes has authenticate on router level', () => {
      const router = require('@routes/supplierRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('machineSystemRoutes has authenticate on router level', () => {
      const router = require('@routes/machineSystemRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('machineActivityReportRoutes has authenticate on router level', () => {
      const router = require('@routes/machineActivityReportRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('warehouseReceiptRoutes has authenticate on router level', () => {
      const router = require('@routes/warehouseReceiptRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('warehouseIssueRoutes has authenticate on router level', () => {
      const router = require('@routes/warehouseIssueRoutes').default;
      expect(hasRouterLevelMiddleware(router, 'authenticate')).toBe(true);
    });

    it('debtRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/debtRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(2);
    });

    it('debtRoutes DELETE /:id has extra middleware (authorize) before handler', () => {
      const router = require('@routes/debtRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('supplierRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/supplierRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('supplierRoutes DELETE /:id has extra middleware (authorize) before handler', () => {
      const router = require('@routes/supplierRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('invoiceRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/invoiceRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('invoiceRoutes DELETE /:id has extra middleware (authorize) before handler', () => {
      const router = require('@routes/invoiceRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('purchaseRequestRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/purchaseRequestRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(2);
    });

    it('purchaseRequestRoutes DELETE /:id has extra middleware (authorize) before handler', () => {
      const router = require('@routes/purchaseRequestRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('warehouseReceiptRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/warehouseReceiptRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('warehouseIssueRoutes POST / has extra middleware (authorize) before handler', () => {
      const router = require('@routes/warehouseIssueRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });
  });

  describe('authorize middleware — secondary department roles', () => {
    it('EMPLOYEE with secondary TEAM_LEAD passes authorize(TEAM_LEAD)', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD');
      const req = makeAuthReq(EMPLOYEE_WITH_SECONDARY_TEAM_LEAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('EMPLOYEE with secondary TEAM_LEAD is still blocked by authorize(ADMIN, DEPARTMENT_HEAD)', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
      const req = makeAuthReq(EMPLOYEE_WITH_SECONDARY_TEAM_LEAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('EMPLOYEE with secondary TEAM_LEAD is blocked by authorize(ADMIN) only', () => {
      const middleware = authorize('ADMIN');
      const req = makeAuthReq(EMPLOYEE_WITH_SECONDARY_TEAM_LEAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('EMPLOYEE without secondary departments remains blocked', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD');
      const req = makeAuthReq(EMPLOYEE_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Behavioral test — authorize blocks EMPLOYEE on write routes', () => {
    it('authorize(ADMIN, DEPARTMENT_HEAD) blocks EMPLOYEE with 403', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
      const req = makeAuthReq(EMPLOYEE_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('authorize(ADMIN, DEPARTMENT_HEAD) allows DEPARTMENT_HEAD', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD');
      const req = makeAuthReq(DEPT_HEAD_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('authorize(ADMIN) blocks DEPARTMENT_HEAD with 403', () => {
      const middleware = authorize('ADMIN');
      const req = makeAuthReq(DEPT_HEAD_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD) allows TEAM_LEAD', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD');
      const req = makeAuthReq(TEAM_LEAD_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD) blocks EMPLOYEE', () => {
      const middleware = authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD');
      const req = makeAuthReq(EMPLOYEE_PAYLOAD);
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
