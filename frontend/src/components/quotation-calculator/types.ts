import { MaterialStandard } from '../../services/materialStandardService';
import { ProductionProcess } from '../../services/productionProcessService';
import { InternationalProduct } from '../../services/internationalProductService';

// ─── Shared cost item ────────────────────────────────────────────────────────

export interface SelectedCostItem {
  id: string;
  costId: string;
  tenChiPhi: string;
  donViTinh?: string;
  keHoach: number;
  thucTe: number;
  // USD / exchange-rate fields (export costs only)
  keHoachUSD?: number;
  thucTeUSD?: number;
  tiGiaKeHoach?: number;
  tiGiaThucTe?: number;
}

// ─── General cost group ──────────────────────────────────────────────────────

export interface GeneralCostGroup {
  id: string;
  tenBangChiPhi: string;
  selectedCosts: SelectedCostItem[];
  selectedProducts: string[];
}

// ─── Main product tab form data ──────────────────────────────────────────────

export interface MainTabFormData {
  maBaoGia: string;
  maDinhMuc: string;
  tenDinhMuc: string;
  tiLeThuHoi: string;
  sanPhamDauRa: string;
  nguyenLieuDauVao: string;
  thanhPhamTonKho: string;
  tongThanhPhamCanSxThem: string;
  tongNguyenLieuCanSanXuat: string;
  nguyenLieuTonKho: string;
  nguyenLieuCanNhapThem: string;
  // Actual fields
  tongKhoiLuongThanhPhamThucTe: string;
  thanhPhamTonKhoThucTe: string;
  tongThanhPhamCanSxThemThucTe: string;
  tongNguyenLieuCanSanXuatThucTe: string;
  ghiChu: string;
  thoiGianChoPhepToiDa: string;
  ngayBatDauSanXuat: string;
  ngayBatDauSanXuatThucTe: string;
  ngayHoanThanhThucTe: string;
  chiPhiSanXuatKeHoach: string;
  chiPhiSanXuatThucTe: string;
  chiPhiChungKeHoach: string;
  chiPhiChungThucTe: string;
  chiPhiXuatKhauKeHoach: string;
  chiPhiXuatKhauThucTe: string;
  giaHoaVon: string;
  loiNhuanCongThem: string;
  loiNhuanCongThemThucTe: string;
  giaHoaVonSanPhamPhu: { [tenSanPham: string]: string };
  tiLeThuHoiThucTe: { [tenSanPham: string]: string };
  giaHoaVonSanPhamPhuThucTe: { [tenSanPham: string]: string };
  tiGiaUSD: string;
}

// ─── Main product tab ────────────────────────────────────────────────────────

export interface MainTab {
  selectedStandard: MaterialStandard | null;
  selectedProcess: ProductionProcess | null;
  formData: MainTabFormData;
}

// ─── Additional cost tab form data ───────────────────────────────────────────

export interface AdditionalTabFormData {
  maBaoGia: string;
  maDinhMuc: string;
  tenDinhMuc: string;
  tiLeThuHoi: string;
  sanPhamDauRa: string;
  nguyenLieuDauVao: string;
  thanhPhamTonKho: string;
  tongThanhPhamCanSxThem: string;
  tongNguyenLieuCanSanXuat: string;
  nguyenLieuTonKho: string;
  nguyenLieuCanNhapThem: string;
  tongKhoiLuongThanhPhamThucTe: string;
  thanhPhamTonKhoThucTe: string;
  tongThanhPhamCanSxThemThucTe: string;
  tongNguyenLieuCanSanXuatThucTe: string;
  ghiChu: string;
  thoiGianChoPhepToiDa: string;
  ngayBatDauSanXuat: string;
  ngayBatDauSanXuatThucTe: string;
  ngayHoanThanhThucTe: string;
  chiPhiSanXuatKeHoach: string;
  chiPhiSanXuatThucTe: string;
  chiPhiChungKeHoach: string;
  chiPhiChungThucTe: string;
  chiPhiXuatKhauKeHoach: string;
  chiPhiXuatKhauThucTe: string;
  giaHoaVon: string;
  loiNhuanCongThem: string;
  giaHoaVonSanPhamPhu: { [tenSanPham: string]: string };
  soLuong: string;
  donViTinh: string;
  tiGiaUSD: string;
}

// ─── Additional cost tab ─────────────────────────────────────────────────────

export interface AdditionalCostTab {
  id: string;
  tenChiPhiBoSung: string;
  selectedProduct: InternationalProduct | null;
  selectedProductType: string;
  selectedStandard: MaterialStandard | null;
  selectedProcess: ProductionProcess | null;
  formData: AdditionalTabFormData;
}

// ─── Inventory check result ──────────────────────────────────────────────────

export interface InventoryItem {
  tenKho: string;
  tenLo: string;
  soLuong: number;
  giaThanh: number;
  donViTinh: string;
}

export interface InventoryCheckResult {
  show: boolean;
  loading: boolean;
  productName: string;
  materialName: string;
  items: InventoryItem[];
  materialItems: InventoryItem[];
}

// ─── Quotation form data ─────────────────────────────────────────────────────

export interface QuotationFormData {
  hieuLucBaoGia: string;
  tinhTrang: string;
  ghiChu: string;
}
