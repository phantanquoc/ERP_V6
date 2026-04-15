import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface SupplyRequestItem {
  id: string;
  supplyRequestId: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai: string;
  fileKemTheo?: string;
  createdAt: string;
  updatedAt: string;
  approvedByEmployeeId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  items: SupplyRequestItem[];
  requestType?: 'material' | 'equipment' | 'manpower' | 'mixed';
  requestTypeLabel?: string;
  supportsProcurementFlow?: boolean;
  purchaseRequests?: { id: string; trangThai: string; maYeuCau: string }[];
  warehouseReceipts?: { id: string; maPhieuNhap: string }[];
}

export type SupplyRequestType = 'material' | 'equipment' | 'manpower' | 'mixed';

export interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  items: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

export interface UpdateSupplyRequestRequest {
  items?: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

class SupplyRequestService {
  async getAllSupplyRequests(
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      requestType?: SupplyRequestType;
    }
  ) {
    const params: any = { page, limit };
    if (filters?.search) {
      params.search = filters.search;
    }
    if (filters?.requestType) {
      params.requestType = filters.requestType;
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

  async updateSupplyRequestStatus(id: string, trangThai: string) {
    const response = await apiClient.patch(`/supply-requests/${id}/status`, { trangThai });
    return response;
  }

  async approveSupplyRequest(id: string) {
    const response = await apiClient.patch(`/supply-requests/${id}/approve`, {});
    return response;
  }

  async rejectSupplyRequest(id: string, rejectionReason?: string) {
    const response = await apiClient.patch(`/supply-requests/${id}/reject`, { rejectionReason });
    return response;
  }

  async deleteSupplyRequest(id: string) {
    const response = await apiClient.delete(`/supply-requests/${id}`);
    return response;
  }

  async exportToExcel(filters?: { search?: string; requestType?: SupplyRequestType }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.requestType) params.append('requestType', filters.requestType);

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
