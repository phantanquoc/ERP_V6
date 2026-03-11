import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export const quotationService = {
  async getAllQuotations(page: number = 1, limit: number = 10, search?: string, customerType?: string): Promise<PaginatedResponse> {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;
    if (customerType) params.customerType = customerType;

    const response = await apiClient.get('/quotations', { params });
    return response as unknown as PaginatedResponse;
  },

  async getQuotationById(id: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/quotations/${id}`);
    return response as unknown as SingleResponse;
  },

  async createQuotation(data: CreateQuotationRequest): Promise<SingleResponse> {
    const response = await apiClient.post('/quotations', data);
    return response as unknown as SingleResponse;
  },

  async updateQuotation(id: string, data: UpdateQuotationRequest): Promise<SingleResponse> {
    const response = await apiClient.patch(`/quotations/${id}`, data);
    return response as unknown as SingleResponse;
  },

  async deleteQuotation(id: string): Promise<void> {
    await apiClient.delete(`/quotations/${id}`);
  },

  async generateQuotationCode(): Promise<GenerateCodeResponse> {
    const response = await apiClient.get('/quotations/generate-code');
    return response as unknown as GenerateCodeResponse;
  },

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/quotations/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-bao-gia-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

