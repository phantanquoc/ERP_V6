import prisma from '@config/database';
import type { JwtPayload } from '@types';

/**
 * Mirror of frontend hasSubModuleAccess("general","pricing").
 * Returns true if user is a pricing approver:
 * - ADMIN always passes
 * - GENERAL DEPARTMENT_HEAD / TEAM_LEAD (primary or secondary) passes
 * - GENERAL/pricing EMPLOYEE (primary subDepartment = pricing or secondary subDepartment = pricing) passes
 *
 * Department/subDepartment are stored as IDs in JWT; we resolve codes via DB.
 * SecondaryDepartments may carry role per entry.
 */
export async function isPricingApprover(user?: JwtPayload | null): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  // Collect effective entries: primary + secondaries
  const entries: Array<{ departmentId?: string | null; subDepartmentId?: string | null; role: string }> = [];
  if (user.departmentId) {
    entries.push({
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId ?? null,
      role: user.role,
    });
  }
  if (Array.isArray(user.secondaryDepartments)) {
    for (const s of user.secondaryDepartments) {
      entries.push({
        departmentId: s.departmentId,
        subDepartmentId: s.subDepartmentId ?? null,
        role: s.role,
      });
    }
  }
  if (entries.length === 0) return false;

  // Resolve department codes
  const deptIds = [...new Set(entries.map(e => e.departmentId).filter(Boolean) as string[])];
  const subDeptIds = [...new Set(entries.map(e => e.subDepartmentId).filter(Boolean) as string[])];

  const [depts, subDepts] = await Promise.all([
    deptIds.length ? prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, code: true } }) : [],
    subDeptIds.length ? prisma.subDepartment.findMany({ where: { id: { in: subDeptIds } }, select: { id: true, code: true } }) : [],
  ]);
  const deptCodeById = new Map(depts.map(d => [d.id, d.code]));
  const subDeptCodeById = new Map(subDepts.map(s => [s.id, s.code]));

  for (const e of entries) {
    const deptCode = e.departmentId ? deptCodeById.get(e.departmentId) : undefined;
    if (deptCode !== 'DEPT_GENERAL') continue;
    if (e.role === 'DEPARTMENT_HEAD' || e.role === 'TEAM_LEAD') return true;
    if (e.role === 'EMPLOYEE') {
      const subCode = e.subDepartmentId ? subDeptCodeById.get(e.subDepartmentId) : undefined;
      if (subCode === 'SUBDEPT_GENERAL_PRICING') return true;
    }
  }
  return false;
}

/**
 * Sync variant when caller already has department/subDepartment codes (e.g. from cached lookups).
 * Mirrors the same logic but without DB.
 */
export function isPricingApproverSync(
  params: {
    role: string;
    departmentCode?: string | null;
    subDepartmentCode?: string | null;
    secondaryDepartments?: Array<{ departmentCode?: string | null; subDepartmentCode?: string | null; role: string }>;
  }
): boolean {
  if (params.role === 'ADMIN') return true;
  const checkEntry = (deptCode: string | null | undefined, subCode: string | null | undefined, role: string): boolean => {
    if (deptCode !== 'DEPT_GENERAL') return false;
    if (role === 'DEPARTMENT_HEAD' || role === 'TEAM_LEAD') return true;
    if (role === 'EMPLOYEE' && subCode === 'SUBDEPT_GENERAL_PRICING') return true;
    return false;
  };
  if (checkEntry(params.departmentCode, params.subDepartmentCode, params.role)) return true;
  if (params.secondaryDepartments) {
    for (const s of params.secondaryDepartments) {
      if (checkEntry(s.departmentCode, s.subDepartmentCode, s.role)) return true;
    }
  }
  return false;
}
