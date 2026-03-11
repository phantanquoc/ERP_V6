import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InternationalCustomer {
  id: string;
  maKhachHang: string;
  tenCongTy: string;
  nguoiLienHe: string;
  loaiKhachHang: string;

  // Chung
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  website?: string;
  trangThai: string;
  ngayHopTac?: string;
  doanhThuNam: number;
  soLuongDonHang: number;
  sanPhamChinh?: string;
  ghiChu?: string;

  // Khách hàng quốc tế
  quocGia?: string;
  thanhPho?: string;

  // Khách hàng nội địa
  tinhThanh?: string;
  quanHuyen?: string;
  maSoThue?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInternationalCustomerRequest {
  maKhachHang?: string;
  tenCongTy: string;
  nguoiLienHe: string;
  loaiKhachHang: string;

  // Chung
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  website?: string;
  trangThai?: string;
  ngayHopTac?: string;
  doanhThuNam?: number;
  soLuongDonHang?: number;
  sanPhamChinh?: string;
  ghiChu?: string;

  // Khách hàng quốc tế
  quocGia?: string;
  thanhPho?: string;

  // Khách hàng nội địa
  tinhThanh?: string;
  quanHuyen?: string;
  maSoThue?: string;
}

export interface UpdateInternationalCustomerRequest {
  tenCongTy?: string;
  nguoiLienHe?: string;
  loaiKhachHang?: string;

  // Chung
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  website?: string;
  trangThai?: string;
  ngayHopTac?: string;
  doanhThuNam?: number;
  soLuongDonHang?: number;
  sanPhamChinh?: string;
  ghiChu?: string;

  // Khách hàng quốc tế
  quocGia?: string;
  thanhPho?: string;

  // Khách hàng nội địa
  tinhThanh?: string;
  quanHuyen?: string;
  maSoThue?: string;
}

class InternationalCustomerService {
  async getAllCustomers(page: number = 1, limit: number = 10, search?: string, phanLoaiDiaLy?: string): Promise<PaginatedResponse<InternationalCustomer>> {
    try {
      const response = await apiClient.get('/international-customers', {
        params: { page, limit, search, phanLoaiDiaLy },
      });
      return response as unknown as PaginatedResponse<InternationalCustomer>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomerById(id: string): Promise<InternationalCustomer> {
    try {
      const response = await apiClient.get(`/international-customers/${id}`);
      return response.data as unknown as InternationalCustomer;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomerByCode(code: string): Promise<InternationalCustomer> {
    try {
      const response = await apiClient.get(`/international-customers/code/${code}`);
      return response.data as unknown as InternationalCustomer;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(data: CreateInternationalCustomerRequest): Promise<InternationalCustomer> {
    try {
      const response = await apiClient.post('/international-customers', data);
      return response.data as unknown as InternationalCustomer;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(id: string, data: UpdateInternationalCustomerRequest): Promise<InternationalCustomer> {
    try {
      const response = await apiClient.patch(`/international-customers/${id}`, data);
      return response.data as unknown as InternationalCustomer;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      await apiClient.delete(`/international-customers/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateCustomerCode(type: 'international' | 'domestic' = 'international'): Promise<string> {
    try {
      const response = await apiClient.post('/international-customers/generate-code', { type });
      return (response.data as any).code;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }

  async exportToExcel(filters?: { search?: string; phanLoaiDiaLy?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.phanLoaiDiaLy) params.append('phanLoaiDiaLy', filters.phanLoaiDiaLy);

    const url = `${API_BASE_URL}/international-customers/export/excel${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to export to Excel');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-khach-hang-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new InternationalCustomerService();

