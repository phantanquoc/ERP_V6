import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface QuotationRequestItem {
  id: string;
  quotationRequestId: string;
  productId: string;
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham?: string;
  yeuCauSanPham?: string;
  quyDongGoi?: string;
  soLuong: number;
  donViTinh: string;
  giaDoiThuBan?: number;
  giaBanGanNhat?: number;
  createdAt: string;
  updatedAt: string;
}

export type QuotationRequestStatus = 'CHO_XU_LY' | 'DANG_BAO_GIA' | 'DA_BAO_GIA' | 'HUY';

export interface QuotationRequest {
  id: string;
  maYeuCauBaoGia: string;
  ngayYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  customerId: string;
  maKhachHang: string;
  tenKhachHang: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  tiGiaUSD?: number;
  ghiChu?: string;
  status: QuotationRequestStatus;
  createdAt: string;
  updatedAt: string;
  items: QuotationRequestItem[];
  // Top-level shortcuts (populated by some endpoints)
  productId?: string;
  tenSanPham?: string;
  soLuong?: number;
  donViTinh?: string;
}

export interface CreateQuotationRequestData {
  maYeuCauBaoGia?: string;
  ngayYeuCau?: string;
  employeeId: string;
  customerId: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  tiGiaUSD?: number;
  ghiChu?: string;
  items: Array<{
    productId: string;
    yeuCauSanPham?: string;
    quyDongGoi?: string;
    soLuong: number;
    donViTinh: string;
    giaDoiThuBan?: number;
    giaBanGanNhat?: number;
  }>;
}

export interface UpdateQuotationRequestData {
  customerId?: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  tiGiaUSD?: number;
  ghiChu?: string;
  items?: Array<{
    productId: string;
    yeuCauSanPham?: string;
    quyDongGoi?: string;
    soLuong: number;
    donViTinh: string;
    giaDoiThuBan?: number;
    giaBanGanNhat?: number;
  }>;
}

export interface PaginatedResponse {
  success: boolean;
  data: QuotationRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse {
  success: boolean;
  data: QuotationRequest;
  message?: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  data: {
    code: string;
  };
}

export const quotationRequestService = {
  async getAllQuotationRequests(page: number = 1, limit: number = 20, search?: string, customerType?: string, status?: string, dateFrom?: string, dateTo?: string, month?: number, year?: number): Promise<PaginatedResponse> {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;
    if (customerType) params.customerType = customerType;
    if (status) params.status = status;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (month) params.month = month;
    if (year) params.year = year;

    const response = await apiClient.get('/quotation-requests', { params });
    return response as unknown as PaginatedResponse;
  },

  async getQuotationRequestById(id: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/quotation-requests/${id}`);
    return response as unknown as SingleResponse;
  },

  async getQuotationRequestByCode(code: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/quotation-requests/code/${code}`);
    return response as unknown as SingleResponse;
  },

  async createQuotationRequest(data: CreateQuotationRequestData): Promise<SingleResponse> {
    const response = await apiClient.post('/quotation-requests', data);
    return response as unknown as SingleResponse;
  },

  async updateQuotationRequest(id: string, data: UpdateQuotationRequestData): Promise<SingleResponse> {
    const response = await apiClient.patch(`/quotation-requests/${id}`, data);
    return response as unknown as SingleResponse;
  },

  async deleteQuotationRequest(id: string): Promise<void> {
    await apiClient.delete(`/quotation-requests/${id}`);
  },

  async cancelQuotationRequest(id: string): Promise<SingleResponse> {
    const response = await apiClient.post(`/quotation-requests/${id}/cancel`, {});
    return response as unknown as SingleResponse;
  },

  async markInProgress(id: string): Promise<SingleResponse> {
    const response = await apiClient.post(`/quotation-requests/${id}/mark-in-progress`, {});
    return response as unknown as SingleResponse;
  },

  async generateQuotationRequestCode(): Promise<GenerateCodeResponse> {
    const response = await apiClient.get('/quotation-requests/generate-code');
    return response as unknown as GenerateCodeResponse;
  },

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/quotation-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-bao-gia-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

