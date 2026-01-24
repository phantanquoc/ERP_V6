import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate unique receipt code
export const generateReceiptCode = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `PN${year}${month}${day}`;
    
    const lastReceipt = await prisma.warehouseReceipt.findFirst({
      where: {
        maPhieuNhap: {
          startsWith: prefix,
        },
      },
      orderBy: {
        maPhieuNhap: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastReceipt) {
      const lastNumber = parseInt(lastReceipt.maPhieuNhap.slice(-4));
      nextNumber = lastNumber + 1;
    }

    const code = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    res.status(200).json({
      success: true,
      data: { code },
    });
  } catch (error: any) {
    console.error('Error generating receipt code:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã phiếu nhập',
    });
  }
};

// Create warehouse receipt
export const createWarehouseReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      maPhieuNhap,
      employeeId,
      maNhanVien,
      tenNhanVien,
      warehouseId,
      tenKho,
      lotId,
      tenLo,
      lotProductId,
      tenSanPham,
      soLuongNhap,
      donViTinh,
      ghiChu,
    } = req.body;

    if (!maPhieuNhap || !employeeId || !warehouseId || !lotId || !lotProductId || soLuongNhap === undefined || soLuongNhap === null) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
      });
      return;
    }

    // Lấy số lượng hiện tại trước khi nhập
    const lotProduct = await prisma.lotProduct.findUnique({
      where: { id: lotProductId },
    });

    const soLuongTruoc = lotProduct?.soLuong || 0;
    const soLuongNhapFloat = parseFloat(soLuongNhap.toString());
    const soLuongSau = soLuongTruoc + soLuongNhapFloat;

    // Create warehouse receipt với lịch sử biến động
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        maPhieuNhap,
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
        soLuongNhap: soLuongNhapFloat,
        soLuongSau,
        donViTinh,
        ghiChu,
      },
    });

    // Update lot product quantity
    if (lotProduct) {
      await prisma.lotProduct.update({
        where: { id: lotProductId },
        data: {
          soLuong: soLuongSau,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'Tạo phiếu nhập kho thành công',
    });
  } catch (error: any) {
    console.error('Error creating warehouse receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu nhập kho',
    });
  }
};

// Get all warehouse receipts
export const getAllWarehouseReceipts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const receipts = await prisma.warehouseReceipt.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: receipts,
    });
  } catch (error: any) {
    console.error('Error fetching warehouse receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách phiếu nhập kho',
    });
  }
};

