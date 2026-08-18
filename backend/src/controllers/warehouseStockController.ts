import { Request, Response, NextFunction } from 'express';
import warehouseStockService from '@services/warehouseStockService';

export const receiveSplit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (!body.employeeId) {
      res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
      return;
    }
    const receipt = await warehouseStockService.receiveSplit({
      lotId: body.lotId,
      internationalProductId: body.internationalProductId,
      donViTinh: body.donViTinh,
      soKien: body.soKien,
      tongSoLuong: body.tongSoLuong,
      employeeId: body.employeeId,
      maNhanVien: body.maNhanVien,
      tenNhanVien: body.tenNhanVien,
      mucDich: body.mucDich,
      ghiChu: body.ghiChu,
    });
    res.status(201).json({ success: true, data: receipt, message: 'Nhập hàng chia đều thành công — đã tạo phiếu nhập' });
  } catch (error) {
    next(error);
  }
};

export const issueFifo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (!body.employeeId) {
      res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
      return;
    }
    const issue = await warehouseStockService.issueFifo({
      lotId: body.lotId,
      internationalProductId: body.internationalProductId,
      tongSoLuong: body.tongSoLuong,
      employeeId: body.employeeId,
      maNhanVien: body.maNhanVien,
      tenNhanVien: body.tenNhanVien,
      mucDich: body.mucDich,
      ghiChu: body.ghiChu,
    });
    res.status(201).json({ success: true, data: issue, message: 'Xuất hàng FIFO thành công — đã tạo phiếu xuất' });
  } catch (error) {
    next(error);
  }
};