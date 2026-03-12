 import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';

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
  async getAllExportCosts(page: number = 1, limit: number = 10, search?: string): Promise<ExportCostResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

     const response = await apiClient.get(`/export-costs?${params.toString()}`);
     return response as unknown as ExportCostResponse;
  }

  async getExportCostById(id: string): Promise<ExportCost> {
     const response = await apiClient.get(`/export-costs/${id}`);
     return response as unknown as ExportCost;
  }

  async createExportCost(data: CreateExportCostInput): Promise<ExportCost> {
     const response = await apiClient.post('/export-costs', data);
     return response as unknown as ExportCost;
  }

  async updateExportCost(id: string, data: UpdateExportCostInput): Promise<ExportCost> {
     const response = await apiClient.put(`/export-costs/${id}`, data);
     return response as unknown as ExportCost;
  }

  async deleteExportCost(id: string): Promise<void> {
     await apiClient.delete(`/export-costs/${id}`);
  }

  async exportToExcel(): Promise<void> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/export-costs/export/excel`;
    await downloadFile(url, `chi-phi-xuat-khau-${Date.now()}.xlsx`);
  }
}

export default new ExportCostService();

