import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import repairRequestService from '@services/repairRequestService';
import { getFileUrl } from '@middlewares/upload';
import { RepairRequestStatus, RequestType } from '@prisma/client';
import logger from '@config/logger';

class RepairRequestController {
  async getAllRepairRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: { search?: string; trangThai?: RepairRequestStatus; requestType?: RequestType; sourceInspectionRequestId?: string } = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.trangThai) {
        const raw = req.query.trangThai as string;
        if (Object.values(RepairRequestStatus).includes(raw as RepairRequestStatus)) {
          filters.trangThai = raw as RepairRequestStatus;
        }
      }
      if (req.query.requestType) {
        const raw = req.query.requestType as string;
        if (Object.values(RequestType).includes(raw as RequestType)) {
          filters.requestType = raw as RequestType;
        }
      }
      if (req.query.sourceInspectionRequestId) {
        filters.sourceInspectionRequestId = req.query.sourceInspectionRequestId as string;
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
      let items: any[] | undefined;
      if (req.body.items !== undefined) {
        items = typeof req.body.items === 'string'
          ? JSON.parse(req.body.items)
          : req.body.items;
      }

      const data: Record<string, unknown> = {
        ngayThang: req.body.ngayThang ? new Date(req.body.ngayThang) : new Date(),
        maYeuCau: req.body.maYeuCau,
        tenHeThong: req.body.tenHeThong,
        tinhTrangThietBi: req.body.tinhTrangThietBi,
        loaiLoi: req.body.loaiLoi,
        mucDoUuTien: req.body.mucDoUuTien,
        noiDungLoi: req.body.noiDungLoi,
        ghiChu: req.body.ghiChu,
        fileDinhKem: req.file ? getFileUrl('repair-requests', req.file.filename) : req.body.fileDinhKem ?? undefined,
        ...(items !== undefined && { items }),
        userId: req.user?.id,
        actorRole: req.user?.role,
        ...(req.body.requestType !== undefined && { requestType: req.body.requestType }),
        ...(req.body.sourceInspectionRequestId !== undefined && { sourceInspectionRequestId: req.body.sourceInspectionRequestId }),
        ...(req.body.ngayHoanThienDuKien !== undefined && { ngayHoanThienDuKien: req.body.ngayHoanThienDuKien ? new Date(req.body.ngayHoanThienDuKien) : null }),
        ...(req.body.ngayBatDauKeHoach !== undefined && { ngayBatDauKeHoach: req.body.ngayBatDauKeHoach ? new Date(req.body.ngayBatDauKeHoach) : null }),
        ...(req.body.keHoachChiTiet !== undefined && { keHoachChiTiet: req.body.keHoachChiTiet }),
        ...(req.body.phuongAn !== undefined && { phuongAn: req.body.phuongAn }),
        ...(req.body.bienPhapAnToan !== undefined && { bienPhapAnToan: req.body.bienPhapAnToan }),
        ...(req.body.chiPhiDuKien !== undefined && { chiPhiDuKien: req.body.chiPhiDuKien != null ? Number(req.body.chiPhiDuKien) : null }),
        ...(req.body.canNgungMay !== undefined && { canNgungMay: Boolean(req.body.canNgungMay) }),
        ...(req.body.phongBanId !== undefined && { phongBanId: req.body.phongBanId }),
      };

      if (req.body.trangThai !== undefined) {
        logger.warn(`Controller: ignoring client-supplied trangThai on create (user=${req.user?.id})`);
      }

      const request = await repairRequestService.createRepairRequest(data as never);

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

      let items: any[] | undefined;
      if (req.body.items !== undefined) {
        items = typeof req.body.items === 'string'
          ? JSON.parse(req.body.items)
          : req.body.items;
      }

      const data: Record<string, unknown> = {
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
      if (req.body.requestType !== undefined) {
        logger.warn(`Controller: ignoring client-supplied requestType on update (id=${id})`);
      }

      if (req.body.ngayThang) data.ngayThang = new Date(req.body.ngayThang);
      if (req.body.ngayHoanThienDuKien !== undefined) data.ngayHoanThienDuKien = req.body.ngayHoanThienDuKien ? new Date(req.body.ngayHoanThienDuKien) : null;
      if (req.body.ngayBatDauKeHoach !== undefined) data.ngayBatDauKeHoach = req.body.ngayBatDauKeHoach ? new Date(req.body.ngayBatDauKeHoach) : null;
      if (req.body.keHoachChiTiet !== undefined) data.keHoachChiTiet = req.body.keHoachChiTiet;
      if (req.body.phuongAn !== undefined) data.phuongAn = req.body.phuongAn;
      if (req.body.bienPhapAnToan !== undefined) data.bienPhapAnToan = req.body.bienPhapAnToan;
      if (req.body.chiPhiDuKien !== undefined) data.chiPhiDuKien = req.body.chiPhiDuKien != null ? Number(req.body.chiPhiDuKien) : null;
      if (req.body.chiPhiThucTe !== undefined) data.chiPhiThucTe = req.body.chiPhiThucTe != null ? Number(req.body.chiPhiThucTe) : null;
      if (req.body.noiDungThucHien !== undefined) data.noiDungThucHien = req.body.noiDungThucHien;
      if (req.body.gioCongThucTe !== undefined) data.gioCongThucTe = req.body.gioCongThucTe != null ? Number(req.body.gioCongThucTe) : null;
      if (req.body.canNgungMay !== undefined) data.canNgungMay = Boolean(req.body.canNgungMay);
      if (req.body.phongBanId !== undefined) data.phongBanId = req.body.phongBanId;
      // ketQuaNghiemThu is never accepted here — it is written only by confirm-acceptance.

      if (req.file) {
        data.fileDinhKem = getFileUrl('repair-requests', req.file.filename);
      }

      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const updated = await repairRequestService.updateRepairRequest(id, data as never, actor);

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
      const filters: { search?: string; trangThai?: RepairRequestStatus; requestType?: RequestType } = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.trangThai) {
        const raw = req.query.trangThai as string;
        if (Object.values(RepairRequestStatus).includes(raw as RepairRequestStatus)) {
          filters.trangThai = raw as RepairRequestStatus;
        }
      }
      if (req.query.requestType) {
        const raw = req.query.requestType as string;
        if (Object.values(RequestType).includes(raw as RequestType)) filters.requestType = raw as RequestType;
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

  // ── Status transitions ───────────────────────────────────────────────

  async accept(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.accept(id, actor);
      res.json({ success: true, data: result, message: 'Tiếp nhận yêu cầu thành công' });
    } catch (error) { next(error); }
  }

  async plan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (!Number.isFinite(id)) {
        const { ValidationError } = await import('@utils/errors');
        throw new ValidationError('ID không hợp lệ');
      }
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const raw = (req.body ?? {}) as Record<string, unknown>;
      const normalized: Record<string, unknown> = {};
      for (const k of ['keHoachChiTiet', 'phuongAn', 'bienPhapAnToan'] as const) {
        const v = raw[k];
        if (v !== undefined && v !== null) {
          const s = String(v).trim();
          if (s) normalized[k] = s;
        }
      }
      // Drop empty phongBanId to avoid FK '' -> 500; date strings coerced to Date with validation
      if (raw.phongBanId !== undefined && raw.phongBanId !== null) {
        const s = String(raw.phongBanId).trim();
        if (s) normalized.phongBanId = s;
      }
      const parseDate = (v: unknown, label: string): Date | undefined => {
        if (v === undefined || v === null || String(v).trim() === '') return undefined;
        const d = v instanceof Date ? v : new Date(String(v));
        if (Number.isNaN(d.getTime())) {
          const { ValidationError: VE } = require('@utils/errors');
          throw new VE(`${label} không hợp lệ`);
        }
        return d;
      };
      try {
        const d1 = parseDate(raw.ngayBatDauKeHoach, 'Ngày bắt đầu kế hoạch');
        if (d1 !== undefined) normalized.ngayBatDauKeHoach = d1;
        const d2 = parseDate(raw.ngayHoanThienDuKien, 'Ngày hoàn thiện dự kiến');
        if (d2 !== undefined) normalized.ngayHoanThienDuKien = d2;
      } catch (e) { throw e; }
      if (raw.chiPhiDuKien !== undefined && raw.chiPhiDuKien !== null && String(raw.chiPhiDuKien).trim() !== '') {
        const n = Number(raw.chiPhiDuKien);
        if (!Number.isFinite(n) || n < 0) {
          const { ValidationError: VE2 } = await import('@utils/errors');
          throw new VE2('Chi phí dự kiến phải >= 0');
        }
        normalized.chiPhiDuKien = n;
      }
      if (raw.canNgungMay !== undefined) normalized.canNgungMay = Boolean(raw.canNgungMay);
      const result = await repairRequestService.plan(id, actor, normalized);
      res.json({ success: true, data: result, message: 'Lập kế hoạch thành công' });
    } catch (error) {
      logger.error(`plan controller error id=${req.params.id}: ${(error as Error).message}`, { stack: (error as Error).stack });
      next(error);
    }
  }

  async startRepair(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.startRepair(id, actor);
      res.json({ success: true, data: result, message: 'Bắt đầu sửa chữa thành công' });
    } catch (error) { next(error); }
  }

  async submitAcceptance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.submitForAcceptance(id, actor);
      res.json({ success: true, data: result, message: 'Đề nghị nghiệm thu thành công' });
    } catch (error) { next(error); }
  }

  async confirmAcceptance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const ketQua = req.body.ketQua as string;
      // chiPhiThucTe from the confirmer is ignored — actual cost is set by technicians.
      const lyDo = (req.body.lyDo ?? req.body.reason) as string | undefined;
      const result = await repairRequestService.confirmAcceptance(id, actor, ketQua as never, lyDo);
      res.json({ success: true, data: result, message: ketQua === 'DAT' ? 'Nghiệm thu đạt' : 'Nghiệm thu không đạt — quay lại sửa chữa' });
    } catch (error) { next(error); }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const reason = (req.body.reason ?? req.body.lyDo ?? req.body.ghiChu) as string | undefined;
      const result = await repairRequestService.reject(id, actor, reason);
      res.json({ success: true, data: result, message: 'Đã từ chối yêu cầu' });
    } catch (error) { next(error); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const reason = (req.body.reason ?? req.body.lyDo) as string | undefined;
      const result = await repairRequestService.cancel(id, actor, { reason });
      res.json({ success: true, data: result, message: 'Hủy yêu cầu sửa chữa thành công' });
    } catch (error) { next(error); }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.complete(id, actor);
      res.json({ success: true, data: result, message: 'Hoàn thành yêu cầu thành công' });
    } catch (error) { next(error); }
  }

  /** Technician-only actual execution fields (cost, hours, content) after acceptance. Body validated by repairActualFieldsSchema. */
  async updateActualFields(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const result = await repairRequestService.updateActualFields(id, req.body as never, actor);
      res.json({ success: true, data: result, message: 'Đã cập nhật thông tin thực tế' });
    } catch (error) { next(error); }
  }

  async getStatusHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const logs = await repairRequestService.getStatusHistory(id);
      res.json({ success: true, data: logs });
    } catch (error) { next(error); }
  }

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
    } catch (error) { next(error); }
  }

  // ── Assignees ─────────────────────────────────────────────────────────

  async listAssignees(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.listAssignees(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async addAssignee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const data = await repairRequestService.assignUser(id, req.body as never, actor);
      res.status(201).json({ success: true, data, message: 'Đã phân công' });
    } catch (error) { next(error); }
  }

  async removeAssignee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const assigneeId = req.params.assigneeId as string;
      const data = await repairRequestService.unassignUser(id, assigneeId);
      res.json({ success: true, data, message: 'Đã gỡ phân công' });
    } catch (error) { next(error); }
  }

  // ── Material needs ────────────────────────────────────────────────────

  async listMaterialNeeds(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.listMaterialNeeds(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async addMaterialNeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.upsertMaterialNeed(id, req.body as never);
      res.status(201).json({ success: true, data, message: 'Đã thêm vật tư' });
    } catch (error) { next(error); }
  }

  async updateMaterialNeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const needId = req.params.needId as string;
      const data = await repairRequestService.upsertMaterialNeed(id, needId, req.body as never);
      res.json({ success: true, data, message: 'Đã cập nhật vật tư' });
    } catch (error) { next(error); }
  }

  async removeMaterialNeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const needId = req.params.needId as string;
      const data = await repairRequestService.removeMaterialNeed(id, needId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // ── Supply links ──────────────────────────────────────────────────────

  async listSupplyLinks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.listSupplyLinks(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async addSupplyLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const data = await repairRequestService.linkSupplyRequest(id, req.body as never, actor);
      res.status(201).json({ success: true, data, message: 'Đã liên kết yêu cầu vật tư' });
    } catch (error) { next(error); }
  }

  async removeSupplyLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const linkId = req.params.linkId as string;
      const data = await repairRequestService.unlinkSupplyRequest(id, linkId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // ── Supply chain ──────────────────────────────────────────────────────

  async getSupplyChain(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.getSupplyChain(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // ── Cost summary ────────────────────────────────────────────────────

  async getCostSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.getCostSummary(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // ── Incidental costs ────────────────────────────────────────────────

  async listIncidentalCosts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.listIncidentalCosts(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createIncidentalCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = await repairRequestService.createIncidentalCost(id, req.body as never);
      res.status(201).json({ success: true, data, message: 'Đã thêm chi phí phát sinh' });
    } catch (error) { next(error); }
  }

  async updateIncidentalCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const costId = req.params.costId as string;
      const data = await repairRequestService.updateIncidentalCost(id, costId, req.body as never);
      res.json({ success: true, data, message: 'Đã cập nhật chi phí phát sinh' });
    } catch (error) { next(error); }
  }

  async deleteIncidentalCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const costId = req.params.costId as string;
      const data = await repairRequestService.deleteIncidentalCost(id, costId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export default new RepairRequestController();
