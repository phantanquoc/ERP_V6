import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import sparePartService from '@services/sparePartService';
import { getFileUrl } from '@middlewares/upload';

class SparePartController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const loai = req.query.loai as string | undefined;

      const result = await sparePartService.getAll(page, limit, search, trangThai, loai);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await sparePartService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const part = await sparePartService.getById(req.params.id);
      res.json({ success: true, data: part });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        tenLinhKien: req.body.tenLinhKien,
        loai: req.body.loai,
        donVi: req.body.donVi,
        soLuongTon: req.body.soLuongTon !== undefined ? parseInt(req.body.soLuongTon) : undefined,
        giaNhap: req.body.giaNhap !== undefined ? parseFloat(req.body.giaNhap) : undefined,
        nhaCungCap: req.body.nhaCungCap,
        trangThai: req.body.trangThai,
        ngayMua: req.body.ngayMua ? new Date(req.body.ngayMua) : undefined,
        fileDinhKem: req.file ? getFileUrl('spare-parts', req.file.filename) : undefined,
      };

      const part = await sparePartService.create(data);
      res.status(201).json({ success: true, data: part, message: 'Tạo linh kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        tenLinhKien: req.body.tenLinhKien,
        loai: req.body.loai,
        donVi: req.body.donVi,
        nhaCungCap: req.body.nhaCungCap,
        trangThai: req.body.trangThai,
        ngayMua: req.body.ngayMua ? new Date(req.body.ngayMua) : undefined,
      };

      if (req.body.soLuongTon !== undefined) data.soLuongTon = parseInt(req.body.soLuongTon);
      if (req.body.giaNhap !== undefined) data.giaNhap = parseFloat(req.body.giaNhap);
      if (req.file) data.fileDinhKem = getFileUrl('spare-parts', req.file.filename);

      // Remove undefined values
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

      const part = await sparePartService.update(req.params.id, data);
      res.json({ success: true, data: part, message: 'Cập nhật linh kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await sparePartService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa linh kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        trangThai: req.query.trangThai as string | undefined,
        loai: req.query.loai as string | undefined,
      };
      const workbook = await sparePartService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-linh-kien-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new SparePartController();
