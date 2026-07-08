 import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
  supplier?: { id: string; tenNhaCungCap: string; maNhaCungCap: string };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  trangThai: string;
  supplyRequestId?: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
  ghiChuMuaHang?: string;
  supplier?: { id: string; tenNhaCungCap: string; maNhaCungCap: string };
  createdAt: string;
  updatedAt: string;
  items: PurchaseRequestItem[];
}

export interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  items: { phanLoai: string; tenHangHoa: string; soLuong: number; donViTinh: string; nhaCungCapId?: string; giaDuKien?: number }[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
  ghiChuMuaHang?: string;
}

class PurchaseRequestService {
  async getAllPurchaseRequests(page: number = 1, limit: number = 10, search?: string) {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

     const response = await apiClient.get('/purchase-requests', { params });
     return response;
  }

  async getPurchaseRequestById(id: string) {
     const response = await apiClient.get(`/purchase-requests/${id}`);
     return response;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest, file?: File) {
    if (file) {
      const formData = new FormData();
      // Append non-array fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'fileKemTheo' && key !== 'items') {
          formData.append(key, value.toString());
        }
      });
      // Append items as JSON
      if (data.items) {
        formData.append('items', JSON.stringify(data.items));
      }
      formData.append('file', file);
       const response = await apiClient.post('/purchase-requests', formData);
       return response;
    }
     const response = await apiClient.post('/purchase-requests', data);
     return response;
  }

  async generateCode() {
     const response = await apiClient.get('/purchase-requests/generate-code');
     return response;
  }

  async updatePurchaseRequest(id: string, data: {
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
    nhaCungCapId?: string;
    giaDuKien?: number;
    ghiChuMuaHang?: string;
    items?: {
      id?: string;
      phanLoai: string;
      tenHangHoa: string;
      soLuong: number;
      donViTinh: string;
      nhaCungCapId?: string | null;
      giaDuKien?: number | null;
    }[];
    file?: File;
  }) {
    // If file is present, use FormData
    if (data.file) {
      const formData = new FormData();
      if (data.mucDichYeuCau) formData.append('mucDichYeuCau', data.mucDichYeuCau);
      if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
      if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu || '');
      if (data.trangThai) formData.append('trangThai', data.trangThai);
      if (data.nguoiDuyet !== undefined) formData.append('nguoiDuyet', data.nguoiDuyet || '');
      if (data.ngayDuyet) formData.append('ngayDuyet', data.ngayDuyet);
      if (data.nhaCungCapId) formData.append('nhaCungCapId', data.nhaCungCapId);
      if (data.giaDuKien !== undefined) formData.append('giaDuKien', data.giaDuKien.toString());
      if (data.ghiChuMuaHang !== undefined) formData.append('ghiChuMuaHang', data.ghiChuMuaHang || '');
      if (data.items) formData.append('items', JSON.stringify(data.items));
      formData.append('file', data.file);
       const response = await apiClient.put(`/purchase-requests/${id}`, formData);
       return response;
    }
    // JSON update
    const { file: _file, ...jsonData } = data;
     const response = await apiClient.put(`/purchase-requests/${id}`, jsonData);
     return response;
  }

  async deletePurchaseRequest(id: string) {
     const response = await apiClient.delete(`/purchase-requests/${id}`);
     return response;
  }

  async submitForApproval(id: string) {
    const response = await apiClient.post(`/purchase-requests/${id}/submit-approval`, {});
    return response;
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);

     const url = `${API_BASE_URL}/purchase-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-mua-hang-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new PurchaseRequestService();
