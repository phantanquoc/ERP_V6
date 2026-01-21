import { Response, NextFunction } from 'express';
import qualityEvaluationService from '@services/qualityEvaluationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class QualityEvaluationController {
  async getAllQualityEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tenMay = req.query.tenMay as string;

      const result = await qualityEvaluationService.getAllQualityEvaluations(page, limit, tenMay);

      res.json({
        success: true,
        data: result,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getQualityEvaluationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const evaluation = await qualityEvaluationService.getQualityEvaluationById(id);

      res.json({
        success: true,
        data: evaluation,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createQualityEvaluation(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('quality-evaluations', req.file.filename);
      }

      const evaluation = await qualityEvaluationService.createQualityEvaluation(data, userId);

      res.status(201).json({
        success: true,
        data: evaluation,
        message: 'Đã tạo đánh giá chất lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateQualityEvaluation(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('quality-evaluations', req.file.filename);
      }

      const evaluation = await qualityEvaluationService.updateQualityEvaluation(id, data, userId);

      res.json({
        success: true,
        data: evaluation,
        message: 'Đã cập nhật đánh giá chất lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteQualityEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await qualityEvaluationService.deleteQualityEvaluation(id);

      res.json({
        success: true,
        data: result,
        message: 'Đã xóa đánh giá chất lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new QualityEvaluationController();

