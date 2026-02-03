import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_URL = `${API_BASE}/quotation-calculators`;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

// Interface for general cost group (bảng chi phí chung)
export interface GeneralCostGroupData {
  id: string;
  tenBangChiPhi: string;
  selectedCosts: QuotationCalculatorCostData[];
  selectedProducts: string[]; // Danh sách sản phẩm được chọn cho bảng này
}

// Interface matching backend
export interface QuotationCalculatorData {
  quotationRequestId: string;
  maYeuCauBaoGia: string;
  phanTramThue?: number;
  phanTramQuy?: number;
  products: QuotationCalculatorProductData[];
  generalCosts: QuotationCalculatorCostData[];
  exportCosts: QuotationCalculatorCostData[];
  generalCostGroups?: GeneralCostGroupData[]; // Lưu thông tin các bảng chi phí chung (Chi phí chung 1, Chi phí chung 2, ...)
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
  thoiGianChoPhepToiDa?: number;
  ngayBatDauSanXuat?: Date | string;
  ngayHoanThanhThucTe?: Date | string;
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
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/quotation-request/${quotationRequestId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Create or update calculator
  async upsertCalculator(data: QuotationCalculatorData) {
    const token = getAuthToken();
    const response = await axios.post(API_URL, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Delete calculator
  async deleteCalculator(quotationRequestId: string) {
    const token = getAuthToken();
    const response = await axios.delete(`${API_URL}/quotation-request/${quotationRequestId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Create quotation from calculator
  async createQuotationFromCalculator(
    quotationRequestId: string,
    data: {
      hieuLucBaoGia?: number;
      tinhTrang?: string;
      ghiChu?: string;
      employeeId?: string;
      tenNhanVien?: string;
    }
  ) {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_URL}/quotation-request/${quotationRequestId}/create-quotation`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
}

export default new QuotationCalculatorService();

