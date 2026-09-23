import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import sparePartService from '@services/sparePartService';
import { getFileUrl } from '@middlewares/upload';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';
import { z } from 'zod';

const sparePartCreateSchema = z.object({
  tenLinhKien: z.string().min(1, 'Tên linh kiện là bắt buộc'),
  loai: z.string().min(1, 'Loại là bắt buộc'),
  donVi: z.string().min(1, 'Đơn vị là bắt buộc'),
  soLuongTon: z.union([z.number(), z.string()]).optional(),
  giaNhap: z.union([z.number(), z.string()]).optional(),
  nhaCungCap: z.string().optional().nullable(),
  trangThai: z.string().optional().nullable(),
  ngayMua: z.string().optional().nullable(),
});

const sparePartUpdateSchema = z.object({
  tenLinhKien: z.string().min(1).optional(),
  loai: z.string().min(1).optional(),
  donVi: z.string().min(1).optional(),
  soLuongTon: z.union([z.number(), z.string()]).optional(),
  giaNhap: z.union([z.number(), z.string()]).optional(),
  nhaCungCap: z.string().optional().nullable(),
  trangThai: z.string().optional().nullable(),
  ngayMua: z.string().optional().nullable(),
});

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
      const parsed = sparePartCreateSchema.parse(req.body);
      const data = {
        tenLinhKien: parsed.tenLinhKien,
        loai: parsed.loai,
        donVi: parsed.donVi,
        soLuongTon: parsed.soLuongTon !== undefined && parsed.soLuongTon !== '' ? parseInt(String(parsed.soLuongTon), 10) : undefined,
        giaNhap: parsed.giaNhap !== undefined && parsed.giaNhap !== '' ? parseFloat(String(parsed.giaNhap)) : undefined,
        nhaCungCap: parsed.nhaCungCap ?? undefined,
        trangThai: parsed.trangThai ?? undefined,
        ngayMua: parsed.ngayMua ? new Date(parsed.ngayMua) : undefined,
        fileDinhKem: req.file ? getFileUrl('spare-parts', req.file.filename) : undefined,
      };

      const part = await sparePartService.create(data);
      if (part?.id) {
        try {
          await notificationService.notify(NotificationEvent.SPARE_PART_CREATED, {
            actorUserId: req.user?.id,
            entityId: part.id,
            metadata: { maLinhKien: (part as any)?.maLinhKien, tenLinhKien: (part as any)?.tenLinhKien },
          });
        } catch (e) { logger.warn('[SparePartController] notify SPARE_PART_CREATED failed', e); }
      }
      res.status(201).json({ success: true, data: part, message: 'Tạo linh kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = sparePartUpdateSchema.parse(req.body);
      const data: Record<string, unknown> = {
        tenLinhKien: parsed.tenLinhKien,
        loai: parsed.loai,
        donVi: parsed.donVi,
        nhaCungCap: parsed.nhaCungCap,
        trangThai: parsed.trangThai,
        ngayMua: parsed.ngayMua ? new Date(parsed.ngayMua) : undefined,
      };

      if (parsed.soLuongTon !== undefined && parsed.soLuongTon !== '') data.soLuongTon = parseInt(String(parsed.soLuongTon), 10);
      if (parsed.giaNhap !== undefined && parsed.giaNhap !== '') data.giaNhap = parseFloat(String(parsed.giaNhap));
      if (req.file) data.fileDinhKem = getFileUrl('spare-parts', req.file.filename);

      // Remove undefined values
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

      const part = await sparePartService.update(req.params.id, data);
      try {
        await notificationService.notify(NotificationEvent.SPARE_PART_UPDATED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maLinhKien: (part as any)?.maLinhKien, tenLinhKien: (part as any)?.tenLinhKien },
        });
      } catch (e) { logger.warn('[SparePartController] notify SPARE_PART_UPDATED failed', e); }
      res.json({ success: true, data: part, message: 'Cập nhật linh kiện thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let meta: Record<string, unknown> = {};
      try { const p = await sparePartService.getById(req.params.id); meta = { maLinhKien: (p as any)?.maLinhKien, tenLinhKien: (p as any)?.tenLinhKien }; } catch (_) { /* ignore */ }
      await sparePartService.delete(req.params.id);
      try {
        await notificationService.notify(NotificationEvent.SPARE_PART_DELETED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: meta,
        });
      } catch (e) { logger.warn('[SparePartController] notify SPARE_PART_DELETED failed', e); }
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
