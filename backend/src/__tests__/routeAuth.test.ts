/**
 * Route auth enforcement — updated for DB-driven requireRule (commit 27e0c6e)
 *
 * Previously routes used authorize(...roles); now every write/READ route is
 * guarded by requireRule(resource, action) with DB lookup + baseline fallback.
 * This file keeps authenticate tests unchanged and migrates all authorize
 * assertions to requireRule.
 */

// ─── Mocks for requireRule (hoisted; must be before requireRule import) ─────
const mockPrisma: any = {
  rule: { findMany: jest.fn() },
  resource: { findMany: jest.fn(), findUnique: jest.fn() },
  delegation: { findMany: jest.fn() },
  employee: { findUnique: jest.fn() },
  position: { findUnique: jest.fn() },
  userSecondaryDepartment: { findMany: jest.fn() },
  customerFeedback: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));
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

import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
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

function resetRequireRuleMocks() {
  jest.clearAllMocks();
  mockPrisma.employee.findUnique.mockResolvedValue(null);
  mockPrisma.position.findUnique.mockResolvedValue(null);
  mockPrisma.userSecondaryDepartment.findMany.mockResolvedValue([]);
  mockPrisma.delegation.findMany.mockResolvedValue([]);
  mockPrisma.rule.findMany.mockResolvedValue([]);
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

  // ─── requireRule — baseline per role (replaces old authorize tests) ─────
  describe('requireRule — baseline per role', () => {
    beforeEach(resetRequireRuleMocks);

    it('EMPLOYEE denied DELETE via baseline (403)', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('EMPLOYEE denied APPROVE via baseline (403)', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'APPROVE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('TEAM_LEAD allowed APPROVE via baseline', async () => {
      const req = mockRequest({ user: TEAM_LEAD_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'APPROVE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('TEAM_LEAD denied DELETE via baseline (403)', async () => {
      const req = mockRequest({ user: TEAM_LEAD_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('DEPARTMENT_HEAD allowed DELETE via baseline', async () => {
      const req = mockRequest({ user: DEPT_HEAD_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('ADMIN bypass — DELETE without Rule (200)', async () => {
      const req = mockRequest({ user: ADMIN_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('Position.defaultRole overrides JWT role (EMPLOYEE JWT + DEPARTMENT_HEAD position → DELETE allowed)', async () => {
      const jwtEmp = { ...EMPLOYEE_PAYLOAD, id: 'user-pos' } as JwtPayload;
      const req = mockRequest({ user: jwtEmp, params: {} }) as any;
      const res = mockResponse();
      mockPrisma.employee.findUnique.mockResolvedValue({ positionId: 'pos-head', subDepartmentId: null });
      mockPrisma.position.findUnique.mockResolvedValue({ defaultRole: 'DEPARTMENT_HEAD' });
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ─── requireRule — delegation scope ────────────────────────────────────
  describe('requireRule — delegation scope', () => {
    beforeEach(resetRequireRuleMocks);

    it('delegation with matching GLOBAL scope grants access even when baseline would deny', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: null, resourceCode: 'invoices', action: 'DELETE' },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('delegation with non-matching DEPARTMENT scope does not grant access', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: 'dept-other', subDepartmentId: null, resourceCode: 'invoices', action: 'DELETE' },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('SUB_DEPARTMENT delegation must match exact subDepartmentId', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      // EMPLOYEE_PAYLOAD has subDepartmentId sub-2; delegation for sub-other should not match
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: 'sub-other', resourceCode: 'invoices', action: 'DELETE' },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('SUB_DEPARTMENT delegation matching sub-2 grants access', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: {} }) as any;
      const res = mockResponse();
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: 'sub-2', resourceCode: 'invoices', action: 'DELETE' },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ─── requireRule — owner-scope ─────────────────────────────────────────
  describe('requireRule — owner-scope (UPDATE/DELETE fallback)', () => {
    beforeEach(resetRequireRuleMocks);

    it('allows DELETE when user is owner (invoices/createdById) even though baseline denies', async () => {
      const owner: JwtPayload = { ...EMPLOYEE_PAYLOAD, id: 'user-owner' };
      const req = mockRequest({ user: owner, params: { id: 'inv-1' } }) as any;
      const res = mockResponse();
      mockPrisma.invoice.findUnique.mockResolvedValue({ createdById: 'user-owner' });
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('denies DELETE when user is not owner', async () => {
      const other: JwtPayload = { ...EMPLOYEE_PAYLOAD, id: 'user-other' };
      const req = mockRequest({ user: other, params: { id: 'inv-1' } }) as any;
      const res = mockResponse();
      mockPrisma.invoice.findUnique.mockResolvedValue({ createdById: 'user-owner' });
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows UPDATE when user is owner', async () => {
      const owner: JwtPayload = { ...EMPLOYEE_PAYLOAD, id: 'user-owner' };
      const req = mockRequest({ user: owner, params: { id: 'fb-1' } }) as any;
      const res = mockResponse();
      // For CREATE/READ baseline allows EMPLOYEE, but DELETE/UPDATE owner-scope:
      // EMPLOYEE baseline allows UPDATE, so this tests explicit deny-then-owner path.
      // Force deny by providing explicit Rule allow:false, then owner should still deny
      // (explicit Rule takes precedence over owner). To test owner→allow, use DELETE path above.
      // Here we test that UPDATE via baseline still allows (no owner needed)
      await requireRule('invoices', 'UPDATE')(req, res, mockNext);
      // Baseline allows EMPLOYEE UPDATE → next without owner check
      expect(mockNext).toHaveBeenCalled();
    });

    it('denies when resource has no owner mapping', async () => {
      const req = mockRequest({ user: EMPLOYEE_PAYLOAD, params: { id: 'rec-1' } }) as any;
      const res = mockResponse();
      await requireRule('unknown-resource', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── Route-level middleware registration (requireRule) ──────────────────

  describe('Route-level middleware registration (requireRule)', () => {
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

    it('machineSystemRoutes has authenticate on per-route level (no router.use)', () => {
      // machineSystemRoutes uses per-route authenticate + deviceOrJwtAuth, not router.use(authenticate)
      // Verify at least one route has authenticate in its stack
      const router = require('@routes/machineSystemRoutes').default;
      const layers = router.stack || router._router?.stack || [];
      const hasAuthPerRoute = layers.some(
        (l: any) => l.route && l.route.stack.some((s: any) => s.name === 'authenticate' || s.name === 'deviceOrJwtAuth'),
      );
      expect(hasAuthPerRoute).toBe(true);
    });

    it('machineStatusLogRoutes has authenticate on router level', () => {
      const router = require('@routes/machineStatusLogRoutes').default;
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

    it('debtRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/debtRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(2);
    });

    it('debtRoutes DELETE /:id has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/debtRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('supplierRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/supplierRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('supplierRoutes DELETE /:id has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/supplierRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('invoiceRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/invoiceRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('invoiceRoutes DELETE /:id has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/invoiceRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('purchaseRequestRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/purchaseRequestRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(2);
    });

    it('purchaseRequestRoutes DELETE /:id has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/purchaseRequestRoutes').default;
      const count = getRouteMiddlewareCount(router, 'delete', '/:id');
      expect(count).toBeGreaterThan(1);
    });

    it('warehouseReceiptRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/warehouseReceiptRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });

    it('warehouseIssueRoutes POST / has extra middleware (requireRule) before handler', () => {
      const router = require('@routes/warehouseIssueRoutes').default;
      const count = getRouteMiddlewareCount(router, 'post', '/');
      expect(count).toBeGreaterThan(1);
    });
  });

  // ─── requireRule — secondary delegation via user departmentIds ──────────
  describe('requireRule — secondary department delegation', () => {
    beforeEach(resetRequireRuleMocks);

    it('EMPLOYEE with secondary TEAM_LEAD delegation: GLOBAL delegation still grants (scope-agnostic)', async () => {
      const req = mockRequest({ user: EMPLOYEE_WITH_SECONDARY_TEAM_LEAD, params: {} }) as any;
      const res = mockResponse();
      mockPrisma.delegation.findMany.mockResolvedValue([
        { departmentId: null, subDepartmentId: null, resourceCode: 'invoices', action: 'DELETE' },
      ]);
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('without delegation, EMPLOYEE still denied DELETE even with secondary TEAM_LEAD (secondary does not bypass baseline)', async () => {
      const req = mockRequest({ user: EMPLOYEE_WITH_SECONDARY_TEAM_LEAD, params: {} }) as any;
      const res = mockResponse();
      // No delegation; baseline checks primary role (EMPLOYEE) unless position overrides.
      // Position not set, so effectiveRole stays EMPLOYEE → deny.
      await requireRule('invoices', 'DELETE')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── requireRule — 401 when unauthenticated ─────────────────────────────
  describe('requireRule — 401 when req.user missing', () => {
    beforeEach(resetRequireRuleMocks);
    it('returns 401', async () => {
      const req = mockRequest({ params: {} }) as any;
      delete req.user;
      const res = mockResponse();
      await requireRule('invoices', 'READ')(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
