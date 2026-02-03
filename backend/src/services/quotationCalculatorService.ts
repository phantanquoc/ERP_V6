import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface for creating/updating quotation calculator
export interface QuotationCalculatorData {
  quotationRequestId: string;
  maYeuCauBaoGia: string;
  phanTramThue?: number;
  phanTramQuy?: number;
  products: QuotationCalculatorProductData[];
  generalCosts: QuotationCalculatorCostData[];
  exportCosts: QuotationCalculatorCostData[];
  generalCostGroups?: any[]; // Lưu thông tin các bảng chi phí chung (Chi phí chung 1, Chi phí chung 2, ...)
}

export interface QuotationCalculatorProductData {
  quotationRequestItemId: string;
  productId: string;
  tenSanPham: string;
  soLuong: number;
  donViTinh: string;
  maBaoGia: string;
  materialStandardId?: string;
  maDinhMuc?: string;
  tenDinhMuc?: string;
  tiLeThuHoi?: number;
  sanPhamDauRa?: string;
  thanhPhamTonKho?: number;
  tongThanhPhamCanSxThem?: number;
  tongNguyenLieuCanSanXuat?: number;
  nguyenLieuTonKho?: number;
  nguyenLieuCanNhapThem?: number;
  productionProcessId?: string;
  maQuyTrinhSanXuat?: string;
  tenQuyTrinhSanXuat?: string;
  flowchartData?: any; // Lưu flowchart đã chỉnh sửa
  thoiGianChoPhepToiDa?: number;
  ngayBatDauSanXuat?: Date;
  ngayHoanThanhThucTe?: number; // Số ngày hoàn thành thực tế (có thể là số thập phân)
  chiPhiSanXuatKeHoach?: number;
  chiPhiSanXuatThucTe?: number;
  chiPhiChungKeHoach?: number;
  chiPhiChungThucTe?: number;
  chiPhiXuatKhauKeHoach?: number;
  chiPhiXuatKhauThucTe?: number;
  giaHoaVon?: number;
  loiNhuanCongThem?: number;
  ghiChu?: string;
  byProducts?: { tenSanPham: string; giaHoaVon: number }[];
  isAdditionalCost?: boolean; // Flag để đánh dấu chi phí bổ sung
  tenChiPhiBoSung?: string; // Tên chi phí bổ sung
  originalTabId?: string; // ID gốc của tab để sử dụng khi load lại
}

export interface QuotationCalculatorCostData {
  costId: string;
  maChiPhi: string;
  tenChiPhi: string;
  donViTinh?: string;
  keHoach: number;
  thucTe: number;
}

class QuotationCalculatorService {
  // Get calculator by quotation request ID
  async getByQuotationRequestId(quotationRequestId: string) {
    const calculator = await prisma.quotationCalculator.findUnique({
      where: { quotationRequestId },
      include: {
        products: {
          include: {
            byProducts: true,
          },
        },
        generalCosts: true,
        exportCosts: true,
      },
    });

    return calculator;
  }

  // Create or update calculator
  async upsertCalculator(data: QuotationCalculatorData) {
    // Check if calculator already exists
    const existing = await prisma.quotationCalculator.findUnique({
      where: { quotationRequestId: data.quotationRequestId },
    });

    if (existing) {
      // Update existing calculator
      return await this.updateCalculator(existing.id, data);
    } else {
      // Create new calculator
      return await this.createCalculator(data);
    }
  }

