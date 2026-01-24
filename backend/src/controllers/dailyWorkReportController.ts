import { Response, NextFunction } from 'express';
import dailyWorkReportService from '@services/dailyWorkReportService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class DailyWorkReportController {
  /**
   * Get all daily work reports
   */
  async getAllReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const employeeId = req.query.employeeId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const status = req.query.status as string;

      const result = await dailyWorkReportService.getAllReports(page, limit, {
        employeeId,
        startDate,
        endDate,
        status,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   */
  async getReportById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const report = await dailyWorkReportService.getReportById(id);

      res.json({
        success: true,
        data: report,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reports by employee ID
   */
  async getReportsByEmployeeId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await dailyWorkReportService.getReportsByEmployeeId(employeeId, page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my reports (for authenticated employee)
   */
  async getMyReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await dailyWorkReportService.getReportsByEmployeeId(employee.id, page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new daily work report
   */
  async createReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      const report = await dailyWorkReportService.createReport({
        ...req.body,
        employeeId: employee.id,
      });

      res.status(201).json({
        success: true,
        data: report,
        message: 'Báo cáo công việc đã được tạo thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a daily work report
   */
  async updateReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const report = await dailyWorkReportService.updateReport(id, req.body);

      res.json({
        success: true,
        data: report,
        message: 'Báo cáo công việc đã được cập nhật',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add supervisor comment
   */
  async addSupervisorComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { comment, status } = req.body;
      const supervisorId = req.user?.id;

      if (!supervisorId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const report = await dailyWorkReportService.addSupervisorComment(id, supervisorId, comment, status);

      res.json({
        success: true,
        data: report,
        message: 'Nhận xét đã được thêm',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a daily work report
   */
  async deleteReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await dailyWorkReportService.deleteReport(id);

      res.json({
        success: true,
        message: 'Báo cáo công việc đã được xóa',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const statistics = await dailyWorkReportService.getReportStatistics(employee.id, month, year);

      res.json({
        success: true,
        data: statistics,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new DailyWorkReportController();

