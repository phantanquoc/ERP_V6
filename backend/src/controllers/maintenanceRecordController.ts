import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenanceRecordService from '@services/maintenanceRecordService';
import { getFileUrl } from '@middlewares/upload';

class MaintenanceRecordController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await maintenanceRecordService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        machineSystemId: req.query.machineSystemId as string | undefined,
        machineSystemDetailId: req.query.machineSystemDetailId as string | undefined,
        loai: req.query.loai as string | undefined,
        maintenancePlanId: req.query.maintenancePlanId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await maintenanceRecordService.getById(req.params.id);
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async generateCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await maintenanceRecordService.generateCode();
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await maintenanceRecordService.create({
        ...req.body,
        ngayThucHien: new Date(req.body.ngayThucHien),
        fileDinhKem: req.file ? getFileUrl('maintenance-records', req.file.filename) : undefined,
        userId: req.user?.id,
      });
      res.status(201).json({ success: true, data: record, message: 'Tạo biên bản thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await maintenanceRecordService.update(req.params.id, {
        ...req.body,
        ngayThucHien: req.body.ngayThucHien ? new Date(req.body.ngayThucHien) : undefined,
        fileDinhKem: req.file ? getFileUrl('maintenance-records', req.file.filename) : req.body.fileDinhKem,
      });
      res.json({ success: true, data: record, message: 'Cập nhật biên bản thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await maintenanceRecordService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa biên bản thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const wb = await maintenanceRecordService.exportExcel({
        machineSystemId: req.query.machineSystemId as string | undefined,
        loai: req.query.loai as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=bien-ban-bao-duong.xlsx');
      await wb.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new MaintenanceRecordController();