 import apiClient from './apiClient';

export interface AcceptanceHandover {
  id: string;
  maNghiemThu: string;
  ngayNghiemThu: string;
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
}

class AcceptanceHandoverService {
  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    try {
      const params: any = { page, limit };
      if (search) {
        params.search = search;
      }

       const response = await apiClient.get('/acceptance-handovers', { params });
       return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách nghiệm thu bàn giao');
    }
  }

  async getAcceptanceHandoverById(id: string) {
    try {
       const response = await apiClient.get(`/acceptance-handovers/${id}`);
       return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy thông tin nghiệm thu bàn giao');
    }
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest, file?: File) {
    try {
      const formData = new FormData();
      
      // Append all fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append file if exists
      if (file) {
        formData.append('file', file);
      }

       const response = await apiClient.post('/acceptance-handovers', formData);
       return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo nghiệm thu bàn giao');
    }
  }

  async updateAcceptanceHandover(id: string, data: Partial<CreateAcceptanceHandoverRequest>, file?: File) {
    try {
      const formData = new FormData();
      
      // Append all fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append file if exists
      if (file) {
        formData.append('file', file);
      }

       const response = await apiClient.put(`/acceptance-handovers/${id}`, formData);
       return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật nghiệm thu bàn giao');
    }
  }

  async deleteAcceptanceHandover(id: string) {
    try {
       const response = await apiClient.delete(`/acceptance-handovers/${id}`);
       return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa nghiệm thu bàn giao');
    }
  }

  async generateCode() {
    try {
       const response = await apiClient.get('/acceptance-handovers/generate-code');
       return (response.data as any).code;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo mã nghiệm thu bàn giao');
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
     const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
     const url = `${API_BASE_URL}/acceptance-handovers/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-nghiem-thu-ban-giao-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new AcceptanceHandoverService();

