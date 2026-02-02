import { Request, Response, NextFunction } from 'express';
import finishedProductService from '@services/finishedProductService';
import type { AuthenticatedRequest } from '@types';
import { getFileUrl } from '@middlewares/upload';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class FinishedProductController {
  async getAllFinishedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tenMay = req.query.tenMay as string | undefined;

      const result = await finishedProductService.getAllFinishedProducts(page, limit, tenMay);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinishedProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await finishedProductService.getFinishedProductById(id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFinishedProduct(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('finished-products', req.file.filename);
      }

      const product = await finishedProductService.createFinishedProduct(data, userId);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Tạo thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFinishedProduct(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('finished-products', req.file.filename);
      }

      const product = await finishedProductService.updateFinishedProduct(id, data, userId);

      res.json({
        success: true,
        data: product,
        message: 'Cập nhật thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFinishedProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await finishedProductService.deleteFinishedProduct(id);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTotalWeightByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.query.date as string;

      if (!date) {
        res.status(400).json({
          success: false,
          message: 'Ngày tháng là bắt buộc',
        });
        return;
      }

      const result = await finishedProductService.getTotalWeightByDate(date);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FinishedProductController();

