import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';

export interface FinishedProduct {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  khoiLuong: number;

  // Machine info
  machineId?: string;
  tenMay?: string;
  trangThai?: 'DANG_HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  machine?: {
    id: string;
    tenMay: string;
    maMay: string;
    trangThai: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  };

  // Thành phẩm A
  aKhoiLuong: number;
  aTiLe: number;

  // Thành phẩm B
  bKhoiLuong: number;
  bTiLe: number;

  // Thành phẩm B Dầu
  bDauKhoiLuong: number;
  bDauTiLe: number;

  // Thành phẩm C
  cKhoiLuong: number;
  cTiLe: number;

  // Vụn lớn
  vunLonKhoiLuong: number;
  vunLonTiLe: number;

  // Vụn nhỏ
  vunNhoKhoiLuong: number;
  vunNhoTiLe: number;

  // Phế phẩm
  phePhamKhoiLuong: number;
  phePhamTiLe: number;

  // Ướt
  uotKhoiLuong: number;
  uotTiLe: number;

  tongKhoiLuong: number;
  fileDinhKem?: string;
  nguoiThucHien: string;

  createdAt?: string;
  updatedAt?: string;
}

interface FinishedProductResponse {
  success: boolean;
  data: FinishedProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

class FinishedProductService {
  private buildFormData(data: Record<string, any>, file?: File): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'fileDinhKem') {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });
    if (file) {
      formData.append('file', file);
    }
    return formData;
  }

  async getAllFinishedProducts(page: number = 1, limit: number = 10, tenMay?: string): Promise<{ data: FinishedProduct[], pagination: any }> {
    try {
      const params: any = { page, limit };
      if (tenMay) {
        params.tenMay = tenMay;
      }

      const response = await apiClient.get<FinishedProductResponse>('/finished-products', { params });
      return {
        data: (response as any).data,
        pagination: (response as any).pagination,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getFinishedProductById(id: string): Promise<FinishedProduct> {
    try {
      const response = await apiClient.get<FinishedProduct>(`/finished-products/${id}`);
      return response.data as FinishedProduct;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFinishedProduct(data: Partial<FinishedProduct>, file?: File): Promise<FinishedProduct> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.post<FinishedProduct>('/finished-products', formData);
        return response.data as FinishedProduct;
      }
      const response = await apiClient.post<FinishedProduct>('/finished-products', data as Record<string, any>);
      return response.data as FinishedProduct;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateFinishedProduct(id: string, data: Partial<FinishedProduct>, file?: File): Promise<FinishedProduct> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.patch<FinishedProduct>(`/finished-products/${id}`, formData);
        return response.data as FinishedProduct;
      }
      const response = await apiClient.patch<FinishedProduct>(`/finished-products/${id}`, data as Record<string, any>);
      return response.data as FinishedProduct;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteFinishedProduct(id: string): Promise<void> {
    try {
      await apiClient.delete(`/finished-products/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTotalWeightByDate(date: string): Promise<{ totalWeight: number; productCount: number }> {
    try {
      const response = await apiClient.get<{ totalWeight: number; productCount: number }>('/finished-products/total-weight-by-date', { params: { date } });
      return response.data as { totalWeight: number; productCount: number };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async exportToExcel(filters?: { search?: string; tenMay?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tenMay) params.append('tenMay', filters.tenMay);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/finished-products/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    await downloadFile(url, `danh-sach-thanh-pham-${Date.now()}.xlsx`);
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}

export default new FinishedProductService();

