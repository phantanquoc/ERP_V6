/**
 * Baseline RBAC check (REQ-RBAC-006): used when no explicit Rule matches.
 *
 * - DELETE requires DEPARTMENT_HEAD or ADMIN
 * - APPROVE / REJECT requires TEAM_LEAD or above
 * - All other actions (CREATE, READ, UPDATE, EXPORT, IMPORT) allow every in-dept user
 */
export function baselineAllow(action: string, role: string): boolean {
  if (action === 'DELETE') return role === 'DEPARTMENT_HEAD' || role === 'ADMIN';
  if (action === 'APPROVE' || action === 'REJECT')
    return role === 'TEAM_LEAD' || role === 'DEPARTMENT_HEAD' || role === 'ADMIN';
  return true;
}
