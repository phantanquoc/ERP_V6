import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@types';
import positionResponsibilityService from '@services/positionResponsibilityService';
import { ApiResponse } from '@types';

export class PositionResponsibilityController {
  async getAllResponsibilities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const responsibilities = await positionResponsibilityService.getAllResponsibilities(positionId);

      res.json({
        success: true,
        data: responsibilities,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getResponsibilityById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const responsibility = await positionResponsibilityService.getResponsibilityById(id);

      res.json({
        success: true,
        data: responsibility,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createResponsibility(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const responsibility = await positionResponsibilityService.createResponsibility(positionId, req.body);

      res.status(201).json({
        success: true,
        data: responsibility,
        message: 'Responsibility created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateResponsibility(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const responsibility = await positionResponsibilityService.updateResponsibility(id, req.body);

      res.json({
        success: true,
        data: responsibility,
        message: 'Responsibility updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteResponsibility(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await positionResponsibilityService.deleteResponsibility(id);

      res.json({
        success: true,
        message: 'Responsibility deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async copyResponsibilitiesFrom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const sourcePositionId = req.params.sourcePositionId as string;
      const responsibilities = await positionResponsibilityService.copyResponsibilitiesFrom(positionId, sourcePositionId);

      res.status(201).json({
        success: true,
        data: responsibilities,
        message: `Đã sao chép ${responsibilities.length} tiêu chí đánh giá từ chức vụ nguồn`,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async rescaleResponsibilityWeights(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const responsibilities = await positionResponsibilityService.rescaleResponsibilityWeights(positionId);
      res.json({
        success: true,
        data: responsibilities,
        message: 'Đã chuẩn hóa tổng trọng số về 100%',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getResponsibilityUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const usage = await positionResponsibilityService.getResponsibilityUsage(id);
      res.json({ success: true, data: usage } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async exportXlsx(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.query.positionId as string | undefined;
      const buffer = await positionResponsibilityService.exportResponsibilities(positionId);
      const suffix = positionId ? `-pos-${positionId.slice(0, 8)}` : '';
      const filename = `tieu-chi-danh-gia${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new PositionResponsibilityController();

