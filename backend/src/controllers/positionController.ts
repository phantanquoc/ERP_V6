import { Response, NextFunction } from 'express';
import positionService from '@services/positionService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class PositionController {
  async getAllPositions(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positions = await positionService.getAllPositions();

      res.json({
        success: true,
        data: positions,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getPositionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const position = await positionService.getPositionById(id);

      res.json({
        success: true,
        data: position,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createPosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const position = await positionService.createPosition(req.body);

      res.status(201).json({
        success: true,
        data: position,
        message: 'Position created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updatePosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const position = await positionService.updatePosition(id, req.body);

      res.json({
        success: true,
        data: position,
        message: 'Position updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deletePosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await positionService.deletePosition(id);

      res.json({
        success: true,
        message: 'Position deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionIds, category } = req.body;
      if (!Array.isArray(positionIds) || positionIds.length === 0) {
        res.status(400).json({ success: false, message: 'Danh sách vị trí không được để trống' });
        return;
      }
      const count = await positionService.bulkUpdateCategory(positionIds, category);
      res.json({
        success: true,
        data: { count },
        message: `Đã cập nhật danh mục cho ${count} vị trí`,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getPositionUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const usage = await positionService.getPositionUsage(id);
      res.json({ success: true, data: usage } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async exportXlsx(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await positionService.exportPositions();
      const filename = `vi-tri-cong-viec-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

export default new PositionController();

