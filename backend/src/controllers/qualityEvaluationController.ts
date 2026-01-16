import { Response, NextFunction } from 'express';
import qualityEvaluationService from '@services/qualityEvaluationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

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

  async createQualityEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const evaluation = await qualityEvaluationService.createQualityEvaluation(req.body, userId);

      res.status(201).json({
        success: true,
        data: evaluation,
        message: 'Đã tạo đánh giá chất lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateQualityEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const evaluation = await qualityEvaluationService.updateQualityEvaluation(id, req.body, userId);

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

