import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import repairRequestService from '@services/repairRequestService';
import { getFileUrl } from '@middlewares/upload';
import { RepairRequestStatus } from '@prisma/client';
import logger from '@config/logger';

class RepairRequestController {
  async getAllRepairRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: { search?: string; trangThai?: RepairRequestStatus } = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.trangThai) {
        const raw = req.query.trangThai as string;
        if (Object.values(RepairRequestStatus).includes(raw as RepairRequestStatus)) {
          filters.trangThai = raw as RepairRequestStatus;
        }
      }

      const result = await repairRequestService.getAllRepairRequests(page, limit, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRepairRequestById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const request = await repairRequestService.getRepairRequestById(id);

      res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRepairRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // items may arrive as JSON string (FormData) or as array (JSON body)
      let items: any[] | undefined;
      if (req.body.items !== undefined) {
        items = typeof req.body.items === 'string'
          ? JSON.parse(req.body.items)
          : req.body.items;
      }

      const data = {
        ngayThang: new Date(req.body.ngayThang),
        maYeuCau: req.body.maYeuCau,
        tenHeThong: req.body.tenHeThong,
        tinhTrangThietBi: req.body.tinhTrangThietBi,
        loaiLoi: req.body.loaiLoi,
        mucDoUuTien: req.body.mucDoUuTien,
        noiDungLoi: req.body.noiDungLoi,
        ghiChu: req.body.ghiChu,
        fileDinhKem: req.file ? getFileUrl('repair-requests', req.file.filename) : undefined,
        ...(items !== undefined && { items }),
        userId: req.user?.id,
      };

      if (req.body.trangThai !== undefined) {
        logger.warn(`Controller: ignoring client-supplied trangThai on create (user=${req.user?.id})`);
      }

      const request = await repairRequestService.createRepairRequest(data);

      res.status(201).json({
        success: true,
        data: request,
        message: 'Tạo yêu cầu sửa chữa thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRepairRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      // items may arrive as JSON string (FormData) or as array (JSON body)
      let items: any[] | undefined;
      if (req.body.items !== undefined) {
        items = typeof req.body.items === 'string'
          ? JSON.parse(req.body.items)
          : req.body.items;
      }

      const data: any = {
        tenHeThong: req.body.tenHeThong,
        tinhTrangThietBi: req.body.tinhTrangThietBi,
        loaiLoi: req.body.loaiLoi,
        mucDoUuTien: req.body.mucDoUuTien,
        noiDungLoi: req.body.noiDungLoi,
        ghiChu: req.body.ghiChu,
        ...(items !== undefined && { items }),
      };

      if (req.body.trangThai !== undefined) {
        logger.warn(`Controller: ignoring client-supplied trangThai on update (id=${id}, user=${req.user?.id})`);
      }

      if (req.body.ngayThang) {
        data.ngayThang = new Date(req.body.ngayThang);
      }

      if (req.file) {
        data.fileDinhKem = getFileUrl('repair-requests', req.file.filename);
      }

      const updated = await repairRequestService.updateRepairRequest(id, data);

      res.json({
        success: true,
        data: updated,
        message: 'Cập nhật yêu cầu sửa chữa thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRepairRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      await repairRequestService.deleteRepairRequest(id);

      res.json({
        success: true,
        message: 'Xóa yêu cầu sửa chữa thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: { search?: string; trangThai?: RepairRequestStatus } = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.trangThai) {
        const raw = req.query.trangThai as string;
        if (Object.values(RepairRequestStatus).includes(raw as RepairRequestStatus)) {
          filters.trangThai = raw as RepairRequestStatus;
        }
      }
      const buffer = await repairRequestService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-sua-chua-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async generateCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await repairRequestService.generateRepairRequestCode();
      res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/start-repair
   * CHO_XU_LY → DANG_SUA_CHUA
   */
  async startRepair(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.startRepair(id, actor);

      res.json({
        success: true,
        data: result,
        message: 'Bắt đầu sửa chữa thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/cancel
   * any non-terminal → DA_HUY
   */
  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const reason = req.body.reason as string | undefined;
      const result = await repairRequestService.cancel(id, actor, { reason });

      res.json({
        success: true,
        data: result,
        message: 'Hủy yêu cầu sửa chữa thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /stats — dashboard aggregates
   * Parses ISO date query params and delegates to service.
   */
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const machineSystemId = req.query.machineSystemId as string | undefined;

      const data = await repairRequestService.getStats(
        dateFrom || dateTo || machineSystemId
          ? { dateFrom, dateTo, machineSystemId }
          : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id/status-history
   */
  async getStatusHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const logs = await repairRequestService.getStatusHistory(id);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RepairRequestController();

