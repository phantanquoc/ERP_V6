import { Request, Response, NextFunction } from 'express';
import purchaseRequestService from '@services/purchaseRequestService';
import { getFileUrl } from '@middlewares/upload';
import type { AuthenticatedRequest } from '@types';
import prisma from '@config/database';

const PR_ALLOWED_FIELDS = ['mucDichYeuCau','mucDoUuTien','ghiChu','fileKemTheo','supplyRequestId','nhaCungCapId','giaDuKien','ghiChuMuaHang','isQuickPurchase','sourceType','ngayDuKienNhap','warehouseId','ghiChuVanChuyen','trangThai','nguoiDuyet','ngayDuyet','items'] as const;
const PR_ADMIN_ONLY = new Set(['trangThai','nguoiDuyet','ngayDuyet']);
function pickPR(body: Record<string,unknown>, isAdmin: boolean): Record<string,unknown> {
  const out: Record<string,unknown> = {};
  for (const k of PR_ALLOWED_FIELDS) if (k in body) {
    if (!isAdmin && PR_ADMIN_ONLY.has(k)) continue;
    out[k]=body[k];
  }
  // items is handled separately, keep as-is if present
  return out;
}


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
      const supplyRequestBoPhan = req.query.supplyRequestBoPhan as string | undefined;

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
        { phanLoaiNCC, sourceType, trangThai, supplyRequestBoPhan } as any,
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

  async createPurchaseRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const raw = req.body as Record<string, unknown>;
      const data: any = pickPR(raw, isAdmin);
      // Derive identity from JWT — never trust client employeeId/tenNhanVien
      if (req.user?.id) {
        const emp = await prisma.employee.findUnique({ where: { userId: req.user.id }, select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } } });
        if (emp) {
          data.employeeId = emp.id;
          data.maNhanVien = emp.employeeCode;
          data.tenNhanVien = `${emp.user.lastName ?? ''} ${emp.user.firstName ?? ''}`.trim();
        }
      }
      // Preserve items (with per-item whitelist handled in service); still block if not in allowlist via pickPR already includes items
      if (raw.items !== undefined) data.items = raw.items;

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

  async updatePurchaseRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const isAdmin = req.user?.role === 'ADMIN';
      const raw = req.body as Record<string, unknown>;
      const data: any = pickPR(raw, isAdmin);
      if (raw.items !== undefined) data.items = raw.items;
      // Block client identity override on update as well
      delete data.employeeId; delete data.maNhanVien; delete data.tenNhanVien;

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

  async confirmActualPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = req.body as { items?: Array<{ id: string; giaThucTe?: number | null; soLuongThucTe?: number | null }>; lyDoChenhLech?: string | null };
      const items = (body.items ?? []) as Array<{ id: string; giaThucTe?: number | null; soLuongThucTe?: number | null }>;
      const lyDoChenhLech = body.lyDoChenhLech ?? null;
      const actorUserId = (req as unknown as { user?: { id?: string } }).user?.id;
      const updated = await purchaseRequestService.confirmActualPrice(id, items, actorUserId, lyDoChenhLech);
      return res.json({ success: true, data: updated, message: 'Đã xác nhận giá thực tế' });
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

  async cancelPurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      // Actor from JWT — never trust a client-declared name. Display-name storage
      // matches nguoiDuyet on the same model.
      let nguoiHuy: string | undefined;
      const actorUserId = (req as unknown as { user?: { id?: string } }).user?.id;
      if (actorUserId) {
        const user = await prisma.user.findUnique({
          where: { id: actorUserId },
          select: { firstName: true, lastName: true },
        });
        if (user) nguoiHuy = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || undefined;
      }
      const lyDoHuy = (req.body as { lyDoHuy?: string } | undefined)?.lyDoHuy;
      const updated = await purchaseRequestService.cancelPurchaseRequest(id, { lyDoHuy, nguoiHuy });
      return res.json({ success: true, message: 'Đã hủy yêu cầu mua hàng', data: updated });
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin && req.user?.id) {
        const emp = await prisma.employee.findUnique({ where: { userId: req.user.id }, select: { id: true } });
        if (emp) filters.employeeId = emp.id;
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

