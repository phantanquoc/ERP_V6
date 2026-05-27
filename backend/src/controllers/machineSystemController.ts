import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineSystemService from '@services/machineSystemService';
import { getFileUrl } from '@middlewares/upload';

class MachineSystemController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await machineSystemService.getAllMachineSystems(page, limit, search);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = await machineSystemService.getMachineSystemById(req.params.id);
      res.json({ success: true, data: system });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        khuVuc: req.body.khuVuc,
        viTri: req.body.viTri,
        maHeThong: req.body.maHeThong,
        tenHeThong: req.body.tenHeThong,
        chucNang: req.body.chucNang ?? '',
        maThietBi: req.body.maThietBi,
        tenThietBi: req.body.tenThietBi,
        nhiemVu: req.body.nhiemVu,
        maNguoiThucHien: req.body.maNguoiThucHien,
        nguoiThucHien: req.body.nguoiThucHien,
        fileDinhKem: req.file ? getFileUrl('machine-systems', req.file.filename) : undefined,
      };

      const system = await machineSystemService.createMachineSystem(data);
      res.status(201).json({ success: true, data: system, message: 'Tạo hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        khuVuc: req.body.khuVuc,
        viTri: req.body.viTri,
        maHeThong: req.body.maHeThong,
        tenHeThong: req.body.tenHeThong,
        chucNang: req.body.chucNang,
        maThietBi: req.body.maThietBi,
        tenThietBi: req.body.tenThietBi,
        nhiemVu: req.body.nhiemVu,
        maNguoiThucHien: req.body.maNguoiThucHien,
        nguoiThucHien: req.body.nguoiThucHien,
      };

      if (req.file) {
        data.fileDinhKem = getFileUrl('machine-systems', req.file.filename);
      }

      const system = await machineSystemService.updateMachineSystem(req.params.id, data);
      res.json({ success: true, data: system, message: 'Cập nhật hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await machineSystemService.deleteMachineSystem(req.params.id);
      res.json({ success: true, message: 'Xóa hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workbook = await machineSystemService.exportToExcel();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-he-thong-may-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineSystemController();
