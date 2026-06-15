import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenancePlanService from '@services/maintenancePlanService';
import { getFileUrl } from '@middlewares/upload';

class MaintenancePlanController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await maintenancePlanService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        machineSystemId: req.query.machineSystemId as string | undefined,
        nam: req.query.nam ? parseInt(req.query.nam as string, 10) : undefined,
        trangThai: req.query.trangThai as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await maintenancePlanService.getById(req.params.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async generateCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await maintenancePlanService.generateCode();
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      const plan = await maintenancePlanService.create({
        ...req.body,
        nam: parseInt(req.body.nam, 10),
        items,
        fileDinhKem: req.file ? getFileUrl('maintenance-plans', req.file.filename) : undefined,
      });
      res.status(201).json({ success: true, data: plan, message: 'Tạo kế hoạch bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = req.body.items
        ? (typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items)
        : undefined;
      const plan = await maintenancePlanService.update(req.params.id, {
        ...req.body,
        items,
        fileDinhKem: req.file ? getFileUrl('maintenance-plans', req.file.filename) : req.body.fileDinhKem,
      });
      res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch thành công' });
    } catch (error) {
      next(error);
    }
  }

  async toggleMonth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = parseInt(req.body.month, 10);
      const lanThu = req.body.lanThu ? parseInt(req.body.lanThu, 10) : 1;
      const ghiChu = req.body.ghiChu as string | undefined;
      const nguoiThucHien = req.body.nguoiThucHien as string | undefined;
      const item = await maintenancePlanService.toggleMonth(req.params.id, req.params.itemId, month, lanThu, ghiChu, nguoiThucHien);
      res.json({ success: true, data: item, message: 'Cập nhật tiến độ thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateLogNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const log = await maintenancePlanService.updateLogNote(req.params.logId, {
        ghiChu: req.body.ghiChu,
        nguoiThucHien: req.body.nguoiThucHien,
      });
      res.json({ success: true, data: log, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await maintenancePlanService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa kế hoạch bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MaintenancePlanController();