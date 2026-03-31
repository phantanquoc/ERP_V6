import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@types';
import overtimePlanService from '@services/overtimePlanService';
import { getFileUrl } from '@middlewares/upload';

class OvertimePlanController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const nguoiThamGia = req.body['nguoiThamGia[]'] || req.body.nguoiThamGia || [];
      const nguoiThamGiaArray = Array.isArray(nguoiThamGia) ? nguoiThamGia : [nguoiThamGia];
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => getFileUrl('overtime-plans', file.filename)) || [];
      const { noiDung, ngayTangCa, gioBatDau, gioKetThuc, ghiChu, mucDoUuTien } = req.body;
      const plan = await overtimePlanService.create(
        { nguoiThamGia: nguoiThamGiaArray, noiDung, ngayTangCa, gioBatDau, gioKetThuc, ghiChu, mucDoUuTien },
        userId, filePaths
      );
      res.status(201).json({ success: true, data: plan, message: 'Tạo kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await overtimePlanService.getAll({
        page, limit,
        search: req.query.search as string,
        mucDoUuTien: req.query.mucDoUuTien as string,
        trangThai: req.query.trangThai as any,
        department: req.query.department as string,
      });
      res.json({ success: true, data: result.plans, pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages } } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getMyPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await overtimePlanService.getMyPlans(userId, { page, limit });
      res.json({ success: true, data: result.plans, pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages } } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await overtimePlanService.getById(req.params.id as string);
      res.json({ success: true, data: plan } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const nguoiThamGia = req.body['nguoiThamGia[]'] || req.body.nguoiThamGia;
      const nguoiThamGiaArray = nguoiThamGia ? (Array.isArray(nguoiThamGia) ? nguoiThamGia : [nguoiThamGia]) : undefined;
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => getFileUrl('overtime-plans', file.filename));
      const { noiDung, ngayTangCa, gioBatDau, gioKetThuc, ghiChu, mucDoUuTien } = req.body;
      const plan = await overtimePlanService.update(
        req.params.id as string,
        { nguoiThamGia: nguoiThamGiaArray, noiDung, ngayTangCa, gioBatDau, gioKetThuc, ghiChu, mucDoUuTien },
        userId, filePaths
      );
      res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      await overtimePlanService.delete(req.params.id as string, userId);
      res.json({ success: true, message: 'Xóa kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async acceptPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const plan = await overtimePlanService.acceptPlan(req.params.id as string, userId, req.body);
      res.json({ success: true, data: plan, message: 'Cập nhật trạng thái tiếp nhận thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async approvePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const plan = await overtimePlanService.approvePlan(req.params.id as string, userId, req.body);
      res.json({ success: true, data: plan, message: 'Phê duyệt kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async updateActualTime(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const isUserAdmin = req.user?.role === 'ADMIN';
      const { actualTimes } = req.body;
      const plan = await overtimePlanService.updateActualTime(req.params.id as string, userId, actualTimes, isUserAdmin);
      res.json({ success: true, data: plan, message: 'Cập nhật giờ thực tế thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }
}

export default new OvertimePlanController();

