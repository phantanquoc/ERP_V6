import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  productId: string;
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham?: string;
  yeuCauSanPham?: string;
  quyDongGoi?: string;
  soLuong: number;
  donViTinh: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  giaDoiThuBan?: number;
  giaBanGanNhat?: number;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotationRequestData {
  maYeuCauBaoGia?: string;
  ngayYeuCau?: string;
  employeeId: string;
  customerId: string;
  productId: string;
  yeuCauSanPham?: string;
  quyDongGoi?: string;
  soLuong: number;
  donViTinh: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  giaDoiThuBan?: number;
  giaBanGanNhat?: number;
  ghiChu?: string;
}

export interface UpdateQuotationRequestData {
  customerId?: string;
  productId?: string;
  yeuCauSanPham?: string;
  quyDongGoi?: string;
  soLuong?: number;
  donViTinh?: string;
  hinhThucVanChuyen?: string;
  hinhThucThanhToan?: string;
  quocGia?: string;
  cangDen?: string;
  giaDoiThuBan?: number;
  giaBanGanNhat?: number;
  ghiChu?: string;
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
  async getAllQuotationRequests(page: number = 1, limit: number = 10, search?: string, customerType?: string): Promise<PaginatedResponse> {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;
    if (customerType) params.customerType = customerType;

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

