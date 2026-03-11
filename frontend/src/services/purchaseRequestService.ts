 import apiClient from './apiClient';

export interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  trangThai: string;
  supplyRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
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
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'fileKemTheo') {
          formData.append(key, value.toString());
        }
      });
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
    phanLoai?: string;
    tenHangHoa?: string;
    soLuong?: number;
    donViTinh?: string;
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
    file?: File;
  }) {
    const formData = new FormData();

    if (data.phanLoai) formData.append('phanLoai', data.phanLoai);
    if (data.tenHangHoa) formData.append('tenHangHoa', data.tenHangHoa);
    if (data.soLuong !== undefined) formData.append('soLuong', data.soLuong.toString());
    if (data.donViTinh) formData.append('donViTinh', data.donViTinh);
    if (data.mucDichYeuCau) formData.append('mucDichYeuCau', data.mucDichYeuCau);
    if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu);
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    if (data.nguoiDuyet !== undefined) formData.append('nguoiDuyet', data.nguoiDuyet);
    if (data.ngayDuyet) formData.append('ngayDuyet', data.ngayDuyet);

    // Append file if exists
    if (data.file) {
      formData.append('file', data.file);
    }

     const response = await apiClient.put(`/purchase-requests/${id}`, formData);
     return response;
  }

  async deletePurchaseRequest(id: string) {
     const response = await apiClient.delete(`/purchase-requests/${id}`);
     return response;
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);

     const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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

