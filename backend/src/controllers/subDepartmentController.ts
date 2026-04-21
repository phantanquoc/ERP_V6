import { Response, NextFunction } from 'express';
import subDepartmentService from '@services/subDepartmentService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class SubDepartmentController {
  async getAllSubDepartments(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subDepartments = await subDepartmentService.getAllSubDepartments();

      res.json({
        success: true,
        data: subDepartments,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSubDepartmentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const subDepartment = await subDepartmentService.getSubDepartmentById(id);

      res.json({
        success: true,
        data: subDepartment,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new SubDepartmentController();
