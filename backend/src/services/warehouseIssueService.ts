import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import reorderRuleService from './reorderRuleService';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';

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

interface UpdateIssueInput {
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongXuat: number;
  donViTinh?: string;
  ghiChu?: string;
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
    const issues = await prisma.warehouseIssue.findMany({
      orderBy: { ngayXuat: 'desc' },
      include: { materialEvaluation: { select: { id: true } } },
    });
    return issues.map((issue) => {
      const { materialEvaluation, ...rest } = issue;
      return {
        ...rest,
        isLocked: !!issue.supplyRequestId || !!materialEvaluation,
      };
    });
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

  async update(id: string, input: UpdateIssueInput) {
    const existing = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: { materialEvaluation: { select: { id: true } } },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }

    // Lock check: supply-request-linked OR material-evaluation-generated
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }
    if (existing.materialEvaluation) {
      throw new ConflictError('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
    }

    const soLuongXuatFloat = parseFloat(input.soLuongXuat.toString());

    return prisma.$transaction(async (tx) => {
      // 1. Reverse original impact: add back soLuongXuat to original lotProduct
      const originalLotProduct = await tx.lotProduct.findUnique({ where: { id: existing.lotProductId } });
      if (!originalLotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô gốc');
      }

      const refundedQty = originalLotProduct.soLuong + existing.soLuongXuat;
      await tx.lotProduct.update({
        where: { id: existing.lotProductId },
        data: { soLuong: refundedQty },
      });

      // 2. Apply new impact on target lotProduct (may be different)
      const targetLotProduct = await tx.lotProduct.findUnique({ where: { id: input.lotProductId } });
      if (!targetLotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô đích');
      }

      // If same lotProduct, use the refunded quantity as base
      const currentQty = input.lotProductId === existing.lotProductId
        ? refundedQty
        : targetLotProduct.soLuong;

      if (currentQty < soLuongXuatFloat) {
        throw new ValidationError(`Số lượng tồn kho không đủ. Tồn kho hiện tại: ${currentQty} ${targetLotProduct.donViTinh}`);
      }

      const soLuongTruoc = currentQty;
      const soLuongSau = currentQty - soLuongXuatFloat;

      await tx.lotProduct.update({
        where: { id: input.lotProductId },
        data: { soLuong: soLuongSau },
      });

      // 3. Update the issue record
      const updatedIssue = await tx.warehouseIssue.update({
        where: { id },
        data: {
          warehouseId: input.warehouseId,
          tenKho: input.tenKho ?? '',
          lotId: input.lotId,
          tenLo: input.tenLo ?? '',
          lotProductId: input.lotProductId,
          tenSanPham: input.tenSanPham,
          soLuongXuat: soLuongXuatFloat,
          soLuongTruoc,
          soLuongSau,
          donViTinh: input.donViTinh ?? '',
          ghiChu: input.ghiChu,
        },
      });

      return updatedIssue;
    });
  }

  async delete(id: string) {
    const existing = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: { materialEvaluation: { select: { id: true } } },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }

    // Lock check
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }
    if (existing.materialEvaluation) {
      throw new ConflictError('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
    }

    return prisma.$transaction(async (tx) => {
      // Reverse: add soLuongXuat back to lotProduct
      const lotProduct = await tx.lotProduct.findUnique({ where: { id: existing.lotProductId } });
      if (!lotProduct) {
        throw new ValidationError('Không tìm thấy sản phẩm trong lô');
      }

      const newQty = lotProduct.soLuong + existing.soLuongXuat;
      await tx.lotProduct.update({
        where: { id: existing.lotProductId },
        data: { soLuong: newQty },
      });

      // Delete the issue
      await tx.warehouseIssue.delete({ where: { id } });

      return { id };
    });
  }
}

export default new WarehouseIssueService();
