import { Request, Response, NextFunction } from 'express';
import dataEntryPagePositionService from '@services/dataEntryPagePositionService';

export class DataEntryPagePositionController {
  async listByPage(req: Request, res: Response, next: NextFunction) {
    try {
      const { pageKey } = req.params;
      const mappings = await dataEntryPagePositionService.listByPage(pageKey);

      res.json({
        success: true,
        data: mappings,
      });
    } catch (error) {
      next(error);
    }
  }

  async addMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const { pageKey } = req.params;
      const { positionId } = req.body;

      const mapping = await dataEntryPagePositionService.addMapping(
        pageKey,
        positionId
      );

      res.status(201).json({
        success: true,
        message: 'Đã gán vị trí cho trang nhập liệu',
        data: mapping,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const { pageKey, positionId } = req.params;

      await dataEntryPagePositionService.removeMapping(pageKey, positionId);

      res.json({
        success: true,
        message: 'Đã xóa vị trí khỏi trang nhập liệu',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DataEntryPagePositionController();
