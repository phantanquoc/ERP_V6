import { Response, NextFunction } from 'express';
import materialEvaluationService from '@services/materialEvaluationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';
import { ValidationError } from '@utils/errors';
import prisma from '@config/database';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class MaterialEvaluationController {
  async getAllMaterialEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const nguoiThucHien =
        typeof req.query.nguoiThucHien === 'string' && req.query.nguoiThucHien.trim().length > 0
          ? req.query.nguoiThucHien.trim()
          : undefined;
      const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
      const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
      const caRaw = parseInt(req.query.ca as string);
      const ca = !isNaN(caRaw) ? caRaw : undefined;
      const thoiGianChienFrom = typeof req.query.thoiGianChienFrom === 'string' ? req.query.thoiGianChienFrom : undefined;
      const thoiGianChienTo = typeof req.query.thoiGianChienTo === 'string' ? req.query.thoiGianChienTo : undefined;

      const filters =
        nguoiThucHien || dateFrom || dateTo || ca != null || thoiGianChienFrom || thoiGianChienTo
          ? { nguoiThucHien, dateFrom, dateTo, ca, thoiGianChienFrom, thoiGianChienTo }
          : undefined;

      const result = await materialEvaluationService.getAllMaterialEvaluations(page, limit, filters);

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
      const id = req.params.id as string;
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
      const maChien = req.params.maChien as string;
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

      let userId: string | undefined;
      if (req.isKioskDevice) {
        const operatorId = req.kioskOperatorId;
        if (!operatorId) throw new ValidationError('Thiếu x-operator-id header');
        const employee = await prisma.employee.findUnique({ where: { id: operatorId } });
        if (!employee) throw new ValidationError('Người thực hiện không tồn tại');
        userId = operatorId;
      } else {
        userId = req.user?.id;
      }

      const evaluation = await materialEvaluationService.createMaterialEvaluation(data, userId);

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
      const id = req.params.id as string;
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

  async getDeleteInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const info = await materialEvaluationService.getMaterialEvaluationDeleteInfo(id);

      res.json({
        success: true,
        data: info,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const counts = await materialEvaluationService.deleteMaterialEvaluation(id);

      res.json({
        success: true,
        message: 'Xóa đánh giá vật liệu thành công',
        data: counts,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new MaterialEvaluationController();

