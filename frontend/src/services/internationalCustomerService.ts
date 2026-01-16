import axios from 'axios';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllCustomers(page: number = 1, limit: number = 10, search?: string, phanLoaiDiaLy?: string): Promise<PaginatedResponse<InternationalCustomer>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/international-customers`, {
        params: { page, limit, search, phanLoaiDiaLy },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomerById(id: string): Promise<InternationalCustomer> {
    try {
      const response = await axios.get(`${API_BASE_URL}/international-customers/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomerByCode(code: string): Promise<InternationalCustomer> {
    try {
      const response = await axios.get(`${API_BASE_URL}/international-customers/code/${code}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(data: CreateInternationalCustomerRequest): Promise<InternationalCustomer> {
    try {
      const response = await axios.post(`${API_BASE_URL}/international-customers`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(id: string, data: UpdateInternationalCustomerRequest): Promise<InternationalCustomer> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/international-customers/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/international-customers/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateCustomerCode(): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/international-customers/generate-code`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data.code;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new InternationalCustomerService();

