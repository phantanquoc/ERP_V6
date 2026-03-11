import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Supplier {
  id: string;
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai: string;
  doanhChi?: number;
  employeeId: string;
  employee?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai?: string;
  phanLoaiNCC?: string;
  doanhChi?: number;
  employeeId: string;
}

export interface UpdateSupplierData {
  tenNhaCungCap?: string;
  loaiCungCap?: string;
  quocGia?: string;
  website?: string;
  nguoiLienHe?: string;
  soDienThoai?: string;
  emailLienHe?: string;
  diaChi?: string;
  khaNang?: string;
  loaiHinh?: string;
  trangThai?: string;
  doanhChi?: number;
}

export const supplierService = {
  // Get all suppliers with pagination
  async getAllSuppliers(page: number = 1, limit: number = 10, search?: string, phanLoaiNCC?: string) {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (phanLoaiNCC) params.phanLoaiNCC = phanLoaiNCC;

    const response = await apiClient.get('/suppliers', { params });
    return response;
  },

  // Get supplier by ID
  async getSupplierById(id: string) {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response;
  },

  // Generate next supplier code
  async generateCode(phanLoaiNCC?: string) {
    const params: any = {};
    if (phanLoaiNCC) params.phanLoaiNCC = phanLoaiNCC;
    const response = await apiClient.get('/suppliers/generate-code', { params });
    return response;
  },

  // Create new supplier
  async createSupplier(data: CreateSupplierData) {
    const response = await apiClient.post('/suppliers', data);
    return response;
  },

  // Update supplier
  async updateSupplier(id: string, data: UpdateSupplierData) {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response;
  },

  // Delete supplier
  async deleteSupplier(id: string) {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response;
  },

  // Export suppliers to Excel
  async exportToExcel(filters?: { search?: string; phanLoaiNCC?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.phanLoaiNCC) params.append('phanLoaiNCC', filters.phanLoaiNCC);

    const url = `${API_BASE_URL}/suppliers/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-nha-cung-cap-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

