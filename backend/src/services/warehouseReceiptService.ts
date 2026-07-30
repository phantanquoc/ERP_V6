import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import { suggestAvailableProductCodeFor, UNCLASSIFIED_CATEGORY } from '@utils/productCode';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';

interface CreateReceiptInput {
  maPhieuNhap: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId?: string;
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh?: string;
  ghiChu?: string;
  supplyRequestId?: string;
  loaiSanPham?: string;
}

interface UpdateReceiptInput {
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh?: string;
  ghiChu?: string;
}

class WarehouseReceiptService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseReceipt.findFirst({
      where: { maPhieuNhap: yearlyCodeWhere('PN', year) },
      orderBy: { maPhieuNhap: 'desc' },
      select: { maPhieuNhap: true },
    });
    return nextYearlyCode(last?.maPhieuNhap ?? null, 'PN', year);
  }

  async getAll() {
    const receipts = await prisma.warehouseReceipt.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return receipts.map((r) => ({
      ...r,
      isLocked: !!r.supplyRequestId,
    }));
  }

  async getById(id: string) {
    const receipt = await prisma.warehouseReceipt.findUnique({ where: { id } });
    if (!receipt) {
      throw Object.assign(new Error('Không tìm thấy phiếu nhập kho'), { status: 404 });
    }
    return receipt;
  }

  async create(input: CreateReceiptInput) {
    const soLuongNhapFloat = parseFloat(input.soLuongNhap.toString());
    let resolvedLotProductId = input.lotProductId;
    let soLuongTruoc = 0;

    if (resolvedLotProductId) {
      const lotProduct = await prisma.lotProduct.findUnique({
        where: { id: resolvedLotProductId },
      });
      soLuongTruoc = lotProduct?.soLuong || 0;
    } else {
      const resolved = await this.resolveOrCreateLotProduct(input.lotId, input.tenSanPham, input.donViTinh, input.loaiSanPham);
      resolvedLotProductId = resolved.id;
      soLuongTruoc = resolved.soLuong;
    }

    const soLuongSau = soLuongTruoc + soLuongNhapFloat;

    const [receipt] = await prisma.$transaction([
      prisma.warehouseReceipt.create({
        data: {
          maPhieuNhap: input.maPhieuNhap,
          employeeId: input.employeeId,
          maNhanVien: input.maNhanVien ?? '',
          tenNhanVien: input.tenNhanVien ?? '',
          warehouseId: input.warehouseId,
          tenKho: input.tenKho ?? '',
          lotId: input.lotId,
          tenLo: input.tenLo ?? '',
          lotProductId: resolvedLotProductId!,
          tenSanPham: input.tenSanPham,
          soLuongTruoc,
          soLuongNhap: soLuongNhapFloat,
          soLuongSau,
          donViTinh: input.donViTinh ?? '',
          ghiChu: input.ghiChu,
          ...(input.supplyRequestId ? { supplyRequestId: input.supplyRequestId } : {}),
        },
      }),
      prisma.lotProduct.update({
        where: { id: resolvedLotProductId! },
        data: { soLuong: soLuongSau },
      }),
    ]);

    return receipt;
  }

  async update(id: string, input: UpdateReceiptInput) {
    const existing = await prisma.warehouseReceipt.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }

    // Lock check: supply-request-linked receipts cannot be edited
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }

    const soLuongNhapFloat = parseFloat(input.soLuongNhap.toString());

    return prisma.$transaction(async (tx) => {
      // 1. Reverse original impact on original lotProduct
      const originalLotProduct = await tx.lotProduct.findUnique({ where: { id: existing.lotProductId } });
      if (!originalLotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô gốc');
      }

      const reversedQty = originalLotProduct.soLuong - existing.soLuongNhap;
      if (reversedQty < 0) {
        throw new ValidationError('Số lượng tồn kho không đủ để hoàn tác phiếu nhập');
      }

      await tx.lotProduct.update({
        where: { id: existing.lotProductId },
        data: { soLuong: reversedQty },
      });

      // 2. Apply new impact on target lotProduct (may be different)
      const targetLotProduct = await tx.lotProduct.findUnique({ where: { id: input.lotProductId } });
      if (!targetLotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô đích');
      }

      // If same lotProduct, use the reversed quantity as base
      const currentQty = input.lotProductId === existing.lotProductId
        ? reversedQty
        : targetLotProduct.soLuong;

      const soLuongTruoc = currentQty;
      const soLuongSau = currentQty + soLuongNhapFloat;

      await tx.lotProduct.update({
        where: { id: input.lotProductId },
        data: { soLuong: soLuongSau },
      });

      // 3. Update the receipt record with recomputed snapshots and denormalized fields
      const updatedReceipt = await tx.warehouseReceipt.update({
        where: { id },
        data: {
          warehouseId: input.warehouseId,
          tenKho: input.tenKho ?? '',
          lotId: input.lotId,
          tenLo: input.tenLo ?? '',
          lotProductId: input.lotProductId,
          tenSanPham: input.tenSanPham,
          soLuongNhap: soLuongNhapFloat,
          soLuongTruoc,
          soLuongSau,
          donViTinh: input.donViTinh ?? '',
          ghiChu: input.ghiChu,
        },
      });

      return updatedReceipt;
    });
  }

  async delete(id: string) {
    const existing = await prisma.warehouseReceipt.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }

    // Lock check
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }

    return prisma.$transaction(async (tx) => {
      // Reverse: subtract soLuongNhap back from lotProduct
      const lotProduct = await tx.lotProduct.findUnique({ where: { id: existing.lotProductId } });
      if (!lotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô');
      }

      const newQty = lotProduct.soLuong - existing.soLuongNhap;
      if (newQty < 0) {
        throw new ValidationError('Số lượng tồn kho không đủ để xóa phiếu nhập');
      }

      await tx.lotProduct.update({
        where: { id: existing.lotProductId },
        data: { soLuong: newQty },
      });

      // Delete the receipt
      await tx.warehouseReceipt.delete({ where: { id } });

      return { id };
    });
  }

  async batchCreate(items: CreateReceiptInput[], supplyRequestId?: string) {
    const results: any[] = [];

    for (const item of items) {
      if (!item.warehouseId || !item.lotId || !item.tenSanPham || item.soLuongNhap === undefined) {
        continue;
      }
      const receipt = await this.create({ ...item, supplyRequestId });
      results.push(receipt);
    }

    return results;
  }

  async resolveOrCreateLotProduct(lotId: string, tenSanPham: string, donViTinh?: string, loaiSanPham?: string) {
    let product = await prisma.internationalProduct.findFirst({
      where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
    });

    if (!product) {
      // Codes follow LOAI-STT-TENVIETTAT, and the prefix is derived from the category.
      // Both callers pass one, but the parameter is optional — rather than invent a
      // category that is not in the standard list (which is what produced the current
      // Nguyên liệu / Nguyên vật liệu drift), mark it explicitly so it shows up as
      // needing review instead of hiding inside a plausible-looking category.
      const resolvedLoai = loaiSanPham || UNCLASSIFIED_CATEGORY;
      const maSanPham = await suggestAvailableProductCodeFor(prisma, {
        tenSanPham,
        loaiSanPham: resolvedLoai,
      });
      product = await prisma.internationalProduct.create({
        data: { maSanPham, tenSanPham, donViTinh, loaiSanPham: resolvedLoai },
      });
    }

    let lotProduct = await prisma.lotProduct.findFirst({
      where: { lotId, internationalProductId: product.id },
    });

    if (lotProduct) {
      return { id: lotProduct.id, soLuong: lotProduct.soLuong };
    }

    lotProduct = await prisma.lotProduct.create({
      data: {
        lotId,
        internationalProductId: product.id,
        soLuong: 0,
        donViTinh: donViTinh || product.donViTinh || 'Kg',
      },
    });
    // Auto-generate maKien from lot tenLo + last 4 chars of id
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    const autoMaKien = `${lot?.tenLo ?? lotId.slice(-4)}-${lotProduct.id.slice(-4)}`;
    lotProduct = await prisma.lotProduct.update({
      where: { id: lotProduct.id },
      data: { maKien: autoMaKien },
    });
    return { id: lotProduct.id, soLuong: 0 };
  }
}

export default new WarehouseReceiptService();
