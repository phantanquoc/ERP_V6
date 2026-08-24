import { describe, it, expect, beforeEach } from 'vitest';
import {
  can,
  canDelete,
  canIfConfigured,
  setCachedPermissions,
  clearCachedPermissions,
  getCachedPermissions,
  isCachedPermissionsLoaded,
} from './permissions';

// Frontend permissions: can() reads from cachedPermissions (DB Rule Matrix)
// and falls back to baseline (REQ-RBAC-006) when no cached entry exists.
// Baseline: DELETE requires ADMIN/DEPARTMENT_HEAD; APPROVE/REJECT requires TEAM_LEAD+.
// Others (CREATE/READ/UPDATE/EXPORT/IMPORT) allow all.

describe('permissions — can() baseline vs DB', () => {
  beforeEach(() => clearCachedPermissions());

  it('EMPLOYEE denied DELETE via baseline (no cached perms)', () => {
    // No cachedPermissions → baseline fallback
    expect(can('invoices', 'DELETE', 'employee')).toBe(false);
    expect(can('invoices', 'DELETE', 'EMPLOYEE')).toBe(false);
  });

  it('EMPLOYEE denied APPROVE via baseline', () => {
    expect(can('invoices', 'APPROVE', 'employee')).toBe(false);
    expect(can('invoices', 'REJECT', 'employee')).toBe(false);
  });

  it('TEAM_LEAD allowed APPROVE via baseline, denied DELETE', () => {
    expect(can('invoices', 'APPROVE', 'team_lead')).toBe(true);
    expect(can('invoices', 'REJECT', 'team_lead')).toBe(true);
    expect(can('invoices', 'DELETE', 'team_lead')).toBe(false);
  });

  it('DEPARTMENT_HEAD allowed DELETE and APPROVE via baseline', () => {
    expect(can('invoices', 'DELETE', 'department_head')).toBe(true);
    expect(can('invoices', 'APPROVE', 'department_head')).toBe(true);
    expect(can('invoices', 'REJECT', 'department_head')).toBe(true);
  });

  it('ADMIN allowed all via baseline', () => {
    expect(can('invoices', 'DELETE', 'admin')).toBe(true);
    expect(can('invoices', 'APPROVE', 'admin')).toBe(true);
    expect(can('invoices', 'CREATE', 'admin')).toBe(true);
  });

  it('EMPLOYEE allowed CREATE/READ/UPDATE via baseline', () => {
    expect(can('invoices', 'CREATE', 'employee')).toBe(true);
    expect(can('invoices', 'READ', 'employee')).toBe(true);
    expect(can('invoices', 'UPDATE', 'employee')).toBe(true);
    expect(can('invoices', 'EXPORT', 'employee')).toBe(true);
    expect(can('invoices', 'IMPORT', 'employee')).toBe(true);
  });

  it('DB cached permission overrides baseline — EMPLOYEE allowed DELETE when DB allow:true', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    // DB says allow — should be true even for EMPLOYEE (delegation/RULE)
    expect(can('invoices', 'DELETE', 'employee')).toBe(true);
  });

  it('DB cached permission overrides baseline — DEPARTMENT_HEAD denied DELETE when DB allow:false', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: false }]);
    // DB says deny — even DEPARTMENT_HEAD blocked
    expect(can('invoices', 'DELETE', 'department_head')).toBe(false);
    expect(can('invoices', 'DELETE', 'admin')).toBe(false);
  });

  it('DB cached permission for different resource does not affect other resource', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    // orders/DELETE not in cache → baseline for EMPLOYEE still denies
    expect(can('orders', 'DELETE', 'employee')).toBe(false);
  });
});

describe('permissions — canDelete per-resource', () => {
  beforeEach(() => clearCachedPermissions());

  it('canDelete fallback: EMPLOYEE false, DEPARTMENT_HEAD true', () => {
    expect(canDelete('employee')).toBe(false);
    expect(canDelete('department_head')).toBe(true);
    expect(canDelete('admin')).toBe(true);
    expect(canDelete('team_lead')).toBe(false);
  });

  it('canDelete with cached DELETE allow → true regardless of role', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    expect(canDelete('employee')).toBe(true);
  });

  it('canDelete with cached DELETE deny only → false', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: false }]);
    expect(canDelete('employee')).toBe(false);
    expect(canDelete('admin')).toBe(false);
  });

  it('canDelete with mixed cached DELETEs → true if any allow', () => {
    setCachedPermissions([
      { resourceCode: 'invoices', action: 'DELETE', allow: false },
      { resourceCode: 'orders', action: 'DELETE', allow: true },
    ]);
    expect(canDelete('employee')).toBe(true);
  });
});

describe('permissions — canIfConfigured', () => {
  beforeEach(() => clearCachedPermissions());

  it('returns null when no cachedPermissions (before load)', () => {
    expect(canIfConfigured('invoices', 'DELETE')).toBeNull();
  });

  it('returns null for uncached resource/action pair', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'READ', allow: true }]);
    expect(canIfConfigured('orders', 'DELETE')).toBeNull();
  });

  it('returns cached allow value when entry exists', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: false }]);
    expect(canIfConfigured('invoices', 'DELETE')).toBe(false);
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    expect(canIfConfigured('invoices', 'DELETE')).toBe(true);
  });
});

describe('permissions — cachedPermissions staleness', () => {
  beforeEach(() => clearCachedPermissions());

  it('setCachedPermissions populates cache and isCachedPermissionsLoaded', () => {
    expect(isCachedPermissionsLoaded()).toBe(false);
    expect(getCachedPermissions()).toBeNull();
    setCachedPermissions([{ resourceCode: 'invoices', action: 'READ', allow: true }]);
    expect(isCachedPermissionsLoaded()).toBe(true);
    expect(getCachedPermissions()).toHaveLength(1);
    expect(can('invoices', 'READ', 'employee')).toBe(true);
  });

  it('clearCachedPermissions resets cache → can() falls back to baseline', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    expect(can('invoices', 'DELETE', 'employee')).toBe(true);
    clearCachedPermissions();
    expect(isCachedPermissionsLoaded()).toBe(false);
    expect(getCachedPermissions()).toBeNull();
    // Now baseline: EMPLOYEE denied DELETE
    expect(can('invoices', 'DELETE', 'employee')).toBe(false);
  });

  it('setCachedPermissions with updated perms → can() reads updated value', () => {
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    expect(can('invoices', 'DELETE', 'employee')).toBe(true);
    // Simulate invalidation + refetch with new perms (deny)
    clearCachedPermissions();
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: false }]);
    expect(can('invoices', 'DELETE', 'employee')).toBe(false);
    expect(can('invoices', 'DELETE', 'admin')).toBe(false);
  });

  it('after invalidate, uncached action falls back to baseline', () => {
    setCachedPermissions([
      { resourceCode: 'invoices', action: 'DELETE', allow: true },
      { resourceCode: 'invoices', action: 'APPROVE', allow: false },
    ]);
    expect(can('invoices', 'APPROVE', 'team_lead')).toBe(false);
    clearCachedPermissions();
    setCachedPermissions([{ resourceCode: 'invoices', action: 'DELETE', allow: true }]);
    // APPROVE no longer in cache → baseline for TEAM_LEAD is allow
    expect(can('invoices', 'APPROVE', 'team_lead')).toBe(true);
  });
});
