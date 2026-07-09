import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';
import { computeKpiDeduction } from '@utils/payroll';
import notificationService from './notificationService';
import { logChange, logStatusTransition, logScoreUpdate, EvaluationAuditAction } from './evaluationAuditService';
import { EvaluationStatus, NotificationEvent, UserRole } from '@types';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

// ─── Allowed MIME types for evidence ────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_EVIDENCE_PER_DETAIL = 5;
const MAX_GOALS_PER_EVALUATION = 3;
const MAX_IDP_ITEMS_PER_EVALUATION = 3;

// ─── Score computation helpers ──────────────────────────────────────────────

/**
 * Calculate a weighted average score from evaluation details.
 * For each score type (self, supervisor1, supervisor2), if ALL non-NA details have a non-null
 * value → compute weighted score = sum(score * weight) / totalActiveWeight.
 * Average only the score types that are fully filled.
 */
function computeWeightedScore(details: Array<{
  selfScore: number | null;
  supervisorScore1: number | null;
  supervisorScore2: number | null;
  notApplicable?: boolean;
  positionResponsibility: { weight: number } | null;
}>): number {
  // Filter out N/A details
  const activeDetails = details.filter(d => !d.notApplicable);
  if (activeDetails.length === 0) return 0;

  const totalWeight = activeDetails.reduce((sum, d) => sum + (d.positionResponsibility?.weight ?? 0), 0);
  if (totalWeight === 0) return 0;

  const hasSelf = activeDetails.every(d => d.selfScore !== null);
  const hasSup1 = activeDetails.every(d => d.supervisorScore1 !== null);
  const hasSup2 = activeDetails.every(d => d.supervisorScore2 !== null);

  const scoresToAverage: number[] = [];

  if (hasSelf) {
    const s = activeDetails.reduce((sum, d) => sum + ((d.selfScore ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }
  if (hasSup1) {
    const s = activeDetails.reduce((sum, d) => sum + ((d.supervisorScore1 ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }
  if (hasSup2) {
    const s = activeDetails.reduce((sum, d) => sum + ((d.supervisorScore2 ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }

  return scoresToAverage.length > 0
    ? scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length
    : 0;
}

/**
 * Compute weighted score for a specific score field (selfScore, supervisorScore1, supervisorScore2).
 * Skips details where notApplicable === true.
 * Returns 0 if any applicable detail has null for that field (not fully filled yet).
 * Correct formula: sum(score × weight) / totalActiveWeight
 */
export function computeWeightedScoreForField(
  details: Array<{
    selfScore: number | null;
    supervisorScore1: number | null;
    supervisorScore2: number | null;
    notApplicable?: boolean;
    positionResponsibility: { weight: number } | null;
  }>,
  field: 'selfScore' | 'supervisorScore1' | 'supervisorScore2'
): number {
  // Filter out N/A details
  const activeDetails = details.filter(d => !d.notApplicable);
  if (activeDetails.length === 0) return 0;

  const allFilled = activeDetails.every(d => d[field] !== null);
  if (!allFilled) return 0;

  const totalWeight = activeDetails.reduce((sum, d) => sum + (d.positionResponsibility?.weight ?? 0), 0);
  if (totalWeight === 0) return 0;

  return activeDetails.reduce((sum, d) => {
    const score = d[field] ?? 0;
    const weight = d.positionResponsibility?.weight ?? 0;
    return sum + score * weight;
  }, 0) / totalWeight;
}

export class EmployeeEvaluationService {

  // ─── getEmployeeEvaluations ────────────────────────────────────────────────

  async getEmployeeEvaluations(
    month: number,
    year: number,
    userDepartmentId?: string,
    userSubDepartmentId?: string,
    callerId?: string,
    callerRole?: string
  ): Promise<any[]> {
    const conditions: any[] = [];

    if (userSubDepartmentId) {
      conditions.push({ user: { subDepartmentId: userSubDepartmentId } });
    } else if (userDepartmentId) {
      conditions.push({
        OR: [
          { user: { departmentId: userDepartmentId } },
          { subDepartment: { departmentId: userDepartmentId } },
        ],
      });
    }

    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { user: { role: { not: 'ADMIN' } } },
          ...(conditions.length > 0 ? [{ OR: conditions }] : []),
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true, supervisor1Id: true, supervisor2Id: true } },
        position: { select: { id: true, name: true } },
        evaluations: {
          where: { period: `${year}-${String(month).padStart(2, '0')}` },
          include: {
            details: {
              include: { positionResponsibility: true },
            },
          },
        },
      },
    });

    return employees.map(emp => {
      const evaluation = emp.evaluations[0];
      const fullName = emp.user ? `${emp.user.lastName} ${emp.user.firstName}`.trim() : '';

      // Use persisted percentages if available; fallback to recomputing
      let selfScore: number | null = null;
      let supervisorScore1: number | null = null;
      let supervisorScore2: number | null = null;

      if (evaluation) {
        selfScore = (evaluation.selfScorePercentage ?? computeWeightedScoreForField(evaluation.details, 'selfScore')) || null;
        supervisorScore1 = (evaluation.sup1Percentage ?? computeWeightedScoreForField(evaluation.details, 'supervisorScore1')) || null;
        supervisorScore2 = (evaluation.sup2Percentage ?? computeWeightedScoreForField(evaluation.details, 'supervisorScore2')) || null;

        // BS1 masking: mask aggregate only for the specific supervisor1/2 of THIS employee
        if (callerRole && callerRole !== UserRole.ADMIN && callerId) {
          const evalStatus = evaluation.status;
          const isSup1ForRow = emp.user?.supervisor1Id === callerId;
          const isSup2ForRow = emp.user?.supervisor2Id === callerId;

          // Sup1 in SUPERVISOR1_PENDING: mask self-score until they've saved scores
          if (isSup1ForRow && evalStatus === EvaluationStatus.SUPERVISOR1_PENDING) {
            const anyDetailHasSup1Score = evaluation.details.some(d => d.supervisorScore1 !== null);
            if (!anyDetailHasSup1Score) {
              selfScore = null;
            }
          }
          // Sup2 in SUPERVISOR2_PENDING: mask sup1 score until they've saved scores
          if (isSup2ForRow && evalStatus === EvaluationStatus.SUPERVISOR2_PENDING) {
            const anyDetailHasSup2Score = evaluation.details.some(d => d.supervisorScore2 !== null);
            if (!anyDetailHasSup2Score) {
              supervisorScore1 = null;
            }
          }
        }
      }

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: fullName,
        positionId: emp.positionId,
        positionName: emp.position?.name || '',
        evaluationId: evaluation?.id || null,
        selfScore,
        supervisorScore1,
        supervisorScore2,
      };
    });
  }

  // ─── getEvaluationDetails ─────────────────────────────────────────────────

  async getEvaluationDetails(evaluationId: string, userId?: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: true,
            position: {
              include: { responsibilities: true },
            },
          },
        },
        details: {
          include: { positionResponsibility: true },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Không tìm thấy đánh giá');
    }

    let callerRole: string | null = null;
    let isSubjectEmployee = false;

    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      callerRole = currentUser?.role || null;

      // Access check
      if (!['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(callerRole || '')) {
        if (evaluation.employee.userId !== userId) {
          throw new AuthorizationError('Không có quyền xem đánh giá này');
        }
        isSubjectEmployee = true;
      } else if (evaluation.employee.userId === userId) {
        isSubjectEmployee = true;
      }
    }

    // BS1 masking logic
    let masked: string | null = null;
    let shouldMaskSelfScore = false;
    let shouldMaskSup1Score = false;

    if (userId && callerRole !== UserRole.ADMIN && !isSubjectEmployee) {
      const evalUser = evaluation.employee.user;
      const evalStatus = evaluation.status;

      // Sup1 masking: non-ADMIN sup1 in SUPERVISOR1_PENDING, no scores saved yet
      if (
        (callerRole === UserRole.TEAM_LEAD || callerRole === UserRole.DEPARTMENT_HEAD) &&
        evalStatus === EvaluationStatus.SUPERVISOR1_PENDING &&
        evalUser?.supervisor1Id === userId
      ) {
        const anyDetailHasSup1Score = evaluation.details.some(d => d.supervisorScore1 !== null);
        if (!anyDetailHasSup1Score) {
          shouldMaskSelfScore = true;
          masked = 'selfScore';
        }
      }

      // Sup2 masking: non-ADMIN sup2 in SUPERVISOR2_PENDING, no scores saved yet
      if (
        (callerRole === UserRole.TEAM_LEAD || callerRole === UserRole.DEPARTMENT_HEAD) &&
        evalStatus === EvaluationStatus.SUPERVISOR2_PENDING &&
        evalUser?.supervisor2Id === userId
      ) {
        const anyDetailHasSup2Score = evaluation.details.some(d => d.supervisorScore2 !== null);
        if (!anyDetailHasSup2Score) {
          shouldMaskSup1Score = true;
          masked = 'supervisorScore1';
        }
      }
    }

    const details = evaluation.details.map((evalDetail, index) => {
      const resp = evalDetail.positionResponsibility;
      return {
        stt: index + 1,
        responsibilityId: resp.id,
        title: resp.title,
        description: resp.description,
        weight: resp.weight,
        selfScore: shouldMaskSelfScore ? null : (evalDetail.selfScore ?? null),
        supervisorScore1: shouldMaskSup1Score ? null : (evalDetail.supervisorScore1 ?? null),
        supervisorScore2: evalDetail.supervisorScore2 ?? null,
        notApplicable: evalDetail.notApplicable,
        commentEmployee: evalDetail.commentEmployee ?? null,
        commentSup1: evalDetail.commentSup1 ?? null,
        commentSup2: evalDetail.commentSup2 ?? null,
        detailId: evalDetail.id,
      };
    });

    const fullName = evaluation.employee.user
      ? `${evaluation.employee.user.lastName} ${evaluation.employee.user.firstName}`.trim()
      : '';

    let supervisor1Name: string | null = null;
    let supervisor2Name: string | null = null;
    if (evaluation.employee.user?.supervisor1Id) {
      const sup1 = await prisma.user.findUnique({
        where: { id: evaluation.employee.user.supervisor1Id },
        select: { firstName: true, lastName: true },
      });
      if (sup1) supervisor1Name = `${sup1.lastName} ${sup1.firstName}`.trim();
    }
    if (evaluation.employee.user?.supervisor2Id) {
      const sup2 = await prisma.user.findUnique({
        where: { id: evaluation.employee.user.supervisor2Id },
        select: { firstName: true, lastName: true },
      });
      if (sup2) supervisor2Name = `${sup2.lastName} ${sup2.firstName}`.trim();
    }

    return {
      evaluationId: evaluation.id,
      employeeCode: evaluation.employee.employeeCode,
      employeeName: fullName,
      positionName: evaluation.employee.position?.name || '',
      period: evaluation.period,
      status: evaluation.status,
      mode: evaluation.mode,
      supervisor1Name,
      supervisor2Name,
      commentEmployee: evaluation.commentEmployee ?? null,
      commentSup1: evaluation.commentSup1 ?? null,
      commentSup2: evaluation.commentSup2 ?? null,
      selfScorePercentage: evaluation.selfScorePercentage ?? null,
      sup1Percentage: evaluation.sup1Percentage ?? null,
      sup2Percentage: evaluation.sup2Percentage ?? null,
      appealComment: evaluation.appealComment ?? null,
      appealResponse: evaluation.appealResponse ?? null,
      appealedAt: evaluation.appealedAt ?? null,
      appealRespondedAt: evaluation.appealRespondedAt ?? null,
      details,
      ...(masked ? { masked } : {}),
    };
  }

  // ─── createOrUpdateEvaluation ─────────────────────────────────────────────

  async createOrUpdateEvaluation(employeeId: string, month: number, year: number): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: { include: { responsibilities: true } }, user: true },
    });

    if (!employee) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Derive mode from position category
    const positionCategory = employee.position?.category;
    const mode = positionCategory === 'PRODUCTION' ? 'QUICK' : 'FULL';

    let evaluation = await prisma.evaluation.findFirst({
      where: { employeeId, period },
    });

    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          employeeId,
          period,
          score: 0,
          mode: mode as any,
        },
      });

      const responsibilities = employee.positionId
        ? await prisma.positionResponsibility.findMany({ where: { positionId: employee.positionId } })
        : [];

      for (const resp of responsibilities) {
        await prisma.evaluationDetail.create({
          data: {
            evaluationId: evaluation.id,
            positionResponsibilityId: resp.id,
          },
        });
      }

      if (employee.user?.role !== 'ADMIN') {
        await notificationService.notify(NotificationEvent.EVALUATION_CREATED, {
          targetEmployeeIds: [employeeId],
          entityId: evaluation.id,
          metadata: {
            evaluationId: evaluation.id,
            period: `${year}-${String(month).padStart(2, '0')}`,
            monthName: new Date(year, month - 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
          },
        });
      }
    } else {
      const evalId = evaluation.id;
      const responsibilities = employee.positionId
        ? await prisma.positionResponsibility.findMany({ where: { positionId: employee.positionId } })
        : [];

      const existingDetails = await prisma.evaluationDetail.findMany({
        where: { evaluationId: evalId },
        select: { positionResponsibilityId: true },
      });
      const existingIds = new Set(existingDetails.map(d => d.positionResponsibilityId));
      const missing = responsibilities.filter(r => !existingIds.has(r.id));

      if (missing.length > 0) {
        await prisma.evaluationDetail.createMany({
          data: missing.map(r => ({ evaluationId: evalId, positionResponsibilityId: r.id })),
        });
      }
    }

    return evaluation;
  }

  // ─── createBulkEvaluations ─────────────────────────────────────────────────

  async createBulkEvaluations(month: number, year: number): Promise<any> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const employees = await prisma.employee.findMany({
      where: {},
      include: {
        user: { select: { role: true } },
        position: {
          include: { responsibilities: true },
        },
      },
    });

    if (employees.length === 0) {
      return { created: 0, skipped: 0, total: 0 };
    }

    const existingEvaluations = await prisma.evaluation.findMany({
      where: { period, employeeId: { in: employees.map(e => e.id) } },
      select: { employeeId: true },
    });

    const existingEmployeeIds = new Set(existingEvaluations.map(e => e.employeeId));
    const employeesToCreate = employees.filter(e => !existingEmployeeIds.has(e.id));

    let createdCount = 0;

    for (const employee of employeesToCreate) {
      try {
        let evaluationId: string | null = null;

        // Derive mode from position category
        const positionCategory = employee.position?.category;
        const mode = positionCategory === 'PRODUCTION' ? 'QUICK' : 'FULL';

        await prisma.$transaction(async (tx) => {
          const evaluation = await tx.evaluation.create({
            data: {
              employeeId: employee.id,
              period,
              score: 0,
              mode: mode as any,
            },
          });
          evaluationId = evaluation.id;

          const responsibilities = employee.position?.responsibilities || [];
          if (responsibilities.length > 0) {
            await tx.evaluationDetail.createMany({
              data: responsibilities.map(resp => ({
                evaluationId: evaluation.id,
                positionResponsibilityId: resp.id,
              })),
            });
          }
        });

        if (evaluationId && employee.user?.role !== 'ADMIN') {
          await notificationService.createEvaluationNotification(
            employee.id,
            month,
            year,
            evaluationId
          );
        }

        createdCount++;
      } catch (error) {
        logger.error(`Error creating evaluation for employee ${employee.id}:`, error);
      }
    }

    return {
      created: createdCount,
      skipped: existingEmployeeIds.size,
      total: employees.length,
    };
  }

  // ─── updateEvaluationDetail ────────────────────────────────────────────────

  async updateEvaluationDetail(detailId: string, data: any, userId?: string): Promise<any> {
    const detail = await prisma.evaluationDetail.findUnique({
      where: { id: detailId },
      include: {
        evaluation: {
          include: { employee: true },
        },
      },
    });

    if (!detail) {
      throw new NotFoundError('Không tìm thấy chi tiết đánh giá');
    }

    const evaluationStatus = detail.evaluation.status;

    if (data.selfScore !== undefined) {
      if (evaluationStatus !== EvaluationStatus.SELF_PENDING) {
        throw new ValidationError('Không thể cập nhật điểm tự đánh giá: trạng thái đánh giá không phải SELF_PENDING');
      }
    }

    if (data.supervisorScore1 !== undefined) {
      if (evaluationStatus !== EvaluationStatus.SUPERVISOR1_PENDING) {
        throw new ValidationError('Không thể cập nhật điểm cấp trên 1: trạng thái đánh giá không phải SUPERVISOR1_PENDING');
      }
    }

    if (data.supervisorScore2 !== undefined) {
      if (evaluationStatus !== EvaluationStatus.SUPERVISOR2_PENDING) {
        throw new ValidationError('Không thể cập nhật điểm cấp trên 2: trạng thái đánh giá không phải SUPERVISOR2_PENDING');
      }
    }

    let callerRole: string | null = null;

    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      callerRole = currentUser?.role || null;
      const isManager = ['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(callerRole || '');

      if (!isManager) {
        if (detail.evaluation.employee.userId !== userId) {
          throw new AuthorizationError('Không có quyền cập nhật đánh giá này');
        }
        if (data.supervisorScore1 !== undefined || data.supervisorScore2 !== undefined) {
          throw new ValidationError('Không thể cập nhật điểm cấp trên: bạn không có quyền');
        }
      }

      if (callerRole !== 'ADMIN') {
        if (data.supervisorScore1 !== undefined) {
          if (detail.evaluation.employee.userId) {
            const evalUser = await prisma.user.findUnique({
              where: { id: detail.evaluation.employee.userId },
              select: { supervisor1Id: true },
            });
            if (evalUser?.supervisor1Id !== userId) {
              throw new ValidationError('Bạn không phải cấp trên 1 được chỉ định cho nhân viên này');
            }
          }
        }
        if (data.supervisorScore2 !== undefined) {
          const evalUser = await prisma.user.findUnique({
            where: { id: detail.evaluation.employee.userId },
            select: { supervisor2Id: true },
          });
          if (evalUser?.supervisor2Id !== userId) {
            throw new ValidationError('Bạn không phải cấp trên 2 được chỉ định cho nhân viên này');
          }
        }
      }
    }

    // Role+status matrix guard for comment writes
    const commentUpdate: Record<string, string | undefined> = {};
    if (data.commentEmployee !== undefined) {
      if (callerRole === UserRole.ADMIN) {
        commentUpdate.commentEmployee = data.commentEmployee;
      } else if (evaluationStatus === EvaluationStatus.SELF_PENDING && detail.evaluation.employee.userId === userId) {
        commentUpdate.commentEmployee = data.commentEmployee;
      } else {
        throw new ValidationError('Không thể cập nhật nhận xét nhân viên: trạng thái không phù hợp hoặc không có quyền');
      }
    }
    if (data.commentSup1 !== undefined) {
      if (callerRole === UserRole.ADMIN) {
        commentUpdate.commentSup1 = data.commentSup1;
      } else if (evaluationStatus === EvaluationStatus.SUPERVISOR1_PENDING) {
        commentUpdate.commentSup1 = data.commentSup1;
      } else {
        throw new ValidationError('Không thể cập nhật nhận xét cấp trên 1: trạng thái không phải SUPERVISOR1_PENDING');
      }
    }
    if (data.commentSup2 !== undefined) {
      if (callerRole === UserRole.ADMIN) {
        commentUpdate.commentSup2 = data.commentSup2;
      } else if (evaluationStatus === EvaluationStatus.SUPERVISOR2_PENDING) {
        commentUpdate.commentSup2 = data.commentSup2;
      } else {
        throw new ValidationError('Không thể cập nhật nhận xét cấp trên 2: trạng thái không phải SUPERVISOR2_PENDING');
      }
    }

    // Validate scores
    if (data.selfScore !== undefined && (typeof data.selfScore !== 'number' || data.selfScore < 0 || data.selfScore > 100)) {
      throw new ValidationError('Điểm tự đánh giá phải trong khoảng 0-100');
    }
    if (data.supervisorScore1 !== undefined && (typeof data.supervisorScore1 !== 'number' || data.supervisorScore1 < 0 || data.supervisorScore1 > 100)) {
      throw new ValidationError('Điểm cấp trên 1 phải trong khoảng 0-100');
    }
    if (data.supervisorScore2 !== undefined && (typeof data.supervisorScore2 !== 'number' || data.supervisorScore2 < 0 || data.supervisorScore2 > 100)) {
      throw new ValidationError('Điểm cấp trên 2 phải trong khoảng 0-100');
    }

    // Build update data with score fields and comments
    const updateData: Record<string, any> = {};
    if (data.selfScore !== undefined) updateData.selfScore = data.selfScore;
    if (data.supervisorScore1 !== undefined) updateData.supervisorScore1 = data.supervisorScore1;
    if (data.supervisorScore2 !== undefined) updateData.supervisorScore2 = data.supervisorScore2;
    Object.assign(updateData, commentUpdate);

    // Update the detail
    const updatedDetail = await prisma.evaluationDetail.update({
      where: { id: detailId },
      data: updateData,
      include: { positionResponsibility: true },
    });

    // Handle notification workflow with status transitions and audit logs
    try {
      if (data.selfScore !== undefined) {
        type SelfNotifTarget =
          | { type: 'supervisor1'; supervisorEmployeeId: string | null; supervisorUserId: string; employeeName: string }
          | { type: 'supervisor2'; supervisorEmployeeId: string | null; supervisorUserId: string; employeeName: string }
          | { type: 'completed'; employeeId: string };
        const notifRef: { target: SelfNotifTarget | null } = { target: null };

        await prisma.$transaction(async (tx) => {
          const currentEval = await tx.evaluation.findUnique({
            where: { id: detail.evaluation.id },
            select: { status: true },
          });
          if (currentEval?.status !== EvaluationStatus.SELF_PENDING) return;

          // Count filled: skip N/A details
          const [filledCount, totalCount, naCount] = await Promise.all([
            tx.evaluationDetail.count({
              where: { evaluationId: detail.evaluation.id, selfScore: { not: null }, notApplicable: false },
            }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id } }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id, notApplicable: true } }),
          ]);
          const activeTotal = totalCount - naCount;
          if (filledCount < activeTotal) return;

          const employee = await tx.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });
          const fullName = employee?.user
            ? `${employee.user.lastName} ${employee.user.firstName}`.trim()
            : '';

          // Compute self score percentage
          const allDetails = await tx.evaluationDetail.findMany({
            where: { evaluationId: detail.evaluation.id },
            include: { positionResponsibility: true },
          });
          const selfPct = computeWeightedScoreForField(allDetails, 'selfScore');

          if (employee?.user?.supervisor1Id) {
            const supervisorUser = await tx.user.findUnique({
              where: { id: employee.user.supervisor1Id },
              include: { employees: { select: { id: true } } },
            });
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR1_PENDING, selfScorePercentage: selfPct },
            });
            await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SELF_PENDING, EvaluationStatus.SUPERVISOR1_PENDING, userId || '');
            await logScoreUpdate(tx, detail, 'selfScore', detail.selfScore, data.selfScore, userId || '');
            notifRef.target = {
              type: 'supervisor1',
              supervisorUserId: employee.user.supervisor1Id,
              supervisorEmployeeId: supervisorUser?.employees?.id ?? null,
              employeeName: fullName,
            };
          } else if (employee?.user?.supervisor2Id) {
            const supervisorUser = await tx.user.findUnique({
              where: { id: employee.user.supervisor2Id },
              include: { employees: { select: { id: true } } },
            });
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING, selfScorePercentage: selfPct },
            });
            await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SELF_PENDING, EvaluationStatus.SUPERVISOR2_PENDING, userId || '');
            await logScoreUpdate(tx, detail, 'selfScore', detail.selfScore, data.selfScore, userId || '');
            notifRef.target = {
              type: 'supervisor2',
              supervisorUserId: employee.user.supervisor2Id,
              supervisorEmployeeId: supervisorUser?.employees?.id ?? null,
              employeeName: fullName,
            };
          } else {
            const calculatedScore = computeWeightedScore(allDetails);
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED, score: calculatedScore, selfScorePercentage: selfPct, sup2Percentage: selfPct },
            });
            await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SELF_PENDING, EvaluationStatus.COMPLETED, userId || '');
            await logScoreUpdate(tx, detail, 'selfScore', detail.selfScore, data.selfScore, userId || '');
            notifRef.target = { type: 'completed', employeeId: detail.evaluation.employeeId };
          }
        });

        const notifTarget = notifRef.target;
        if (notifTarget?.type === 'supervisor1') {
          await notificationService.notify(NotificationEvent.EVALUATION_SUPERVISOR1_PENDING, {
            targetEmployeeIds: notifTarget.supervisorEmployeeId ? [notifTarget.supervisorEmployeeId] : [],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period, employeeName: notifTarget.employeeName },
          });
        } else if (notifTarget?.type === 'supervisor2') {
          await notificationService.notify(NotificationEvent.EVALUATION_SUPERVISOR2_PENDING, {
            targetEmployeeIds: notifTarget.supervisorEmployeeId ? [notifTarget.supervisorEmployeeId] : [],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period, employeeName: notifTarget.employeeName },
          });
        } else if (notifTarget?.type === 'completed') {
          await notificationService.notify(NotificationEvent.EVALUATION_COMPLETED, {
            targetEmployeeIds: [notifTarget.employeeId],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period },
          });
        }
      } else if (data.supervisorScore1 !== undefined) {
        type Sup1NotifTarget =
          | { type: 'supervisor2'; supervisorEmployeeId: string | null; employeeName: string }
          | { type: 'completed'; employeeId: string };
        const notifRef: { target: Sup1NotifTarget | null } = { target: null };

        await prisma.$transaction(async (tx) => {
          const currentEval = await tx.evaluation.findUnique({
            where: { id: detail.evaluation.id },
            select: { status: true },
          });
          if (currentEval?.status !== EvaluationStatus.SUPERVISOR1_PENDING) return;

          const [filledCount, totalCount, naCount] = await Promise.all([
            tx.evaluationDetail.count({
              where: { evaluationId: detail.evaluation.id, supervisorScore1: { not: null }, notApplicable: false },
            }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id } }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id, notApplicable: true } }),
          ]);
          const activeTotal = totalCount - naCount;
          if (filledCount < activeTotal) return;

          const employee = await tx.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });
          const fullName = employee?.user
            ? `${employee.user.lastName} ${employee.user.firstName}`.trim()
            : '';

          const allDetails = await tx.evaluationDetail.findMany({
            where: { evaluationId: detail.evaluation.id },
            include: { positionResponsibility: true },
          });
          const sup1Pct = computeWeightedScoreForField(allDetails, 'supervisorScore1');

          if (employee?.user?.supervisor2Id) {
            const supervisorUser = await tx.user.findUnique({
              where: { id: employee.user.supervisor2Id },
              include: { employees: { select: { id: true } } },
            });
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING, evaluatedBy1Id: userId, sup1Percentage: sup1Pct },
            });
            await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SUPERVISOR1_PENDING, EvaluationStatus.SUPERVISOR2_PENDING, userId || '');
            await logScoreUpdate(tx, detail, 'supervisorScore1', detail.supervisorScore1, data.supervisorScore1, userId || '');
            notifRef.target = {
              type: 'supervisor2',
              supervisorEmployeeId: supervisorUser?.employees?.id ?? null,
              employeeName: fullName,
            };
          } else {
            const calculatedScore = computeWeightedScore(allDetails);
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED, score: calculatedScore, evaluatedBy1Id: userId, sup1Percentage: sup1Pct, sup2Percentage: sup1Pct },
            });
            await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SUPERVISOR1_PENDING, EvaluationStatus.COMPLETED, userId || '');
            await logScoreUpdate(tx, detail, 'supervisorScore1', detail.supervisorScore1, data.supervisorScore1, userId || '');
            notifRef.target = { type: 'completed', employeeId: detail.evaluation.employeeId };
          }
        });

        const notifTarget2 = notifRef.target;
        if (notifTarget2?.type === 'supervisor2') {
          await notificationService.notify(NotificationEvent.EVALUATION_SUPERVISOR2_PENDING, {
            targetEmployeeIds: notifTarget2.supervisorEmployeeId ? [notifTarget2.supervisorEmployeeId] : [],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period, employeeName: notifTarget2.employeeName },
          });
          try {
            const evalEmployee = await prisma.employee.findUnique({
              where: { id: detail.evaluation.employeeId },
              select: { id: true },
            });
            if (evalEmployee) {
              await notificationService.notify(NotificationEvent.EVALUATION_SUPERVISOR1_COMPLETED, {
                targetEmployeeIds: [evalEmployee.id],
                entityId: detail.evaluation.id,
                metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period },
              });
            }
          } catch {}
        } else if (notifTarget2?.type === 'completed') {
          await notificationService.notify(NotificationEvent.EVALUATION_COMPLETED, {
            targetEmployeeIds: [notifTarget2.employeeId],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period },
          });
        }
      } else if (data.supervisorScore2 !== undefined) {
        let completedEmployeeId: string | null = null;

        await prisma.$transaction(async (tx) => {
          const currentEval = await tx.evaluation.findUnique({
            where: { id: detail.evaluation.id },
            select: { status: true, mode: true },
          });
          if (currentEval?.status !== EvaluationStatus.SUPERVISOR2_PENDING) return;

          const [filledCount, totalCount, naCount] = await Promise.all([
            tx.evaluationDetail.count({
              where: { evaluationId: detail.evaluation.id, supervisorScore2: { not: null }, notApplicable: false },
            }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id } }),
            tx.evaluationDetail.count({ where: { evaluationId: detail.evaluation.id, notApplicable: true } }),
          ]);
          const activeTotal = totalCount - naCount;
          if (filledCount < activeTotal) return;

          const allDetails = await tx.evaluationDetail.findMany({
            where: { evaluationId: detail.evaluation.id },
            include: { positionResponsibility: true },
          });
          const calculatedScore = computeWeightedScore(allDetails);
          const sup2Pct = computeWeightedScoreForField(allDetails, 'supervisorScore2');

          await tx.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: EvaluationStatus.COMPLETED, score: calculatedScore, evaluatedBy2Id: userId, sup2Percentage: sup2Pct },
          });
          await logStatusTransition(tx, detail.evaluation.id, EvaluationStatus.SUPERVISOR2_PENDING, EvaluationStatus.COMPLETED, userId || '');
          await logScoreUpdate(tx, detail, 'supervisorScore2', detail.supervisorScore2, data.supervisorScore2, userId || '');

          completedEmployeeId = detail.evaluation.employeeId;
        });

        if (completedEmployeeId) {
          await notificationService.notify(NotificationEvent.EVALUATION_COMPLETED, {
            targetEmployeeIds: [completedEmployeeId],
            entityId: detail.evaluation.id,
            metadata: { evaluationId: detail.evaluation.id, period: detail.evaluation.period },
          });
        }
      }

      // Audit comment updates outside the scoring transaction
      if (Object.keys(commentUpdate).length > 0 && userId) {
        await prisma.$transaction(async (tx) => {
          for (const [field, newValue] of Object.entries(commentUpdate)) {
            if (newValue !== undefined) {
              await logChange(tx, {
                evaluationId: detail.evaluation.id,
                evaluationDetailId: detailId,
                changedByUserId: userId,
                action: EvaluationAuditAction.COMMENT_UPDATE,
                field,
                oldValue: (detail as any)[field] ?? null,
                newValue,
              });
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error in evaluation notification workflow:', error);
    }

    return updatedDetail;
  }

  // ─── toggleNotApplicable ───────────────────────────────────────────────────

  async toggleNotApplicable(detailId: string, notApplicable: boolean, userId: string): Promise<any> {
    const detail = await prisma.evaluationDetail.findUnique({
      where: { id: detailId },
      include: {
        evaluation: { include: { employee: { include: { user: true } } } },
      },
    });

    if (!detail) {
      throw new NotFoundError('Không tìm thấy chi tiết đánh giá');
    }

    const evalStatus = detail.evaluation.status;
    const evalEmployee = detail.evaluation.employee;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = currentUser?.role;

    // ADMIN always allowed
    if (role !== UserRole.ADMIN) {
      const isEmployee = evalEmployee.userId === userId;
      const supervisor1Id = evalEmployee.user?.supervisor1Id;
      const supervisor2Id = evalEmployee.user?.supervisor2Id;

      if (isEmployee) {
        // Employee only during SELF_PENDING
        if (evalStatus !== EvaluationStatus.SELF_PENDING) {
          throw new ValidationError('Nhân viên chỉ có thể thay đổi N/A khi trạng thái là SELF_PENDING');
        }
      } else if (supervisor1Id === userId) {
        // Supervisor1 during their pending status
        if (evalStatus !== EvaluationStatus.SUPERVISOR1_PENDING) {
          throw new ValidationError('Cấp trên 1 chỉ có thể thay đổi N/A khi trạng thái là SUPERVISOR1_PENDING');
        }
      } else if (supervisor2Id === userId) {
        // Supervisor2 during their pending status
        if (evalStatus !== EvaluationStatus.SUPERVISOR2_PENDING) {
          throw new ValidationError('Cấp trên 2 chỉ có thể thay đổi N/A khi trạng thái là SUPERVISOR2_PENDING');
        }
      } else {
        throw new AuthorizationError('Không có quyền thay đổi N/A cho chi tiết này');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.evaluationDetail.update({
        where: { id: detailId },
        data: { notApplicable },
      });

      await logChange(tx, {
        evaluationId: detail.evaluation.id,
        evaluationDetailId: detailId,
        changedByUserId: userId,
        action: EvaluationAuditAction.NA_TOGGLE,
        field: 'notApplicable',
        oldValue: String(detail.notApplicable),
        newValue: String(notApplicable),
      });

      return updated;
    });
  }

  // ─── updateEvaluationComment (evaluation-level) ────────────────────────────

  async updateEvaluationComment(
    evaluationId: string,
    commentField: 'commentEmployee' | 'commentSup1' | 'commentSup2',
    commentValue: string,
    userId: string
  ): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { employee: { include: { user: true } } },
    });

    if (!evaluation) {
      throw new NotFoundError('Không tìm thấy đánh giá');
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = currentUser?.role;
    const evalStatus = evaluation.status;

    if (role !== UserRole.ADMIN) {
      if (commentField === 'commentEmployee') {
        if (evalStatus !== EvaluationStatus.SELF_PENDING || evaluation.employee.userId !== userId) {
          throw new ValidationError('Nhân viên chỉ có thể cập nhật nhận xét khi trạng thái là SELF_PENDING');
        }
      } else if (commentField === 'commentSup1') {
        if (evalStatus !== EvaluationStatus.SUPERVISOR1_PENDING) {
          throw new ValidationError('Cấp trên 1 chỉ có thể cập nhật nhận xét khi trạng thái là SUPERVISOR1_PENDING');
        }
      } else if (commentField === 'commentSup2') {
        if (evalStatus !== EvaluationStatus.SUPERVISOR2_PENDING) {
          throw new ValidationError('Cấp trên 2 chỉ có thể cập nhật nhận xét khi trạng thái là SUPERVISOR2_PENDING');
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.evaluation.update({
        where: { id: evaluationId },
        data: { [commentField]: commentValue },
      });

      await logChange(tx, {
        evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.COMMENT_UPDATE,
        field: commentField,
        oldValue: (evaluation as any)[commentField] ?? null,
        newValue: commentValue,
      });

      return updated;
    });
  }

  // ─── getPayrollImpactPreview ───────────────────────────────────────────────

  async getPayrollImpactPreview(
    evaluationId: string,
    userId: string
  ): Promise<{
    kpiBonus: number;
    currentSup2Percentage: number;
    projectedDeduction: number;
    projectedNet: number;
    isFinalized: boolean;
  }> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            positionLevel: true,
            position: { include: { levels: { take: 1, orderBy: { level: 'asc' } } } },
            user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } },
          },
        },
        details: true,
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = currentUser?.role;
    const empUserId = evaluation.employee.userId;

    if (role !== UserRole.ADMIN && role !== UserRole.DEPARTMENT_HEAD) {
      const isOwn = empUserId === userId;
      const isSup =
        evaluation.employee.user?.supervisor1Id === userId ||
        evaluation.employee.user?.supervisor2Id === userId;
      if (!isOwn && !isSup) {
        throw new AuthorizationError('Không có quyền xem thông tin lương dự kiến');
      }
    }

    const kpiBonus =
      evaluation.employee.positionLevel?.kpiSalary ??
      (evaluation.employee as any).position?.levels?.[0]?.kpiSalary ??
      0;
    const sup2Pct =
      evaluation.sup2Percentage !== null
        ? evaluation.sup2Percentage
        : computeWeightedScoreForField(evaluation.details as any[], 'supervisorScore2');
    const projectedDeduction = computeKpiDeduction(kpiBonus, sup2Pct);
    const isFinalized =
      evaluation.status === EvaluationStatus.COMPLETED ||
      evaluation.status === EvaluationStatus.ACKNOWLEDGED;

    return {
      kpiBonus,
      currentSup2Percentage: sup2Pct,
      projectedDeduction,
      projectedNet: kpiBonus - projectedDeduction,
      isFinalized,
    };
  }

  // ─── submitAppeal ──────────────────────────────────────────────────────────

  async submitAppeal(
    evaluationId: string,
    appealComment: string,
    userId: string
  ): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { employee: { include: { user: { select: { id: true, supervisor2Id: true } } } } },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    if (evaluation.employee.userId !== userId) {
      throw new AuthorizationError('Chỉ nhân viên được đánh giá mới có thể gửi khiếu nại');
    }

    if (evaluation.status !== EvaluationStatus.ACKNOWLEDGED) {
      throw new ValidationError('Chỉ có thể khiếu nại đánh giá đã được xác nhận');
    }

    if (!evaluation.acknowledgedAt) {
      throw new ValidationError('Đánh giá chưa có ngày xác nhận');
    }

    const daysSince =
      (Date.now() - (evaluation.acknowledgedAt as Date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      throw new ValidationError('Đã quá 7 ngày kể từ khi xác nhận đánh giá, không thể khiếu nại');
    }

    if (evaluation.appealComment !== null) {
      throw new ValidationError('Bạn đã gửi khiếu nại cho đánh giá này rồi');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.evaluation.update({
        where: { id: evaluationId },
        data: { appealComment, appealedAt: new Date() },
      });

      await logChange(tx, {
        evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.APPEAL_SUBMIT,
        field: 'appealComment',
        oldValue: null,
        newValue: appealComment.substring(0, 4000),
      });

      return result;
    });

    // Notify supervisor2 + all ADMINs (never bubble)
    try {
      const notifyEmpIds: string[] = [];

      if (evaluation.employee.user?.supervisor2Id) {
        const sup2 = await prisma.user.findUnique({
          where: { id: evaluation.employee.user.supervisor2Id },
          include: { employees: { select: { id: true } } },
        });
        if ((sup2 as any)?.employees?.id) {
          notifyEmpIds.push((sup2 as any).employees.id);
        }
      }

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        include: { employees: { select: { id: true } } },
      });
      for (const a of admins) {
        if ((a as any).employees?.id) notifyEmpIds.push((a as any).employees.id);
      }

      if (notifyEmpIds.length > 0) {
        await notificationService.notify(NotificationEvent.EVALUATION_COMPLETED, {
          targetEmployeeIds: notifyEmpIds,
          entityId: evaluationId,
          metadata: { evaluationId, eventType: 'APPEAL_SUBMITTED' },
        });
      }
    } catch (err) {
      logger.error('Failed to send appeal notification:', err);
    }

    return updated;
  }

  // ─── replyAppeal ───────────────────────────────────────────────────────────

  async replyAppeal(
    evaluationId: string,
    appealResponse: string,
    userId: string
  ): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { employee: { include: { user: { select: { id: true, supervisor2Id: true } } } } },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = currentUser?.role;

    const isSup2 = evaluation.employee.user?.supervisor2Id === userId;
    if (role !== UserRole.ADMIN && role !== UserRole.DEPARTMENT_HEAD && !isSup2) {
      throw new AuthorizationError('Không có quyền phản hồi khiếu nại');
    }

    if (!evaluation.appealComment) {
      throw new ValidationError('Chưa có khiếu nại nào được gửi');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.evaluation.update({
        where: { id: evaluationId },
        data: {
          appealResponse,
          appealRespondedAt: new Date(),
          appealResponderId: userId,
        },
      });

      await logChange(tx, {
        evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.APPEAL_REPLY,
        field: 'appealResponse',
        oldValue: (evaluation as any).appealResponse ?? null,
        newValue: appealResponse.substring(0, 4000),
      });

      return result;
    });

    // Notify subject employee (never bubble)
    try {
      if (evaluation.employee.id) {
        await notificationService.notify(NotificationEvent.EVALUATION_COMPLETED, {
          targetEmployeeIds: [evaluation.employee.id],
          entityId: evaluationId,
          metadata: { evaluationId, eventType: 'APPEAL_REPLIED' },
        });
      }
    } catch (err) {
      logger.error('Failed to send appeal reply notification:', err);
    }

    return updated;
  }

  // ─── getCalibrationHeatmap ─────────────────────────────────────────────────

  async getCalibrationHeatmap(
    month: number,
    year: number,
    userId: string
  ): Promise<any> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, employees: { select: { subDepartmentId: true, subDepartment: { select: { departmentId: true } } } } },
    });
    if (
      currentUser?.role !== UserRole.ADMIN &&
      currentUser?.role !== UserRole.DEPARTMENT_HEAD
    ) {
      throw new AuthorizationError('Không có quyền xem heatmap hiệu chỉnh');
    }
    // DEPARTMENT_HEAD is scoped to their own department
    const callerDeptId =
      currentUser?.role === UserRole.DEPARTMENT_HEAD
        ? currentUser.employees?.subDepartment?.departmentId ?? null
        : null;

    const monthStr = String(month).padStart(2, '0');
    const targetPeriod = `${year}-${monthStr}`;

    // Fetch all evaluations for the period
    const evaluations = await prisma.evaluation.findMany({
      where: { period: targetPeriod },
      include: {
        employee: {
          include: {
            subDepartment: { include: { department: true } },
            user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } },
          },
        },
        details: true,
      },
    });

    if (evaluations.length === 0) {
      return {
        supervisors: [],
        departmentBenchmarks: [],
        trend: [],
        inflationAlerts: [],
        period: targetPeriod,
      };
    }

    // Group evaluations by supervisor2 for supervisor distribution
    const bySup2 = new Map<string, typeof evaluations>();
    for (const ev of evaluations) {
      const sup2Id = ev.employee.user?.supervisor2Id;
      if (!sup2Id) continue;
      if (!bySup2.has(sup2Id)) bySup2.set(sup2Id, []);
      bySup2.get(sup2Id)!.push(ev);
    }

    const supervisors = await Promise.all(
      Array.from(bySup2.entries()).map(async ([sup2Id, evs]) => {
        const sup2User = await prisma.user.findUnique({
          where: { id: sup2Id },
          select: { id: true, firstName: true, lastName: true, role: true },
        });
        const sup2Name = sup2User ? `${sup2User.lastName} ${sup2User.firstName}`.trim() : 'Unknown';
        const scores = evs
          .map(ev => ev.sup2Percentage ?? computeWeightedScoreForField(ev.details as any[], 'supervisorScore2'))
          .filter(s => s > 0);
        const distribution = { d0_20: 0, d21_40: 0, d41_60: 0, d61_80: 0, d81_100: 0 };
        for (const s of scores) {
          if (s <= 20) distribution.d0_20++;
          else if (s <= 40) distribution.d21_40++;
          else if (s <= 60) distribution.d41_60++;
          else if (s <= 80) distribution.d61_80++;
          else distribution.d81_100++;
        }
        return {
          supervisorId: sup2Id,
          supervisorName: sup2Name,
          supervisorRole: sup2User?.role ?? 'UNKNOWN',
          subordinateCount: evs.length,
          scores,
          avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
          distribution,
        };
      })
    );

    // Department benchmarks (P20/P50/P80)
    const byDept = new Map<string, number[]>();
    for (const ev of evaluations) {
      const deptId = (ev.employee as any).subDepartment?.departmentId;
      if (!deptId) continue;
      if (!byDept.has(deptId)) byDept.set(deptId, []);
      const pct = ev.sup2Percentage ?? computeWeightedScoreForField(ev.details as any[], 'supervisorScore2');
      byDept.get(deptId)!.push(pct);
    }

    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = (p / 100) * (sorted.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };

    const departmentBenchmarks: any[] = [];
    for (const [deptId, scores] of byDept.entries()) {
      const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true, name: true } });
      departmentBenchmarks.push({
        departmentId: deptId,
        departmentName: (dept as any)?.name ?? 'Unknown',
        sampleSize: scores.length,
        p20: percentile(scores, 20),
        p50: percentile(scores, 50),
        p80: percentile(scores, 80),
      });
    }

    // 12-period trend: current month and preceding 11 months
    const trend: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const periodStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const periodEvs = await prisma.evaluation.findMany({
        where: { period: periodStr },
        include: { details: true },
      });
      const allScores = periodEvs
        .map(ev => ev.sup2Percentage ?? computeWeightedScoreForField((ev as any).details as any[], 'supervisorScore2'))
        .filter(s => s > 0);
      const completedCount = periodEvs.filter(
        ev => ev.status === EvaluationStatus.COMPLETED || ev.status === EvaluationStatus.ACKNOWLEDGED
      ).length;
      trend.push({
        period: periodStr,
        avgScore: allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0,
        completionRate: periodEvs.length > 0 ? (completedCount / periodEvs.length) * 100 : 0,
      });
    }

    // Inflation alerts: supervisor with >70% of direct reports at or above their department P80,
    // sampleSize >= 5 (per spec BS3)
    const deptP80Map = new Map<string, number>();
    for (const b of departmentBenchmarks) deptP80Map.set(b.departmentId, b.p80);

    const inflationAlerts: any[] = [];
    for (const sup of supervisors) {
      if (sup.subordinateCount < 5) continue;
      // Compute per-department P80 threshold ratio: for each subordinate use its own department's P80
      const supEvs = bySup2.get(sup.supervisorId) ?? [];
      let highCount = 0;
      let usableCount = 0;
      for (const ev of supEvs) {
        const deptId = (ev.employee as any).subDepartment?.departmentId;
        if (!deptId) continue;
        const p80 = deptP80Map.get(deptId);
        if (p80 === undefined) continue;
        const s = ev.sup2Percentage ?? computeWeightedScoreForField(ev.details as any[], 'supervisorScore2');
        if (s <= 0) continue;
        usableCount++;
        if (s >= p80) highCount++;
      }
      if (usableCount < 5) continue;
      const ratio = highCount / usableCount;
      if (ratio > 0.7) {
        const dept = supEvs[0] ? (supEvs[0].employee as any).subDepartment?.department : null;
        inflationAlerts.push({
          supervisorId: sup.supervisorId,
          supervisorName: sup.supervisorName,
          departmentName: dept?.name ?? 'Không xác định',
          inflationRate: ratio,
          sampleSize: usableCount,
        });
      }
    }

    // Filter to caller's department if DEPARTMENT_HEAD
    let filteredSupervisors = supervisors;
    let filteredBenchmarks = departmentBenchmarks;
    let filteredAlerts = inflationAlerts;
    if (callerDeptId) {
      const supIdsInDept = new Set<string>();
      for (const [sup2Id, evs] of bySup2.entries()) {
        if (evs.some(ev => (ev.employee as any).subDepartment?.departmentId === callerDeptId)) {
          supIdsInDept.add(sup2Id);
        }
      }
      filteredSupervisors = supervisors.filter(s => supIdsInDept.has(s.supervisorId));
      filteredBenchmarks = departmentBenchmarks.filter(b => b.departmentId === callerDeptId);
      filteredAlerts = inflationAlerts.filter(a => supIdsInDept.has(a.supervisorId));
    }

    return {
      supervisors: filteredSupervisors.map(s => ({
        supervisorId: s.supervisorId,
        supervisorName: s.supervisorName,
        supervisorRole: s.supervisorRole,
        subordinateCount: s.subordinateCount,
        avgScore: s.avgScore,
        distribution: s.distribution,
      })),
      departmentBenchmarks: filteredBenchmarks.map(b => ({
        departmentName: b.departmentName,
        p20: b.p20,
        p50: b.p50,
        p80: b.p80,
      })),
      trend,
      inflationAlerts: filteredAlerts,
      period: targetPeriod,
    };
  }

  // ─── copyFromPreviousMonth ─────────────────────────────────────────────────

  async copyFromPreviousMonth(evaluationId: string, userId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: { include: { user: { select: { id: true } } } },
        details: { include: { positionResponsibility: true } },
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    if ((evaluation as any).mode !== 'QUICK') {
      throw new ValidationError('Chỉ áp dụng sao chép từ tháng trước cho đánh giá QUICK');
    }

    // Parse period and find previous month
    const [yearStr, monthStr] = (evaluation.period as string).split('-');
    const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1 - 1, 1);
    const prevPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const prevEval = await prisma.evaluation.findFirst({
      where: {
        employeeId: evaluation.employeeId,
        period: prevPeriod,
      },
      include: { details: true },
    });

    if (!prevEval) {
      throw new NotFoundError(`Không tìm thấy đánh giá tháng trước (${prevPeriod})`);
    }

    // Build lookup: positionResponsibilityId → detail from prev month
    const prevMap = new Map<string, any>();
    for (const d2 of (prevEval as any).details) {
      if (d2.positionResponsibilityId) prevMap.set(d2.positionResponsibilityId, d2);
    }

    // Only copy if current evaluation is still in SELF_PENDING
    if (evaluation.status !== EvaluationStatus.SELF_PENDING) {
      throw new ValidationError('Chỉ có thể sao chép khi đánh giá đang ở trạng thái tự đánh giá');
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const detail of evaluation.details) {
        const prev = prevMap.get((detail as any).positionResponsibilityId ?? '');
        if (!prev) continue;
        if (detail.selfScore !== null) continue; // don't overwrite existing scores

        await tx.evaluationDetail.update({
          where: { id: detail.id },
          data: { selfScore: prev.selfScore },
        });

        if (prev.selfScore !== null) {
          await logScoreUpdate(tx, { id: detail.id, evaluationId }, 'selfScore', null, prev.selfScore, userId);
        }
      }
      return evaluation;
    });

    return updated;
  }

  // ─── Goal CRUD ─────────────────────────────────────────────────────────────

  async listGoals(evaluationId: string, userId: string): Promise<any[]> {
    await this._assertEvaluationReadAccess(evaluationId, userId);
    return prisma.evaluationGoal.findMany({
      where: { evaluationId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createGoal(
    evaluationId: string,
    data: { title: string; description?: string; targetPeriod: string },
    userId: string
  ): Promise<any> {
    await this._assertEvaluationWriteAccess(evaluationId, userId);

    const count = await prisma.evaluationGoal.count({ where: { evaluationId } });
    if (count >= MAX_GOALS_PER_EVALUATION) {
      throw new ValidationError(`Mỗi đánh giá chỉ được tối đa ${MAX_GOALS_PER_EVALUATION} mục tiêu`);
    }

    return prisma.$transaction(async (tx) => {
      const goal = await tx.evaluationGoal.create({
        data: {
          evaluationId,
          orderIndex: count + 1,
          title: data.title,
          description: data.description ?? null,
          targetPeriod: data.targetPeriod,
        },
      });

      await logChange(tx, {
        evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.GOAL_UPDATE,
        field: 'goals',
        oldValue: null,
        newValue: JSON.stringify({ action: 'create', goalId: goal.id, title: data.title }),
      });

      return goal;
    });
  }

  async updateGoal(
    goalId: string,
    data: { title?: string; description?: string; targetPeriod?: string },
    userId: string
  ): Promise<any> {
    const goal = await prisma.evaluationGoal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundError('Không tìm thấy mục tiêu');

    await this._assertEvaluationWriteAccess(goal.evaluationId, userId);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.evaluationGoal.update({
        where: { id: goalId },
        data: {
          title: data.title ?? goal.title,
          description: data.description !== undefined ? data.description : goal.description,
          targetPeriod: data.targetPeriod !== undefined ? data.targetPeriod : goal.targetPeriod,
        },
      });

      await logChange(tx, {
        evaluationId: goal.evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.GOAL_UPDATE,
        field: 'goals',
        oldValue: JSON.stringify({ title: goal.title }),
        newValue: JSON.stringify({ goalId, ...data }),
      });

      return updated;
    });
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    const goal = await prisma.evaluationGoal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundError('Không tìm thấy mục tiêu');

    await this._assertEvaluationWriteAccess(goal.evaluationId, userId);

    await prisma.$transaction(async (tx) => {
      await tx.evaluationGoal.delete({ where: { id: goalId } });

      await logChange(tx, {
        evaluationId: goal.evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.GOAL_UPDATE,
        field: 'goals',
        oldValue: JSON.stringify({ goalId, title: goal.title }),
        newValue: null,
      });
    });
  }

  // ─── IDP CRUD ──────────────────────────────────────────────────────────────

  async listIdpItems(evaluationId: string, userId: string): Promise<any[]> {
    await this._assertEvaluationReadAccess(evaluationId, userId);
    return prisma.evaluationIdpItem.findMany({
      where: { evaluationId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createIdpItem(
    evaluationId: string,
    data: { skill: string; action: string; deadline: Date | string },
    userId: string
  ): Promise<any> {
    await this._assertEvaluationWriteAccess(evaluationId, userId);

    const count = await prisma.evaluationIdpItem.count({ where: { evaluationId } });
    if (count >= MAX_IDP_ITEMS_PER_EVALUATION) {
      throw new ValidationError(`Mỗi đánh giá chỉ được tối đa ${MAX_IDP_ITEMS_PER_EVALUATION} mục IDP`);
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.evaluationIdpItem.create({
        data: {
          evaluationId,
          orderIndex: count + 1,
          skill: data.skill,
          action: data.action,
          deadline: new Date(data.deadline as string),
        },
      });

      await logChange(tx, {
        evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.IDP_UPDATE,
        field: 'idpItems',
        oldValue: null,
        newValue: JSON.stringify({ action: 'create', itemId: item.id, skill: data.skill }),
      });

      return item;
    });
  }

  async updateIdpItem(
    itemId: string,
    data: { skill?: string; action?: string; deadline?: Date | string },
    userId: string
  ): Promise<any> {
    const item = await prisma.evaluationIdpItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('Không tìm thấy mục IDP');

    await this._assertEvaluationWriteAccess(item.evaluationId, userId);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.evaluationIdpItem.update({
        where: { id: itemId },
        data: {
          skill: data.skill ?? item.skill,
          action: data.action ?? item.action,
          deadline: data.deadline !== undefined ? new Date(data.deadline as string) : item.deadline,
        },
      });

      await logChange(tx, {
        evaluationId: item.evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.IDP_UPDATE,
        field: 'idpItems',
        oldValue: JSON.stringify({ skill: item.skill, action: item.action }),
        newValue: JSON.stringify({ itemId, ...data }),
      });

      return updated;
    });
  }

  async deleteIdpItem(itemId: string, userId: string): Promise<void> {
    const item = await prisma.evaluationIdpItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('Không tìm thấy mục IDP');

    await this._assertEvaluationWriteAccess(item.evaluationId, userId);

    await prisma.$transaction(async (tx) => {
      await tx.evaluationIdpItem.delete({ where: { id: itemId } });

      await logChange(tx, {
        evaluationId: item.evaluationId,
        changedByUserId: userId,
        action: EvaluationAuditAction.IDP_UPDATE,
        field: 'idpItems',
        oldValue: JSON.stringify({ itemId, skill: item.skill }),
        newValue: null,
      });
    });
  }

  // ─── Evidence CRUD ─────────────────────────────────────────────────────────

  async listEvidence(detailId: string, userId: string): Promise<any[]> {
    const detail = await prisma.evaluationDetail.findUnique({
      where: { id: detailId },
      select: { evaluationId: true },
    });
    if (!detail) throw new NotFoundError('Không tìm thấy chi tiết đánh giá');
    await this._assertEvaluationReadAccess(detail.evaluationId, userId);
    return prisma.evaluationEvidence.findMany({ where: { evaluationDetailId: detailId }, orderBy: { createdAt: 'asc' } });
  }

  async uploadEvidence(
    detailId: string,
    file: { originalname: string; path: string; mimetype: string; size: number },
    userId: string
  ): Promise<any> {
    const detail = await prisma.evaluationDetail.findUnique({
      where: { id: detailId },
      include: { evaluation: true },
    });
    if (!detail) throw new NotFoundError('Không tìm thấy chi tiết đánh giá');

    const evalStatus = (detail as any).evaluation.status;
    if (
      evalStatus === EvaluationStatus.COMPLETED ||
      evalStatus === EvaluationStatus.ACKNOWLEDGED
    ) {
      throw new ValidationError('Không thể thêm minh chứng sau khi đánh giá đã hoàn thành');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(`Loại file không được hỗ trợ: ${file.mimetype}`);
    }
    if (file.size > MAX_EVIDENCE_FILE_SIZE) {
      throw new ValidationError('Kích thước file vượt quá 5MB');
    }

    const count = await prisma.evaluationEvidence.count({ where: { evaluationDetailId: detailId } });
    if (count >= MAX_EVIDENCE_PER_DETAIL) {
      throw new ValidationError(`Mỗi tiêu chí chỉ được tối đa ${MAX_EVIDENCE_PER_DETAIL} minh chứng`);
    }

    // Move file to organized directory
    const targetDir = path.join('uploads', 'evaluation-evidence', (detail as any).evaluation.id);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const finalPath = path.join(targetDir, `${Date.now()}-${file.originalname}`);
    fs.renameSync(file.path, finalPath);

    const evaluationId = (detail as any).evaluation.id;

    return prisma.$transaction(async (tx) => {
      const evidence = await tx.evaluationEvidence.create({
        data: {
          evaluationDetailId: detailId,
          uploadedByUserId: userId,
          fileName: file.originalname,
          filePath: finalPath,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });

      await logChange(tx, {
        evaluationId,
        evaluationDetailId: detailId,
        changedByUserId: userId,
        action: EvaluationAuditAction.EVIDENCE_ADD,
        field: 'evidence',
        oldValue: null,
        newValue: JSON.stringify({ evidenceId: evidence.id, fileName: file.originalname }),
      });

      return evidence;
    });
  }

  async deleteEvidence(evidenceId: string, userId: string): Promise<void> {
    const evidence = await prisma.evaluationEvidence.findUnique({
      where: { id: evidenceId },
      include: { evaluationDetail: { include: { evaluation: true } } },
    });
    if (!evidence) throw new NotFoundError('Không tìm thấy minh chứng');

    const evalStatus = (evidence as any).evaluationDetail.evaluation.status;
    if (
      evalStatus === EvaluationStatus.COMPLETED ||
      evalStatus === EvaluationStatus.ACKNOWLEDGED
    ) {
      throw new ValidationError('Không thể xóa minh chứng sau khi đánh giá đã hoàn thành');
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (evidence.uploadedByUserId !== userId && currentUser?.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Không có quyền xóa minh chứng này');
    }

    const evaluationId = (evidence as any).evaluationDetail.evaluation.id;
    const detailId = evidence.evaluationDetailId;

    await prisma.$transaction(async (tx) => {
      await tx.evaluationEvidence.delete({ where: { id: evidenceId } });

      // Remove file from disk (best-effort)
      try {
        if (fs.existsSync(evidence.filePath)) {
          fs.unlinkSync(evidence.filePath);
        }
      } catch (err) {
        logger.warn('Failed to delete evidence file from disk:', err);
      }

      await logChange(tx, {
        evaluationId,
        evaluationDetailId: detailId,
        changedByUserId: userId,
        action: EvaluationAuditAction.EVIDENCE_DELETE,
        field: 'evidence',
        oldValue: JSON.stringify({ evidenceId, fileName: evidence.fileName }),
        newValue: null,
      });
    });
  }

  // ─── Private access helpers ────────────────────────────────────────────────

  private async _assertEvaluationReadAccess(evaluationId: string, userId: string): Promise<void> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: { user: { select: { id: true, supervisor1Id: true, supervisor2Id: true, role: true } } },
        },
      },
    });
    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEPARTMENT_HEAD) return;

    const isOwn = evaluation.employee.userId === userId;
    const isSup =
      evaluation.employee.user?.supervisor1Id === userId ||
      evaluation.employee.user?.supervisor2Id === userId;
    if (!isOwn && !isSup) {
      throw new AuthorizationError('Không có quyền xem đánh giá này');
    }
  }

  private async _assertEvaluationWriteAccess(evaluationId: string, userId: string): Promise<void> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: { user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } } },
        },
      },
    });
    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    if (
      evaluation.status === EvaluationStatus.COMPLETED ||
      evaluation.status === EvaluationStatus.ACKNOWLEDGED
    ) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (currentUser?.role !== UserRole.ADMIN) {
        throw new ValidationError('Không thể chỉnh sửa đánh giá đã hoàn thành');
      }
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEPARTMENT_HEAD) return;

    const isOwn = evaluation.employee.userId === userId;
    const isSup =
      evaluation.employee.user?.supervisor1Id === userId ||
      evaluation.employee.user?.supervisor2Id === userId;
    if (!isOwn && !isSup) {
      throw new AuthorizationError('Không có quyền chỉnh sửa đánh giá này');
    }
  }

  // ─── finalizeEvaluation ────────────────────────────────────────────────────

  async finalizeEvaluation(
    evaluationId: string,
    userId: string,
    options?: { overrideEmptyGoals?: boolean }
  ): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: true,
        details: true,
        goals: true,
        idpItems: true,
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = currentUser?.role;
    const evalStatus = evaluation.status;

    // Only ADMIN or supervisor2 can finalize (transition to COMPLETED)
    if (role !== UserRole.ADMIN) {
      const empUser = await prisma.user.findUnique({
        where: { id: evaluation.employee.userId },
        select: { supervisor2Id: true },
      });
      if (empUser?.supervisor2Id !== userId) {
        throw new AuthorizationError('Không có quyền hoàn thành đánh giá');
      }
    }

    if (evalStatus !== EvaluationStatus.SUPERVISOR2_PENDING) {
      throw new ValidationError('Chỉ có thể hoàn thành đánh giá đang ở trạng thái chờ cấp trên 2');
    }

    // Full-mode guardrail: require ≥1 goal and ≥1 IDP item (unless override or ADMIN)
    if ((evaluation as any).mode === 'FULL' && role !== UserRole.ADMIN && !options?.overrideEmptyGoals) {
      const goalCount = (evaluation as any).goals?.length ?? 0;
      const idpCount = (evaluation as any).idpItems?.length ?? 0;
      if (goalCount < 1) {
        throw new ValidationError('Đánh giá FULL yêu cầu ít nhất 1 mục tiêu trước khi hoàn thành');
      }
      if (idpCount < 1) {
        throw new ValidationError('Đánh giá FULL yêu cầu ít nhất 1 mục IDP trước khi hoàn thành');
      }
    }

    const sup2Pct = computeWeightedScoreForField(evaluation.details as any[], 'supervisorScore2');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.evaluation.update({
        where: { id: evaluationId },
        data: {
          status: EvaluationStatus.COMPLETED,
          sup2Percentage: sup2Pct,
        },
      });

      await logStatusTransition(tx, evaluationId, EvaluationStatus.SUPERVISOR2_PENDING, EvaluationStatus.COMPLETED, userId);

      return updated;
    });
  }

  // ─── acknowledgeEvaluation ─────────────────────────────────────────────────

  async acknowledgeEvaluation(evaluationId: string, userId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { employee: true },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    if (evaluation.employee.userId !== userId) {
      throw new AuthorizationError('Chỉ nhân viên được đánh giá mới có thể xác nhận');
    }

    if (evaluation.status !== EvaluationStatus.COMPLETED) {
      throw new ValidationError('Chỉ có thể xác nhận đánh giá đã hoàn thành');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.evaluation.update({
        where: { id: evaluationId },
        data: {
          status: EvaluationStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
        },
      });

      await logStatusTransition(tx, evaluationId, EvaluationStatus.COMPLETED, EvaluationStatus.ACKNOWLEDGED, userId);

      return updated;
    });
  }

  // ─── getEvaluationHistory ──────────────────────────────────────────────────

  async getEvaluationHistory(
    employeeId: string,
    userId: string,
    _month?: number,
    _year?: number
  ): Promise<any[]> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Access: ADMIN / DEPARTMENT_HEAD unrestricted; otherwise own employee or supervisor
    if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.DEPARTMENT_HEAD) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } } },
      });
      if (!employee) throw new NotFoundError('Không tìm thấy nhân viên');

      const isOwn = employee.userId === userId;
      const isSup = employee.user?.supervisor1Id === userId || employee.user?.supervisor2Id === userId;
      if (!isOwn && !isSup) {
        throw new AuthorizationError('Không có quyền xem lịch sử đánh giá');
      }
    }

    return prisma.evaluation.findMany({
      where: { employeeId },
      orderBy: { period: 'desc' },
      include: {
        details: { include: { positionResponsibility: true } },
      },
    });
  }

  // ─── getPendingEvaluationCount ─────────────────────────────────────────────

  async getPendingEvaluationCount(userId: string): Promise<{ total: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employees: { select: { id: true } } },
    });

    if (!user) return { total: 0 };

    const subordinateEmployeeIds = await this._getSubordinateEmployeeIds(userId);

    if (subordinateEmployeeIds.length === 0) {
      return { total: 0 };
    }

    const count = await prisma.evaluation.count({
      where: {
        employeeId: { in: subordinateEmployeeIds },
        status: {
          in: [EvaluationStatus.SUPERVISOR1_PENDING, EvaluationStatus.SUPERVISOR2_PENDING],
        },
      },
    });

    return { total: count };
  }

  // ─── getSubordinatesForEvaluation ──────────────────────────────────────────

  async getSubordinatesForEvaluation(
    userId: string,
    month: number,
    year: number
  ): Promise<any[]> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    let evaluations: any[];

    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEPARTMENT_HEAD) {
      evaluations = await prisma.evaluation.findMany({
        where: { period },
        include: {
          employee: { include: { user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } } } },
          details: true,
        },
      });
    } else {
      // Only subordinates supervised by this user
      const subordinateEmployeeIds = await this._getSubordinateEmployeeIds(userId);
      evaluations = await prisma.evaluation.findMany({
        where: {
          period,
          employeeId: { in: subordinateEmployeeIds },
        },
        include: {
          employee: { include: { user: { select: { id: true, supervisor1Id: true, supervisor2Id: true } } } },
          details: true,
        },
      });
    }

    // Apply BS1 masking on list for supervisor1 / supervisor2
    return evaluations.map(ev => {
      const hasSup1Score = ev.details.some((d: any) => d.supervisorScore1 !== null);
      const hasSup2Score = ev.details.some((d: any) => d.supervisorScore2 !== null);

      let selfPercentage = ev.selfScorePercentage ?? computeWeightedScoreForField(ev.details, 'selfScore');
      let sup1Percentage = ev.sup1Percentage ?? computeWeightedScoreForField(ev.details, 'supervisorScore1');

      // BS1: mask selfScore aggregate for sup1 if no sup1 scores saved yet
      const isSup1 = ev.employee.user?.supervisor1Id === userId;
      const isSup2 = ev.employee.user?.supervisor2Id === userId;

      if (
        isSup1 &&
        ev.status === EvaluationStatus.SUPERVISOR1_PENDING &&
        !hasSup1Score
      ) {
        selfPercentage = null;
      }
      if (
        isSup2 &&
        ev.status === EvaluationStatus.SUPERVISOR2_PENDING &&
        !hasSup2Score
      ) {
        sup1Percentage = null;
      }

      return {
        ...ev,
        selfScorePercentage: selfPercentage,
        sup1Percentage: sup1Percentage,
      };
    });
  }

  // ─── getEvaluationCompletionStats ──────────────────────────────────────────

  async getEvaluationCompletionStats(month: number, year: number): Promise<{
    total: number;
    selfPending: number;
    supervisor1Pending: number;
    supervisor2Pending: number;
    completed: number;
    acknowledged: number;
    completionRate: number;
    byDepartment: Array<{ departmentName: string; total: number; completed: number; rate: number }>;
  }> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const evaluations = await prisma.evaluation.findMany({
      where: { period },
      select: {
        status: true,
        employee: {
          select: {
            subDepartment: {
              select: { department: { select: { name: true } } },
            },
          },
        },
      },
    });

    const total = evaluations.length;
    let selfPending = 0;
    let supervisor1Pending = 0;
    let supervisor2Pending = 0;
    let completed = 0;
    let acknowledged = 0;
    const deptMap = new Map<string, { total: number; completed: number }>();

    for (const ev of evaluations) {
      switch (ev.status) {
        case EvaluationStatus.SELF_PENDING: selfPending++; break;
        case EvaluationStatus.SUPERVISOR1_PENDING: supervisor1Pending++; break;
        case EvaluationStatus.SUPERVISOR2_PENDING: supervisor2Pending++; break;
        case EvaluationStatus.COMPLETED: completed++; break;
        case EvaluationStatus.ACKNOWLEDGED: acknowledged++; break;
      }
      const deptName = ev.employee.subDepartment?.department?.name ?? 'Không xác định';
      const bucket = deptMap.get(deptName) ?? { total: 0, completed: 0 };
      bucket.total++;
      if (ev.status === EvaluationStatus.COMPLETED || ev.status === EvaluationStatus.ACKNOWLEDGED) {
        bucket.completed++;
      }
      deptMap.set(deptName, bucket);
    }

    const completionRate = total > 0 ? ((completed + acknowledged) / total) * 100 : 0;
    const byDepartment = Array.from(deptMap.entries()).map(([departmentName, s]) => ({
      departmentName,
      total: s.total,
      completed: s.completed,
      rate: s.total > 0 ? (s.completed / s.total) * 100 : 0,
    }));

    return { total, selfPending, supervisor1Pending, supervisor2Pending, completed, acknowledged, completionRate, byDepartment };
  }

  // ─── syncEvaluationDetails ─────────────────────────────────────────────────

  async syncEvaluationDetails(evaluationId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: { include: { position: { include: { responsibilities: true } } } },
        details: { select: { positionResponsibilityId: true } },
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    const responsibilities = evaluation.employee.position?.responsibilities ?? [];
    const existingIds = new Set(evaluation.details.map((d: any) => d.positionResponsibilityId));
    const missing = responsibilities.filter((r: any) => !existingIds.has(r.id));
    const obsoleteIds = Array.from(existingIds).filter(
      id => !responsibilities.some((r: any) => r.id === id)
    );

    if (missing.length === 0 && obsoleteIds.length === 0) {
      return { added: 0, removed: 0 };
    }

    await prisma.$transaction(async (tx) => {
      if (missing.length > 0) {
        await tx.evaluationDetail.createMany({
          data: missing.map((r: any) => ({ evaluationId, positionResponsibilityId: r.id })),
        });
      }
      if (obsoleteIds.length > 0) {
        await tx.evaluationDetail.deleteMany({
          where: { evaluationId, positionResponsibilityId: { in: obsoleteIds as string[] } },
        });
      }
    });

    return { added: missing.length, removed: obsoleteIds.length };
  }

  // ─── getEvaluationPdfData ─────────────────────────────────────────────────

  async getEvaluationPdfData(evaluationId: string, userId: string): Promise<{ evaluation: any; currentUserRole: string | null; isOwn: boolean; isSup: boolean }> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, supervisor1Id: true, supervisor2Id: true } },
            position: { select: { name: true } },
          },
        },
        details: {
          include: {
            positionResponsibility: { select: { title: true, weight: true } },
            evidences: true,
          },
          orderBy: { positionResponsibilityId: 'asc' },
        },
        goals: { orderBy: { orderIndex: 'asc' } },
        idpItems: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!evaluation) return { evaluation: null, currentUserRole: null, isOwn: false, isSup: false };

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const emp = (evaluation as any).employee;
    const empUser = emp?.user;
    const isOwn = emp?.userId === userId;
    const isSup = empUser?.supervisor1Id === userId || empUser?.supervisor2Id === userId;

    return {
      evaluation,
      currentUserRole: currentUser?.role ?? null,
      isOwn,
      isSup,
    };
  }

  // ─── Private: get subordinate employee IDs ─────────────────────────────────

  private async _getSubordinateEmployeeIds(userId: string): Promise<string[]> {
    // Find all employees whose user has supervisor1Id or supervisor2Id = userId
    const subordinateUsers = await prisma.user.findMany({
      where: {
        OR: [{ supervisor1Id: userId }, { supervisor2Id: userId }],
      },
      include: { employees: { select: { id: true } } },
    });

    return subordinateUsers
      .filter(u => (u as any).employees?.id)
      .map(u => (u as any).employees!.id);
  }

  async exportEvaluations(month: number, year: number): Promise<any> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const evaluations = await prisma.evaluation.findMany({
      where: { period },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Đánh giá T${String(month).padStart(2, '0')}-${year}`);

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'employeeName', width: 25 },
      { header: 'Vị trí', key: 'positionName', width: 25 },
      { header: 'Kỳ đánh giá', key: 'period', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 20 },
      { header: 'Tự đánh giá (%)', key: 'selfScore', width: 18 },
      { header: 'QL1 (%)', key: 'sup1Score', width: 15 },
      { header: 'QL2 (%)', key: 'sup2Score', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const statusLabel: Record<string, string> = {
      SELF_PENDING: 'Chờ tự đánh giá',
      SUPERVISOR1_PENDING: 'Chờ QL1 đánh giá',
      SUPERVISOR2_PENDING: 'Chờ QL2 đánh giá',
      COMPLETED: 'Hoàn thành',
    };

    evaluations.forEach((ev, idx) => {
      const emp = ev.employee;
      const fullName = emp?.user
        ? `${(emp.user as any).lastName} ${(emp.user as any).firstName}`.trim()
        : '';

      const row = worksheet.addRow({
        stt: idx + 1,
        employeeCode: emp?.employeeCode ?? '',
        employeeName: fullName,
        positionName: (emp?.position as any)?.name ?? '',
        period: ev.period,
        status: statusLabel[ev.status] ?? ev.status,
        selfScore: ev.selfScorePercentage != null ? Number(ev.selfScorePercentage) : null,
        sup1Score: ev.sup1Percentage != null ? Number(ev.sup1Percentage) : null,
        sup2Score: ev.sup2Percentage != null ? Number(ev.sup2Percentage) : null,
      });

      ['selfScore', 'sup1Score', 'sup2Score'].forEach(key => {
        row.getCell(key).numFmt = '0.0"%"';
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}

export default new EmployeeEvaluationService();
