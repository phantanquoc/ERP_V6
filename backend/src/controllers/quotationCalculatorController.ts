import { Request, Response, NextFunction } from 'express';
import quotationCalculatorService from '../services/quotationCalculatorService';
import logger from '@config/logger';

export const getCalculatorByQuotationRequestId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const calculator = await quotationCalculatorService.getByQuotationRequestId(req.params.quotationRequestId);
    return res.json({ success: true, data: calculator });
  } catch (error) {
    return next(error);
  }
};

export const upsertCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    logger.debug('Received upsertCalculator request');
    logger.debug('Products count:', data.products?.length);
    if (data.products && data.products.length > 0) {
      data.products.forEach((p: any, i: number) => {
        logger.debug(`Product ${i} thực tế fields:`, {
          tongKhoiLuongThanhPhamThucTe: p.tongKhoiLuongThanhPhamThucTe,
          thanhPhamTonKhoThucTe: p.thanhPhamTonKhoThucTe,
          tongThanhPhamCanSxThemThucTe: p.tongThanhPhamCanSxThemThucTe,
          tongNguyenLieuCanSanXuatThucTe: p.tongNguyenLieuCanSanXuatThucTe,
          loiNhuanCongThemThucTe: p.loiNhuanCongThemThucTe,
        });
      });
    }

    const calculator = await quotationCalculatorService.upsertCalculator(data);
    return res.json({ success: true, data: calculator, message: 'Lưu bảng tính chi phí thành công' });
  } catch (error) {
    return next(error);
  }
};

export const deleteCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quotationCalculatorService.deleteCalculator(req.params.quotationRequestId);
    return res.json({ success: true, message: 'Xóa bảng tính chi phí thành công' });
  } catch (error) {
    return next(error);
  }
};

export const createQuotationFromCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotationRequestId = req.params.quotationRequestId;
    const { hieuLucBaoGia, tinhTrang, ghiChu, employeeId, tenNhanVien } = req.body;

    const quotation = await quotationCalculatorService.createQuotationFromCalculator(
      quotationRequestId,
      { hieuLucBaoGia, tinhTrang, ghiChu, employeeId, tenNhanVien }
    );

    return res.status(201).json({ success: true, data: quotation, message: 'Tạo báo giá thành công' });
  } catch (error: any) {
    if (error.status === 404 || error.status === 400) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return next(error);
  }
};
