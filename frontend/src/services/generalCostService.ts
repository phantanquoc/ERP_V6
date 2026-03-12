 import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';

export interface GeneralCost {
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

export interface CreateGeneralCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

export interface UpdateGeneralCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
  giaTri?: number;
  ghiChu?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

export interface GeneralCostResponse {
  data: GeneralCost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class GeneralCostService {
  async getAllGeneralCosts(page: number = 1, limit: number = 10, search?: string): Promise<GeneralCostResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

     const response = await apiClient.get(`/general-costs?${params.toString()}`);
     return response as unknown as GeneralCostResponse;
  }

  async getGeneralCostById(id: string): Promise<GeneralCost> {
     const response = await apiClient.get(`/general-costs/${id}`);
     return response as unknown as GeneralCost;
  }

  async createGeneralCost(data: CreateGeneralCostInput): Promise<GeneralCost> {
     const response = await apiClient.post('/general-costs', data);
     return response as unknown as GeneralCost;
  }

  async updateGeneralCost(id: string, data: UpdateGeneralCostInput): Promise<GeneralCost> {
     const response = await apiClient.put(`/general-costs/${id}`, data);
     return response as unknown as GeneralCost;
  }

  async deleteGeneralCost(id: string): Promise<void> {
     await apiClient.delete(`/general-costs/${id}`);
  }

  async exportToExcel(): Promise<void> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/general-costs/export/excel`;
    await downloadFile(url, `chi-phi-chung-${Date.now()}.xlsx`);
  }
}

export default new GeneralCostService();

