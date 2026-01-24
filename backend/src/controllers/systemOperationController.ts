import { Response, NextFunction } from 'express';
import systemOperationService from '@services/systemOperationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class SystemOperationController {
  async getAllSystemOperations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tenMay = req.query.tenMay as string;

      const result = await systemOperationService.getAllSystemOperations(page, limit, tenMay);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSystemOperationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const operation = await systemOperationService.getSystemOperationById(id);

      res.json({
        success: true,
        data: operation,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createBulkSystemOperations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { maChien, thoiGianChien } = req.body;
      const operations = await systemOperationService.createBulkSystemOperations(maChien, thoiGianChien);

      res.status(201).json({
        success: true,
        data: operations,
        message: 'Đã tạo thông số vận hành cho tất cả máy',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSystemOperationsByMaChien(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const maChien = req.params.maChien as string;
      const operations = await systemOperationService.getSystemOperationsByMaChien(maChien);

      res.json({
        success: true,
        data: operations,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const operation = await systemOperationService.createSystemOperation(req.body);

      res.status(201).json({
        success: true,
        data: operation,
        message: 'System operation created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const operation = await systemOperationService.updateSystemOperation(id, req.body);

      res.json({
        success: true,
        data: operation,
        message: 'System operation updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await systemOperationService.deleteSystemOperation(id);

      res.json({
        success: true,
        message: 'System operation deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new SystemOperationController();

