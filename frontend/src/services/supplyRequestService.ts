import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface SupplyRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai: string;
  fileKemTheo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

export interface UpdateSupplyRequestRequest {
  phanLoai?: string;
  tenGoi?: string;
  soLuong?: number;
  donViTinh?: string;
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

class SupplyRequestService {
  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    const response = await apiClient.get('/supply-requests', { params });
    return response;
  }

  async getSupplyRequestById(id: string) {
    const response = await apiClient.get(`/supply-requests/${id}`);
    return response;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    const response = await apiClient.post('/supply-requests', data);
    return response;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    const response = await apiClient.put(`/supply-requests/${id}`, data);
    return response;
  }

  async deleteSupplyRequest(id: string) {
    const response = await apiClient.delete(`/supply-requests/${id}`);
    return response;
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);

    const url = `${API_BASE_URL}/supply-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-cung-cap-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new SupplyRequestService();

