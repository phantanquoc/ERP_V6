import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import faultTemplateService from '@services/faultTemplateService';
import { getFileUrl } from '@middlewares/upload';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
};

class FaultTemplateController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await faultTemplateService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        search: req.query.search as string | undefined,
        machineSystemId: req.query.machineSystemId as string | undefined,
        machineSystemDetailId: req.query.machineSystemDetailId as string | undefined,
        mucDo: req.query.mucDo as string | undefined,
        trangThai: req.query.trangThai as string | undefined,
        hoatDong: parseBoolean(req.query.hoatDong),
        activeOnly: parseBoolean(req.query.activeOnly),
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await faultTemplateService.getById(req.params.id);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await faultTemplateService.create({
        ...req.body,
        hoatDong: parseBoolean(req.body.hoatDong),
        fileDinhKem: req.file ? getFileUrl('fault-templates', req.file.filename) : undefined,
      });
      res.status(201).json({ success: true, data: template, message: 'Tạo mẫu lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await faultTemplateService.update(req.params.id, {
        ...req.body,
        hoatDong: parseBoolean(req.body.hoatDong),
        fileDinhKem: req.file ? getFileUrl('fault-templates', req.file.filename) : undefined,
      });
      res.json({ success: true, data: template, message: 'Cập nhật mẫu lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await faultTemplateService.deactivate(req.params.id);
      res.json({ success: true, data: template, message: 'Ngừng hoạt động mẫu lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await faultTemplateService.delete(req.params.id);
      res.json({ success: true, data: template, message: 'Xóa mẫu lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new FaultTemplateController();
