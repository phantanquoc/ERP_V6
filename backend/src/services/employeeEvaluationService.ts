import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';
import { EvaluationStatus, NotificationEvent } from '@types';

/**
 * Calculate a weighted average score from evaluation details.
 * For each score type (self, supervisor1, supervisor2), if ALL details have a non-null
 * value → compute weighted score = sum(score * weight) / 100.
 * Average only the score types that are fully filled.
 */
function computeWeightedScore(details: Array<{
  selfScore: number | null;
  supervisorScore1: number | null;
  supervisorScore2: number | null;
  positionResponsibility: { weight: number } | null;
}>): number {
  const total = details.length;
  if (total === 0) return 0;

  const totalWeight = details.reduce((sum, d) => sum + (d.positionResponsibility?.weight ?? 0), 0);
  if (totalWeight === 0) return 0;

  const hasSelf = details.every(d => d.selfScore !== null);
  const hasSup1 = details.every(d => d.supervisorScore1 !== null);
  const hasSup2 = details.every(d => d.supervisorScore2 !== null);

  const scoresToAverage: number[] = [];

  if (hasSelf) {
    const s = details.reduce((sum, d) => sum + ((d.selfScore ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }
  if (hasSup1) {
    const s = details.reduce((sum, d) => sum + ((d.supervisorScore1 ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }
  if (hasSup2) {
    const s = details.reduce((sum, d) => sum + ((d.supervisorScore2 ?? 0) * (d.positionResponsibility?.weight ?? 0)), 0) / totalWeight;
    scoresToAverage.push(s);
  }

  return scoresToAverage.length > 0
    ? scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length
    : 0;
}

/**
 * Compute weighted score for a specific score field (selfScore, supervisorScore1, supervisorScore2).
 * Returns 0 if any detail has null for that field (not fully filled yet).
 * Correct formula: sum(score × weight) / totalWeight
 */
function computeWeightedScoreForField(
  details: Array<{
    selfScore: number | null;
    supervisorScore1: number | null;
    supervisorScore2: number | null;
    positionResponsibility: { weight: number } | null;
  }>,
  field: 'selfScore' | 'supervisorScore1' | 'supervisorScore2'
): number {
  const allFilled = details.every(d => d[field] !== null);
  if (!allFilled || details.length === 0) return 0;

  const totalWeight = details.reduce((sum, d) => sum + (d.positionResponsibility?.weight ?? 0), 0);
  if (totalWeight === 0) return 0;

  return details.reduce((sum, d) => {
    const score = d[field] ?? 0;
    const weight = d.positionResponsibility?.weight ?? 0;
    return sum + score * weight;
  }, 0) / totalWeight;
}

export class EmployeeEvaluationService {
  async getEmployeeEvaluations(month: number, year: number, userDepartmentId?: string, userSubDepartmentId?: string): Promise<any[]> {
    // Build where conditions
    const conditions: any[] = [];

    // Filter by department/subdepartment
    if (userSubDepartmentId) {
      // TEAM_LEAD/EMPLOYEE: only show subdepartment
      conditions.push({ user: { subDepartmentId: userSubDepartmentId } });
    } else if (userDepartmentId) {
      // DEPARTMENT_HEAD: show department (including subdepartments)
      conditions.push({
        OR: [
          { user: { departmentId: userDepartmentId } },
          { subDepartment: { departmentId: userDepartmentId } },
        ],
      });
    }
    // ADMIN: no filter, show all

    // Get employees with their position and evaluation data
    const employees = await prisma.employee.findMany({
      where: conditions.length > 0 ? { OR: conditions } : {},
      include: {
        user: true,
        position: true,
        evaluations: {
          where: {
            period: `${year}-${String(month).padStart(2, '0')}`,
          },
          include: {
            details: {
              include: {
                positionResponsibility: true,
              },
            },
          },
        },
      },
    });

    return employees.map(emp => {
      const evaluation = emp.evaluations[0];
      const fullName = emp.user ? `${emp.user.lastName} ${emp.user.firstName}`.trim() : '';

      // Calculate weighted scores using correct formula: sum(score × weight) / 100
      const detailsForScoring = evaluation?.details ?? [];
      const selfScorePercentage = computeWeightedScoreForField(detailsForScoring, 'selfScore');
      const supervisorScore1Percentage = computeWeightedScoreForField(detailsForScoring, 'supervisorScore1');
      const supervisorScore2Percentage = computeWeightedScoreForField(detailsForScoring, 'supervisorScore2');

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: fullName,
        positionId: emp.positionId,
        positionName: emp.position?.name || '',
        evaluationId: evaluation?.id || null,
        selfScore: selfScorePercentage,
        supervisorScore1: supervisorScore1Percentage,
        supervisorScore2: supervisorScore2Percentage,
      };
    });
  }

  async getEvaluationDetails(evaluationId: string, userId?: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: true,
            position: {
              include: {
                responsibilities: true,
              },
            },
          },
        },
        details: {
          include: {
            positionResponsibility: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Evaluation not found');
    }

    // Check access: User can only view their own evaluation (for self-evaluation)
    // or if they are a manager/admin
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // If user is not ADMIN, DEPARTMENT_HEAD, or TEAM_LEAD, they can only view their own evaluation
      if (!['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(currentUser?.role || '')) {
        // Regular user can only view their own evaluation
        if (evaluation.employee.userId !== userId) {
          throw new Error('Access denied');
        }
      }
    }

    // Map directly from evaluation details — guarantees detailId is always present
    const details = evaluation.details.map((evalDetail, index) => {
      const resp = evalDetail.positionResponsibility;
      return {
        stt: index + 1,
        responsibilityId: resp.id,
        title: resp.title,
        description: resp.description,
        weight: resp.weight,
        selfScore: evalDetail.selfScore ?? null,
        supervisorScore1: evalDetail.supervisorScore1 ?? null,
        supervisorScore2: evalDetail.supervisorScore2 ?? null,
        detailId: evalDetail.id,
      };
    });

    const fullName = evaluation.employee.user
      ? `${evaluation.employee.user.lastName} ${evaluation.employee.user.firstName}`.trim()
      : '';

    // Get supervisor names
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
      // SUGGESTION fix: include status so frontend can disable inputs accordingly
      status: evaluation.status,
      supervisor1Name,
      supervisor2Name,
      details,
    };
  }

  async createOrUpdateEvaluation(employeeId: string, month: number, year: number): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true, user: true },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Find or create evaluation
    let evaluation = await prisma.evaluation.findFirst({
      where: {
        employeeId,
        period,
      },
    });

    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          employeeId,
          period,
          score: 0,
        },
      });

      // Create evaluation details for all position responsibilities
      const responsibilities = employee.positionId
        ? await prisma.positionResponsibility.findMany({
            where: { positionId: employee.positionId },
          })
        : [];

      for (const resp of responsibilities) {
        await prisma.evaluationDetail.create({
          data: {
            evaluationId: evaluation.id,
            positionResponsibilityId: resp.id,
          },
        });
      }

      // Create notification for employee (skip ADMIN — they only review subordinates)
      if (employee.user?.role !== 'ADMIN') {
        await notificationService.notify(NotificationEvent.EVALUATION_CREATED, {
          targetEmployeeIds: [employeeId],
          entityId: evaluation.id,
          metadata: { evaluationId: evaluation.id, period: `${year}-${String(month).padStart(2, '0')}`, monthName: new Date(year, month - 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) },
        });
      }
    } else if (evaluation) {
      // Evaluation exists — backfill missing details if needed
      const evalId = evaluation.id;
      const responsibilities = employee.positionId
        ? await prisma.positionResponsibility.findMany({
            where: { positionId: employee.positionId },
          })
        : [];

      const existingDetails = await prisma.evaluationDetail.findMany({
        where: { evaluationId: evalId },
        select: { positionResponsibilityId: true },
      });
      const existingIds = new Set(existingDetails.map(d => d.positionResponsibilityId));
      const missing = responsibilities.filter(r => !existingIds.has(r.id));

      if (missing.length > 0) {
        await prisma.evaluationDetail.createMany({
          data: missing.map(r => ({
            evaluationId: evalId,
            positionResponsibilityId: r.id,
          })),
        });
      }
    }

    return evaluation;
  }

  // BUG 5: New bulk creation method — creates evaluations for all employees in one operation
  async createBulkEvaluations(month: number, year: number): Promise<any> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Find ALL active employees (including those without positionId)
    const employees = await prisma.employee.findMany({
      where: {},
      include: {
        user: { select: { role: true } },
        position: {
          include: {
            responsibilities: true,
          },
        },
      },
    });

    if (employees.length === 0) {
      return { created: 0, skipped: 0, total: 0 };
    }

    // Find employees that already have evaluations for this period
    const existingEvaluations = await prisma.evaluation.findMany({
      where: {
        period,
        employeeId: { in: employees.map(e => e.id) },
      },
      select: { employeeId: true },
    });

    const existingEmployeeIds = new Set(existingEvaluations.map(e => e.employeeId));
    const employeesToCreate = employees.filter(e => !existingEmployeeIds.has(e.id));

    let createdCount = 0;

    for (const employee of employeesToCreate) {
      try {
        let evaluationId: string | null = null;

        await prisma.$transaction(async (tx) => {
          const evaluation = await tx.evaluation.create({
            data: {
              employeeId: employee.id,
              period,
              score: 0,
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

        // Notification sent outside transaction so it only fires on successful commit
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

  async updateEvaluationDetail(detailId: string, data: any, userId?: string): Promise<any> {
    const detail = await prisma.evaluationDetail.findUnique({
      where: { id: detailId },
      include: {
        evaluation: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!detail) {
      throw new NotFoundError('Evaluation detail not found');
    }

    // BUG 1: Validate status before allowing score updates
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

    // Check access:
    // - Regular users can only update their own evaluation's selfScore
    // - Managers can update all scores
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const isManager = ['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(currentUser?.role || '');

      if (!isManager) {
        // Regular user can only update their own evaluation
        if (detail.evaluation.employee.userId !== userId) {
          throw new Error('Access denied');
        }
        // Regular user can only update selfScore
        if (data.supervisorScore1 !== undefined || data.supervisorScore2 !== undefined) {
          throw new ValidationError('Không thể cập nhật điểm cấp trên: bạn không có quyền');
        }
      }

      // Strict supervisor authorization: non-ADMIN managers must be the assigned supervisor
      if (currentUser?.role !== 'ADMIN') {
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

    // Validate scores
    if (data.selfScore !== undefined && (typeof data.selfScore !== 'number' || data.selfScore < 0 || data.selfScore > 100)) {
      throw new ValidationError('Self score must be between 0 and 100');
    }

    if (data.supervisorScore1 !== undefined && (typeof data.supervisorScore1 !== 'number' || data.supervisorScore1 < 0 || data.supervisorScore1 > 100)) {
      throw new ValidationError('Supervisor 1 score must be between 0 and 100');
    }

    if (data.supervisorScore2 !== undefined && (typeof data.supervisorScore2 !== 'number' || data.supervisorScore2 < 0 || data.supervisorScore2 > 100)) {
      throw new ValidationError('Supervisor 2 score must be between 0 and 100');
    }

    // Update the detail
    const updatedDetail = await prisma.evaluationDetail.update({
      where: { id: detailId },
      data: {
        ...(data.selfScore !== undefined && { selfScore: data.selfScore }),
        ...(data.supervisorScore1 !== undefined && { supervisorScore1: data.supervisorScore1 }),
        ...(data.supervisorScore2 !== undefined && { supervisorScore2: data.supervisorScore2 }),
        // comment can only be set by supervisors (non-self fields present)
        ...(data.comment !== undefined && (data.supervisorScore1 !== undefined || data.supervisorScore2 !== undefined) && { comment: data.comment }),
      },
      include: {
        positionResponsibility: true,
      },
    });

    // Handle notification workflow — each branch uses a transaction to prevent
    // race conditions when two requests concurrently save the last detail.
    // Status update + score calculation happen inside the transaction;
    // notifications are sent after commit (outside transaction).
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

          const filled = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id, selfScore: { not: null } },
          });
          const total = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id },
          });
          if (filled < total) return;

          const employee = await tx.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });
          const fullName = employee?.user
            ? `${employee.user.lastName} ${employee.user.firstName}`.trim()
            : '';

          if (employee?.user?.supervisor1Id) {
            // Resolve supervisor1's employeeId inside transaction for consistency
            const supervisorUser = await tx.user.findUnique({
              where: { id: employee.user.supervisor1Id },
              include: { employees: { select: { id: true } } },
            });
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR1_PENDING },
            });
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
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING },
            });
            notifRef.target = {
              type: 'supervisor2',
              supervisorUserId: employee.user.supervisor2Id,
              supervisorEmployeeId: supervisorUser?.employees?.id ?? null,
              employeeName: fullName,
            };
          } else {
            // No supervisors — auto-finalize with score
            const allDetails = await tx.evaluationDetail.findMany({
              where: { evaluationId: detail.evaluation.id },
              include: { positionResponsibility: true },
            });
            const calculatedScore = computeWeightedScore(allDetails);
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED, score: calculatedScore },
            });
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

          const filled = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id, supervisorScore1: { not: null } },
          });
          const total = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id },
          });
          if (filled < total) return;

          const employee = await tx.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });
          const fullName = employee?.user
            ? `${employee.user.lastName} ${employee.user.firstName}`.trim()
            : '';

          if (employee?.user?.supervisor2Id) {
            const supervisorUser = await tx.user.findUnique({
              where: { id: employee.user.supervisor2Id },
              include: { employees: { select: { id: true } } },
            });
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING, evaluatedBy1Id: userId },
            });
            notifRef.target = {
              type: 'supervisor2',
              supervisorEmployeeId: supervisorUser?.employees?.id ?? null,
              employeeName: fullName,
            };
          } else {
            // No supervisor2 — auto-finalize with score
            const allDetails = await tx.evaluationDetail.findMany({
              where: { evaluationId: detail.evaluation.id },
              include: { positionResponsibility: true },
            });
            const calculatedScore = computeWeightedScore(allDetails);
            await tx.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED, score: calculatedScore, evaluatedBy1Id: userId },
            });
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
          // Notify the employee that supervisor1 has completed their evaluation
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
            select: { status: true },
          });
          if (currentEval?.status !== EvaluationStatus.SUPERVISOR2_PENDING) return;

          const filled = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id, supervisorScore2: { not: null } },
          });
          const total = await tx.evaluationDetail.count({
            where: { evaluationId: detail.evaluation.id },
          });
          if (filled < total) return;

          // Auto-finalize with score
          const allDetails = await tx.evaluationDetail.findMany({
            where: { evaluationId: detail.evaluation.id },
            include: { positionResponsibility: true },
          });
          const calculatedScore = computeWeightedScore(allDetails);
          await tx.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: EvaluationStatus.COMPLETED, score: calculatedScore, evaluatedBy2Id: userId },
          });

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
    } catch (error) {
      logger.error('❌ Error in evaluation notification workflow:', error);
      // Don't fail the evaluation update if notification fails
    }

    return updatedDetail;
  }

  async getEvaluationHistory(evaluationId: string, userId?: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            evaluations: {
              orderBy: { period: 'desc' },
              include: {
                details: {
                  include: {
                    positionResponsibility: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Evaluation not found');
    }

    // Check access: User can only view their own evaluation history (for self-evaluation)
    // or if they are a manager/admin
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // If user is not ADMIN, DEPARTMENT_HEAD, or TEAM_LEAD, they can only view their own history
      if (!['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes(currentUser?.role || '')) {
        // Regular user can only view their own evaluation history
        if (evaluation.employee.userId !== userId) {
          throw new Error('Access denied');
        }
      }
    }

    // Map all evaluations to history format
    const history = evaluation.employee.evaluations.map((evalItem) => {
      const totalWeight = evalItem.details.reduce((sum, d) => {
        return sum + (d.positionResponsibility?.weight || 0);
      }, 0) || 100;

      const selfScoreWeighted = evalItem.details.reduce((sum, d) => {
        return sum + (d.selfScore || 0) * (d.positionResponsibility?.weight || 0);
      }, 0);
      const selfScorePercentage = totalWeight > 0 ? selfScoreWeighted / totalWeight : 0;

      const hasSup1 = evalItem.details.every(d => d.supervisorScore1 !== null);
      const sup1ScoreWeighted = hasSup1 ? evalItem.details.reduce((sum, d) => {
        return sum + (d.supervisorScore1 || 0) * (d.positionResponsibility?.weight || 0);
      }, 0) : 0;
      const sup1ScorePercentage = hasSup1 && totalWeight > 0 ? sup1ScoreWeighted / totalWeight : null;

      const hasSup2 = evalItem.details.every(d => d.supervisorScore2 !== null);
      const sup2ScoreWeighted = hasSup2 ? evalItem.details.reduce((sum, d) => {
        return sum + (d.supervisorScore2 || 0) * (d.positionResponsibility?.weight || 0);
      }, 0) : 0;
      const sup2ScorePercentage = hasSup2 && totalWeight > 0 ? sup2ScoreWeighted / totalWeight : null;

      return {
        evaluationId: evalItem.id,
        period: evalItem.period,
        status: evalItem.status,
        selfScore: selfScorePercentage,
        supervisorScore1: sup1ScorePercentage,
        supervisorScore2: sup2ScorePercentage,
        score: evalItem.score,
        createdAt: evalItem.createdAt,
        updatedAt: evalItem.updatedAt,
      };
    });

    let supervisor1Name: string | null = null;
    let supervisor2Name: string | null = null;
    if (evaluation.employee.userId) {
      const empUser = await prisma.user.findUnique({
        where: { id: evaluation.employee.userId },
        select: { supervisor1Id: true, supervisor2Id: true },
      });
      if (empUser?.supervisor1Id) {
        const sup1 = await prisma.user.findUnique({
          where: { id: empUser.supervisor1Id },
          select: { lastName: true, firstName: true },
        });
        if (sup1) supervisor1Name = `${sup1.lastName} ${sup1.firstName}`;
      }
      if (empUser?.supervisor2Id) {
        const sup2 = await prisma.user.findUnique({
          where: { id: empUser.supervisor2Id },
          select: { lastName: true, firstName: true },
        });
        if (sup2) supervisor2Name = `${sup2.lastName} ${sup2.firstName}`;
      }
    }

    return {
      employeeCode: evaluation.employee.employeeCode,
      supervisor1Name,
      supervisor2Name,
      history,
    };
  }

  async acknowledgeEvaluation(evaluationId: string, userId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Không tìm thấy đánh giá');
    }

    if (evaluation.status !== EvaluationStatus.COMPLETED) {
      throw new ValidationError('Chỉ có thể xác nhận đánh giá đã hoàn thành');
    }

    // Verify the requesting user's employee matches the evaluation's employee
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!requestingEmployee || requestingEmployee.id !== evaluation.employeeId) {
      throw new ValidationError('Bạn chỉ có thể xác nhận đánh giá của mình');
    }

    return prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: EvaluationStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  async finalizeEvaluation(evaluationId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        details: {
          include: {
            positionResponsibility: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Evaluation not found');
    }

    // Only allow finalize when status is already COMPLETED (idempotent recalculation)
    const allowedStatuses: string[] = [EvaluationStatus.COMPLETED];
    if (!allowedStatuses.includes(evaluation.status)) {
      throw new ValidationError('Không thể hoàn thành đánh giá: chưa hoàn tất tất cả bước đánh giá');
    }

    // Check that at least some scores have been entered before finalizing
    const hasAnyScore = evaluation.details.some(
      d => d.selfScore !== null || d.supervisorScore1 !== null || d.supervisorScore2 !== null
    );

    if (!hasAnyScore) {
      throw new ValidationError('Không thể hoàn thành đánh giá: chưa có điểm nào được nhập');
    }

    // Recalculate weighted average score using shared helper
    const averageScore = computeWeightedScore(evaluation.details);

    return await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        score: averageScore,
        status: EvaluationStatus.COMPLETED,
      },
    });
  }

  async getPendingEvaluationCount(userId: string, month: number, year: number): Promise<number> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Get subordinate employee IDs (where current user is supervisor1 or supervisor2)
    const subordinates = await prisma.user.findMany({
      where: {
        OR: [
          { supervisor1Id: userId },
          { supervisor2Id: userId },
        ],
        isActive: true,
      },
      select: {
        employees: { select: { id: true } },
      },
    });

    const employeeIds = subordinates
      .filter(s => s.employees)
      .map(s => s.employees!.id);

    if (employeeIds.length === 0) return 0;

    // Count evaluations of subordinates that are not completed
    return prisma.evaluation.count({
      where: {
        employeeId: { in: employeeIds },
        period,
        status: { not: 'COMPLETED' },
      },
    });
  }

  async getSubordinatesForEvaluation(userId: string, month: number, year: number): Promise<any[]> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Get all users where supervisor1Id or supervisor2Id equals the current user
    const subordinates = await prisma.user.findMany({
      where: {
        OR: [
          { supervisor1Id: userId },
          { supervisor2Id: userId },
        ],
        isActive: true,
      },
      include: {
        employees: {
          include: {
            position: true,
            evaluations: {
              where: { period },
              include: {
                details: {
                  include: {
                    positionResponsibility: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Map to response format
    return subordinates.flatMap(user => {
      if (!user.employees) return [];
      const employee = user.employees;
      const evaluation = employee.evaluations[0];
      const fullName = `${user.lastName} ${user.firstName}`.trim();

      // Calculate scores using correct weighted formula
      const detailsForScoring = evaluation?.details ?? [];
      const selfScorePercentage = computeWeightedScoreForField(detailsForScoring, 'selfScore');
      const supervisorScore1Percentage = computeWeightedScoreForField(detailsForScoring, 'supervisorScore1');
      const supervisorScore2Percentage = computeWeightedScoreForField(detailsForScoring, 'supervisorScore2');

      return [{
        userId: user.id,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: fullName,
        positionName: employee.position?.name || '',
        evaluationId: evaluation?.id,
        period,
        selfScorePercentage: Math.round(selfScorePercentage * 100) / 100,
        supervisorScore1Percentage: Math.round(supervisorScore1Percentage * 100) / 100,
        supervisorScore2Percentage: Math.round(supervisorScore2Percentage * 100) / 100,
        status: evaluation?.status || 'NOT_STARTED',
        isSupervisor1: user.supervisor1Id === userId,
        isSupervisor2: user.supervisor2Id === userId,
      }];
    });
  }

  async getEvaluationCompletionStats(month: number, year: number): Promise<{
    total: number;
    selfPending: number;
    supervisor1Pending: number;
    supervisor2Pending: number;
    completed: number;
    acknowledged: number;
    completionRate: number;
    byDepartment: Array<{
      departmentName: string;
      total: number;
      completed: number;
      rate: number;
    }>;
  }> {
    const period = `${year}-${month.toString().padStart(2, '0')}`;

    const evaluations = await prisma.evaluation.findMany({
      where: { period },
      select: {
        status: true,
        employee: {
          select: {
            subDepartment: {
              select: {
                department: {
                  select: { name: true },
                },
              },
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
        case EvaluationStatus.SELF_PENDING:
          selfPending++;
          break;
        case EvaluationStatus.SUPERVISOR1_PENDING:
          supervisor1Pending++;
          break;
        case EvaluationStatus.SUPERVISOR2_PENDING:
          supervisor2Pending++;
          break;
        case EvaluationStatus.COMPLETED:
          completed++;
          break;
        case EvaluationStatus.ACKNOWLEDGED:
          acknowledged++;
          break;
      }

      const deptName = ev.employee.subDepartment?.department?.name ?? 'Không xác định';
      const existing = deptMap.get(deptName) ?? { total: 0, completed: 0 };
      existing.total++;
      if (ev.status === EvaluationStatus.COMPLETED || ev.status === EvaluationStatus.ACKNOWLEDGED) {
        existing.completed++;
      }
      deptMap.set(deptName, existing);
    }

    const completionRate = total > 0 ? ((completed + acknowledged) / total) * 100 : 0;

    const byDepartment = Array.from(deptMap.entries()).map(([departmentName, stats]) => ({
      departmentName,
      total: stats.total,
      completed: stats.completed,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }));

    return {
      total,
      selfPending,
      supervisor1Pending,
      supervisor2Pending,
      completed,
      acknowledged,
      completionRate,
      byDepartment,
    };
  }

  async syncEvaluationDetails(month: number, year: number): Promise<{ synced: number; skipped: number }> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const evaluations = await prisma.evaluation.findMany({
      where: { period },
      include: {
        details: { select: { positionResponsibilityId: true } },
        employee: {
          include: {
            position: {
              include: { responsibilities: true },
            },
          },
        },
      },
    });

    let synced = 0;
    let skipped = 0;

    for (const evaluation of evaluations) {
      const responsibilities = evaluation.employee.position?.responsibilities ?? [];
      const existingIds = new Set(evaluation.details.map(d => d.positionResponsibilityId));
      const missing = responsibilities.filter(r => !existingIds.has(r.id));

      if (missing.length === 0) {
        skipped++;
        continue;
      }

      await prisma.evaluationDetail.createMany({
        data: missing.map(r => ({
          evaluationId: evaluation.id,
          positionResponsibilityId: r.id,
        })),
      });
      synced++;
    }

    return { synced, skipped };
  }
}

export default new EmployeeEvaluationService();
