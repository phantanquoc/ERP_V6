import { Request, Response } from 'express';
import repairRequestService from '@services/repairRequestService';

class RepairRequestController {
  async getAllRepairRequests(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await repairRequestService.getAllRepairRequests(page, limit);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách yêu cầu sửa chữa',
      });
    }
  }

  async getRepairRequestById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const request = await repairRequestService.getRepairRequestById(id);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin yêu cầu sửa chữa',
      });
    }
  }

  async createRepairRequest(req: Request, res: Response) {
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
        fileDinhKem: req.file ? `/uploads/repair-requests/${req.file.filename}` : undefined,
      };

      const request = await repairRequestService.createRepairRequest(data);

      return res.status(201).json({
        success: true,
        data: request,
        message: 'Tạo yêu cầu sửa chữa thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo yêu cầu sửa chữa',
      });
    }
  }

  async updateRepairRequest(req: Request, res: Response) {
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
        data.fileDinhKem = `/uploads/repair-requests/${req.file.filename}`;
      }

      const updated = await repairRequestService.updateRepairRequest(id, data);

      return res.json({
        success: true,
        data: updated,
        message: 'Cập nhật yêu cầu sửa chữa thành công',
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật yêu cầu sửa chữa',
      });
    }
  }

  async deleteRepairRequest(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      await repairRequestService.deleteRepairRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu sửa chữa thành công',
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi xóa yêu cầu sửa chữa',
      });
    }
  }

  async generateCode(_req: Request, res: Response) {
    try {
      const code = repairRequestService.generateRepairRequestCode();
      return res.json({
        success: true,
        data: { code },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo mã yêu cầu',
      });
    }
  }
}

export default new RepairRequestController();

