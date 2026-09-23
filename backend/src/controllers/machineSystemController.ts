import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineSystemService from '@services/machineSystemService';
import { getFileUrl } from '@middlewares/upload';
import { MachineStatus, MachineSystemCategory } from '@prisma/client';
import { z } from 'zod';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';


const machineSystemCreateSchema = z.object({
  khuVuc: z.string().min(1, 'khuVuc là bắt buộc'),
  viTri: z.string().min(1, 'viTri là bắt buộc'),
  maHeThong: z.string().min(1, 'maHeThong là bắt buộc'),
  tenHeThong: z.string().min(1, 'tenHeThong là bắt buộc'),
  chucNang: z.string().optional(),
  loaiHeThong: z.nativeEnum(MachineSystemCategory).optional(),
  maThietBi: z.string().optional().nullable(),
  tenThietBi: z.string().optional().nullable(),
  nhiemVu: z.string().optional().nullable(),
  maNguoiThucHien: z.string().optional().nullable(),
  nguoiThucHien: z.string().optional().nullable(),
  hoatDong: z.union([z.boolean(), z.string()]).optional(),
});

const machineSystemUpdateSchema = z.object({
  khuVuc: z.string().min(1).optional(),
  viTri: z.string().min(1).optional(),
  maHeThong: z.string().min(1).optional(),
  tenHeThong: z.string().min(1).optional(),
  chucNang: z.string().optional(),
  loaiHeThong: z.nativeEnum(MachineSystemCategory).optional(),
  maThietBi: z.string().optional().nullable(),
  tenThietBi: z.string().optional().nullable(),
  nhiemVu: z.string().optional().nullable(),
  maNguoiThucHien: z.string().optional().nullable(),
  nguoiThucHien: z.string().optional().nullable(),
  hoatDong: z.union([z.boolean(), z.string()]).optional(),
});

const cloneSchema = z.object({
  maHeThong: z.string().min(1, 'maHeThong là bắt buộc'),
  tenHeThong: z.string().min(1, 'tenHeThong là bắt buộc'),
  khuVuc: z.string().optional(),
  viTri: z.string().optional(),
});

const statusSchema = z.object({
  trangThaiMoi: z.nativeEnum(MachineStatus),
  nguyenNhan: z.string().min(1, 'nguyenNhan là bắt buộc'),
  ghiChu: z.string().optional(),
});

function parseHoatDong(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  return v === true || v === 'true';
}

class MachineSystemController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const filters = {
        search,
        hoatDong: req.query.hoatDong !== undefined ? req.query.hoatDong === 'true' : undefined,
        trangThai: req.query.trangThai as MachineStatus | undefined,
        loaiHeThong: req.query.loaiHeThong as MachineSystemCategory | undefined,
        maHeThongPrefix: req.query.maHeThongPrefix as string | undefined,
        sortBy: req.query.sortBy as 'maHeThong' | 'tenHeThong' | 'createdAt' | 'updatedAt' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await machineSystemService.getAllMachineSystems(page, limit, filters);
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
      const parsed = machineSystemCreateSchema.parse(req.body);
      const data = {
        khuVuc: parsed.khuVuc,
        viTri: parsed.viTri,
        maHeThong: parsed.maHeThong,
        tenHeThong: parsed.tenHeThong,
        chucNang: parsed.chucNang ?? '',
        loaiHeThong: (parsed.loaiHeThong as MachineSystemCategory) || MachineSystemCategory.KHAC,
        maThietBi: parsed.maThietBi ?? undefined,
        tenThietBi: parsed.tenThietBi ?? undefined,
        nhiemVu: parsed.nhiemVu ?? undefined,
        maNguoiThucHien: parsed.maNguoiThucHien ?? undefined,
        nguoiThucHien: parsed.nguoiThucHien ?? undefined,
        hoatDong: parseHoatDong(parsed.hoatDong),
        fileDinhKem: req.file ? getFileUrl('machine-systems', req.file.filename) : undefined,
      };

