import type { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';

function baselineAllow(action: string, role: string): boolean {
  if (action === 'DELETE') return role === 'DEPARTMENT_HEAD' || role === 'ADMIN';
  if (action === 'APPROVE' || action === 'REJECT') return role === 'TEAM_LEAD' || role === 'DEPARTMENT_HEAD' || role === 'ADMIN';
  return true;
}

/**
 * requireRule — DB-driven RBAC middleware replacing hard-coded authorize().
 *
 * Order: authenticate must run before this (needs req.user).
 * Priority: delegation → explicit Rule (position > role, narrow scope wins) → owner-scope → baseline.
 */
export function requireRule(resourceCode: string, action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Chưa xác thực' });
        return;
      }

      // ADMIN bypass
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      const userId = req.user.id;

      // Check delegation first (active window)
      const now = new Date();
      const delegation = await prisma.delegation.findFirst({
        where: {
          toUserId: userId,
          resourceCode,
          action: action as never,
          isActive: true,
          from: { lte: now },
          to: { gte: now },
        },
      });
      if (delegation) {
        next();
        return;
      }

      // Resolve effective role via Position.defaultRole
      let effectiveRole: string = req.user.role;
      const employee = await prisma.employee.findUnique({ where: { userId }, select: { positionId: true, subDepartmentId: true } });
      const positionId = employee?.positionId ?? null;

      if (positionId) {
        const pos = await prisma.position.findUnique({ where: { id: positionId }, select: { defaultRole: true } });
        if (pos?.defaultRole) effectiveRole = pos.defaultRole as string;
      }

      // Populate secondary department ids for downstream data filter
      const secondaryDeps = await prisma.userSecondaryDepartment.findMany({ where: { userId } });
      const departmentIds = [req.user.departmentId, ...secondaryDeps.map(s => s.departmentId)].filter(Boolean) as string[];
      const subDepartmentId = req.user.subDepartmentId ?? employee?.subDepartmentId ?? null;

      // Attach for data-permission filter in services
      (req as unknown as Record<string, unknown>).userDepartmentIds = departmentIds;
      (req as unknown as Record<string, unknown>).userSubDepartmentId = subDepartmentId;
      (req as unknown as Record<string, unknown>).userPositionId = positionId;
      (req as unknown as Record<string, unknown>).effectiveRole = effectiveRole;

      // Find matching explicit Rule
      const candidates = await prisma.rule.findMany({
        where: { resourceCode, action: action as never, isActive: true },
      });

      let matched: (typeof candidates)[number] | null = null;

      // Position-specific: narrow scope first
      if (positionId) {
        matched =
          candidates.find(r => r.positionId === positionId && r.subDepartmentId === subDepartmentId) ??
          candidates.find(r => r.positionId === positionId && r.departmentId !== null && departmentIds.includes(r.departmentId)) ??
          candidates.find(r => r.positionId === positionId && r.scope === 'GLOBAL') ??
          null;
      }
      // Role-based fallback
      if (!matched) {
        matched =
          candidates.find(r => r.role === (effectiveRole as never) && (r as unknown as { subDepartmentId: string | null }).subDepartmentId === subDepartmentId) ??
          candidates.find(r => r.role === (effectiveRole as never) && r.departmentId !== null && departmentIds.includes(r.departmentId)) ??
          candidates.find(r => r.role === (effectiveRole as never) && r.scope === 'GLOBAL') ??
          null;
      }
      // Generic global rule
      if (!matched) {
        matched = candidates.find(r => !r.positionId && !r.role && r.scope === 'GLOBAL') ?? null;
      }

      if (matched) {
        if (!matched.allow) {
          res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
          return;
        }
        next();
        return;
      }

      // Baseline fallback (REQ-RBAC-006)
      // No explicit Rule matched → apply baseline. For resources, we allow if user has any department
      // (meaning they belong to an org unit); otherwise deny. Baseline logic per action.
      if (departmentIds.length === 0 && resourceCode !== 'auth') {
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không thuộc phòng ban nào' });
        return;
      }

      const allow = baselineAllow(action, effectiveRole);
      if (!allow) {
        // Check owner-scope for UPDATE/DELETE: if the target record was created by this user, allow
        // Owner-scope requires knowing the target id; for list/create endpoints there's no single owner.
        // So we only apply owner-scope on :id routes — those will be checked in service layer.
        // Here we deny, but set a flag so service can override for owner.
        (req as unknown as Record<string, unknown>).baselineDenied = true;
        (req as unknown as Record<string, unknown>).baselineDeniedAction = action;
        // For DELETE/APPROVE baseline deny, we still deny at middleware — owner check happens in service
        // But to avoid blocking legitimate owner deletes, we allow through and let service decide
        if (action === 'DELETE' || action === 'UPDATE') {
          // Allow through — service will verify owner or deny
          next();
          return;
        }
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  };
}

/**
 * Helper for services: check if current user is owner of a record.
 * Returns true if createdById matches userId.
 */
export function isOwner(recordCreatedById: string | null | undefined, userId: string): boolean {
  return !!recordCreatedById && recordCreatedById === userId;
}

export { baselineAllow };
