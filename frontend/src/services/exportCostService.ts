import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_URL = `${API_BASE}/export-costs`;

export interface ExportCost {
  id: string;
  maChiPhi: string;
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
  giaThanhNgay?: number;
  donViTien?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExportCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

export interface UpdateExportCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

export interface ExportCostResponse {
  data: ExportCost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class ExportCostService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getAllExportCosts(page: number = 1, limit: number = 10, search?: string): Promise<ExportCostResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await axios.get(`${API_URL}?${params.toString()}`, this.getAuthHeaders());
    return response.data;
  }

  async getExportCostById(id: string): Promise<ExportCost> {
    const response = await axios.get(`${API_URL}/${id}`, this.getAuthHeaders());
    return response.data;
  }

  async createExportCost(data: CreateExportCostInput): Promise<ExportCost> {
    const response = await axios.post(API_URL, data, this.getAuthHeaders());
    return response.data;
  }

  async updateExportCost(id: string, data: UpdateExportCostInput): Promise<ExportCost> {
    const response = await axios.put(`${API_URL}/${id}`, data, this.getAuthHeaders());
    return response.data;
  }

  async deleteExportCost(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, this.getAuthHeaders());
  }

  async exportToExcel(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/export/excel`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export to Excel');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `chi-phi-xuat-khau-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new ExportCostService();

