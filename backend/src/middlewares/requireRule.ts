import type { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';
import { baselineAllow } from '@utils/baselineAllow';
import {
  raiseRole,
  ROLE_RANK,
  matchRule,
  delegationScopeMatches,
  isCommonGrant,
  CHUNG_NO_DEPT_ALLOW,
} from '@utils/permissionResolution';
import logger from '@config/logger';

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
  invoices: { delegate: 'invoice', ownerField: 'createdById' },
  // common schema — owner = createdById
  'internal-inspections': { delegate: 'internalInspection', ownerField: 'createdById' },
  'repair-requests': { delegate: 'repairRequest', ownerField: 'createdById' },
  'acceptance-handovers': { delegate: 'acceptanceHandover', ownerField: 'createdById' },
  'supply-requests': { delegate: 'supplyRequest', ownerField: 'employeeId' },
  'purchase-requests': { delegate: 'purchaseRequest', ownerField: 'employeeId' },
  'replenishment-requests': { delegate: 'replenishmentRequest', ownerField: 'employeeId' },
  'general-costs': { delegate: 'generalCost', ownerField: 'createdById' },
  'export-costs': { delegate: 'exportCost', ownerField: 'createdById' },
  // business: creator stored under different column names
  projects: { delegate: 'project', ownerField: 'nguoiTaoId' },
  'overtime-plans': { delegate: 'overtimePlan', ownerField: 'nguoiTaoId' },
  'work-plans': { delegate: 'workPlan', ownerField: 'nguoiTaoId' },
  tasks: { delegate: 'task', ownerField: 'nguoiGiaoId' },
  // common: creator stored as createdBy (no Id suffix) or other
  products: { delegate: 'product', ownerField: 'createdBy' },
  processes: { delegate: 'process', ownerField: 'msnv' },
  'production-processes': { delegate: 'productionProcess', ownerField: 'msnv' },
  'daily-work-reports': { delegate: 'dailyWorkReport', ownerField: 'employeeId' },
  'private-feedbacks': { delegate: 'privateFeedback', ownerField: 'userId' },
  'leave-requests': { delegate: 'leaveRequest', ownerField: 'employeeId' },
  // orders / quotations / warehouse / suppliers use employeeId link (join via employee.userId)
  'inspection-requests': { delegate: 'inspectionRequest', ownerField: 'createdById' },
  quotations: { delegate: 'quotation', ownerField: 'employeeId' },
  'quotation-requests': { delegate: 'quotationRequest', ownerField: 'employeeId' },
  orders: { delegate: 'order', ownerField: 'employeeId' },
  suppliers: { delegate: 'supplier', ownerField: 'employeeId' },
  'warehouse-receipts': { delegate: 'warehouseReceipt', ownerField: 'employeeId' },
  'warehouse-issues': { delegate: 'warehouseIssue', ownerField: 'employeeId' },
  // orders / quotations use employeeId link — owner check via employee.userId would require join; deny fallback
};

/**
 * Try to load the owner of a record identified by :id for the given resourceCode.
 * Returns the owner userId string if found, null if record missing or no owner field, undefined if resource not mapped.
 */
// Resources whose ownerField stores an Employee.id (not auth.User.id) —
// loadRecordOwner must join via employee.userId to compare against req.user.id.
const EMPLOYEE_OWNER_RESOURCES = new Set([
  'supply-requests',
  'purchase-requests',
  'replenishment-requests',
  'leave-requests',
  'daily-work-reports',
  'quotations',
  'quotation-requests',
  'orders',
  'suppliers',
  'warehouse-receipts',
  'warehouse-issues',
]);

// Resources whose ownerField stores an employee code (msnv), not auth.User.id —
// loadRecordOwner must join via employee.employeeCode → employee.userId.
const MSNV_OWNER_RESOURCES = new Set(['processes', 'production-processes']);

// Delegates whose PK is an Int autoincrement (legacy) — coerce the string :id
// param, otherwise Prisma throws a type error and owner-scope silently denies.
const INT_ID_RESOURCES = new Set(['repair-requests', 'inspection-requests']);

