import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ProductionReport {
  id: string;
  ngayThang: string;
  tongSoTuaSanXuat: number;
  soMeTua: number;
  tongSoMeKeHoach: number;
  soMeThucTe: number;
  maDinhMuc: string;
  tongKhoiLuongNguyenLieu: number;
  tongKhoiLuongThanhPhamDinhMuc: number;
  khoiLuongThanhPhamThucTe: number;
  chenhLechKhoiLuong: number;
  danhGiaChenhLech: string;
  nguyenNhanChenhLech: string;
  deXuatDieuChinh: string;
  fileDinhKem?: string;
  nguoiThucHien: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionReportCreateInput {
  ngayThang: string;
  tongSoTuaSanXuat?: number;
  soMeTua?: number;
  tongSoMeKeHoach?: number;
  soMeThucTe?: number;
  maDinhMuc?: string;
  tongKhoiLuongNguyenLieu?: number;
  tongKhoiLuongThanhPhamDinhMuc?: number;
  khoiLuongThanhPhamThucTe?: number;
  danhGiaChenhLech?: string;
  nguyenNhanChenhLech?: string;
  deXuatDieuChinh?: string;
  fileDinhKem?: string;
  nguoiThucHien?: string;
}

export interface ProductionReportUpdateInput extends Partial<ProductionReportCreateInput> {}

export interface ProductionReportListResponse {
  data: ProductionReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ProductionReportService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAll(page: number = 1, limit: number = 10): Promise<ProductionReportListResponse> {
    const response = await axios.get(`${API_BASE_URL}/production-reports`, {
      params: { page, limit },
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async getById(id: string): Promise<ProductionReport> {
    const response = await axios.get(`${API_BASE_URL}/production-reports/${id}`, {
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async create(data: ProductionReportCreateInput): Promise<ProductionReport> {
    const response = await axios.post(`${API_BASE_URL}/production-reports`, data, {
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async update(id: string, data: ProductionReportUpdateInput): Promise<ProductionReport> {
    const response = await axios.put(`${API_BASE_URL}/production-reports/${id}`, data, {
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/production-reports/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export default new ProductionReportService();

