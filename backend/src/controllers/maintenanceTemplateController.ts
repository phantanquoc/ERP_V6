import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenanceTemplateService from '@services/maintenanceTemplateService';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
};

class MaintenanceTemplateController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await maintenanceTemplateService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 50,
        search: req.query.search as string | undefined,
        machineSystemDetailId: req.query.machineSystemDetailId as string | undefined,
        machineSystemId: req.query.machineSystemId as string | undefined,
        hoatDong: parseBoolean(req.query.hoatDong),
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await maintenanceTemplateService.getById(req.params.id);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await maintenanceTemplateService.create(req.body);
      res.status(201).json({ success: true, data: template, message: 'Tạo template bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await maintenanceTemplateService.update(req.params.id, {
        ...req.body,
        hoatDong: parseBoolean(req.body.hoatDong),
      });
      res.json({ success: true, data: template, message: 'Cập nhật template thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await maintenanceTemplateService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa template thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MaintenanceTemplateController();