async function loadRecordOwner(
  resourceCode: string,
  recordId: string
): Promise<string | null | undefined> {
  const mapping = RESOURCE_TO_MODEL[resourceCode];
  if (!mapping) return undefined; // unknown resource → caller should deny
  const delegate = (
    prisma as unknown as Record<
      string,
      { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> }
    >
  )[mapping.delegate];
  if (!delegate || typeof delegate.findUnique !== 'function') {
    logger.warn(
      `[requireRule] owner-scope: delegate not found for resource=${resourceCode} -> ${mapping.delegate}`
    );
    return undefined;
  }
  try {
    // Int-PK resources: the :id route param arrives as string — coerce it.
    const whereId: unknown = INT_ID_RESOURCES.has(resourceCode) ? Number(recordId) : recordId;
    if (whereId !== recordId && (typeof whereId !== 'number' || !Number.isInteger(whereId)))
      return null;
    // Employee-owned resources: resolve employeeId → employee.userId
    if (EMPLOYEE_OWNER_RESOURCES.has(resourceCode)) {
      const row = await delegate.findUnique({
        where: { id: whereId },
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
    // msnv-owned resources: resolve employeeCode → employee.userId
    if (MSNV_OWNER_RESOURCES.has(resourceCode)) {
      const row = await delegate.findUnique({
        where: { id: whereId },
        select: { [mapping.ownerField]: true },
      });
      if (!row) return null;
      const msnv = row[mapping.ownerField];
      if (typeof msnv !== 'string' || !msnv) return null;
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: msnv },
        select: { userId: true },
      });
      return employee?.userId ?? null;
    }
    const row = await delegate.findUnique({
      where: { id: whereId },
      select: { [mapping.ownerField]: true },
    });
    if (!row) return null;
    const val = row[mapping.ownerField];
    return typeof val === 'string' ? val : null;
  } catch (err) {
    logger.warn(
      `[requireRule] owner-scope query failed for ${resourceCode}/${recordId}: ${String(err)}`
    );
    return null;
  }
}

/**
 * Participant check for shared records: task assignees (nguoiNhanIds) and
 * repair-request assignees (repairRequestAssignee rows) may READ records
 * assigned to them. Returns false for all other resources. Fail-closed.
 */
