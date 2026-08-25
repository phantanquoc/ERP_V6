import { Request, Response, NextFunction } from 'express';
import purchaseRequestService from '@services/purchaseRequestService';
import { getFileUrl } from '@middlewares/upload';
import type { AuthenticatedRequest } from '@types';
import prisma from '@config/database';

class PurchaseRequestController {
  async getAllPurchaseRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const phanLoaiQ = req.query.phanLoai as string | undefined;
      const phanLoaiNCC = req.query.phanLoaiNCC as string | undefined;
      const sourceType = req.query.sourceType as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;

      const isAdmin = req.user?.role === 'ADMIN';

      // Build all department IDs (primary + secondary)
      const allDeptIds = [
        req.user?.departmentId,
        ...(req.user?.secondaryDepartments?.map(s => s.departmentId) ?? []),
      ].filter(Boolean) as string[];

      // Check if user is in purchasing department — they see all PRs
      let isPurchasing = false;
      if (!isAdmin && allDeptIds.length > 0) {
        const depts = await prisma.department.findMany({
          where: { id: { in: allDeptIds } },
          select: { code: true },
        });
        isPurchasing = depts.some(d => d.code === 'DEPT_PURCHASING');
      }

      // If purchasing or admin, no dept filter; otherwise filter by all user's depts
      const departmentIds = (isAdmin || isPurchasing) ? undefined : (allDeptIds.length > 0 ? allDeptIds : undefined);

      const result = await purchaseRequestService.getAllPurchaseRequests(
        page,
        limit,
        search,
        departmentIds,
        month,
        year,
        phanLoaiQ,
        { phanLoaiNCC, sourceType, trangThai } as any,
      );

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getPurchaseRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const request = await purchaseRequestService.getPurchaseRequestById(id);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createPurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl('purchase-requests', req.file.filename);
      }

      // Parse items from FormData JSON string if needed
      if (data.items && typeof data.items === 'string') {
        try {
          data.items = JSON.parse(data.items);
        } catch (e) {
          // ignore parse error — service will validate
        }
      }

      const request = await purchaseRequestService.createPurchaseRequest(data);

      return res.status(201).json({
        success: true,
        data: request,
        message: 'Tạo yêu cầu mua hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async generatePurchaseRequestCode(_req: Request, res: Response, next: NextFunction) {
    try {
      const code = await purchaseRequestService.getGeneratedCode();

      return res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updatePurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl('purchase-requests', req.file.filename);
      }

      // Parse items from FormData JSON string if needed
      if (data.items && typeof data.items === 'string') {
        try {
          data.items = JSON.parse(data.items);
        } catch (e) {
          // ignore
        }
      }

      // Inject actor for pricing approver guard
      (data as any).__actorUserId = (req as any).user?.id;
      const request = await purchaseRequestService.updatePurchaseRequest(id, data);

      return res.json({
        success: true,
        data: request,
        message: 'Cập nhật yêu cầu mua hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async submitForApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const request = await purchaseRequestService.submitForApproval(id);
      return res.json({
        success: true,
        data: request,
        message: 'Đã gửi yêu cầu mua hàng lên admin phê duyệt',
      });
    } catch (error) {
      return next(error);
    }
  }

  async deletePurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await purchaseRequestService.deletePurchaseRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu mua hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: any = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      const buffer = await purchaseRequestService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-mua-hang-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new PurchaseRequestController();

