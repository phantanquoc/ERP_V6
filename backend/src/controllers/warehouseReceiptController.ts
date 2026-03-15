import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';

// Generate unique receipt code
export const generateReceiptCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};

// Create warehouse receipt
export const createWarehouseReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      lotProductId: inputLotProductId,
      tenSanPham,
      soLuongNhap,
      donViTinh,
      ghiChu,
      supplyRequestId,
    } = req.body;

    if (!maPhieuNhap || !employeeId || !warehouseId || !lotId || !tenSanPham || soLuongNhap === undefined || soLuongNhap === null) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
      });
      return;
    }

    const soLuongNhapFloat = parseFloat(soLuongNhap.toString());
    let resolvedLotProductId = inputLotProductId;
    let soLuongTruoc = 0;

    if (resolvedLotProductId) {
      // Trường hợp có lotProductId (nhập kho thông thường từ WarehouseReceiptTab)
      const lotProduct = await prisma.lotProduct.findUnique({
        where: { id: resolvedLotProductId },
      });
      soLuongTruoc = lotProduct?.soLuong || 0;
    } else {
      // Trường hợp nhập kho từ yêu cầu cung cấp — tự tìm/tạo sản phẩm trong lô
      // 1. Tìm hoặc tạo InternationalProduct theo tenSanPham
      let product = await prisma.internationalProduct.findFirst({
        where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
      });

      if (!product) {
        // Tạo mã sản phẩm mới
        const lastProduct = await prisma.internationalProduct.findFirst({
          where: { maSanPham: { startsWith: 'SP-' } },
          orderBy: { maSanPham: 'desc' },
        });
        let sequence = 1;
        if (lastProduct) {
          const seqStr = lastProduct.maSanPham.replace('SP-', '');
          if (seqStr) sequence = parseInt(seqStr, 10) + 1;
        }
        const maSanPham = `SP-${String(sequence).padStart(3, '0')}`;

        product = await prisma.internationalProduct.create({
          data: { maSanPham, tenSanPham, donViTinh },
        });
      }

      // 2. Tìm LotProduct trong lô theo internationalProductId
      let lotProduct = await prisma.lotProduct.findFirst({
        where: { lotId, internationalProductId: product.id },
      });

      if (lotProduct) {
        // Sản phẩm đã tồn tại trong lô → cộng số lượng
        soLuongTruoc = lotProduct.soLuong;
        resolvedLotProductId = lotProduct.id;
      } else {
        // Sản phẩm chưa có trong lô → tạo mới LotProduct với số lượng 0
        lotProduct = await prisma.lotProduct.create({
          data: {
            lotId,
            internationalProductId: product.id,
            soLuong: 0,
            donViTinh: donViTinh || product.donViTinh || 'Kg',
          },
        });
        soLuongTruoc = 0;
        resolvedLotProductId = lotProduct.id;
      }
    }

    const soLuongSau = soLuongTruoc + soLuongNhapFloat;

    // Tạo phiếu nhập và cập nhật số lượng trong transaction
    const [receipt] = await prisma.$transaction([
      prisma.warehouseReceipt.create({
        data: {
          maPhieuNhap,
          employeeId,
          maNhanVien,
          tenNhanVien,
          warehouseId,
          tenKho,
          lotId,
          tenLo,
          lotProductId: resolvedLotProductId,
          tenSanPham,
          soLuongTruoc,
          soLuongNhap: soLuongNhapFloat,
          soLuongSau,
          donViTinh,
          ghiChu,
          ...(supplyRequestId ? { supplyRequestId } : {}),
        },
      }),
      prisma.lotProduct.update({
        where: { id: resolvedLotProductId },
        data: { soLuong: soLuongSau },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'Tạo phiếu nhập kho thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Get all warehouse receipts
export const getAllWarehouseReceipts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};

