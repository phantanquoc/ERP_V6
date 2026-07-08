import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere, nextStaticCode, staticCodeWhere } from '../utils/codeGenerator';

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
    return prisma.warehouseReceipt.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
    return { id: lotProduct.id, soLuong: 0 };
  }
}

export default new WarehouseReceiptService();
