import { PrismaClient, DailyWorkReportStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '@utils/errors';

const prisma = new PrismaClient();

export class DailyWorkReportService {
  /**
   * Get all daily work reports with pagination and filters
   */
  async getAllReports(
    page: number = 1,
    limit: number = 10,
    filters?: {
      employeeId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.reportDate = {};
      if (filters.startDate) {
        where.reportDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reportDate.lte = filters.endDate;
      }
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [reports, total] = await Promise.all([
      prisma.dailyWorkReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportDate: 'desc' },
        include: {
          employee: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              position: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.dailyWorkReport.count({ where }),
    ]);

    return {
      data: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<any> {
    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            position: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundError('Daily work report not found');
    }

    return report;
  }

  /**
   * Get reports by employee ID
   */
  async getReportsByEmployeeId(
    employeeId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    return this.getAllReports(page, limit, { employeeId });
  }

  /**
   * Create a new daily work report
   */
  async createReport(data: {
    employeeId: string;
    reportDate: Date;
    workDescription: string;
    achievements?: string;
    challenges?: string;
    planForNextDay?: string;
    workHours?: number;
    status?: string;
    attachments?: string;
  }): Promise<any> {
    // Validate employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Check if report already exists for this date
    const reportDate = new Date(data.reportDate);
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingReport = await prisma.dailyWorkReport.findFirst({
      where: {
        employeeId: data.employeeId,
        reportDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existingReport) {
      throw new ValidationError('Báo cáo cho ngày này đã tồn tại');
    }

    const report = await prisma.dailyWorkReport.create({
      data: {
        employeeId: data.employeeId,
        reportDate: new Date(data.reportDate),
        workDescription: data.workDescription,
        achievements: data.achievements,
        challenges: data.challenges,
        planForNextDay: data.planForNextDay,
        workHours: data.workHours,
        status: (data.status as DailyWorkReportStatus) || DailyWorkReportStatus.SUBMITTED,
        attachments: data.attachments,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return report;
  }

  /**
   * Update a daily work report
   */
  async updateReport(
    id: string,
    data: {
      reportDate?: Date;
      workDescription?: string;
      achievements?: string;
      challenges?: string;
      planForNextDay?: string;
      workHours?: number;
      status?: string;
      attachments?: string;
    }
  ): Promise<any> {
    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Daily work report not found');
    }

    const updatedReport = await prisma.dailyWorkReport.update({
      where: { id },
      data: {
        ...(data.reportDate && { reportDate: data.reportDate }),
        ...(data.workDescription && { workDescription: data.workDescription }),
        ...(data.achievements !== undefined && { achievements: data.achievements }),
        ...(data.challenges !== undefined && { challenges: data.challenges }),
        ...(data.planForNextDay !== undefined && { planForNextDay: data.planForNextDay }),
        ...(data.workHours !== undefined && { workHours: data.workHours }),
        ...(data.status && { status: data.status as DailyWorkReportStatus }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updatedReport;
  }

  /**
   * Add supervisor comment to a report
   */
  async addSupervisorComment(
    id: string,
    supervisorId: string,
    comment: string,
    status?: string
  ): Promise<any> {
    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Daily work report not found');
    }

    const updatedReport = await prisma.dailyWorkReport.update({
      where: { id },
      data: {
        supervisorComment: comment,
        supervisorId,
        reviewedAt: new Date(),
        ...(status && { status: status as DailyWorkReportStatus }),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updatedReport;
  }

  /**
   * Delete a daily work report
   */
  async deleteReport(id: string): Promise<void> {
    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Daily work report not found');
    }

    await prisma.dailyWorkReport.delete({
      where: { id },
    });
  }

  /**
   * Get report statistics for an employee
   */
  async getReportStatistics(employeeId: string, month?: number, year?: number): Promise<any> {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const reports = await prisma.dailyWorkReport.findMany({
      where: {
        employeeId,
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalReports = reports.length;
    const submittedReports = reports.filter((r) => r.status === 'SUBMITTED').length;
    const reviewedReports = reports.filter((r) => r.status === 'REVIEWED').length;
    const approvedReports = reports.filter((r) => r.status === 'APPROVED').length;
    const rejectedReports = reports.filter((r) => r.status === 'REJECTED').length;
    const totalWorkHours = reports.reduce((sum, r) => sum + (r.workHours || 0), 0);

    return {
      month: targetMonth,
      year: targetYear,
      totalReports,
      submittedReports,
      reviewedReports,
      approvedReports,
      rejectedReports,
      totalWorkHours,
      averageWorkHours: totalReports > 0 ? totalWorkHours / totalReports : 0,
    };
  }
}

export default new DailyWorkReportService();

