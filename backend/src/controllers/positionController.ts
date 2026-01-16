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
      const { id } = req.params;
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
      const { id } = req.params;
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
      const { id } = req.params;
      await positionService.deletePosition(id);

      res.json({
        success: true,
        message: 'Position deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new PositionController();

