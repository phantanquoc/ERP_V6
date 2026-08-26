import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
import supplyRequestService from '@services/supplyRequestService';
import type { AuthenticatedRequest } from '@types';

class SupplyRequestController {
  async getAllSupplyRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const phanLoai = (req.query.phanLoai as string) || undefined;
      const filters = {
        maYeuCau: (req.query.maYeuCau as string) || undefined,
        tenNhanVien: (req.query.tenNhanVien as string) || undefined,
        boPhan: (req.query.boPhan as string) || undefined,
        trangThai: (req.query.trangThai as string) || undefined,
        mucDoUuTien: (req.query.mucDoUuTien as string) || undefined,
      };
      const departmentIds = (req as unknown as { userDepartmentIds?: string[] }).userDepartmentIds;
      const subDepartmentIds = (() => {
        const v = (req as unknown as { userSubDepartmentId?: string | null }).userSubDepartmentId;
        return v ? [v] : undefined;
      })();

      const result = await supplyRequestService.getAllSupplyRequests(page, limit, search, departmentIds, subDepartmentIds, phanLoai, filters);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getSupplyRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplyRequest = await supplyRequestService.getSupplyRequestById(id);

      return res.json({
        success: true,
        data: supplyRequest,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createSupplyRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Derive employeeId from JWT — do not trust client-provided identity
      let employeeId: string | null = null;
      if (req.user?.id) {
        const employee = await prisma.employee.findUnique({
          where: { userId: req.user.id },
          select: { id: true },
        });
        employeeId = employee?.id ?? (req.body.employeeId as string | undefined) ?? null;
      } else {
        employeeId = (req.body.employeeId as string | undefined) ?? null;
      }
      const body = { ...req.body, employeeId };
      const supplyRequest = await supplyRequestService.createSupplyRequest(body);

      return res.status(201).json({
        success: true,
        data: supplyRequest,
        message: 'Tạo yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplyRequest = await supplyRequestService.updateSupplyRequest(id, req.body);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Cập nhật yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await supplyRequestService.deleteSupplyRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async cancelSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await supplyRequestService.cancelSupplyRequest(id);
      return res.json({
        success: true,
        message: 'Đã hủy yêu cầu cung cấp',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.maYeuCau) filters.maYeuCau = req.query.maYeuCau as string;
      if (req.query.tenNhanVien) filters.tenNhanVien = req.query.tenNhanVien as string;
      if (req.query.boPhan) filters.boPhan = req.query.boPhan as string;
      if (req.query.trangThai) filters.trangThai = req.query.trangThai as string;
      if (req.query.mucDoUuTien) filters.mucDoUuTien = req.query.mucDoUuTien as string;

      const buffer = await supplyRequestService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-cung-cap-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async markMuaNhanhAsPurchased(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const soTien = req.body.soTien !== undefined ? Number(req.body.soTien) : undefined;
      await supplyRequestService.markMuaNhanhAsPurchased(id, soTien);

      return res.json({
        success: true,
        message: 'Đã đánh dấu đã mua hàng',
      });
    } catch (error) {
      return next(error);
    }
  }

  async partialFulfillItem(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = req.params.itemId as string;
      const { fulfilledQty, reason, decidedByEmployeeId, routeShortageToPurchase, lotProductId, warehouseId, lotId, autoCreateProduct } = req.body ?? {};

      const result = await supplyRequestService.partialFulfill(itemId, {
        fulfilledQty: Number(fulfilledQty),
        reason,
        decidedByEmployeeId,
        routeShortageToPurchase,
        lotProductId,
        warehouseId,
        lotId,
        autoCreateProduct,
      });

      return res.json({
        success: true,
        data: result,
        message: 'Đã cập nhật fulfillment',
      });
    } catch (error) {
      return next(error);
    }
  }

  async batchFulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const { lines } = req.body;

      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách cấp phát không được để trống' });
      }

      const result = await supplyRequestService.batchFulfill(lines);

      return res.json({
        success: true,
        data: result,
        message: `Đã cấp phát ${result.decisionsCount} dòng thành công`,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getDecisionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const decisions = await supplyRequestService.getDecisionHistory(id);
      return res.json({
        success: true,
        data: decisions,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default new SupplyRequestController();

