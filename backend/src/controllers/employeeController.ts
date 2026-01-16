import { Response, NextFunction } from 'express';
import employeeService from '@services/employeeService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class EmployeeController {
  async getAllEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await employeeService.getAllEmployees(page, limit);

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

  async getEmployeeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeService.getEmployeeById(id);

      res.json({
        success: true,
        data: employee,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeByCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const employee = await employeeService.getEmployeeByCode(code);

      res.json({
        success: true,
        data: employee,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const employee = await employeeService.createEmployee(req.body);

      res.status(201).json({
        success: true,
        data: employee,
        message: 'Employee created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeService.updateEmployee(id, req.body);

      res.json({
        success: true,
        data: employee,
        message: 'Employee updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await employeeService.deleteEmployee(id);

      res.json({
        success: true,
        message: 'Employee deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateEmployeeCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeCode = await employeeService.generateEmployeeCode();

      res.json({
        success: true,
        data: { employeeCode },
        message: 'Employee code generated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeController();

