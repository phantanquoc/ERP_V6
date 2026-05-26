import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import supplyRequestService from '@services/supplyRequestService';

export const generateIssueCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseIssue.findFirst({
      where: { maPhieuXuat: yearlyCodeWhere('PX', year) },
      orderBy: { maPhieuXuat: 'desc' },
      select: { maPhieuXuat: true },
    });
    const maPhieuXuat = nextYearlyCode(last?.maPhieuXuat ?? null, 'PX', year);
    res.status(200).json({ success: true, data: { maPhieuXuat } });
  } catch (error) {
    next(error);
  }
};

// Tạo phiếu xuất kho
export const createWarehouseIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      maPhieuXuat,
      employeeId,
      maNhanVien,
      tenNhanVien,
      warehouseId,
      tenKho,
      lotId,
      tenLo,
      lotProductId,
      tenSanPham,
      soLuongXuat,
      donViTinh,
      ghiChu,
      supplyRequestId,
    } = req.body;

    // Kiểm tra số lượng tồn kho
    const lotProduct = await prisma.lotProduct.findUnique({
      where: { id: lotProductId },
    });

    if (!lotProduct) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong lô',
      });
      return;
    }

    if (lotProduct.soLuong < soLuongXuat) {
      res.status(400).json({
        success: false,
        message: `Số lượng tồn kho không đủ. Tồn kho hiện tại: ${lotProduct.soLuong} ${lotProduct.donViTinh}`,
      });
      return;
    }

    // Tính số lượng trước và sau khi xuất
    const soLuongTruoc = lotProduct.soLuong;
    const soLuongSau = soLuongTruoc - soLuongXuat;

    // Tạo phiếu xuất và TRỪ số lượng trong transaction
    const [warehouseIssue] = await prisma.$transaction([
      prisma.warehouseIssue.create({
        data: {
          maPhieuXuat,
          employeeId,
          maNhanVien,
          tenNhanVien,
          warehouseId,
          tenKho,
          lotId,
          tenLo,
          lotProductId,
          tenSanPham,
          soLuongTruoc,
          soLuongXuat,
          soLuongSau,
          donViTinh,
          ghiChu,
          supplyRequestId: supplyRequestId || null,
        },
      }),
      // TRỪ số lượng
      prisma.lotProduct.update({
        where: { id: lotProductId },
        data: {
          soLuong: soLuongSau,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Tạo phiếu xuất kho thành công',
      data: warehouseIssue,
    });

    // Fire-and-forget: advance supply request workflow if linked
    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId)
        .catch(err => console.error('Error in onWarehouseDocumentCreated:', err));
    }
  } catch (error) {
    next(error);
  }
};

// Lấy tất cả phiếu xuất kho
export const getAllWarehouseIssues = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const issues = await prisma.warehouseIssue.findMany({
      orderBy: {
        ngayXuat: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    next(error);
  }
};

