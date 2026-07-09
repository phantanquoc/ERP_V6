import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineSystemService from '@services/machineSystemService';
import { getFileUrl } from '@middlewares/upload';
import { MachineStatus, MachineSystemCategory } from '@prisma/client';

class MachineSystemController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const filters = {
        search,
        hoatDong: req.query.hoatDong !== undefined ? req.query.hoatDong === 'true' : undefined,
        trangThai: req.query.trangThai as MachineStatus | undefined,
        loaiHeThong: req.query.loaiHeThong as MachineSystemCategory | undefined,
        maHeThongPrefix: req.query.maHeThongPrefix as string | undefined,
        sortBy: req.query.sortBy as 'maHeThong' | 'tenHeThong' | 'createdAt' | 'updatedAt' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await machineSystemService.getAllMachineSystems(page, limit, filters);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = await machineSystemService.getMachineSystemById(req.params.id);
      res.json({ success: true, data: system });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        khuVuc: req.body.khuVuc,
        viTri: req.body.viTri,
        maHeThong: req.body.maHeThong,
        tenHeThong: req.body.tenHeThong,
        chucNang: req.body.chucNang ?? '',
        loaiHeThong: (req.body.loaiHeThong as MachineSystemCategory) || MachineSystemCategory.KHAC,
        maThietBi: req.body.maThietBi,
        tenThietBi: req.body.tenThietBi,
        nhiemVu: req.body.nhiemVu,
        maNguoiThucHien: req.body.maNguoiThucHien,
        nguoiThucHien: req.body.nguoiThucHien,
        hoatDong: req.body.hoatDong !== undefined ? req.body.hoatDong === 'true' || req.body.hoatDong === true : undefined,
        fileDinhKem: req.file ? getFileUrl('machine-systems', req.file.filename) : undefined,
      };

      const system = await machineSystemService.createMachineSystem(data);
      res.status(201).json({ success: true, data: system, message: 'Tạo hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Strip trangThai — status changes must go through POST /:id/status
      const { trangThai: _stripped, ...bodyWithoutStatus } = req.body as Record<string, unknown> & { trangThai?: unknown };

      const data: Record<string, unknown> = {
        khuVuc: bodyWithoutStatus.khuVuc,
        viTri: bodyWithoutStatus.viTri,
        maHeThong: bodyWithoutStatus.maHeThong,
        tenHeThong: bodyWithoutStatus.tenHeThong,
        chucNang: bodyWithoutStatus.chucNang,
        loaiHeThong: bodyWithoutStatus.loaiHeThong as MachineSystemCategory | undefined,
        maThietBi: bodyWithoutStatus.maThietBi,
        tenThietBi: bodyWithoutStatus.tenThietBi,
        nhiemVu: bodyWithoutStatus.nhiemVu,
        maNguoiThucHien: bodyWithoutStatus.maNguoiThucHien,
        nguoiThucHien: bodyWithoutStatus.nguoiThucHien,
      };

      if (bodyWithoutStatus.hoatDong !== undefined) {
        data.hoatDong = bodyWithoutStatus.hoatDong === 'true' || bodyWithoutStatus.hoatDong === true;
      }

      if (req.file) {
        data.fileDinhKem = getFileUrl('machine-systems', req.file.filename);
      }

      const system = await machineSystemService.updateMachineSystem(req.params.id, data);
      res.json({ success: true, data: system, message: 'Cập nhật hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await machineSystemService.deleteMachineSystem(req.params.id);
      res.json({ success: true, message: 'Xóa hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getNextCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const loaiHeThong = req.query.loaiHeThong as MachineSystemCategory;
      if (!loaiHeThong || !Object.values(MachineSystemCategory).includes(loaiHeThong)) {
        res.status(400).json({ success: false, message: 'Loại hệ thống không hợp lệ' });
        return;
      }
      const code = await machineSystemService.getNextCode(loaiHeThong);
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async getDistinctFields(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [khuVuc, viTri] = await Promise.all([
        machineSystemService.getDistinctField('khuVuc'),
        machineSystemService.getDistinctField('viTri'),
      ]);
      res.json({ success: true, data: { khuVuc, viTri } });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workbook = await machineSystemService.exportToExcel();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-he-thong-may-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  async clone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { maHeThong, tenHeThong, khuVuc, viTri } = req.body as {
        maHeThong: string;
        tenHeThong: string;
        khuVuc?: string;
        viTri?: string;
      };

      if (!maHeThong || !tenHeThong) {
        res.status(400).json({ success: false, message: 'maHeThong và tenHeThong là bắt buộc khi nhân bản' });
        return;
      }

      const result = await machineSystemService.clone(req.params.id, { maHeThong, tenHeThong, khuVuc, viTri });
      res.status(201).json({ success: true, data: result, message: 'Nhân bản hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limits = {
        faultRecords: req.query.faultRecords ? parseInt(req.query.faultRecords as string) : undefined,
        repairItems: req.query.repairItems ? parseInt(req.query.repairItems as string) : undefined,
        handoverItems: req.query.handoverItems ? parseInt(req.query.handoverItems as string) : undefined,
        operations: req.query.operations ? parseInt(req.query.operations as string) : undefined,
        maintenanceRecords: req.query.maintenanceRecords ? parseInt(req.query.maintenanceRecords as string) : undefined,
        statusLogs: req.query.statusLogs ? parseInt(req.query.statusLogs as string) : undefined,
      };

      const summary = await machineSystemService.getSummary(req.params.id, limits);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trangThaiMoi, nguyenNhan, ghiChu } = req.body as {
        trangThaiMoi: MachineStatus;
        nguyenNhan: string;
        ghiChu?: string;
      };

      if (!trangThaiMoi || !Object.values(MachineStatus).includes(trangThaiMoi)) {
        res.status(400).json({ success: false, message: 'Trạng thái máy không hợp lệ' });
        return;
      }

      const nguoiCapNhat = req.user
        ? `${(req.user as { lastName?: string }).lastName ?? ''} ${(req.user as { firstName?: string }).firstName ?? ''}`.trim()
        : 'Hệ thống';

      const updated = await machineSystemService.updateStatus(
        req.params.id,
        trangThaiMoi,
        nguyenNhan,
        nguoiCapNhat,
        ghiChu,
      );
      res.json({ success: true, data: updated, message: 'Cập nhật trạng thái máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/machine-systems/active-production
   * Returns machines with loaiHeThong = SAN_XUAT (nồi chiên chân không) and trangThai = HOAT_DONG.
   * SystemOperation only stores frying-specific parameters (maChien, thoiGianChien,
   * khoiLuongDauVao, 4 giai đoạn thời gian/nhiệt độ/áp suất), which are meaningless for
   * DONG_GOI/BAO_QUAN machines — so the "Dữ liệu sản xuất" tabs are scoped to SAN_XUAT only.
   * This is the single source of truth for the "active fryer machine" set used by the
   * frontend (replaces the old regex-based filter).
   */
  async getActiveProductionMachines(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const productionCategories: MachineSystemCategory[] = [
        MachineSystemCategory.SAN_XUAT,
      ];
      const data = await machineSystemService.getActiveProductionMachines(productionCategories);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineSystemController();
