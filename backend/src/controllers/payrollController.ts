import { Request, Response } from 'express';
import payrollService from '@services/payrollService';

export class PayrollController {
  async getPayrollByMonthYear(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching payrolls:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching payrolls',
      });
      return;
    }
  }

  async getPayrollDetail(req: Request, res: Response): Promise<void> {
    try {
      const payrollId = req.params.payrollId as string;

      const payroll = await payrollService.getPayrollDetail(payrollId);

      res.json({
        success: true,
        data: payroll,
      });
      return;
    } catch (error) {
      console.error('Error fetching payroll detail:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching payroll detail',
      });
      return;
    }
  }

  async createOrUpdatePayroll(req: Request, res: Response): Promise<void> {
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
      console.error('Error creating/updating payroll:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error creating/updating payroll',
      });
      return;
    }
  }

  async updatePayroll(req: Request, res: Response): Promise<void> {
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
      console.error('Error updating payroll:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error updating payroll',
      });
      return;
    }
  }
}

export default new PayrollController();