async function isRecordParticipant(
  resourceCode: string,
  recordId: string,
  userId: string
): Promise<boolean> {
  try {
    if (resourceCode === 'tasks') {
      const task = await prisma.task.findUnique({
        where: { id: recordId },
        select: { nguoiNhanIds: true },
      });
      return Array.isArray(task?.nguoiNhanIds) && (task.nguoiNhanIds as string[]).includes(userId);
    }
    if (resourceCode === 'repair-requests') {
      const id = Number(recordId);
      if (!Number.isInteger(id)) return false;
      const row = await prisma.repairRequestAssignee.findFirst({
        where: { repairRequestId: id, userId },
      });
      return row !== null;
    }
    return false;
  } catch (err) {
    logger.warn(
      `[requireRule] participant check failed for ${resourceCode}/${recordId}: ${String(err)}`
    );
    return false;
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
      // Kiosk device bypass — device key already validated by deviceOrJwtAuth
      if ((req as AuthenticatedRequest).isKioskDevice) {
        next();
        return;
      }

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

      // ─── Authorization identity comes from auth.users (the access-control record),
      // NOT from the HR employee record. `common.employees.positionId` points at a job
      // title whose `defaultRole` is an HR default; it used to OVERRIDE req.user.role
      // unconditionally, which silently DOWNGRADED users whose HR position lagged behind
      // their granted role — e.g. a purchasing TEAM_LEAD stored under "Nhân viên sản xuất"
      // (defaultRole EMPLOYEE) lost APPROVE rights and could not submit a replenishment
      // request for admin approval.
      //
      // Rule: a position may only RAISE the effective role, never lower it.
      const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { positionId: true, subDepartmentId: true },
      });
      const positionId = employee?.positionId ?? null;
      let positionDefaultRole: string | null = null;
      if (positionId) {
        const pos = await prisma.position.findUnique({
          where: { id: positionId },
          select: { defaultRole: true },
        });
        positionDefaultRole = (pos?.defaultRole as string | null) ?? null;
      }
      const effectiveRole: string = raiseRole(req.user.role, positionDefaultRole);

      // Populate secondary department ids for downstream data filter
      const secondaryDeps = await prisma.userSecondaryDepartment.findMany({ where: { userId } });
      const departmentIds: string[] = [
        req.user.departmentId,
        ...secondaryDeps.map((s) => s.departmentId),
      ].filter((v): v is string => !!v);
      // Primary sub-department (User is authoritative, Employee only as last-resort fallback)
      const subDepartmentId: string | null =
        req.user.subDepartmentId ?? employee?.subDepartmentId ?? null;
      // Every sub-department this user belongs to (primary + secondary) so that a rule
      // scoped to a secondary sub-department still matches.
      const subDepartmentIds: string[] = [
        req.user.subDepartmentId,
        employee?.subDepartmentId,
        ...secondaryDeps.map((s) => s.subDepartmentId),
      ].filter((v): v is string => !!v);

      // Attach for data-permission filter in services
      (req as unknown as Record<string, unknown>).userDepartmentIds = departmentIds;
      (req as unknown as Record<string, unknown>).userSubDepartmentId = subDepartmentId;
      (req as unknown as Record<string, unknown>).userSubDepartmentIds = subDepartmentIds;
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
      const hasMatchingDelegation = delegations.some((d) =>
        delegationScopeMatches(d, departmentIds, subDepartmentIds)
      );
      if (hasMatchingDelegation) {
        next();
        return;
      }

      // Find matching explicit Rule (shared resolver — keeps preview and enforcement identical)
      const candidates = await prisma.rule.findMany({
        where: { resourceCode, action: action as never, isActive: true },
      });
      const matched = matchRule(candidates, {
        positionId,
        effectiveRole,
        departmentIds,
        subDepartmentIds,
      });

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
        CHUNG_NO_DEPT_ALLOW.has(resourceCode)
      ) {
        next();
        return;
      }

      // In-department: preview allows Chung's "common" reads even when no explicit Rule
      // exists and baseline would deny. Keep enforcement identical so the Rule Matrix
      // preview matches reality.
      if (departmentIds.length !== 0 && isCommonGrant(resourceCode, action)) {
        next();
        return;
      }

      // Baseline fallback (REQ-RBAC-006)
      if (departmentIds.length === 0 && resourceCode !== 'auth') {
        res
          .status(403)
          .json({ success: false, message: 'Truy cập bị từ chối: Không thuộc phòng ban nào' });
        return;
      }

      const allow = baselineAllow(action, effectiveRole);
      if (!allow) {
        // For UPDATE/DELETE, check owner-scope: load record by :id and allow if created by this user
        if (action === 'UPDATE' || action === 'DELETE') {
          const recordId =
            (req.params as Record<string, string>).id ??
            Object.values(req.params as Record<string, string>)[0];
          if (recordId) {
            const ownerId = await loadRecordOwner(resourceCode, recordId);
            if (ownerId !== undefined && ownerId !== null && ownerId === userId) {
              next();
              return;
            }
            // If mapping missing or owner mismatch, fall through to 403
            if (ownerId === undefined) {
              logger.warn(
                `[requireRule] owner-scope: no mapping for resource=${resourceCode}, denying ${action} for user=${userId}`
              );
            }
          }
          // No :id (bulk/list) or not owner → deny
        }
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
        return;
      }

      // IDOR READ guard: baseline allows READ for every in-dept role, so a same-role
      // user could fetch another user's record via GET /resource/:id. For
      // non-leadership roles (below TEAM_LEAD), a single-record READ succeeds only
      // when the caller owns the record (or participates in it); TEAM_LEAD+ keep
      // full visibility. Narrow on purpose:
      // - only mapped resources (ownership is defined in RESOURCE_TO_MODEL);
      // - only the :id param (code/employeeId params are not record ids);
      // list reads and unmapped resources keep baseline behavior.
      if (action === 'READ' && (ROLE_RANK[effectiveRole] ?? 0) < (ROLE_RANK['TEAM_LEAD'] ?? 1)) {
        const recordId = (req.params as Record<string, string>).id;
        if (recordId && RESOURCE_TO_MODEL[resourceCode]) {
          const ownerId = await loadRecordOwner(resourceCode, recordId);
          if (ownerId !== undefined && ownerId !== null && ownerId === userId) {
            next();
            return;
          }
          // Participant reads: assignees open records shared with them, not just
          // records they created (task nguoiNhanIds, repair assignee rows).
          if (
            ownerId !== undefined &&
            (await isRecordParticipant(resourceCode, recordId, userId))
          ) {
            next();
            return;
          }
          if (ownerId === undefined) {
            logger.warn(
              `[requireRule] owner-scope: no mapping for resource=${resourceCode}, denying ${action} for user=${userId}`
            );
          }
          res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('[requireRule] unexpected error', {
        resourceCode,
        action,
        error: String(error),
      });
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
