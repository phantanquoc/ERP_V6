import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, CreateOvertimePlanRequest, UpdateOvertimePlanRequest, AcceptOvertimePlanRequest, ApproveOvertimePlanRequest, OvertimePlanListQuery, ApiResponse } from '@types';
import overtimePlanService from '@services/overtimePlanService';
import { getFileUrl } from '@middlewares/upload';

class OvertimePlanController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const data: CreateOvertimePlanRequest = req.body;
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => getFileUrl('overtime-plans', file.filename)) || [];

      const plan = await overtimePlanService.create(data, userId, filePaths);

      res.status(201).json({ success: true, data: plan, message: 'Tạo kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: OvertimePlanListQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        mucDoUuTien: req.query.mucDoUuTien as string,
        trangThai: req.query.trangThai as any,
        nguoiTao: req.query.nguoiTao as string,
        nguoiThamGia: req.query.nguoiThamGia as string,
        department: req.query.department as string,
      };

      const result = await overtimePlanService.getAll(query);

      res.json({
        success: true,
        data: result.plans,
        pagination: { total: result.total, page: result.page, totalPages: result.totalPages, limit: query.limit },
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await overtimePlanService.getById(req.params.id);
      res.json({ success: true, data: plan } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const data: UpdateOvertimePlanRequest = req.body;
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => getFileUrl('overtime-plans', file.filename)) || [];

      const plan = await overtimePlanService.update(req.params.id, data, userId, filePaths);

      res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      await overtimePlanService.delete(req.params.id, userId);
      res.json({ success: true, message: 'Xóa kế hoạch tăng ca thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async getMyPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const query: OvertimePlanListQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const result = await overtimePlanService.getMyPlans(userId, query);

      res.json({
        success: true,
        data: result.plans,
        pagination: { total: result.total, page: result.page, totalPages: result.totalPages, limit: query.limit },
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async acceptPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const data: AcceptOvertimePlanRequest = req.body;
      const plan = await overtimePlanService.acceptPlan(req.params.id, userId, data);

      res.json({
        success: true,
        data: plan,
        message: data.trangThai === 'DA_TIEP_NHAN' ? 'Đã tiếp nhận kế hoạch tăng ca' : 'Đã từ chối kế hoạch tăng ca',
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  async approvePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const data: ApproveOvertimePlanRequest = req.body;
      const plan = await overtimePlanService.approvePlan(req.params.id, userId, data);

      res.json({
        success: true,
        data: plan,
        message: data.trangThai === 'DA_DUYET' ? 'Đã phê duyệt kế hoạch tăng ca' : 'Đã từ chối kế hoạch tăng ca',
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }
}

export default new OvertimePlanController();
