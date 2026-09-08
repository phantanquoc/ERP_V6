import {
  raiseRole,
  matchRule,
  resolveOne,
  isCommonGrant,
  CHUNG_NO_DEPT_ALLOW,
  COMMON_GRANTS,
} from '../utils/permissionResolution';
import type { PermissionContext } from '../utils/permissionResolution';

describe('raiseRole', () => {
  it('does not downgrade TEAM_LEAD to EMPLOYEE', () => {
    expect(raiseRole('TEAM_LEAD', 'EMPLOYEE')).toBe('TEAM_LEAD');
  });
  it('raises EMPLOYEE to DEPARTMENT_HEAD', () => {
    expect(raiseRole('EMPLOYEE', 'DEPARTMENT_HEAD')).toBe('DEPARTMENT_HEAD');
  });
  it('null candidate keeps base', () => {
    expect(raiseRole('DEPARTMENT_HEAD', null)).toBe('DEPARTMENT_HEAD');
  });
});

describe('matchRule secondary sub-department awareness', () => {
  // A SUB_DEPARTMENT-scoped rule must carry a role or positionId to be matchable
  // (the generic no-role/no-position branch only accepts GLOBAL scope).
  const base = {
    id: 'r1', resourceCode: 'supply-requests', action: 'UPDATE',
    scope: 'SUB_DEPARTMENT', role: 'EMPLOYEE', positionId: null,
    departmentId: null, isActive: true, allow: true,
  };
  const mkRule = (overrides: Record<string, unknown> = {}) => ({ ...base, ...overrides }) as never;

  it('matches a SUB_DEPARTMENT rule when the sub-dept is only secondary', () => {
    const rule = mkRule({ subDepartmentId: 'sub-B' });
    const hit = matchRule([rule], {
      positionId: null,
      effectiveRole: 'EMPLOYEE',
      departmentIds: ['dept-X'],
      subDepartmentIds: ['sub-A', 'sub-B'],
    });
    expect(hit).not.toBeNull();
  });

  it('does not match when the rule sub-dept is not among the user sub-departments', () => {
    const rule = mkRule({ subDepartmentId: 'sub-Z' });
    const hit = matchRule([rule], {
      positionId: null, effectiveRole: 'EMPLOYEE', departmentIds: ['dept-X'], subDepartmentIds: ['sub-A'],
    });
    expect(hit).toBeNull();
  });

  it('prefers the position-scoped rule over the role-scoped one', () => {
    const byRole = mkRule({ id: 'role-rule', subDepartmentId: null, scope: 'GLOBAL', allow: false });
    const byPos = mkRule({ id: 'pos-rule', positionId: 'pos-1', subDepartmentId: null, scope: 'GLOBAL', role: null, allow: true });
    const hit = matchRule([byRole, byPos], {
      positionId: 'pos-1', effectiveRole: 'EMPLOYEE', departmentIds: [], subDepartmentIds: [],
    });
    expect((hit as any)?.id).toBe('pos-rule');
  });
});

// ─── resolveOne ────────────────────────────────────────────────────────────
//
// resolveOne is the pure decision function shared by the live middleware
// (requireRule) and the preview endpoint, so every PermissionSource branch has
// to be pinned down here without any DB in the loop.

/** A Prisma-shaped Rule row; only the fields matchRule/resolveOne read. */
const rule = (overrides: Record<string, unknown> = {}) => ({
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
}) as never;

const delegation = (overrides: Record<string, unknown> = {}) => ({
  resourceCode: 'supply-requests',
  action: 'UPDATE',
  departmentId: null,
  subDepartmentId: null,
  ...overrides,
});

/**
 * In-department EMPLOYEE with primary dept-1 / sub-A and secondary sub-B.
 * Override anything per test.
 */
function makeCtx(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return {
    userId: 'user-1',
    role: 'EMPLOYEE',
    effectiveRole: 'EMPLOYEE',
    positionId: null,
    departmentIds: ['dept-1'],
    subDepartmentId: 'sub-A',
    subDepartmentIds: ['sub-A', 'sub-B'],
    delegations: [],
    allRules: [],
    ...overrides,
  } as PermissionContext;
}

