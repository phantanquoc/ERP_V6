import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@types';
import workPlanService from '@services/workPlanService';
import { getFileUrl } from '@middlewares/upload';
import prisma from '@config/database';

class WorkPlanController {
  async createWorkPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { tieuDe, noiDung, ngayBatDau, ngayKetThuc, mucDoUuTien, ghiChu } = req.body;
      // Handle FormData array: nguoiThucHien[] or nguoiThucHien
      const nguoiThucHien = req.body['nguoiThucHien[]'] || req.body.nguoiThucHien || [];
      const nguoiThucHienArray = Array.isArray(nguoiThucHien) ? nguoiThucHien : [nguoiThucHien];
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => getFileUrl('work-plans', file.filename)) || [];

      const workPlan = await workPlanService.createWorkPlan(
        { tieuDe, nguoiThucHien: nguoiThucHienArray, noiDung, ngayBatDau, ngayKetThuc, mucDoUuTien, ghiChu },
        userId,
        filePaths
      );

      res.status(201).json({
        success: true,
        data: workPlan,
        message: 'Tạo kế hoạch công việc thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getAllWorkPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string | undefined;

      const result = await workPlanService.getAllWorkPlans(page, limit, search);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getMyWorkPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin nhân viên',
        });
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string | undefined;

      const result = await workPlanService.getMyWorkPlans(userId, employee.id, page, limit, search);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getWorkPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const workPlan = await workPlanService.getWorkPlanById(id);

      res.json({
        success: true,
        data: workPlan,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateWorkPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = req.body;

      const workPlan = await workPlanService.updateWorkPlan(id, data);

      res.json({
        success: true,
        data: workPlan,
        message: 'Cập nhật kế hoạch công việc thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteWorkPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await workPlanService.deleteWorkPlan(id);

      res.json({
        success: true,
        message: 'Xóa kế hoạch công việc thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new WorkPlanController();

