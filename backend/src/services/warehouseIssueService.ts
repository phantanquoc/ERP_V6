import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import reorderRuleService from './reorderRuleService';

interface CreateIssueInput {
  maPhieuXuat: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongXuat: number;
  donViTinh?: string;
  ghiChu?: string;
  supplyRequestId?: string;
}

class WarehouseIssueService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseIssue.findFirst({
      where: { maPhieuXuat: yearlyCodeWhere('PX', year) },
      orderBy: { maPhieuXuat: 'desc' },
      select: { maPhieuXuat: true },
    });
    return nextYearlyCode(last?.maPhieuXuat ?? null, 'PX', year);
  }

  async getAll() {
    return prisma.warehouseIssue.findMany({ orderBy: { ngayXuat: 'desc' } });
  }

  async getById(id: string) {
    const issue = await prisma.warehouseIssue.findUnique({ where: { id } });
    if (!issue) {
      throw Object.assign(new Error('Không tìm thấy phiếu xuất kho'), { status: 404 });
    }
    return issue;
  }

  async create(input: CreateIssueInput) {
    const lotProduct = await prisma.lotProduct.findUnique({ where: { id: input.lotProductId } });

    if (!lotProduct) {
      throw Object.assign(new Error('Không tìm thấy sản phẩm trong lô'), { status: 404 });
    }

    if (lotProduct.soLuong < input.soLuongXuat) {
      throw Object.assign(new Error(`Số lượng tồn kho không đủ. Tồn kho hiện tại: ${lotProduct.soLuong} ${lotProduct.donViTinh}`), { status: 400 });
    }

    const soLuongTruoc = lotProduct.soLuong;
    const soLuongSau = soLuongTruoc - input.soLuongXuat;

    const [warehouseIssue] = await prisma.$transaction([
      prisma.warehouseIssue.create({
        data: {
          maPhieuXuat: input.maPhieuXuat,
          employeeId: input.employeeId,
          maNhanVien: input.maNhanVien ?? '',
          tenNhanVien: input.tenNhanVien ?? '',
          warehouseId: input.warehouseId,
          tenKho: input.tenKho ?? '',
          lotId: input.lotId,
          tenLo: input.tenLo ?? '',
          lotProductId: input.lotProductId,
          tenSanPham: input.tenSanPham,
          soLuongTruoc,
          soLuongXuat: input.soLuongXuat,
          soLuongSau,
          donViTinh: input.donViTinh ?? '',
          ghiChu: input.ghiChu,
          supplyRequestId: input.supplyRequestId || null,
        },
      }),
      prisma.lotProduct.update({
        where: { id: input.lotProductId },
        data: { soLuong: soLuongSau },
      }),
    ]);

    // Trigger reorder-rule check (fire-and-forget; swallows its own errors)
    reorderRuleService.checkAndNotify(lotProduct.internationalProductId).catch((err) => {
      console.error('reorderRuleService.checkAndNotify failed:', err);
    });

    return warehouseIssue;
  }
}

export default new WarehouseIssueService();