/** A no-department account (fresh hire / system user with departmentId NULL). */
const makeNoDeptCtx = (overrides: Partial<PermissionContext> = {}) =>
  makeCtx({ departmentIds: [], subDepartmentId: null, subDepartmentIds: [], ...overrides });

describe('resolveOne — ADMIN_BYPASS', () => {
  it('short-circuits for role ADMIN without reading allRules or delegations', () => {
    // Both collections blow up if touched, proving the branch is a true short-circuit.
    const allRules = { filter: jest.fn(() => { throw new Error('allRules must not be read'); }) };
    const delegations = { some: jest.fn(() => { throw new Error('delegations must not be read'); }) };
    const ctx = makeCtx({ role: 'ADMIN', allRules: allRules as never, delegations: delegations as never });

    const res = resolveOne('payrolls', 'DELETE', ctx);

    expect(res).toEqual({ allow: true, source: 'ADMIN_BYPASS' });
    expect(allRules.filter).not.toHaveBeenCalled();
    expect(delegations.some).not.toHaveBeenCalled();
  });

  it('keys off ctx.role, not effectiveRole (an ADMIN is ADMIN regardless of position)', () => {
    const ctx = makeCtx({ role: 'ADMIN', effectiveRole: 'EMPLOYEE' });
    expect(resolveOne('payrolls', 'DELETE', ctx).source).toBe('ADMIN_BYPASS');
  });
});

describe('resolveOne — DELEGATION', () => {
  it('a global delegation grants even when an explicit DENY rule would deny', () => {
    const ctx = makeCtx({
      delegations: [delegation() as never],
      allRules: [rule({ allow: false })],
    });
    expect(resolveOne('supply-requests', 'UPDATE', ctx)).toEqual({ allow: true, source: 'DELEGATION' });
  });

  it('delegation outranks the ADMIN-only-looking baseline: a denied DELETE is granted', () => {
    const ctx = makeCtx({
      delegations: [delegation({ resourceCode: 'invoices', action: 'DELETE' }) as never],
    });
    // No rule for invoices → without the delegation this falls to baseline DENY for EMPLOYEE DELETE.
    expect(resolveOne('invoices', 'DELETE', ctx)).toEqual({ allow: true, source: 'DELEGATION' });
    expect(resolveOne('invoices', 'DELETE', makeCtx())).toEqual({ allow: false, source: 'BASELINE_DENY' });
  });

  it('a delegation scoped to another department does not grant', () => {
    const ctx = makeCtx({
      delegations: [delegation({ departmentId: 'dept-OTHER' }) as never],
      allRules: [rule({ allow: false })],
    });
    // Falls through to the explicit DENY rule, proving the delegation was rejected.
    expect(resolveOne('supply-requests', 'UPDATE', ctx)).toEqual({ allow: false, source: 'RULE_DENY' });
  });

  it('a sub-department delegation only matches the exact current sub-department', () => {
    const matching = makeCtx({
      subDepartmentId: 'sub-A',
      delegations: [delegation({ subDepartmentId: 'sub-A' }) as never],
    });
    const mismatched = makeCtx({
      subDepartmentId: 'sub-A',
      delegations: [delegation({ subDepartmentId: 'sub-NOPE' }) as never],
    });
    expect(resolveOne('supply-requests', 'UPDATE', matching).source).toBe('DELEGATION');
    expect(resolveOne('supply-requests', 'UPDATE', mismatched).source).not.toBe('DELEGATION');
  });

  it('a delegation for a different resourceCode or action does not grant', () => {
    const ctx = makeCtx({
      delegations: [
        delegation({ resourceCode: 'other-resource' }) as never,
        delegation({ action: 'DELETE' }) as never,
      ],
    });
    expect(resolveOne('supply-requests', 'UPDATE', ctx).source).not.toBe('DELEGATION');
  });

  it('expired / inactive delegations never reach resolveOne — the caller filters them (see requireRule.test.ts)', () => {
    // Contract: PermissionContext.delegations carries ONLY rows already narrowed
    // by `isActive: true, from <= now, to >= now` in requireRule's query. resolveOne
    // deliberately has no from/to/isActive fields, so a stale row cannot leak in.
    expect(Object.keys(delegation())).toEqual(['resourceCode', 'action', 'departmentId', 'subDepartmentId']);
  });
});