      const system = await machineSystemService.createMachineSystem(data);
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_CREATED, {
          actorUserId: req.user?.id,
          entityId: system.id,
          metadata: { maHeThong: system.maHeThong, tenHeThong: system.tenHeThong },
        });
      } catch (e) { logger.warn('[MachineSystemController] notify MACHINE_SYSTEM_CREATED failed', e); }
      res.status(201).json({ success: true, data: system, message: 'Tạo hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Strip trangThai — status changes must go through POST /:id/status
      const { trangThai: _stripped, ...raw } = req.body as Record<string, unknown> & { trangThai?: unknown };
      const parsed = machineSystemUpdateSchema.parse(raw);
      const data: Record<string, unknown> = {};
      for (const k of ['khuVuc','viTri','maHeThong','tenHeThong','chucNang','loaiHeThong','maThietBi','tenThietBi','nhiemVu','maNguoiThucHien','nguoiThucHien'] as const) {
        if ((parsed as Record<string, unknown>)[k] !== undefined) data[k] = (parsed as Record<string, unknown>)[k];
      }
      if (parsed.hoatDong !== undefined) data.hoatDong = parseHoatDong(parsed.hoatDong);
      if (req.file) data.fileDinhKem = getFileUrl('machine-systems', req.file.filename);

      const system = await machineSystemService.updateMachineSystem(req.params.id, data);
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_UPDATED, {
          actorUserId: req.user?.id,
          entityId: system.id,
          metadata: { maHeThong: system.maHeThong, tenHeThong: system.tenHeThong },
        });
      } catch (e) { logger.warn('[MachineSystemController] notify MACHINE_SYSTEM_UPDATED failed', e); }
      res.json({ success: true, data: system, message: 'Cập nhật hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let deletedInfo: { maHeThong?: string; tenHeThong?: string } = {};
      try {
        const existing = await machineSystemService.getMachineSystemById(req.params.id);
        deletedInfo = { maHeThong: existing.maHeThong, tenHeThong: existing.tenHeThong };
      } catch (_) { /* ignore */ }
      await machineSystemService.deleteMachineSystem(req.params.id);
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_DELETED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: deletedInfo,
        });
      } catch (e) { logger.warn('[MachineSystemController] notify MACHINE_SYSTEM_DELETED failed', e); }
      res.json({ success: true, message: 'Xóa hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getNextCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const loaiHeThong = req.query.loaiHeThong as MachineSystemCategory;
      if (!loaiHeThong || !Object.values(MachineSystemCategory).includes(loaiHeThong)) {
        res.status(400).json({ success: false, message: 'Loại hệ thống không hợp lệ' });
        return;
      }
      const code = await machineSystemService.getNextCode(loaiHeThong);
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async getDistinctFields(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [khuVuc, viTri] = await Promise.all([
        machineSystemService.getDistinctField('khuVuc'),
        machineSystemService.getDistinctField('viTri'),
      ]);
      res.json({ success: true, data: { khuVuc, viTri } });
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

  async clone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { maHeThong, tenHeThong, khuVuc, viTri } = cloneSchema.parse(req.body);

      const result = await machineSystemService.clone(req.params.id, { maHeThong, tenHeThong, khuVuc, viTri });
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_CLONED, {
          actorUserId: req.user?.id,
          entityId: (result as any)?.id ?? req.params.id,
          metadata: { maHeThong, tenHeThong, sourceMaHeThong: req.params.id },
        });
      } catch (e) { logger.warn('[MachineSystemController] notify MACHINE_SYSTEM_CLONED failed', e); }
      res.status(201).json({ success: true, data: result, message: 'Nhân bản hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limits = {
        faultRecords: req.query.faultRecords ? parseInt(req.query.faultRecords as string) : undefined,
        repairItems: req.query.repairItems ? parseInt(req.query.repairItems as string) : undefined,
        handoverItems: req.query.handoverItems ? parseInt(req.query.handoverItems as string) : undefined,
        operations: req.query.operations ? parseInt(req.query.operations as string) : undefined,
        maintenanceRecords: req.query.maintenanceRecords ? parseInt(req.query.maintenanceRecords as string) : undefined,
        statusLogs: req.query.statusLogs ? parseInt(req.query.statusLogs as string) : undefined,
      };

      const summary = await machineSystemService.getSummary(req.params.id, limits);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trangThaiMoi, nguyenNhan, ghiChu } = statusSchema.parse(req.body);

      const nguoiCapNhat = req.user
        ? `${(req.user as { lastName?: string }).lastName ?? ''} ${(req.user as { firstName?: string }).firstName ?? ''}`.trim()
        : 'Hệ thống';

      const updated = await machineSystemService.updateStatus(
        req.params.id,
        trangThaiMoi,
        nguyenNhan,
        nguoiCapNhat,
        ghiChu,
      );
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_STATUS_UPDATED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maHeThong: (updated as any)?.maHeThong, tenHeThong: (updated as any)?.tenHeThong, trangThaiMoi },
        });
      } catch (e) { logger.warn('[MachineSystemController] notify MACHINE_SYSTEM_STATUS_UPDATED failed', e); }
      res.json({ success: true, data: updated, message: 'Cập nhật trạng thái máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/machine-systems/active-production
   * Returns machines with loaiHeThong = SAN_XUAT (nồi chiên chân không) and trangThai = HOAT_DONG.
   * SystemOperation only stores frying-specific parameters (maChien, thoiGianChien,
   * khoiLuongDauVao, 4 giai đoạn thời gian/nhiệt độ/áp suất), which are meaningless for
   * DONG_GOI/BAO_QUAN machines — so the "Dữ liệu sản xuất" tabs are scoped to SAN_XUAT only.
   * This is the single source of truth for the "active fryer machine" set used by the
   * frontend (replaces the old regex-based filter).
   */
  async getActiveProductionMachines(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const productionCategories: MachineSystemCategory[] = [
        MachineSystemCategory.SAN_XUAT,
      ];
      const data = await machineSystemService.getActiveProductionMachines(productionCategories);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineSystemController();