  // Create new calculator
  private async createCalculator(data: QuotationCalculatorData) {
    // Ensure generalCostGroups is properly formatted for JSON storage
    const generalCostGroupsToSave = data.generalCostGroups && data.generalCostGroups.length > 0
      ? data.generalCostGroups
      : Prisma.JsonNull;

    const calculator = await prisma.quotationCalculator.create({
      data: {
        quotationRequestId: data.quotationRequestId,
        maYeuCauBaoGia: data.maYeuCauBaoGia,
        phanTramThue: data.phanTramThue,
        phanTramQuy: data.phanTramQuy,
        generalCostGroupsData: generalCostGroupsToSave,
        products: {
          create: data.products.map(product => ({
            quotationRequestItemId: product.quotationRequestItemId,
            productId: product.productId,
            tenSanPham: product.tenSanPham,
            soLuong: product.soLuong,
            donViTinh: product.donViTinh,
            maBaoGia: product.maBaoGia,
            materialStandardId: product.materialStandardId,
            maDinhMuc: product.maDinhMuc,
            tenDinhMuc: product.tenDinhMuc,
            tiLeThuHoi: product.tiLeThuHoi,
            sanPhamDauRa: product.sanPhamDauRa,
            thanhPhamTonKho: product.thanhPhamTonKho,
            tongThanhPhamCanSxThem: product.tongThanhPhamCanSxThem,
            tongNguyenLieuCanSanXuat: product.tongNguyenLieuCanSanXuat,
            nguyenLieuTonKho: product.nguyenLieuTonKho,
            nguyenLieuCanNhapThem: product.nguyenLieuCanNhapThem,
            productionProcessId: product.productionProcessId,
            maQuyTrinhSanXuat: product.maQuyTrinhSanXuat,
            tenQuyTrinhSanXuat: product.tenQuyTrinhSanXuat,
            flowchartData: product.flowchartData || null,
            thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa,
            ngayBatDauSanXuat: product.ngayBatDauSanXuat,
            ngayHoanThanhThucTe: product.ngayHoanThanhThucTe,
            chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach,
            chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe,
            chiPhiChungKeHoach: product.chiPhiChungKeHoach,
            chiPhiChungThucTe: product.chiPhiChungThucTe,
            chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach,
            chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe,
            giaHoaVon: product.giaHoaVon,
            loiNhuanCongThem: product.loiNhuanCongThem,
            ghiChu: product.ghiChu,
            isAdditionalCost: product.isAdditionalCost || false,
            tenChiPhiBoSung: product.tenChiPhiBoSung,
            originalTabId: product.originalTabId,
            byProducts: product.byProducts ? {
              create: product.byProducts,
            } : undefined,
          })),
        },
        generalCosts: {
          create: data.generalCosts.map(cost => ({
            generalCostId: cost.costId,
            maChiPhi: cost.maChiPhi,
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
        },
        exportCosts: {
          create: data.exportCosts.map(cost => ({
            exportCostId: cost.costId,
            maChiPhi: cost.maChiPhi,
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
        },
      },
      include: {
        products: {
          include: {
            byProducts: true,
          },
        },
        generalCosts: true,
        exportCosts: true,
      },
    });

    return calculator;
  }

  // Update existing calculator
  private async updateCalculator(calculatorId: string, data: QuotationCalculatorData) {
    // Ensure generalCostGroups is properly formatted for JSON storage
    const generalCostGroupsToSave = data.generalCostGroups && data.generalCostGroups.length > 0
      ? data.generalCostGroups
      : Prisma.JsonNull;

    // Delete existing products, costs
    await prisma.quotationCalculatorProduct.deleteMany({
      where: { calculatorId },
    });
    await prisma.quotationCalculatorGeneralCost.deleteMany({
      where: { calculatorId },
    });
    await prisma.quotationCalculatorExportCost.deleteMany({
      where: { calculatorId },
    });

    // Update calculator with new data
    const calculator = await prisma.quotationCalculator.update({
      where: { id: calculatorId },
      data: {
        phanTramThue: data.phanTramThue,
        phanTramQuy: data.phanTramQuy,
        generalCostGroupsData: generalCostGroupsToSave,
        products: {
          create: data.products.map(product => ({
            quotationRequestItemId: product.quotationRequestItemId,
            productId: product.productId,
            tenSanPham: product.tenSanPham,
            soLuong: product.soLuong,
            donViTinh: product.donViTinh,
            maBaoGia: product.maBaoGia,
            materialStandardId: product.materialStandardId,
            maDinhMuc: product.maDinhMuc,
            tenDinhMuc: product.tenDinhMuc,
            tiLeThuHoi: product.tiLeThuHoi,
            sanPhamDauRa: product.sanPhamDauRa,
            thanhPhamTonKho: product.thanhPhamTonKho,
            tongThanhPhamCanSxThem: product.tongThanhPhamCanSxThem,
            tongNguyenLieuCanSanXuat: product.tongNguyenLieuCanSanXuat,
            nguyenLieuTonKho: product.nguyenLieuTonKho,
            nguyenLieuCanNhapThem: product.nguyenLieuCanNhapThem,
            productionProcessId: product.productionProcessId,
            maQuyTrinhSanXuat: product.maQuyTrinhSanXuat,
            tenQuyTrinhSanXuat: product.tenQuyTrinhSanXuat,
            flowchartData: product.flowchartData || null,
            thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa,
            ngayBatDauSanXuat: product.ngayBatDauSanXuat,
            ngayHoanThanhThucTe: product.ngayHoanThanhThucTe,
            chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach,
            chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe,
            chiPhiChungKeHoach: product.chiPhiChungKeHoach,
            chiPhiChungThucTe: product.chiPhiChungThucTe,
            chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach,
            chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe,
            giaHoaVon: product.giaHoaVon,
            loiNhuanCongThem: product.loiNhuanCongThem,
            ghiChu: product.ghiChu,
            isAdditionalCost: product.isAdditionalCost || false,
            tenChiPhiBoSung: product.tenChiPhiBoSung,
            originalTabId: product.originalTabId,
            byProducts: product.byProducts ? {
              create: product.byProducts,
            } : undefined,
          })),
        },
        generalCosts: {
          create: data.generalCosts.map(cost => ({
            generalCostId: cost.costId,
            maChiPhi: cost.maChiPhi,
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
        },
        exportCosts: {
          create: data.exportCosts.map(cost => ({
            exportCostId: cost.costId,
            maChiPhi: cost.maChiPhi,
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
        },
      },
      include: {
        products: {
          include: {
            byProducts: true,
          },
        },
        generalCosts: true,
        exportCosts: true,
      },
    });

    return calculator;
  }

  // Delete calculator
  async deleteCalculator(quotationRequestId: string) {
    await prisma.quotationCalculator.delete({
      where: { quotationRequestId },
    });
  }
}

export default new QuotationCalculatorService();

