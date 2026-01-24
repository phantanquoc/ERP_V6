import { Response, NextFunction } from 'express';
import productionReportService from '@services/productionReportService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class ProductionReportController {
  async getAllProductionReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await productionReportService.getAllProductionReports(page, limit);

      res.json({
        success: true,
        data: result,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getProductionReportById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const report = await productionReportService.getProductionReportById(id);

      res.json({
        success: true,
        data: report,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createProductionReport(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('production-reports', req.file.filename);
      }

      const report = await productionReportService.createProductionReport(data, userId);

      res.status(201).json({
        success: true,
        data: report,
        message: 'Đã tạo báo cáo sản lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateProductionReport(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('production-reports', req.file.filename);
      }

      const report = await productionReportService.updateProductionReport(id, data, userId);

      res.json({
        success: true,
        data: report,
        message: 'Đã cập nhật báo cáo sản lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteProductionReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await productionReportService.deleteProductionReport(id);

      res.json({
        success: true,
        data: result,
        message: 'Đã xóa báo cáo sản lượng thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductionReportController();

