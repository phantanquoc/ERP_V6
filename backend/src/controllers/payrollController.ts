import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import payrollService from '@services/payrollService';

export class PayrollController {
  async getPayrollByMonthYear(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const payrolls = await payrollService.getPayrollByMonthYear(Number(month), Number(year));

      res.json({
        success: true,
        data: payrolls,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getPayrollDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payrollId = req.params.payrollId as string;

      const payroll = await payrollService.getPayrollDetail(payrollId);

      res.json({
        success: true,
        data: payroll,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdatePayroll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, month, year, ...payrollData } = req.body;

      if (!employeeId || !month || !year) {
        res.status(400).json({
          success: false,
          message: 'Employee ID, month, and year are required',
        });
        return;
      }

      const payroll = await payrollService.createOrUpdatePayroll(
        employeeId,
        month,
        year,
        payrollData
      );

      res.json({
        success: true,
        data: payroll,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async updatePayroll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payrollId = req.params.payrollId as string;
      const payrollData = req.body;

      const payroll = await payrollService.updatePayroll(payrollId, payrollData);

      res.json({
        success: true,
        data: payroll,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.month) filters.month = Number(req.query.month);
      if (req.query.year) filters.year = Number(req.query.year);
      const buffer = await payrollService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bang-luong-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async getPayrollSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await payrollService.getPayrollSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePayrollSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await payrollService.updatePayrollSettings(req.body);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendPayrollNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        res.status(400).json({ success: false, message: 'Month and year are required' });
        return;
      }
      const result = await payrollService.sendPayrollNotifications(Number(month), Number(year));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyPayroll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { month, year } = req.query;
      if (!month || !year) {
        res.status(400).json({ success: false, message: 'Month and year are required' });
        return;
      }
      const payroll = await payrollService.getMyPayroll(userId, Number(month), Number(year));
      res.json({ success: true, data: payroll });
    } catch (error) {
      next(error);
    }
  }
}

export default new PayrollController();

