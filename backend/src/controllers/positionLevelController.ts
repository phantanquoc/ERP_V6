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
      const { positionId } = req.params;
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
      const { id } = req.params;
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
      const { positionId } = req.params;
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
      const { id } = req.params;
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
      const { id } = req.params;
      await positionLevelService.deleteLevel(id);

      res.json({
        success: true,
        message: 'Position level deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new PositionLevelController();