describe('resolveOne — RULE_ALLOW / RULE_DENY', () => {
  it('an explicit matching allow rule wins over the baseline and reports RULE_ALLOW', () => {
    const ctx = makeCtx({ allRules: [rule({ resourceCode: 'invoices', action: 'DELETE', allow: true })] });
    // baselineAllow would deny EMPLOYEE DELETE — the rule must override it.
    expect(resolveOne('invoices', 'DELETE', ctx)).toEqual({ allow: true, source: 'RULE_ALLOW' });
  });

  it('an explicit matching deny rule reports RULE_DENY even when baseline would allow', () => {
    const ctx = makeCtx({ allRules: [rule({ resourceCode: 'invoices', action: 'READ', allow: false })] });
    expect(resolveOne('invoices', 'READ', ctx)).toEqual({ allow: false, source: 'RULE_DENY' });
  });

  it('rules for other resourceCode / action are ignored', () => {
    const ctx = makeCtx({
      allRules: [
        rule({ resourceCode: 'other-resource', action: 'UPDATE', allow: false }),
        rule({ resourceCode: 'invoices', action: 'DELETE', allow: false }),
      ],
    });
    expect(resolveOne('invoices', 'READ', ctx).source).toBe('BASELINE_ALLOW');
  });

  it('a DENY rule outranks the common tier (common tier is consulted only after rule matching)', () => {
    const ctx = makeCtx({ allRules: [rule({ resourceCode: 'docs', action: 'READ', allow: false })] });
    expect(resolveOne('docs', 'READ', ctx)).toEqual({ allow: false, source: 'RULE_DENY' });
  });
});

describe('resolveOne — no-department baseline vs CHUNG_ALLOW', () => {
  it('overtime-plans always DENY for a no-dept user, regardless of action', () => {
    for (const action of ['READ', 'CREATE', 'UPDATE', 'APPROVE']) {
      expect(resolveOne('overtime-plans', action, makeNoDeptCtx())).toEqual({ allow: false, source: 'BASELINE_NO_DEPT' });
    }
    // ...and the Chung exemption sits AFTER the overtime-plans hard denial.
    expect(CHUNG_NO_DEPT_ALLOW.has('overtime-plans')).toBe(false);
  });

  it('Chung resources allow READ / CREATE and report CHUNG_ALLOW', () => {
    for (const resourceCode of ['lookups', 'supply-requests']) {
      expect(resolveOne(resourceCode, 'READ', makeNoDeptCtx())).toEqual({ allow: true, source: 'CHUNG_ALLOW' });
      expect(resolveOne(resourceCode, 'CREATE', makeNoDeptCtx())).toEqual({ allow: true, source: 'CHUNG_ALLOW' });
    }
  });

  it('Chung resources still DENY anything other than READ / CREATE', () => {
    for (const action of ['UPDATE', 'DELETE', 'APPROVE']) {
      expect(resolveOne('supply-requests', action, makeNoDeptCtx())).toEqual({ allow: false, source: 'BASELINE_NO_DEPT' });
    }
  });

  it('a non-Chung resource DENIES for a no-dept user even for READ', () => {
    expect(resolveOne('invoices', 'READ', makeNoDeptCtx())).toEqual({ allow: false, source: 'BASELINE_NO_DEPT' });
  });

  it('an in-dept user is never routed through CHUNG_ALLOW (branch is no-dept only)', () => {
    expect(resolveOne('supply-requests', 'READ', makeCtx()).source).not.toBe('CHUNG_ALLOW');
  });
});

