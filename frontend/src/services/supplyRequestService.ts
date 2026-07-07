import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface SupplyRequestItem {
  id: string;
  supplyRequestId: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  fulfilledQty?: number;
  fulfillmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyRequestDecision {
  id: string;
  supplyRequestItemId: string;
  decision: string;
  fulfilledQty: number;
  shortageQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  decidedAt: string;
  triggeredPurchaseRequestId?: string;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    tenGoi: string;
    phanLoai: string;
    soLuong: number;
    donViTinh: string;
  };
}

export interface PartialFulfillPayload {
  fulfilledQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  routeShortageToPurchase?: boolean;
  lotProductId?: string;
  warehouseId?: string;
  lotId?: string;
  autoCreateProduct?: boolean;
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
  loaiYeuCau?: string;
  soTien?: number;
  createdAt: string;
  updatedAt: string;
  items: SupplyRequestItem[];
  purchaseRequests?: { id: string; trangThai: string; maYeuCau: string }[];
  warehouseReceipts?: { id: string; maPhieuNhap: string }[];
}

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
  loaiYeuCau?: string;
  soTien?: number;
}

export interface UpdateSupplyRequestRequest {
  items?: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
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

  async markMuaNhanhAsPurchased(id: string, soTien?: number) {
    const response = await apiClient.patch(`/supply-requests/${id}/mark-purchased`, { soTien });
    return response;
  }

  async partialFulfillItem(itemId: string, payload: PartialFulfillPayload) {
    const response = await apiClient.patch(
      `/supply-requests/items/${itemId}/partial-fulfill`,
      payload
    );
    return response;
  }

  async getDecisionHistory(supplyRequestId: string) {
    const response = await apiClient.get(`/supply-requests/${supplyRequestId}/decisions`);
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
