import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import repairRequestService from '@services/repairRequestService';
import { getFileUrl } from '@middlewares/upload';

class RepairRequestController {
  async getAllRepairRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await repairRequestService.getAllRepairRequests(page, limit);

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
      const data = {
        ngayThang: new Date(req.body.ngayThang),
        maYeuCau: req.body.maYeuCau,
        tenHeThong: req.body.tenHeThong,
        tinhTrangThietBi: req.body.tinhTrangThietBi,
        loaiLoi: req.body.loaiLoi,
        mucDoUuTien: req.body.mucDoUuTien,
        noiDungLoi: req.body.noiDungLoi,
        ghiChu: req.body.ghiChu,
        trangThai: req.body.trangThai,
        fileDinhKem: req.file ? getFileUrl('repair-requests', req.file.filename) : undefined,
      };

      const request = await repairRequestService.createRepairRequest(data);

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
      const data: any = {
        tenHeThong: req.body.tenHeThong,
        tinhTrangThietBi: req.body.tinhTrangThietBi,
        loaiLoi: req.body.loaiLoi,
        mucDoUuTien: req.body.mucDoUuTien,
        noiDungLoi: req.body.noiDungLoi,
        ghiChu: req.body.ghiChu,
        trangThai: req.body.trangThai,
      };

      if (req.body.ngayThang) {
        data.ngayThang = new Date(req.body.ngayThang);
      }

      if (req.file) {
        data.fileDinhKem = getFileUrl('repair-requests', req.file.filename);
      }

      const updated = await repairRequestService.updateRepairRequest(id, data);

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
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
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
      const code = repairRequestService.generateRepairRequestCode();
      res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RepairRequestController();

