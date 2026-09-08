import { raiseRole, matchRule } from '../utils/permissionResolution';

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
