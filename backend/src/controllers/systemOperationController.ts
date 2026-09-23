import { Response, NextFunction } from 'express';
import systemOperationService from '@services/systemOperationService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';
import { z } from 'zod';

const systemOperationCreateSchema = z.object({
  maChien: z.string().min(1, 'maChien là bắt buộc'),
  thoiGianChien: z.string().min(1, 'thoiGianChien là bắt buộc'),
  machineSystemId: z.string().min(1).optional().nullable(),
  khoiLuongDauVao: z.union([z.number(), z.string()]).optional(),
  giaiDoan1ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan1NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan1ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan2ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan2NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan2ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan3ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan3NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan3ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan4ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan4NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan4ApSuat: z.union([z.number(), z.string()]).optional(),
  ghiChu: z.string().optional(),
  nguoiThucHien: z.string().optional(),
  materialEvaluationId: z.string().optional().nullable(),
});

const systemOperationUpdateSchema = z.object({
  thoiGianChien: z.string().optional(),
  khoiLuongDauVao: z.union([z.number(), z.string()]).optional(),
  giaiDoan1ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan1NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan1ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan2ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan2NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan2ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan3ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan3NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan3ApSuat: z.union([z.number(), z.string()]).optional(),
  giaiDoan4ThoiGian: z.union([z.number(), z.string()]).optional(),
  giaiDoan4NhietDo: z.union([z.number(), z.string()]).optional(),
  giaiDoan4ApSuat: z.union([z.number(), z.string()]).optional(),
  ghiChu: z.string().optional(),
  nguoiThucHien: z.string().optional(),
});

function pickAllowedCreate(parsed: z.infer<typeof systemOperationCreateSchema>): Record<string, unknown> {
  return { ...parsed };
}
function pickAllowedUpdate(parsed: z.infer<typeof systemOperationUpdateSchema>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) if (v !== undefined) d[k] = v;
  return d;
}

export class SystemOperationController {
  async getAllSystemOperations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const thoiGianChienFrom = typeof req.query.thoiGianChienFrom === 'string' ? req.query.thoiGianChienFrom : undefined;
      const thoiGianChienTo = typeof req.query.thoiGianChienTo === 'string' ? req.query.thoiGianChienTo : undefined;

      const dateRange = thoiGianChienFrom || thoiGianChienTo
        ? { thoiGianChienFrom, thoiGianChienTo }
        : undefined;

      const result = await systemOperationService.getAllSystemOperations(page, limit, machineSystemId, dateRange);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSystemOperationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const operation = await systemOperationService.getSystemOperationById(id);

      res.json({
        success: true,
        data: operation,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createBulkSystemOperations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({ maChien: z.string().min(1), thoiGianChien: z.string().min(1) });
      const parsed = schema.parse(req.body);
      const operations = await systemOperationService.createBulkSystemOperations(parsed.maChien, parsed.thoiGianChien);

      res.status(201).json({
        success: true,
        data: operations,
        message: 'Đã tạo thông số vận hành cho tất cả máy',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSystemOperationsByMaChien(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const maChien = req.params.maChien as string;
      const thoiGianChien = req.query.thoiGianChien as string | undefined;
      const operations = await systemOperationService.getSystemOperationsByMaChien(maChien, thoiGianChien);

      res.json({
        success: true,
        data: operations,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = systemOperationCreateSchema.parse(req.body);
      const data = pickAllowedCreate(parsed);
      const operation = await systemOperationService.createSystemOperation(data);
      if ((operation as any)?.id) {
        try {
          await notificationService.notify(NotificationEvent.SYSTEM_OPERATION_CREATED, {
            actorUserId: req.user?.id,
            entityId: (operation as any).id,
            metadata: { maChien: (operation as any)?.maChien },
          });
        } catch (e) { logger.warn('[SystemOperationController] notify SYSTEM_OPERATION_CREATED failed', e); }
      }
      res.status(201).json({
        success: true,
        data: operation,
        message: 'Tạo thông số hệ thống thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = systemOperationUpdateSchema.parse(req.body);
      const data = pickAllowedUpdate(parsed);
      const operation = await systemOperationService.updateSystemOperation(id, data);
      try {
        await notificationService.notify(NotificationEvent.SYSTEM_OPERATION_UPDATED, {
          actorUserId: req.user?.id,
          entityId: id,
          metadata: { maChien: (operation as any)?.maChien },
        });
      } catch (e) { logger.warn('[SystemOperationController] notify SYSTEM_OPERATION_UPDATED failed', e); }
      res.json({
        success: true,
        data: operation,
        message: 'Cập nhật thông số hệ thống thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteSystemOperation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      let meta: Record<string, unknown> = {};
      try { const op = await systemOperationService.getSystemOperationById(id); meta = { maChien: (op as any)?.maChien }; } catch (_) { /* ignore */ }
      await systemOperationService.deleteSystemOperation(id);
      try {
        await notificationService.notify(NotificationEvent.SYSTEM_OPERATION_DELETED, {
          actorUserId: req.user?.id,
          entityId: id,
          metadata: meta,
        });
      } catch (e) { logger.warn('[SystemOperationController] notify SYSTEM_OPERATION_DELETED failed', e); }
      res.json({
        success: true,
        message: 'System operation deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new SystemOperationController();
