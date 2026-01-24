import { Response, NextFunction } from 'express';
import materialStandardService from '@services/materialStandardService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class MaterialStandardController {
  async getAllMaterialStandards(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await materialStandardService.getAllMaterialStandards(page, limit);

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

  async getMaterialStandardById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const standard = await materialStandardService.getMaterialStandardById(id);

      res.json({
        success: true,
        data: standard,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialStandard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const standard = await materialStandardService.createMaterialStandard(req.body);

      res.status(201).json({
        success: true,
        data: standard,
        message: 'Material standard created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialStandard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const standard = await materialStandardService.updateMaterialStandard(id, req.body);

      res.json({
        success: true,
        data: standard,
        message: 'Material standard updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialStandard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await materialStandardService.deleteMaterialStandard(id);

      res.json({
        success: true,
        message: 'Material standard deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateMaterialStandardCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await materialStandardService.generateMaterialStandardCode();

      res.json({
        success: true,
        data: { code },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new MaterialStandardController();