describe('resolveOne — COMMON_ALLOW', () => {
  // Resources that do NOT appear in CHUNG_NO_DEPT_ALLOW — used to pin the COMMON tier for both branches.
  const commonOnlyCases: Array<[string, string]> = [
    ['login-history', 'READ'],
    ['notifications', 'UPDATE'],
    ['auth', 'READ'],
    ['docs', 'READ'],
    ['system-settings', 'READ'],
    ['departments', 'READ'],
    ['positions', 'READ'],
  ];

  it.each(commonOnlyCases)('%s/%s grants COMMON_ALLOW for a no-dept user', (resourceCode, action) => {
    expect(resolveOne(resourceCode, action, makeNoDeptCtx())).toEqual({ allow: true, source: 'COMMON_ALLOW' });
  });

  it.each(commonOnlyCases)('%s/%s grants COMMON_ALLOW for an in-dept user too', (resourceCode, action) => {
    expect(resolveOne(resourceCode, action, makeCtx())).toEqual({ allow: true, source: 'COMMON_ALLOW' });
  });

  it('an under-provisioned department without any rule row still keeps the common tier', () => {
    // Regression guard: a department that lacks an explicit rule for `notifications`
    // must not lock its own users out of their notifications.
    const ctx = makeCtx({ allRules: [], effectiveRole: 'EMPLOYEE' });
    expect(resolveOne('notifications', 'READ', ctx).source).toBe('COMMON_ALLOW');
  });

  it('actions outside the per-resource grant still fall to baseline / no-dept deny', () => {
    // 'docs' is READ-only, 'login-history' is READ-only.
    expect(resolveOne('docs', 'DELETE', makeCtx()).source).toBe('BASELINE_DENY');
    expect(resolveOne('login-history', 'CREATE', makeNoDeptCtx())).toEqual({ allow: false, source: 'BASELINE_NO_DEPT' });
  });
});

describe('resolveOne — in-dept BASELINE_ALLOW / BASELINE_DENY fallback', () => {
  it('allows the open actions for an EMPLOYEE and reports BASELINE_ALLOW', () => {
    for (const action of ['CREATE', 'READ', 'UPDATE', 'EXPORT', 'IMPORT']) {
      expect(resolveOne('invoices', action, makeCtx())).toEqual({ allow: true, source: 'BASELINE_ALLOW' });
    }
  });

  it('denies DELETE for EMPLOYEE / TEAM_LEAD and reports BASELINE_DENY', () => {
    for (const effectiveRole of ['EMPLOYEE', 'TEAM_LEAD']) {
      expect(resolveOne('invoices', 'DELETE', makeCtx({ effectiveRole })))
        .toEqual({ allow: false, source: 'BASELINE_DENY' });
    }
  });

  it('allows DELETE for DEPARTMENT_HEAD via baseline', () => {
    expect(resolveOne('invoices', 'DELETE', makeCtx({ effectiveRole: 'DEPARTMENT_HEAD' })))
      .toEqual({ allow: true, source: 'BASELINE_ALLOW' });
  });

  it('gates APPROVE / REJECT on TEAM_LEAD and above', () => {
    expect(resolveOne('supply-requests', 'APPROVE', makeCtx({ effectiveRole: 'EMPLOYEE' })).allow).toBe(false);
    expect(resolveOne('supply-requests', 'APPROVE', makeCtx({ effectiveRole: 'TEAM_LEAD' })).allow).toBe(true);
    expect(resolveOne('supply-requests', 'REJECT', makeCtx({ effectiveRole: 'TEAM_LEAD' })).allow).toBe(true);
  });

  it('the baseline key off effectiveRole, not the raw JWT role', () => {
    const raised = makeCtx({ role: 'EMPLOYEE', effectiveRole: 'DEPARTMENT_HEAD' });
    expect(resolveOne('invoices', 'DELETE', raised).source).toBe('BASELINE_ALLOW');
  });
});

describe('isCommonGrant boundary', () => {
  it('docs/lookups READ are inside the tier', () => {
    expect(isCommonGrant('docs', 'READ')).toBe(true);
    expect(isCommonGrant('lookups', 'READ')).toBe(true);
  });

  it('users and attendances are OUTSIDE the tier (privilege-leak guard)', () => {
    expect(isCommonGrant('users', 'READ')).toBe(false);
    expect(isCommonGrant('attendances', 'READ')).toBe(false);
    expect(COMMON_GRANTS.users).toBeUndefined();
    expect(COMMON_GRANTS.attendances).toBeUndefined();
  });

  it('unknown resource codes return false rather than throwing', () => {
    expect(isCommonGrant('definitely-not-a-resource', 'READ')).toBe(false);
  });

  it('a known resource with an ungranted action returns false', () => {
    expect(isCommonGrant('notifications', 'CREATE')).toBe(false);
    expect(isCommonGrant('auth', 'DELETE')).toBe(false);
  });
});
