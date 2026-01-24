import { Response, NextFunction } from 'express';
import departmentService from '@services/departmentService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class DepartmentController {
  async getAllDepartments(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await departmentService.getAllDepartments();

      res.json({
        success: true,
        data: departments,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const department = await departmentService.getDepartmentById(id as string);

      res.json({
        success: true,
        data: department,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await departmentService.createDepartment(req.body);

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const department = await departmentService.updateDepartment(id as string, req.body);

      res.json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await departmentService.deleteDepartment(id as string);

      res.json({
        success: true,
        message: 'Department deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new DepartmentController();

