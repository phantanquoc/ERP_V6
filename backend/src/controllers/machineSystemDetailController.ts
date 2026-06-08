import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineSystemDetailService from '@services/machineSystemDetailService';
import { getFileUrl } from '@middlewares/upload';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
};

class MachineSystemDetailController {
  async generateCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await machineSystemDetailService.generateCode(req.query.loaiChiTiet as string);
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async getTree(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await machineSystemDetailService.getTree(req.query.machineSystemId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await machineSystemDetailService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        search: req.query.search as string | undefined,
        machineSystemId: req.query.machineSystemId as string | undefined,
        loaiChiTiet: req.query.loaiChiTiet as string | undefined,
        hoatDong: parseBoolean(req.query.hoatDong),
        trangThai: req.query.trangThai as string | undefined,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.getById(req.params.id);
      res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.create({
        ...req.body,
        parentDetailId: req.body.parentDetailId || null,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu, 10) : undefined,
        hoatDong: parseBoolean(req.body.hoatDong),
        fileDinhKem: req.file ? getFileUrl('machine-system-details', req.file.filename) : undefined,
      });
      res.status(201).json({ success: true, data: detail, message: 'Tạo chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.update(req.params.id, {
        ...req.body,
        parentDetailId: req.body.parentDetailId === '' ? null : req.body.parentDetailId,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu, 10) : undefined,
        hoatDong: parseBoolean(req.body.hoatDong),
        fileDinhKem: req.file ? getFileUrl('machine-system-details', req.file.filename) : undefined,
      });
      res.json({ success: true, data: detail, message: 'Cập nhật chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.deactivate(req.params.id);
      res.json({ success: true, data: detail, message: 'Ngừng hoạt động chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await machineSystemDetailService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineSystemDetailController();
