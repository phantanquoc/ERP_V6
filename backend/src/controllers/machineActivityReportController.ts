import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineActivityReportService from '@services/machineActivityReportService';
import { getFileUrl } from '@middlewares/upload';

class MachineActivityReportController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await machineActivityReportService.getAllReports(page, limit, search);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await machineActivityReportService.getReportById(req.params.id);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        viTri: req.body.viTri,
        tenHeThong: req.body.tenHeThong,
        tongSoLuong: parseInt(req.body.tongSoLuong, 10),
        soLuongHoatDong: parseInt(req.body.soLuongHoatDong, 10),
        soLuongNgung: parseInt(req.body.soLuongNgung, 10),
        nguyenNhan: req.body.nguyenNhan,
        nguoiBaoCao: req.body.nguoiBaoCao,
        fileDinhKem: req.file ? getFileUrl('machine-reports', req.file.filename) : undefined,
      };

      const report = await machineActivityReportService.createReport(data);
      res.status(201).json({ success: true, data: report, message: 'Tạo báo cáo hoạt động máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        viTri: req.body.viTri,
        tenHeThong: req.body.tenHeThong,
        nguyenNhan: req.body.nguyenNhan,
        nguoiBaoCao: req.body.nguoiBaoCao,
      };

      if (req.body.tongSoLuong !== undefined) data.tongSoLuong = parseInt(req.body.tongSoLuong, 10);
      if (req.body.soLuongHoatDong !== undefined) data.soLuongHoatDong = parseInt(req.body.soLuongHoatDong, 10);
      if (req.body.soLuongNgung !== undefined) data.soLuongNgung = parseInt(req.body.soLuongNgung, 10);
      if (req.file) data.fileDinhKem = getFileUrl('machine-reports', req.file.filename);

      const report = await machineActivityReportService.updateReport(req.params.id, data);
      res.json({ success: true, data: report, message: 'Cập nhật báo cáo hoạt động máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await machineActivityReportService.deleteReport(req.params.id);
      res.json({ success: true, message: 'Xóa báo cáo hoạt động máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workbook = await machineActivityReportService.exportToExcel();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bao-cao-hoat-dong-may-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineActivityReportController();
