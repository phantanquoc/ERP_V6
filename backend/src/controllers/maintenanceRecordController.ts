import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenanceRecordService from '@services/maintenanceRecordService';
import { getFileUrl } from '@middlewares/upload';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import { ValidationError } from '@utils/errors';
import logger from '@config/logger';

const ALLOWED_FIELDS = [
  'maBienBan', 'maintenancePlanId', 'machineSystemId', 'machineSystemDetailId',
  'loai', 'noiDung', 'tinhTrangTruoc', 'tinhTrangSau', 'deXuat', 'thoiGianThucHien',
  'ngayThucHien', 'nguoiThucHien', 'nguoiPhu',
] as const;

function pickAllowed(body: Record<string, unknown>, _isAdmin: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) if (k in body) out[k] = body[k];
  // maBienBan auto-generated; do not allow client override except ADMIN — but service already handles fallback
  // Block maBienBan for non-admin
  const isAdmin = _isAdmin;
  if (!isAdmin) delete out.maBienBan;
  return out;
}

function safeParseJson(value: unknown, field: string): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { throw new ValidationError(`${field} không hợp lệ (JSON parse thất bại)`); }
}

function parseNguoiPhu(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    const parsed = safeParseJson(raw, 'nguoiPhu');
    if (!Array.isArray(parsed)) throw new ValidationError('nguoiPhu phải là mảng');
    return parsed as string[];
  }
  throw new ValidationError('nguoiPhu không hợp lệ');
}

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
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      const nguoiPhu = parseNguoiPhu((picked as Record<string, unknown>).nguoiPhu ?? (req.body as Record<string, unknown>).nguoiPhu);
      const rawNgay = (picked as Record<string, unknown>).ngayThucHien;
      const record = await maintenanceRecordService.create({
        ...(picked as Record<string, unknown>),
        nguoiPhu,
        ngayThucHien: rawNgay ? new Date(rawNgay as string) : new Date(),
        fileDinhKem: req.file ? getFileUrl('maintenance-records', req.file.filename) : undefined,
        userId: req.user?.id,
      } as Parameters<typeof maintenanceRecordService.create>[0]);
      if (record?.id) {
        try {
          await notificationService.notify(NotificationEvent.MAINTENANCE_RECORD_CREATED, {
            actorUserId: req.user?.id,
            entityId: record.id,
            metadata: { maBienBan: (record as any)?.maBienBan },
          });
        } catch (e) { logger.warn('[MaintenanceRecordController] notify MAINTENANCE_RECORD_CREATED failed', e); }
      }
      res.status(201).json({ success: true, data: record, message: 'Tạo biên bản thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      const nguoiPhu = parseNguoiPhu((req.body as Record<string, unknown>).nguoiPhu);
      const payload: Record<string, unknown> = { ...picked };
      if (nguoiPhu !== undefined) payload.nguoiPhu = nguoiPhu;
      else if ('nguoiPhu' in picked) delete payload.nguoiPhu; // avoid passing raw string
      if (picked.ngayThucHien) payload.ngayThucHien = new Date(picked.ngayThucHien as string);
      else delete payload.ngayThucHien;
      if (req.file) payload.fileDinhKem = getFileUrl('maintenance-records', req.file.filename);
      const record = await maintenanceRecordService.update(req.params.id, payload as Parameters<typeof maintenanceRecordService.update>[1]);
      try {
        await notificationService.notify(NotificationEvent.MAINTENANCE_RECORD_UPDATED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maBienBan: (record as any)?.maBienBan },
        });
      } catch (e) { logger.warn('[MaintenanceRecordController] notify MAINTENANCE_RECORD_UPDATED failed', e); }
      res.json({ success: true, data: record, message: 'Cập nhật biên bản thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let maBienBan: string | undefined;
      try { const r = await maintenanceRecordService.getById(req.params.id); maBienBan = (r as any)?.maBienBan; } catch (_) { /* ignore */ }
      await maintenanceRecordService.delete(req.params.id);
      try {
        await notificationService.notify(NotificationEvent.MAINTENANCE_RECORD_DELETED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maBienBan },
        });
      } catch (e) { logger.warn('[MaintenanceRecordController] notify MAINTENANCE_RECORD_DELETED failed', e); }
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
