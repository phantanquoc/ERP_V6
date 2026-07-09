import { Response, NextFunction } from 'express';
import positionLevelService from '@services/positionLevelService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class PositionLevelController {
  async getAllLevels(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const levels = await positionLevelService.getAllLevels();

      res.json({
        success: true,
        data: levels,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getAllLevelsByPosition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const levels = await positionLevelService.getAllLevelsByPosition(positionId);

      res.json({
        success: true,
        data: levels,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getLevelById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const level = await positionLevelService.getLevelById(id);

      res.json({
        success: true,
        data: level,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createLevel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.params.positionId as string;
      const level = await positionLevelService.createLevel(positionId, req.body);

      res.status(201).json({
        success: true,
        data: level,
        message: 'Position level created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateLevel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const level = await positionLevelService.updateLevel(id, req.body);

      res.json({
        success: true,
        data: level,
        message: 'Position level updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteLevel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await positionLevelService.deleteLevel(id);

      res.json({
        success: true,
        message: 'Position level deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getLevelUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const usage = await positionLevelService.getLevelUsage(id);
      res.json({ success: true, data: usage } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async exportXlsx(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const positionId = req.query.positionId as string | undefined;
      const buffer = await positionLevelService.exportLevels(positionId);
      const suffix = positionId ? `-pos-${positionId.slice(0, 8)}` : '';
      const filename = `bac-luong-vi-tri${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

export default new PositionLevelController();

