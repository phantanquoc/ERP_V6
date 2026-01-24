import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@types';
import positionResponsibilityService from '@services/positionResponsibilityService';
import { ApiResponse } from '@types';

export class PositionResponsibilityController {
  async getAllResponsibilities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId } = req.params;
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
      const { positionId } = req.params;
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
}

export default new PositionResponsibilityController();

