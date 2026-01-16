import { Request, Response } from 'express';
import prisma from '@config/database';

// Generate mã phiếu xuất tự động
export const generateIssueCode = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Tìm phiếu xuất cuối cùng trong ngày
    const lastIssue = await prisma.warehouseIssue.findFirst({
      where: {
        maPhieuXuat: {
          startsWith: `PX-${year}${month}${day}`,
        },
      },
      orderBy: {
        maPhieuXuat: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastIssue) {
      const lastNumber = parseInt(lastIssue.maPhieuXuat.split('-').pop() || '0');
      nextNumber = lastNumber + 1;
    }

    const maPhieuXuat = `PX-${year}${month}${day}-${String(nextNumber).padStart(4, '0')}`;

    res.status(200).json({
      success: true,
      data: { maPhieuXuat },
    });
  } catch (error: any) {
    console.error('Error generating issue code:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã phiếu xuất',
      error: error.message,
    });
  }
};

// Tạo phiếu xuất kho
export const createWarehouseIssue = async (req: Request, res: Response): Promise<void> => {
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
          soLuongXuat,
          donViTinh,
          ghiChu,
        },
      }),
      // TRỪ số lượng
      prisma.lotProduct.update({
        where: { id: lotProductId },
        data: {
          soLuong: {
            decrement: soLuongXuat,
          },
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Tạo phiếu xuất kho thành công',
      data: warehouseIssue,
    });
  } catch (error: any) {
    console.error('Error creating warehouse issue:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phiếu xuất kho',
      error: error.message,
    });
  }
};

// Lấy tất cả phiếu xuất kho
export const getAllWarehouseIssues = async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error fetching warehouse issues:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phiếu xuất kho',
      error: error.message,
    });
  }
};

