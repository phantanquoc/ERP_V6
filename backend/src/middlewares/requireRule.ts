import type { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';
import { baselineAllow } from '@utils/baselineAllow';
import logger from '@config/logger';
import type { Rule } from '@prisma/client';

/**
 * Maps a resourceCode to the Prisma model used for owner lookups.
 * ownerField is the column that stores the creator's auth.User.id.
 * Only resources with a creator column are listed; others fall through to deny.
 */
const RESOURCE_TO_MODEL: Record<string, { delegate: string; ownerField: string }> = {
  // business schema — owner = createdById (soft ref to auth.User.id)
  'customer-feedbacks': { delegate: 'customerFeedback', ownerField: 'createdById' },
  'fault-records': { delegate: 'faultRecord', ownerField: 'createdById' },
  'maintenance-plans': { delegate: 'maintenancePlan', ownerField: 'createdById' },
  'maintenance-records': { delegate: 'maintenanceRecord', ownerField: 'createdById' },
  'material-evaluations': { delegate: 'materialEvaluation', ownerField: 'createdById' },
  'finished-products': { delegate: 'finishedProduct', ownerField: 'createdById' },
  'quality-evaluations': { delegate: 'qualityEvaluation', ownerField: 'createdById' },
  'production-reports': { delegate: 'productionReport', ownerField: 'createdById' },
  'invoices': { delegate: 'invoice', ownerField: 'createdById' },
  // common schema — owner = createdById
  'internal-inspections': { delegate: 'internalInspection', ownerField: 'createdById' },
  'repair-requests': { delegate: 'repairRequest', ownerField: 'createdById' },
  'acceptance-handovers': { delegate: 'acceptanceHandover', ownerField: 'createdById' },
  'supply-requests': { delegate: 'supplyRequest', ownerField: 'employeeId' },
  'purchase-requests': { delegate: 'purchaseRequest', ownerField: 'employeeId' },
  'general-costs': { delegate: 'generalCost', ownerField: 'createdById' },
  'export-costs': { delegate: 'exportCost', ownerField: 'createdById' },
  // business: creator stored under different column names
  'projects': { delegate: 'project', ownerField: 'nguoiTaoId' },
  'overtime-plans': { delegate: 'overtimePlan', ownerField: 'nguoiTaoId' },
  'work-plans': { delegate: 'workPlan', ownerField: 'nguoiTaoId' },
  'tasks': { delegate: 'task', ownerField: 'nguoiGiaoId' },
  // common: creator stored as createdBy (no Id suffix) or other
  'products': { delegate: 'product', ownerField: 'createdBy' },
  'processes': { delegate: 'process', ownerField: 'msnv' },
  'production-processes': { delegate: 'productionProcess', ownerField: 'msnv' },
  'daily-work-reports': { delegate: 'dailyWorkReport', ownerField: 'employeeId' },
  'private-feedbacks': { delegate: 'privateFeedback', ownerField: 'userId' },
  'leave-requests': { delegate: 'leaveRequest', ownerField: 'employeeId' },
  // orders / quotations use employeeId link — owner check via employee.userId would require join; deny fallback
};

/**
 * Check whether a delegation's scope matches the user's departments.
 * GLOBAL (both ids null) matches any user; otherwise the user's department/subDepartment must match.
 */
function delegationScopeMatches(
  delegation: { departmentId: string | null; subDepartmentId: string | null },
  departmentIds: string[],
  subDepartmentId: string | null,
): boolean {
  // GLOBAL delegation
  if (!delegation.departmentId && !delegation.subDepartmentId) return true;
  // Sub-department scoped: must match exact subDepartment
  if (delegation.subDepartmentId) return delegation.subDepartmentId === subDepartmentId;
  // Department scoped: must be in user's department list
  if (delegation.departmentId) return departmentIds.includes(delegation.departmentId);
  return false;
}

/**
 * Try to load the owner of a record identified by :id for the given resourceCode.
 * Returns the owner userId string if found, null if record missing or no owner field, undefined if resource not mapped.
 */
// Resources whose ownerField stores an Employee.id (not auth.User.id) —
// loadRecordOwner must join via employee.userId to compare against req.user.id.
const EMPLOYEE_OWNER_RESOURCES = new Set(['supply-requests', 'purchase-requests', 'leave-requests', 'daily-work-reports']);

async function loadRecordOwner(resourceCode: string, recordId: string): Promise<string | null | undefined> {
  const mapping = RESOURCE_TO_MODEL[resourceCode];
  if (!mapping) return undefined; // unknown resource → caller should deny
  const delegate = (prisma as unknown as Record<string, { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> }>)[mapping.delegate];
  if (!delegate || typeof delegate.findUnique !== 'function') {
    logger.warn(`[requireRule] owner-scope: delegate not found for resource=${resourceCode} -> ${mapping.delegate}`);
    return undefined;
  }
  try {
    // Employee-owned resources: resolve employeeId → employee.userId
    if (EMPLOYEE_OWNER_RESOURCES.has(resourceCode)) {
      const row = await delegate.findUnique({
        where: { id: recordId },
        select: { [mapping.ownerField]: true },
      });
      if (!row) return null;
      const employeeId = row[mapping.ownerField];
      if (typeof employeeId !== 'string' || !employeeId) return null;
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true },
      });
      return employee?.userId ?? null;
    }
    const row = await delegate.findUnique({
      where: { id: recordId },
      select: { [mapping.ownerField]: true },
    });
    if (!row) return null;
    const val = row[mapping.ownerField];
    return typeof val === 'string' ? val : null;
  } catch (err) {
    logger.warn(`[requireRule] owner-scope query failed for ${resourceCode}/${recordId}: ${String(err)}`);
    return null;
  }
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

      // Resolve effective role + departments early (needed for delegation scope check)
      let effectiveRole: string = req.user.role;
      const employee = await prisma.employee.findUnique({ where: { userId }, select: { positionId: true, subDepartmentId: true } });
      const positionId = employee?.positionId ?? null;

      if (positionId) {
        const pos = await prisma.position.findUnique({ where: { id: positionId }, select: { defaultRole: true } });
        if (pos?.defaultRole) effectiveRole = pos.defaultRole as string;
      }

      // Populate secondary department ids for downstream data filter
      const secondaryDeps = await prisma.userSecondaryDepartment.findMany({ where: { userId } });
      const departmentIds: string[] = [req.user.departmentId, ...secondaryDeps.map((s) => s.departmentId)].filter((v): v is string => !!v);
      const subDepartmentId: string | null = req.user.subDepartmentId ?? employee?.subDepartmentId ?? null;

      // Attach for data-permission filter in services
      (req as unknown as Record<string, unknown>).userDepartmentIds = departmentIds;
      (req as unknown as Record<string, unknown>).userSubDepartmentId = subDepartmentId;
      (req as unknown as Record<string, unknown>).userPositionId = positionId;
      (req as unknown as Record<string, unknown>).effectiveRole = effectiveRole;

      // Check delegation (active window) — scope-aware
      const now = new Date();
      const delegations = await prisma.delegation.findMany({
        where: {
          toUserId: userId,
          resourceCode,
          action: action as never,
          isActive: true,
          from: { lte: now },
          to: { gte: now },
        },
      });
      const hasMatchingDelegation = delegations.some((d) => delegationScopeMatches(d, departmentIds, subDepartmentId));
      if (hasMatchingDelegation) {
        next();
        return;
      }

      // Find matching explicit Rule
      const candidates = await prisma.rule.findMany({
        where: { resourceCode, action: action as never, isActive: true },
      });

      let matched: Rule | null = null;

      // Position-specific: narrow scope first
      if (positionId) {
        matched =
          (candidates.find((r) => r.positionId === positionId && r.subDepartmentId === subDepartmentId) as Rule | undefined) ??
          (candidates.find((r) => r.positionId === positionId && r.departmentId !== null && departmentIds.includes(r.departmentId)) as Rule | undefined) ??
          (candidates.find((r) => r.positionId === positionId && r.scope === 'GLOBAL') as Rule | undefined) ??
          null;
      }
      // Role-based fallback
      if (!matched) {
        matched =
          (candidates.find((r) => r.role === (effectiveRole as never) && r.subDepartmentId === subDepartmentId) as Rule | undefined) ??
          (candidates.find((r) => r.role === (effectiveRole as never) && r.departmentId !== null && departmentIds.includes(r.departmentId)) as Rule | undefined) ??
          (candidates.find((r) => r.role === (effectiveRole as never) && r.scope === 'GLOBAL') as Rule | undefined) ??
          null;
      }
      // Generic global rule
      if (!matched) {
        matched = (candidates.find((r) => !r.positionId && !r.role && r.scope === 'GLOBAL') as Rule | undefined) ?? null;
      }

      if (matched) {
        if (!matched.allow) {
          res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
          return;
        }
        next();
        return;
      }

      // Self-attendance READ bypass for no-department users (REQ no-dept-self-service)
      // Narrow: attendances + READ + /employee/:employeeId own record only; fails closed.
      if (departmentIds.length === 0 && resourceCode === 'attendances' && action === 'READ') {
        const requestedEmployeeId = (req.params as Record<string, string>).employeeId;
        if (requestedEmployeeId) {
          try {
            const ownEmployee = await prisma.employee.findUnique({
              where: { userId },
              select: { id: true },
            });
            if (ownEmployee && ownEmployee.id === requestedEmployeeId) {
              next();
              return;
            }
          } catch {
            // fail closed — fall through to 403 below
          }
        }
      }

      // Chung tab full access for no-department users except overtime creation (REQ no-dept-self-service fix)
      // READ and CREATE are allowed for Chung resources; UPDATE/DELETE remain blocked (or owner-scoped via later check).
      // Overtime CREATE is intentionally excluded — no-dept never creates overtime plans (TEAM_LEAD+ only).
      if (
        departmentIds.length === 0 &&
        (action === 'READ' || action === 'CREATE') &&
        ['lookups', 'supply-requests', 'repair-requests', 'tasks', 'work-plans', 'private-feedbacks', 'processes'].includes(resourceCode)
      ) {
        next();
        return;
      }

      // Baseline fallback (REQ-RBAC-006)
      if (departmentIds.length === 0 && resourceCode !== 'auth') {
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không thuộc phòng ban nào' });
        return;
      }

      const allow = baselineAllow(action, effectiveRole);
      if (!allow) {
        // For UPDATE/DELETE, check owner-scope: load record by :id and allow if created by this user
        if (action === 'UPDATE' || action === 'DELETE') {
          const recordId = (req.params as Record<string, string>).id ?? Object.values(req.params as Record<string, string>)[0];
          if (recordId) {
            const ownerId = await loadRecordOwner(resourceCode, recordId);
            if (ownerId !== undefined && ownerId !== null && ownerId === userId) {
              next();
              return;
            }
            // If mapping missing or owner mismatch, fall through to 403
            if (ownerId === undefined) {
              logger.warn(`[requireRule] owner-scope: no mapping for resource=${resourceCode}, denying ${action} for user=${userId}`);
            }
          }
          // No :id (bulk/list) or not owner → deny
        }
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
        return;
      }

      next();
    } catch (error) {
      logger.error('[requireRule] unexpected error', { resourceCode, action, error: String(error) });
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
export { RESOURCE_TO_MODEL, delegationScopeMatches, loadRecordOwner };
