/**
 * evaluationAuditService.ts
 *
 * Append-only audit log for every change on Evaluation and EvaluationDetail.
 * All writes must happen inside the caller's transaction (accept tx parameter).
 * No delete or update endpoints are exposed from this service.
 */

import { AuthorizationError } from '@utils/errors';
import { UserRole } from '@types';

// Inlined enum mirror — Prisma-generated enum will be available as
// EvaluationAuditAction via prisma client; we re-export a TS const for type safety.
export const EvaluationAuditAction = {
  SCORE_UPDATE: 'SCORE_UPDATE',
  COMMENT_UPDATE: 'COMMENT_UPDATE',
  STATUS_TRANSITION: 'STATUS_TRANSITION',
  NA_TOGGLE: 'NA_TOGGLE',
  APPEAL_SUBMIT: 'APPEAL_SUBMIT',
  APPEAL_REPLY: 'APPEAL_REPLY',
  EVIDENCE_ADD: 'EVIDENCE_ADD',
  EVIDENCE_DELETE: 'EVIDENCE_DELETE',
  GOAL_UPDATE: 'GOAL_UPDATE',
  IDP_UPDATE: 'IDP_UPDATE',
  PEER_INVITE: 'PEER_INVITE',
  PEER_SUBMIT: 'PEER_SUBMIT',
} as const;

export type EvaluationAuditAction = typeof EvaluationAuditAction[keyof typeof EvaluationAuditAction];

export interface LogChangeParams {
  evaluationId: string;
  evaluationDetailId?: string;
  changedByUserId?: string | null;
  action: EvaluationAuditAction;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
}

/**
 * Write a single audit log row inside the caller's transaction.
 * `tx` must be a Prisma transaction client (from prisma.$transaction callback).
 */
export async function logChange(
  tx: any,
  params: LogChangeParams
): Promise<void> {
  const { evaluationId, evaluationDetailId, changedByUserId, action, field, oldValue, newValue } = params;

  await tx.evaluationAuditLog.create({
    data: {
      evaluationId,
      evaluationDetailId: evaluationDetailId ?? null,
      changedByUserId: changedByUserId ?? null,
      action,
      field,
      // Truncate long text values to 4000 chars — audit rows are a log, not a copy
      oldValue: oldValue != null ? String(oldValue).substring(0, 4000) : null,
      newValue: newValue != null ? String(newValue).substring(0, 4000) : null,
    },
  });
}

/**
 * Convenience helper: log a status transition.
 */
export async function logStatusTransition(
  tx: any,
  evaluationId: string,
  oldStatus: string,
  newStatus: string,
  userId: string
): Promise<void> {
  await logChange(tx, {
    evaluationId,
    changedByUserId: userId,
    action: EvaluationAuditAction.STATUS_TRANSITION,
    field: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

/**
 * Convenience helper: log a score field update on a detail row.
 */
export async function logScoreUpdate(
  tx: any,
  detail: { id: string; evaluationId: string },
  field: string,
  oldValue: number | null,
  newValue: number | null,
  userId: string
): Promise<void> {
  await logChange(tx, {
    evaluationId: detail.evaluationId,
    evaluationDetailId: detail.id,
    changedByUserId: userId,
    action: EvaluationAuditAction.SCORE_UPDATE,
    field,
    oldValue: oldValue != null ? String(oldValue) : null,
    newValue: newValue != null ? String(newValue) : null,
  });
}

/**
 * Read audit log for an evaluation with RBAC enforcement.
 * - ADMIN: sees all evaluations
 * - DEPARTMENT_HEAD: sees only evaluations in their department
 * - All others: throws AuthorizationError
 */
export async function getAuditLog(
  prisma: any,
  evaluationId: string,
  _userId: string,
  userRole: string,
  userDepartmentIds?: string[] | null
): Promise<any[]> {
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.DEPARTMENT_HEAD) {
    throw new AuthorizationError('Không có quyền xem nhật ký kiểm toán đánh giá');
  }

  // DEPARTMENT_HEAD scope enforcement
  if (userRole === UserRole.DEPARTMENT_HEAD && userDepartmentIds?.length) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            subDepartment: { include: { department: true } },
          },
        },
      },
    });

    if (!evaluation) {
      throw new AuthorizationError('Không tìm thấy đánh giá');
    }

    const employeeDeptId = evaluation.employee?.subDepartment?.departmentId;
    if (!employeeDeptId || !userDepartmentIds.includes(employeeDeptId)) {
      throw new AuthorizationError('Không có quyền xem nhật ký kiểm toán của nhân viên ngoài phòng ban');
    }
  }

  return prisma.evaluationAuditLog.findMany({
    where: { evaluationId },
    orderBy: { createdAt: 'desc' },
  });
}

export default { logChange, logStatusTransition, logScoreUpdate, getAuditLog, EvaluationAuditAction };
