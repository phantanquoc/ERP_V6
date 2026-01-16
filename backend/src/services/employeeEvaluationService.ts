import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';

export class EmployeeEvaluationService {
  async getEmployeeEvaluations(month: number, year: number): Promise<any[]> {
    // Get all employees with their position and evaluation data
    const employees = await prisma.employee.findMany({
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
    const responsibilities = evaluation.employee.position.responsibilities;

    // Map responsibilities with evaluation details
    const details = responsibilities.map((resp, index) => {
      const evalDetail = evaluation.details.find(d => d.positionResponsibilityId === resp.id);
      return {
        stt: index + 1,
        responsibilityId: resp.id,
        title: resp.title,
        description: resp.description,
        weight: resp.weight,
        selfScore: evalDetail?.selfScore || null,
        supervisorScore1: evalDetail?.supervisorScore1 || null,
        supervisorScore2: evalDetail?.supervisorScore2 || null,
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
      details,
    };
  }

  async createOrUpdateEvaluation(employeeId: string, month: number, year: number): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true },
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
      const responsibilities = await prisma.positionResponsibility.findMany({
        where: { positionId: employee.positionId },
      });

      for (const resp of responsibilities) {
        await prisma.evaluationDetail.create({
          data: {
            evaluationId: evaluation.id,
            positionResponsibilityId: resp.id,
          },
        });
      }

      // Create notification for employee
      await notificationService.createEvaluationNotification(
        employeeId,
        month,
        year,
        evaluation.id
      );
    }

    return evaluation;
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
        // All self-evaluations are done, send notification to supervisor1
        const employee = await prisma.employee.findUnique({
          where: { id: detail.evaluation.employeeId },
          include: { user: true },
        });

        if (employee?.user?.supervisor1Id) {
          // Send to supervisor1
          await notificationService.createNotification({
            userId: employee.user.supervisor1Id,
            type: 'EVALUATION_SUPERVISOR1',
            title: 'Đánh giá cấp trên 1',
            message: `${employee.user.firstName} ${employee.user.lastName} đã hoàn thành tự đánh giá. Vui lòng đánh giá.`,
            evaluationId: detail.evaluation.id,
            period: detail.evaluation.period,
          });

          // Update evaluation status
          await prisma.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: 'SUPERVISOR1_PENDING' },
          });
        } else if (employee?.user?.supervisor2Id) {
          // No supervisor1, send to supervisor2
          await notificationService.createNotification({
            userId: employee.user.supervisor2Id,
            type: 'EVALUATION_SUPERVISOR2',
            title: 'Đánh giá cấp trên 2',
            message: `${employee.user.firstName} ${employee.user.lastName} đã hoàn thành tự đánh giá. Vui lòng đánh giá.`,
            evaluationId: detail.evaluation.id,
            period: detail.evaluation.period,
          });

          // Update evaluation status
          await prisma.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: 'SUPERVISOR2_PENDING' },
          });
        }
      }
    } else if (data.supervisorScore1 !== undefined) {
      // Supervisor1 just completed evaluation
      // Check if all details have supervisorScore1
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
          await notificationService.createNotification({
            userId: employee.user.supervisor2Id,
            type: 'EVALUATION_SUPERVISOR2',
            title: 'Đánh giá cấp trên 2',
            message: `${employee.user.firstName} ${employee.user.lastName} đã được đánh giá bởi cấp trên 1. Vui lòng đánh giá.`,
            evaluationId: detail.evaluation.id,
            period: detail.evaluation.period,
          });

          // Update evaluation status
          await prisma.evaluation.update({
            where: { id: detail.evaluation.id },
            data: { status: 'SUPERVISOR2_PENDING' },
          });
        }
      }
    } else if (data.supervisorScore2 !== undefined) {
      // Supervisor2 just completed evaluation
      // Check if all details have supervisorScore2
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
        // All evaluations are done
        await prisma.evaluation.update({
          where: { id: detail.evaluation.id },
          data: { status: 'COMPLETED' },
        });
      }
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

    // Calculate weighted average score from all three types of scores
    // Calculate self score (weighted)
    const selfScore = evaluation.details.reduce((sum, d) => {
      const weight = d.positionResponsibility?.weight || 0;
      return sum + ((d.selfScore || 0) * weight);
    }, 0) / 100;

    // Calculate supervisor 1 score (weighted)
    const supervisorScore1 = evaluation.details.reduce((sum, d) => {
      const weight = d.positionResponsibility?.weight || 0;
      return sum + ((d.supervisorScore1 || 0) * weight);
    }, 0) / 100;

    // Calculate supervisor 2 score (weighted)
    const supervisorScore2 = evaluation.details.reduce((sum, d) => {
      const weight = d.positionResponsibility?.weight || 0;
      return sum + ((d.supervisorScore2 || 0) * weight);
    }, 0) / 100;

    // Average of all three scores
    const scores = [selfScore, supervisorScore1, supervisorScore2].filter(s => s > 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        score: averageScore,
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

