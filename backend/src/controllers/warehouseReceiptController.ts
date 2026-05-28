import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere, nextStaticCode, staticCodeWhere } from '../utils/codeGenerator';
import supplyRequestService from '../services/supplyRequestService';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';

export const generateReceiptCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseReceipt.findFirst({
      where: { maPhieuNhap: yearlyCodeWhere('PN', year) },
      orderBy: { maPhieuNhap: 'desc' },
      select: { maPhieuNhap: true },
    });
    const code = nextYearlyCode(last?.maPhieuNhap ?? null, 'PN', year);
    res.status(200).json({ success: true, data: { code } });
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
      loaiSanPham,
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
        const lastProduct = await prisma.internationalProduct.findFirst({
          where: { maSanPham: staticCodeWhere('SP') },
          orderBy: { maSanPham: 'desc' },
          select: { maSanPham: true },
        });
        const maSanPham = nextStaticCode(lastProduct?.maSanPham ?? null, 'SP');

        product = await prisma.internationalProduct.create({
          data: { maSanPham, tenSanPham, donViTinh, loaiSanPham: loaiSanPham || undefined },
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

    try {
      await notificationService.notify(NotificationEvent.WAREHOUSE_RECEIPT_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: receipt.id,
        metadata: { maPhieuNhap, soLuongNhap: soLuongNhapFloat, donViTinh, tenSanPham },
      });
    } catch {}

    // Trigger supply request status advancement (after response sent)
    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId).catch((err) => {
        console.error('Error in onWarehouseDocumentCreated:', err);
      });
    }
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

// Batch create warehouse receipts (multiple items at once)
export const batchCreateWarehouseReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, supplyRequestId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Vui lòng thêm ít nhất một sản phẩm' });
      return;
    }

    const results: any[] = [];

    for (const item of items) {
      const { maPhieuNhap, employeeId, maNhanVien, tenNhanVien, warehouseId, tenKho, lotId, tenLo, tenSanPham, soLuongNhap, donViTinh, ghiChu, loaiSanPham: itemLoaiSanPham } = item;

      if (!warehouseId || !lotId || !tenSanPham || soLuongNhap === undefined) {
        continue;
      }

      const soLuongNhapFloat = parseFloat(soLuongNhap.toString());
      let resolvedLotProductId: string;
      let soLuongTruoc = 0;

      let product = await prisma.internationalProduct.findFirst({
        where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
      });

      if (!product) {
        const lastProduct = await prisma.internationalProduct.findFirst({
          where: { maSanPham: staticCodeWhere('SP') },
          orderBy: { maSanPham: 'desc' },
          select: { maSanPham: true },
        });
        const maSanPham = nextStaticCode(lastProduct?.maSanPham ?? null, 'SP');
        product = await prisma.internationalProduct.create({
          data: { maSanPham, tenSanPham, donViTinh, loaiSanPham: itemLoaiSanPham || undefined },
        });
      }

      let lotProduct = await prisma.lotProduct.findFirst({
        where: { lotId, internationalProductId: product.id },
      });

      if (lotProduct) {
        soLuongTruoc = lotProduct.soLuong;
        resolvedLotProductId = lotProduct.id;
      } else {
        lotProduct = await prisma.lotProduct.create({
          data: { lotId, internationalProductId: product.id, soLuong: 0, donViTinh: donViTinh || product.donViTinh || 'Kg' },
        });
        soLuongTruoc = 0;
        resolvedLotProductId = lotProduct.id;
      }

      const soLuongSau = soLuongTruoc + soLuongNhapFloat;

      const [receipt] = await prisma.$transaction([
        prisma.warehouseReceipt.create({
          data: {
            maPhieuNhap, employeeId, maNhanVien, tenNhanVien,
            warehouseId, tenKho, lotId, tenLo,
            lotProductId: resolvedLotProductId, tenSanPham,
            soLuongTruoc, soLuongNhap: soLuongNhapFloat, soLuongSau,
            donViTinh, ghiChu,
            ...(supplyRequestId ? { supplyRequestId } : {}),
          },
        }),
        prisma.lotProduct.update({
          where: { id: resolvedLotProductId },
          data: { soLuong: soLuongSau },
        }),
      ]);

      results.push(receipt);
    }

    res.status(201).json({
      success: true,
      data: results,
      message: `Đã tạo ${results.length} phiếu nhập kho thành công`,
    });

    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId).catch((err) => {
        console.error('Error in onWarehouseDocumentCreated:', err);
      });
    }
  } catch (error) {
    next(error);
  }
};

