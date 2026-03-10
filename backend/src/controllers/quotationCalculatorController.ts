import { Request, Response, NextFunction } from 'express';
import quotationCalculatorService from '../services/quotationCalculatorService';
import prisma from '@config/database';
import logger from '@config/logger';

// Get calculator by quotation request ID
export const getCalculatorByQuotationRequestId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotationRequestId = req.params.quotationRequestId as string;

    const calculator = await quotationCalculatorService.getByQuotationRequestId(quotationRequestId);

    // Return success with null data if not found (not an error - just no saved data yet)
    return res.json({
      success: true,
      data: calculator, // Will be null if not found
    });
  } catch (error) {
    return next(error);
  }
};

// Create or update calculator
export const upsertCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    // Debug log để kiểm tra dữ liệu nhận được
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

    return res.json({
      success: true,
      data: calculator,
      message: 'Lưu bảng tính chi phí thành công',
    });
  } catch (error) {
    return next(error);
  }
};

// Delete calculator
export const deleteCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotationRequestId = req.params.quotationRequestId as string;

    await quotationCalculatorService.deleteCalculator(quotationRequestId);

    return res.json({
      success: true,
      message: 'Xóa bảng tính chi phí thành công',
    });
  } catch (error) {
    return next(error);
  }
};

// Create quotation from calculator
export const createQuotationFromCalculator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotationRequestId = req.params.quotationRequestId as string;
    const { hieuLucBaoGia, tinhTrang, ghiChu, employeeId, tenNhanVien } = req.body;

    // Get calculator data
    const calculator = await quotationCalculatorService.getByQuotationRequestId(quotationRequestId);

    if (!calculator) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng tính chi phí',
      });
    }

    // Get quotation request
    const quotationRequest = await prisma.quotationRequest.findUnique({
      where: { id: quotationRequestId },
      include: {
        items: true,
      },
    });

    if (!quotationRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu báo giá',
      });
    }

    // Generate quotation code from quotation request code
    // Format: BG-{maYeuCauBaoGia}
    // Example: BG-YC-BG001
    const maBaoGia = `BG-${quotationRequest.maYeuCauBaoGia}`;

    // Get first product for main quotation info
    const firstProduct = calculator.products[0];
    if (!firstProduct) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong bảng tính',
      });
    }

    logger.debug('First product data:', {
      giaHoaVon: firstProduct.giaHoaVon,
      loiNhuanCongThem: firstProduct.loiNhuanCongThem,
    });

    // Calculate giaBaoKhach from first product (giaHoaVon + loiNhuanCongThem)
    const giaBaoKhach = (firstProduct.giaHoaVon || 0) + (firstProduct.loiNhuanCongThem || 0);

    logger.debug('Final giaBaoKhach:', giaBaoKhach);

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        maBaoGia,
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        customerId: quotationRequest.customerId,
        maKhachHang: quotationRequest.maKhachHang,
        tenKhachHang: quotationRequest.tenKhachHang,
        productId: firstProduct.productId,
        tenSanPham: firstProduct.tenSanPham,
        khoiLuong: firstProduct.soLuong,
        donViTinh: firstProduct.donViTinh,
        materialStandardId: firstProduct.materialStandardId || null,
        maDinhMuc: firstProduct.maDinhMuc || null,
        tenDinhMuc: firstProduct.tenDinhMuc || null,
        tiLeThuHoi: firstProduct.tiLeThuHoi || null,
        sanPhamDauRa: firstProduct.sanPhamDauRa || null,
        thanhPhamTonKho: firstProduct.thanhPhamTonKho || null,
        tongThanhPhamCanSxThem: firstProduct.tongThanhPhamCanSxThem || null,
        tongNguyenLieuCanSanXuat: firstProduct.tongNguyenLieuCanSanXuat || null,
        nguyenLieuTonKho: firstProduct.nguyenLieuTonKho || null,
        nguyenLieuCanNhapThem: firstProduct.nguyenLieuCanNhapThem || null,
        giaBaoKhach,
        thoiGianGiaoHang: firstProduct.thoiGianChoPhepToiDa || null,
        hieuLucBaoGia: hieuLucBaoGia ? parseInt(hieuLucBaoGia) : null,
        employeeId: employeeId || null,
        tenNhanVien: tenNhanVien || null,
        tinhTrang: tinhTrang || 'DANG_CHO_PHAN_HOI',
        ghiChu: ghiChu || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: quotation,
      message: 'Tạo báo giá thành công',
    });
  } catch (error) {
    return next(error);
  }
};

