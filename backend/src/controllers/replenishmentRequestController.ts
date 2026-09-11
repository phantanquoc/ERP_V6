import { Request, Response, NextFunction } from 'express';
import replenishmentRequestService from '@services/replenishmentRequestService';
import { getFileUrl } from '@middlewares/upload';
import type { AuthenticatedRequest } from '@types';
import prisma from '@config/database';

class ReplenishmentRequestController {
  async getAllReplenishmentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const phanLoaiGroup = req.query.phanLoaiGroup as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const supplyRequestId = req.query.supplyRequestId as string | undefined;

      const isAdmin = req.user?.role === 'ADMIN';
      const allDeptIds = [
        req.user?.departmentId,
        ...(req.user?.secondaryDepartments?.map((s) => s.departmentId) ?? []),
      ].filter(Boolean) as string[];

      let isPurchasing = false;
      if (!isAdmin && allDeptIds.length > 0) {
        const depts = await prisma.department.findMany({
          where: { id: { in: allDeptIds } },
          select: { code: true },
        });
        isPurchasing = depts.some((d) => d.code === 'DEPT_PURCHASING');
      }
      const departmentIds = isAdmin || isPurchasing ? undefined : allDeptIds.length > 0 ? allDeptIds : undefined;

      const result = await replenishmentRequestService.getAllReplenishmentRequests(
        page,
        limit,
        search,
        departmentIds,
        month,
        year,
        { phanLoaiGroup, trangThai, supplyRequestId },
      );
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      return next(error);
    }
  }

  async getReplenishmentRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await replenishmentRequestService.getReplenishmentRequestById(req.params.id as string);
      return res.json({ success: true, data: row });
    } catch (error) {
      return next(error);
    }
  }

  async generateReplenishmentRequestCode(_req: Request, res: Response, next: NextFunction) {
    try {
      const code = await replenishmentRequestService.generateReplenishmentRequestCode();
      return res.json({ success: true, data: { code } });
    } catch (error) {
      return next(error);
    }
  }

  async createReplenishmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data: Record<string, unknown> = { ...(req.body as Record<string, unknown>) };
      if (data.items && typeof data.items === 'string') {
        try { data.items = JSON.parse(data.items as string) as unknown; } catch { /* validated by service */ }
      }
      if (req.file) data.fileKemTheo = getFileUrl('replenishment-requests', req.file.filename);

      // Derive the owner from the authenticated user — the warehouse clerk filing the
      // YCBS. Mirrors supplyRequestController: never trust a client-provided employeeId.
      if (req.user?.id) {
        const employee = await prisma.employee.findUnique({
          where: { userId: req.user.id },
          select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
        });
        if (employee?.id) {
          data.employeeId = employee.id;
          data.maNhanVien = employee.employeeCode ?? '';
          const fullName = `${(employee.user as { firstName?: string; lastName?: string } | undefined)?.lastName ?? ''} ${employee.user?.firstName ?? ''}`.trim();
          data.tenNhanVien = fullName || employee.employeeCode || '';
        }
      }

      const created = await replenishmentRequestService.createFromSupplyRequest({
        employeeId: (data.employeeId as string) ?? '',
        maNhanVien: (data.maNhanVien as string) ?? '',
        tenNhanVien: (data.tenNhanVien as string) ?? '',
        mucDichYeuCau: (data.mucDichYeuCau as string) ?? '',
        mucDoUuTien: (data.mucDoUuTien as string) ?? 'Trung bình',
        ghiChu: data.ghiChu as string | undefined,
        items: (data.items as { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[]) ?? [],
        supplyRequestId: data.supplyRequestId as string | undefined,
        phanLoaiGroup: data.phanLoaiGroup as string | undefined,
      } as any);

      return res.status(201).json({ success: true, message: 'Tạo yêu cầu bổ sung thành công', data: created });
    } catch (error) {
      return next(error);
    }
  }

  async updateReplenishmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data: Record<string, unknown> = { ...(req.body as Record<string, unknown>) };
      if (data.items && typeof data.items === 'string') {
        // Malformed items JSON: leave data.items as-is and let the service reject it
        // with a clear ValidationError, instead of silently dropping the payload.
        try { data.items = JSON.parse(data.items as string) as unknown; } catch { /* handled downstream */ }
      }
      if (req.file) data.fileKemTheo = getFileUrl('replenishment-requests', req.file.filename);
      (data as Record<string, unknown>).__actorUserId = req.user?.id;
      const row = await replenishmentRequestService.updateReplenishmentRequest(id, data as any);
      return res.json({ success: true, message: 'Cập nhật yêu cầu bổ sung thành công', data: row });
    } catch (error) {
      return next(error);
    }
  }

  async convertToPurchaseRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      // Resolve actor employee id
      let actorEmployeeId: string | undefined;
      if (req.user?.id) {
        const emp = await prisma.employee.findUnique({ where: { userId: req.user.id }, select: { id: true } });
        actorEmployeeId = emp?.id;
      }
      const row = await replenishmentRequestService.convertToPurchaseRequest(id, actorEmployeeId);
      return res.json({ success: true, message: 'Đã chuyển YCBS thành YCMH', data: row });
    } catch (error) {
      return next(error);
    }
  }

  async cancelReplenishmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await replenishmentRequestService.cancelReplenishmentRequest(req.params.id as string);
      return res.json({ success: true, message: 'Đã hủy yêu cầu bổ sung', data: row });
    } catch (error) {
      return next(error);
    }
  }

  async deleteReplenishmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await replenishmentRequestService.deleteReplenishmentRequest(req.params.id as string);
      return res.json({ success: true, message: 'Đã xóa yêu cầu bổ sung', data: result });
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const phanLoaiGroup = req.query.phanLoaiGroup as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const supplyRequestId = req.query.supplyRequestId as string | undefined;

      const isAdmin = req.user?.role === 'ADMIN';
      const allDeptIds = [
        req.user?.departmentId,
        ...(req.user?.secondaryDepartments?.map((s) => s.departmentId) ?? []),
      ].filter(Boolean) as string[];
      let isPurchasing = false;
      if (!isAdmin && allDeptIds.length > 0) {
        const depts = await prisma.department.findMany({ where: { id: { in: allDeptIds } }, select: { code: true } });
        isPurchasing = depts.some((d) => d.code === 'DEPT_PURCHASING');
      }
      const departmentIds = isAdmin || isPurchasing ? undefined : allDeptIds.length > 0 ? allDeptIds : undefined;

      const wb = await replenishmentRequestService.exportToExcel(search, departmentIds, month, year, { phanLoaiGroup, trangThai, supplyRequestId });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="ycbs.xlsx"');
      await wb.xlsx.write(res);
      return res.end();
    } catch (error) {
      return next(error);
    }
  }
}

export default new ReplenishmentRequestController();
