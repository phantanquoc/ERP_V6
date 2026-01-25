import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

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

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const quotationRequestService = {
  async getAllQuotationRequests(page: number = 1, limit: number = 10, search?: string, customerType?: string): Promise<PaginatedResponse> {
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

  async getQuotationRequestById(id: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async getQuotationRequestByCode(code: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/code/${code}`, getAuthHeader());
    return response.data;
  },

  async createQuotationRequest(data: CreateQuotationRequestData): Promise<SingleResponse> {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  },

  async updateQuotationRequest(id: string, data: UpdateQuotationRequestData): Promise<SingleResponse> {
    const response = await axios.patch(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  },

  async deleteQuotationRequest(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  },

  async generateQuotationRequestCode(): Promise<GenerateCodeResponse> {
    const response = await axios.get(`${API_URL}/generate-code`, getAuthHeader());
    return response.data;
  },
};

