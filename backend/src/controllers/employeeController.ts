import { Response, NextFunction } from 'express';
import employeeService from '@services/employeeService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { Request } from 'express';

export class EmployeeController {
  async getAllEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || undefined;

      // Route guard (ProtectedModuleRoute + ProtectedSubRoute) đã kiểm soát quyền truy cập.
      // Employee list là chức năng của phòng nhân sự — cần thấy TOÀN BỘ nhân viên.
      // ADMIN có thể filter theo departmentId qua query param nếu muốn.
      let departmentId: string | undefined;
      if (req.user?.role === 'ADMIN') {
        departmentId = (req.query.departmentId as string) || undefined;
      }

      const result = await employeeService.getAllEmployees(page, limit, departmentId, search);

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
      const id = req.params.id as string;
      const employee = await employeeService.getEmployeeById(id as string);

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
      const code = req.params.code as string;
      const employee = await employeeService.getEmployeeByCode(code as string);

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
      const id = req.params.id as string;
      const employee = await employeeService.updateEmployee(id as string, req.body);

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
      const id = req.params.id as string;
      await employeeService.deleteEmployee(id as string);

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

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await employeeService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-nhan-vien-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeController();

