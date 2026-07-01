import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import faultRecordService from '@services/faultRecordService';
import { getFileUrl } from '@middlewares/upload';
import { FaultRecordStatus } from '@prisma/client';

class FaultRecordController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const mucDo = req.query.mucDo as string | undefined;
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const machineSystemDetailId = req.query.machineSystemDetailId as string | undefined;
      const faultTemplateId = req.query.faultTemplateId as string | undefined;

      const result = await faultRecordService.getAllFaultRecords(
        page,
        limit,
        search,
        trangThai,
        mucDo,
        machineSystemId,
        machineSystemDetailId,
        faultTemplateId,
      );
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await faultRecordService.getFaultRecordById(req.params.id);
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        tenLoi: req.body.tenLoi,
        moTa: req.body.moTa,
        maHeThong: req.body.maHeThong,
        machineSystemId: req.body.machineSystemId,
        machineSystemDetailId: req.body.machineSystemDetailId,
        faultTemplateId: req.body.faultTemplateId,
        mucDo: req.body.mucDo,
        // trangThai intentionally excluded — server defaults to DANG_THEO_DOI
        nguoiPhatHien: req.body.nguoiPhatHien,
        ngayPhatHien: req.body.ngayPhatHien ? new Date(req.body.ngayPhatHien) : undefined,
        fileDinhKem: req.file ? getFileUrl('fault-records', req.file.filename) : undefined,
        userRole: req.user?.role,
        userId: req.user?.id,
        repairSteps: req.body.repairSteps
          ? (typeof req.body.repairSteps === 'string' ? JSON.parse(req.body.repairSteps) : req.body.repairSteps)
          : undefined,
      };

      const record = await faultRecordService.createFaultRecord(data);
      res.status(201).json({ success: true, data: record, message: 'Tạo bản ghi lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Task 4.2: pass body to service unchanged (service drops trangThai with warn)
      const data: Record<string, unknown> = {
        tenLoi: req.body.tenLoi,
        moTa: req.body.moTa,
        maHeThong: req.body.maHeThong,
        machineSystemId: req.body.machineSystemId,
        machineSystemDetailId: req.body.machineSystemDetailId,
        faultTemplateId: req.body.faultTemplateId,
        mucDo: req.body.mucDo,
        trangThai: req.body.trangThai, // forwarded so service can warn+drop
        nguoiPhatHien: req.body.nguoiPhatHien,
        ngayPhatHien: req.body.ngayPhatHien ? new Date(req.body.ngayPhatHien) : undefined,
      };

      if (req.file) {
        data.fileDinhKem = getFileUrl('fault-records', req.file.filename);
      }

      const record = await faultRecordService.updateFaultRecord(req.params.id, data);
      res.json({ success: true, data: record, message: 'Cập nhật bản ghi lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await faultRecordService.deleteFaultRecord(req.params.id);
      res.json({ success: true, message: 'Xóa bản ghi lỗi thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        trangThai: req.query.trangThai as string | undefined,
        mucDo: req.query.mucDo as string | undefined,
      };
      const workbook = await faultRecordService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-loi-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  async checkRecurrence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const faultTemplateId = req.query.faultTemplateId as string | undefined;
      const machineSystemDetailId = req.query.machineSystemDetailId as string | undefined;
      const tenLoi = req.query.tenLoi as string | undefined;

      const data = await faultRecordService.checkRecurrence({ faultTemplateId, machineSystemDetailId, tenLoi });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const data = await faultRecordService.getStats(machineSystemId ? { machineSystemId } : undefined);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getHeatmap(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const data = await faultRecordService.getHeatmap(machineSystemId ? { machineSystemId } : undefined);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ── Task 4.1: New lifecycle handlers ──────────────────────────────────────

  async markResolved(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const actorId = req.user?.id ?? null;
      const reason = req.body.reason as string | undefined;

      await faultRecordService.markResolved(id, actorId, reason);
      res.json({ success: true, message: 'Đã đánh dấu sự cố là đã xử lý' });
    } catch (error) {
      next(error);
    }
  }

  async markRecurred(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const actorId = req.user?.id ?? null;
      const auto = req.body.auto === true;
      const reason = req.body.reason as string | undefined;

      await faultRecordService.markRecurred(id, actorId, { auto, reason });
      res.json({ success: true, message: 'Đã đánh dấu sự cố là tái phát' });
    } catch (error) {
      next(error);
    }
  }

  async getStatusHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await faultRecordService.getStatusHistory(id, { page, limit });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getForTypeahead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;
      const trangThaiRaw = req.query.trangThai as string | undefined;
      const trangThai = trangThaiRaw
        ? (trangThaiRaw.split(',').filter((v) => Object.values(FaultRecordStatus).includes(v as FaultRecordStatus)) as FaultRecordStatus[])
        : undefined;

      const data = await faultRecordService.getForTypeahead({ trangThai, search, limit });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new FaultRecordController();
