import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';
import { NotificationType, EvaluationStatus, NotificationEvent } from '@types';

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
      const fullName = emp.user ? `${emp.user.firstName} ${emp.user.lastName}`.trim() : '';

      // Calculate total weight (should be 100%)
      const totalWeight = evaluation?.details.reduce((sum, d) => {
        return sum + (d.positionResponsibility?.weight || 0);
      }, 0) || 100;

      // Calculate total score points for each score type
      const selfScoreTotalPoints = evaluation?.details.reduce((sum, d) => {
        return sum + (d.selfScore || 0);
      }, 0) || 0;

      const supervisorScore1TotalPoints = evaluation?.details.reduce((sum, d) => {
        return sum + (d.supervisorScore1 || 0);
      }, 0) || 0;

      const supervisorScore2TotalPoints = evaluation?.details.reduce((sum, d) => {
        return sum + (d.supervisorScore2 || 0);
      }, 0) || 0;

      // Calculate percentage: (total points / total weight) * 100
      const selfScorePercentage = totalWeight > 0 ? (selfScoreTotalPoints / totalWeight) * 100 : 0;
      const supervisorScore1Percentage = totalWeight > 0 ? (supervisorScore1TotalPoints / totalWeight) * 100 : 0;
      const supervisorScore2Percentage = totalWeight > 0 ? (supervisorScore2TotalPoints / totalWeight) * 100 : 0;

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

    // Get all responsibilities for the position
    const responsibilities = evaluation.employee.position?.responsibilities || [];

    // Map responsibilities with evaluation details
    const details = responsibilities.map((resp, index) => {
      const evalDetail = evaluation.details.find(d => d.positionResponsibilityId === resp.id);
      return {
        stt: index + 1,
        responsibilityId: resp.id,
        title: resp.title,
        description: resp.description,
        weight: resp.weight,
        selfScore: evalDetail?.selfScore ?? null,
        supervisorScore1: evalDetail?.supervisorScore1 ?? null,
        supervisorScore2: evalDetail?.supervisorScore2 ?? null,
        detailId: evalDetail?.id || null,
      };
    });

    const fullName = evaluation.employee.user
      ? `${evaluation.employee.user.firstName} ${evaluation.employee.user.lastName}`.trim()
      : '';

    return {
      evaluationId: evaluation.id,
      employeeCode: evaluation.employee.employeeCode,
      employeeName: fullName,
      positionName: evaluation.employee.position?.name || '',
      period: evaluation.period,
      // SUGGESTION fix: include status so frontend can disable inputs accordingly
      status: evaluation.status,
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
    }

    return evaluation;
  }

  // BUG 5: New bulk creation method — creates evaluations for all employees in one operation
  async createBulkEvaluations(month: number, year: number): Promise<any> {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Find all employees that have positions (needed for evaluation details)
    const employees = await prisma.employee.findMany({
      where: {
        positionId: { not: null },
      },
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
        const evaluation = await prisma.evaluation.create({
          data: {
            employeeId: employee.id,
            period,
            score: 0,
          },
        });

        // Create evaluation details for all position responsibilities
        const responsibilities = employee.position?.responsibilities || [];
        if (responsibilities.length > 0) {
          await prisma.evaluationDetail.createMany({
            data: responsibilities.map(resp => ({
              evaluationId: evaluation.id,
              positionResponsibilityId: resp.id,
            })),
          });
        }

        // Create notification for employee (skip ADMIN — they only review subordinates)
        if (employee.user?.role !== 'ADMIN') {
          await notificationService.createEvaluationNotification(
            employee.id,
            month,
            year,
            evaluation.id
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
          throw new Error('You can only update your own score');
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
      },
      include: {
        positionResponsibility: true,
      },
    });

    // Handle notification workflow
    try {
      if (data.selfScore !== undefined) {
        // Employee just completed self-evaluation
        // Check if all details have selfScore
        const allDetailsWithSelfScore = await prisma.evaluationDetail.findMany({
          where: {
            evaluationId: detail.evaluation.id,
            selfScore: { not: null },
          },
        });

        const totalDetails = await prisma.evaluationDetail.count({
          where: { evaluationId: detail.evaluation.id },
        });

        if (allDetailsWithSelfScore.length === totalDetails) {
          // All self-evaluations are done
          const employee = await prisma.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });

          if (employee?.user?.supervisor1Id) {
            // Update status first, then send notification outside transaction
            await prisma.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR1_PENDING },
            });

            await notificationService.createNotification({
              userId: employee.user!.supervisor1Id!,
              type: NotificationType.EVALUATION_SUPERVISOR1,
              title: 'Đánh giá cấp trên 1',
              message: `Bạn có 1 đánh giá mới`,
              evaluationId: detail.evaluation.id,
              period: detail.evaluation.period,
            });
          } else if (employee?.user?.supervisor2Id) {
            // No supervisor1, send to supervisor2
            await prisma.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING },
            });

            await notificationService.createNotification({
              userId: employee.user!.supervisor2Id!,
              type: NotificationType.EVALUATION_SUPERVISOR2,
              title: 'Đánh giá cấp trên 2',
              message: `Bạn có 1 đánh giá mới`,
              evaluationId: detail.evaluation.id,
              period: detail.evaluation.period,
            });
          } else {
            // No supervisor1 AND no supervisor2 — complete evaluation directly
            await prisma.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED },
            });

            if (employee?.user?.id) {
              await notificationService.createNotification({
                userId: employee.user.id,
                type: NotificationType.EVALUATION_COMPLETED,
                title: 'Đánh giá hoàn thành',
                message: 'Đánh giá của bạn đã hoàn thành',
                evaluationId: detail.evaluation.id,
                period: detail.evaluation.period,
              });
            }
          }
        }
      } else if (data.supervisorScore1 !== undefined) {
        // Supervisor1 just completed evaluation
        const allDetailsWithScore1 = await prisma.evaluationDetail.findMany({
          where: {
            evaluationId: detail.evaluation.id,
            supervisorScore1: { not: null },
          },
        });

        const totalDetails = await prisma.evaluationDetail.count({
          where: { evaluationId: detail.evaluation.id },
        });

        if (allDetailsWithScore1.length === totalDetails) {
          // All supervisor1 evaluations are done, send notification to supervisor2
          const employee = await prisma.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });

          if (employee?.user?.supervisor2Id) {
            // Update status first, then send notification
            await prisma.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.SUPERVISOR2_PENDING },
            });

            await notificationService.createNotification({
              userId: employee.user!.supervisor2Id!,
              type: NotificationType.EVALUATION_SUPERVISOR2,
              title: 'Đánh giá cấp trên 2',
              message: `Bạn có 1 đánh giá mới`,
              evaluationId: detail.evaluation.id,
              period: detail.evaluation.period,
            });
          } else {
            // No supervisor2 — complete evaluation directly
            await prisma.evaluation.update({
              where: { id: detail.evaluation.id },
              data: { status: EvaluationStatus.COMPLETED },
            });

            if (employee?.user?.id) {
              await notificationService.createNotification({
                userId: employee.user.id,
                type: NotificationType.EVALUATION_COMPLETED,
                title: 'Đánh giá hoàn thành',
                message: 'Đánh giá của bạn đã hoàn thành',
                evaluationId: detail.evaluation.id,
                period: detail.evaluation.period,
              });
            }
          }
        }
      } else if (data.supervisorScore2 !== undefined) {
        // Supervisor2 just completed evaluation
        const allDetailsWithScore2 = await prisma.evaluationDetail.findMany({
          where: {
            evaluationId: detail.evaluation.id,
            supervisorScore2: { not: null },
          },
        });

        const totalDetails = await prisma.evaluationDetail.count({
          where: { evaluationId: detail.evaluation.id },
        });

        if (allDetailsWithScore2.length === totalDetails) {
          // All evaluations are done — set to COMPLETED
          await prisma.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: EvaluationStatus.COMPLETED },
          });

          // BUG 7: Notify the employee that evaluation is completed
          const employee = await prisma.employee.findUnique({
            where: { id: detail.evaluation.employeeId },
            include: { user: true },
          });

          if (employee?.user?.id) {
            await notificationService.createNotification({
              userId: employee.user.id,
              type: NotificationType.EVALUATION_COMPLETED,
              title: 'Đánh giá hoàn thành',
              message: 'Đánh giá của bạn đã hoàn thành',
              evaluationId: detail.evaluation.id,
              period: detail.evaluation.period,
            });
          }
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

      const selfScoreTotalPoints = evalItem.details.reduce((sum, d) => {
        return sum + (d.selfScore || 0);
      }, 0) || 0;

      const selfScorePercentage = totalWeight > 0 ? (selfScoreTotalPoints / totalWeight) * 100 : 0;

      return {
        evaluationId: evalItem.id,
        period: evalItem.period,
        selfScore: selfScorePercentage,
        score: evalItem.score,
        createdAt: evalItem.createdAt,
        updatedAt: evalItem.updatedAt,
      };
    });

    return {
      employeeCode: evaluation.employee.employeeCode,
      history,
    };
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

    // BUG 3: Check that at least some scores have been entered before finalizing
    const hasAnyScore = evaluation.details.some(
      d => d.selfScore !== null || d.supervisorScore1 !== null || d.supervisorScore2 !== null
    );

    if (!hasAnyScore) {
      throw new ValidationError('Không thể hoàn thành đánh giá: chưa có điểm nào được nhập');
    }

    // BUG 6: Determine which score types have been filled in (null-safe check)
    // A score type is "filled" if ALL details have a non-null value for it
    const totalDetails = evaluation.details.length;

    const detailsWithSelfScore = evaluation.details.filter(d => d.selfScore !== null).length;
    const detailsWithSupervisorScore1 = evaluation.details.filter(d => d.supervisorScore1 !== null).length;
    const detailsWithSupervisorScore2 = evaluation.details.filter(d => d.supervisorScore2 !== null).length;

    const hasSelfScore = totalDetails > 0 && detailsWithSelfScore === totalDetails;
    const hasSupervisorScore1 = totalDetails > 0 && detailsWithSupervisorScore1 === totalDetails;
    const hasSupervisorScore2 = totalDetails > 0 && detailsWithSupervisorScore2 === totalDetails;

    // Calculate weighted scores only for score types that are fully filled
    const scoresToAverage: number[] = [];

    if (hasSelfScore) {
      const selfScore = evaluation.details.reduce((sum, d) => {
        const weight = d.positionResponsibility?.weight || 0;
        return sum + ((d.selfScore ?? 0) * weight);
      }, 0) / 100;
      scoresToAverage.push(selfScore);
    }

    if (hasSupervisorScore1) {
      const supervisorScore1 = evaluation.details.reduce((sum, d) => {
        const weight = d.positionResponsibility?.weight || 0;
        return sum + ((d.supervisorScore1 ?? 0) * weight);
      }, 0) / 100;
      scoresToAverage.push(supervisorScore1);
    }

    if (hasSupervisorScore2) {
      const supervisorScore2 = evaluation.details.reduce((sum, d) => {
        const weight = d.positionResponsibility?.weight || 0;
        return sum + ((d.supervisorScore2 ?? 0) * weight);
      }, 0) / 100;
      scoresToAverage.push(supervisorScore2);
    }

    const averageScore = scoresToAverage.length > 0
      ? scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length
      : 0;

    // BUG 3: Also set status = COMPLETED when finalizing
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
      const fullName = `${user.firstName} ${user.lastName}`.trim();

      // Calculate scores
      const totalWeight = evaluation?.details.reduce((sum: number, d: any) => {
        return sum + (d.positionResponsibility?.weight || 0);
      }, 0) || 100;

      const selfScoreTotalPoints = evaluation?.details.reduce((sum: number, d: any) => {
        return sum + (d.selfScore || 0);
      }, 0) || 0;

      const supervisorScore1TotalPoints = evaluation?.details.reduce((sum: number, d: any) => {
        return sum + (d.supervisorScore1 || 0);
      }, 0) || 0;

      const supervisorScore2TotalPoints = evaluation?.details.reduce((sum: number, d: any) => {
        return sum + (d.supervisorScore2 || 0);
      }, 0) || 0;

      const selfScorePercentage = totalWeight > 0 ? (selfScoreTotalPoints / totalWeight) * 100 : 0;
      const supervisorScore1Percentage = totalWeight > 0 ? (supervisorScore1TotalPoints / totalWeight) * 100 : 0;
      const supervisorScore2Percentage = totalWeight > 0 ? (supervisorScore2TotalPoints / totalWeight) * 100 : 0;

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
}

export default new EmployeeEvaluationService();
