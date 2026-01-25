import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/quotations`;

// TypeScript Interfaces
export interface QuotationItem {
  id?: string;
  tenThanhPham: string;
  tiLe: number;
  khoiLuongTuongUng?: number;
}

export interface Quotation {
  id: string;
  maBaoGia: string;
  ngayBaoGia: string;
  quotationRequestId: string;
  maYeuCauBaoGia: string;
  customerId: string;
  maKhachHang: string;
  tenKhachHang: string;
  productId: string;
  tenSanPham: string;
  khoiLuong: number;
  donViTinh: string;
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
  giaBaoKhach?: number;
  thoiGianGiaoHang?: number;
  hieuLucBaoGia?: number;
  employeeId?: string;
  tenNhanVien?: string;
  tinhTrang: 'DRAFT' | 'DANG_CHO_PHAN_HOI' | 'DANG_CHO_GUI_DON_HANG' | 'DA_DAT_HANG' | 'KHONG_DAT_HANG' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
}

export interface CreateQuotationRequest {
  maBaoGia?: string;
  quotationRequestId: string;
  materialStandardId?: string;
  tiLeThuHoi?: number;
  sanPhamDauRa?: string;
  thanhPhamTonKho?: number;
  tongThanhPhamCanSxThem?: number;
  tongNguyenLieuCanSanXuat?: number;
  nguyenLieuTonKho?: number;
  nguyenLieuCanNhapThem?: number;
  tinhTrang?: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  ghiChu?: string;
  items?: QuotationItem[];
}

export interface UpdateQuotationRequest {
  materialStandardId?: string;
  tiLeThuHoi?: number;
  sanPhamDauRa?: string;
  thanhPhamTonKho?: number;
  tongThanhPhamCanSxThem?: number;
  tinhTrang?: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  ghiChu?: string;
  items?: QuotationItem[];
}

interface PaginatedResponse {
  success: boolean;
  data: Quotation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleResponse {
  success: boolean;
  data: Quotation;
  message?: string;
}

interface GenerateCodeResponse {
  success: boolean;
  data: {
    code: string;
  };
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const quotationService = {
  async getAllQuotations(page: number = 1, limit: number = 10, search?: string, customerType?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    if (customerType) {
      params.append('customerType', customerType);
    }

    const response = await axios.get(`${API_URL}?${params.toString()}`, getAuthHeader());
    return response.data;
  },

  async getQuotationById(id: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async createQuotation(data: CreateQuotationRequest): Promise<SingleResponse> {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  },

  async updateQuotation(id: string, data: UpdateQuotationRequest): Promise<SingleResponse> {
    const response = await axios.patch(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  },

  async deleteQuotation(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  },

  async generateQuotationCode(): Promise<GenerateCodeResponse> {
    const response = await axios.get(`${API_URL}/generate-code`, getAuthHeader());
    return response.data;
  },
};

