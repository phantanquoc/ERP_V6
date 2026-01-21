import { Response, NextFunction } from 'express';
import materialEvaluationService from '@services/materialEvaluationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class MaterialEvaluationController {
  async getAllMaterialEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await materialEvaluationService.getAllMaterialEvaluations(page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialEvaluationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const evaluation = await materialEvaluationService.getMaterialEvaluationById(id);

      res.json({
        success: true,
        data: evaluation,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialEvaluationByMaChien(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { maChien } = req.params;
      const evaluation = await materialEvaluationService.getMaterialEvaluationByMaChien(maChien);

      res.json({
        success: true,
        data: evaluation,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateMaChien(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const maChien = await materialEvaluationService.generateMaChien();

      res.json({
        success: true,
        data: { maChien },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialEvaluation(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('material-evaluations', req.file.filename);
      }

      const evaluation = await materialEvaluationService.createMaterialEvaluation(data);

      res.status(201).json({
        success: true,
        data: evaluation,
        message: 'Material evaluation created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialEvaluation(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('material-evaluations', req.file.filename);
      }

      const evaluation = await materialEvaluationService.updateMaterialEvaluation(id, data);

      res.json({
        success: true,
        data: evaluation,
        message: 'Material evaluation updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await materialEvaluationService.deleteMaterialEvaluation(id);

      res.json({
        success: true,
        message: 'Material evaluation deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new MaterialEvaluationController();

