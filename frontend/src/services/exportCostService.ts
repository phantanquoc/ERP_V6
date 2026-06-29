 import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';
import { API_BASE_URL } from '../config/api';

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
  success: boolean;
  data: ExportCost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExportCostDetailResponse {
  success: boolean;
  data: ExportCost;
  message?: string;
}

class ExportCostService {
  async getAllExportCosts(page: number = 1, limit: number = 20, search?: string, loaiChiPhi?: string): Promise<ExportCostResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }
    if (loaiChiPhi) {
      params.append('loaiChiPhi', loaiChiPhi);
    }

    const response = await apiClient.get(`/export-costs?${params.toString()}`);
    return response as unknown as ExportCostResponse;
  }

  async getExportCostById(id: string): Promise<ExportCost> {
    const response = await apiClient.get(`/export-costs/${id}`) as unknown as ExportCostDetailResponse;
    return response.data;
  }

  async createExportCost(data: CreateExportCostInput): Promise<ExportCost> {
    const response = await apiClient.post('/export-costs', data) as unknown as ExportCostDetailResponse;
    return response.data;
  }

  async updateExportCost(id: string, data: UpdateExportCostInput): Promise<ExportCost> {
    const response = await apiClient.put(`/export-costs/${id}`, data) as unknown as ExportCostDetailResponse;
    return response.data;
  }

  async deleteExportCost(id: string): Promise<void> {
     await apiClient.delete(`/export-costs/${id}`);
  }

  async exportToExcel(): Promise<void> {
    const url = `${API_BASE_URL}/export-costs/export/excel`;
    await downloadFile(url, `chi-phi-xuat-khau-${Date.now()}.xlsx`);
  }
}

export default new ExportCostService();
