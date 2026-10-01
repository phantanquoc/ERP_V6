import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import inspectionRequestService from '@services/inspectionRequestService';
import { getFileUrl } from '@middlewares/upload';
import { InspectionRequestStatus } from '@prisma/client';
import logger from '@config/logger';

class InspectionRequestController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: { search?: string; trangThai?: InspectionRequestStatus } = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.trangThai) {
        const raw = req.query.trangThai as string;
        if (Object.values(InspectionRequestStatus).includes(raw as InspectionRequestStatus)) filters.trangThai = raw as InspectionRequestStatus;
      }
      const result = await inspectionRequestService.getAllInspectionRequests(page, limit, filters);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const row = await inspectionRequestService.getInspectionRequestById(id);
      res.json({ success: true, data: row });
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let items: unknown[] | undefined;
      if (req.body.items !== undefined) items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      if (req.body.trangThai !== undefined) logger.warn(`Controller: ignoring trangThai on inspection create (user=${req.user?.id})`);
      const data: Record<string, unknown> = {
        ngayThang: req.body.ngayThang ? new Date(req.body.ngayThang) : undefined,
        mucDoUuTien: req.body.mucDoUuTien,
        ghiChu: req.body.ghiChu,
        phongBanId: req.body.phongBanId,
        fileDinhKem: req.file ? getFileUrl('inspection-requests', req.file.filename) : (req.body.fileDinhKem ?? undefined),
        maYeuCau: req.body.maYeuCau ?? undefined,
        userId: req.user?.id,
        ...(items !== undefined && { items }),
      };
      // Auto-generate maYeuCau if not provided
      if (!data.maYeuCau) data.maYeuCau = await inspectionRequestService.generateInspectionRequestCode();
      const row = await inspectionRequestService.createInspectionRequest(data as never);
      res.status(201).json({ success: true, data: row, message: 'Tạo phiếu kiểm tra thành công' });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      let items: unknown[] | undefined;
      if (req.body.items !== undefined) items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      if (req.body.trangThai !== undefined) logger.warn(`Controller: ignoring trangThai on inspection update (id=${id})`);
      const data: Record<string, unknown> = {
        mucDoUuTien: req.body.mucDoUuTien,
        ghiChu: req.body.ghiChu,
        phongBanId: req.body.phongBanId,
        ...(req.body.ngayThang && { ngayThang: new Date(req.body.ngayThang) }),
        ...(items !== undefined && { items }),
      };
      if (req.file) data.fileDinhKem = getFileUrl('inspection-requests', req.file.filename);
      const row = await inspectionRequestService.updateInspectionRequest(id, data as never);
      res.json({ success: true, data: row, message: 'Cập nhật phiếu kiểm tra thành công' });
    } catch (error) { next(error); }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      await inspectionRequestService.deleteInspectionRequest(id);
      res.json({ success: true, message: 'Xóa phiếu kiểm tra thành công' });
    } catch (error) { next(error); }
  }

  async generateCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await inspectionRequestService.generateInspectionRequestCode();
      res.json({ success: true, data: { code } });
    } catch (error) { next(error); }
  }

  async accept(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const row = await inspectionRequestService.accept(id, actor);
      res.json({ success: true, data: row, message: 'Tiếp nhận phiếu kiểm tra thành công' });
    } catch (error) { next(error); }
  }

  async startInspection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const row = await inspectionRequestService.startInspection(id, actor);
      res.json({ success: true, data: row, message: 'Đã bắt đầu kiểm tra' });
    } catch (error) { next(error); }
  }

  async updateDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      let data: Record<string, unknown> = {
        ketQuaKiemTra: req.body.ketQuaKiemTra,
        mucDoHuHong: req.body.mucDoHuHong,
        deXuatXuLy: req.body.deXuatXuLy,
        thoiGianKiemTra: req.body.thoiGianKiemTra ? new Date(req.body.thoiGianKiemTra as string) : undefined,
        nguoiKiemTra: req.body.nguoiKiemTra,
        ketLuan: req.body.ketLuan,
      };
      if (req.file) data.anhKiemTra = getFileUrl('inspection-requests', req.file.filename);
      else if (req.body.anhKiemTra !== undefined) data.anhKiemTra = req.body.anhKiemTra;
      // strip undefined
      data = Object.fromEntries(Object.entries(data).filter(([,v])=> v!==undefined));
      const row = await inspectionRequestService.updateInspectionDetails(id, data as never, actor);
      res.json({ success: true, data: row, message: 'Đã lưu kết quả kiểm tra' });
    } catch (error) { next(error); }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      // Acceptance data — only used when ketLuan = DA_KHAC_PHUC (multipart with mandatory file)
      const acceptance = {
        tinhTrangSau: (req.body?.tinhTrangSau as string | undefined) ?? null,
        ghiChu: (req.body?.ghiChuNghiemThu as string | undefined) ?? null,
        fileDinhKem: req.file ? getFileUrl('acceptance-handovers', req.file.filename) : null,
      };
      const row = await inspectionRequestService.submitInspection(id, actor, acceptance);
      res.json({ success: true, data: row, message: 'Đã gửi kết quả kiểm tra' });
    } catch (error) { next(error); }
  }

  async confirmAcceptance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const ketQua = req.body.ketQua as string;
      const lyDo = (req.body.lyDo ?? req.body.reason) as string | undefined;
      const row = await inspectionRequestService.confirmAcceptance(id, actor, ketQua, lyDo);
      res.json({ success: true, data: row, message: ketQua === 'DAT' ? 'Đã xác nhận nghiệm thu ĐẠT' : 'Đã xác nhận KHÔNG ĐẠT — chuyển lại kỹ thuật xử lý' });
    } catch (error) { next(error); }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const row = await inspectionRequestService.complete(id, actor);
      res.json({ success: true, data: row, message: 'Hoàn thành phiếu kiểm tra' });
    } catch (error) { next(error); }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const reason = (req.body.reason ?? req.body.lyDo ?? req.body.ghiChu) as string | undefined;
      const row = await inspectionRequestService.reject(id, actor, reason);
      res.json({ success: true, data: row, message: 'Đã từ chối phiếu kiểm tra' });
    } catch (error) { next(error); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const reason = (req.body.reason ?? req.body.lyDo) as string | undefined;
      const row = await inspectionRequestService.cancel(id, actor, reason);
      res.json({ success: true, data: row, message: 'Hủy phiếu kiểm tra thành công' });
    } catch (error) { next(error); }
  }

  async getStatusHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const logs = await inspectionRequestService.getStatusHistory(id);
      res.json({ success: true, data: logs });
    } catch (error) { next(error); }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const data = await inspectionRequestService.getStats(
        dateFrom || dateTo ? { dateFrom, dateTo } : undefined,
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export default new InspectionRequestController();
