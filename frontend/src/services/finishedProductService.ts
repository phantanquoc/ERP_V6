import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';
import { API_BASE_URL } from '../config/api';

export interface FinishedProduct {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  khoiLuong: number;

  // Machine info
  machineSystemId?: string | null;
  trangThai?: 'DANG_HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  machineSystem?: { id: string; maHeThong: string; tenHeThong: string } | null;

  // Warehouse receipt flag
  daNhapKho?: boolean;

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

// ─── Warehouse receipt types ──────────────────────────────────────────────────

/** A single pre-filled grade row returned by GET /:id/receipt-rows */
export interface ReceiptRow {
  tenSanPham: string;
  soLuongNhap: number;
}

/** Body sent to POST /:id/warehouse-receipt */
export interface ConfirmWarehouseReceiptInput {
  warehouseId: string;
  lotId: string;
  rows: Array<{ tenSanPham: string; soLuongNhap: number; donViTinh?: string }>;
}

/** Body sent to POST /finished-products/bulk-warehouse-receipt */
export interface BulkReceiptPayload {
  maChienList: string[];
  warehouseId: string;
  lotId: string;
}

/** Response from POST /finished-products/bulk-warehouse-receipt */
export interface BulkReceiptResponse {
  success: boolean;
}

// ─── Output statistics types ───────────────────────────────────────────────────

export interface OutputStatisticsRow {
  id: string;
  date: string; // YYYY-MM-DD
  maChien: string;
  tenHangHoa: string;
  machineSystemId: string | null;
  maHeThong: string | null;
  tenHeThong: string | null;
  aKhoiLuong: number;
  bKhoiLuong: number;
  bDauKhoiLuong: number;
  cKhoiLuong: number;
  vunLonKhoiLuong: number;
  vunNhoKhoiLuong: number;
  phePhamKhoiLuong: number;
  uotKhoiLuong: number;
  tongKhoiLuong: number;
  goodOutput: number;
  scrap: number;
}

export interface OutputStatisticsFilters {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  machineSystemId?: string;
  tenHangHoa?: string;
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

  async getAllFinishedProducts(
    page: number = 1,
    limit: number = 10,
    machineSystemId?: string,
    dateRange?: { thoiGianChienFrom?: string; thoiGianChienTo?: string },
  ): Promise<{ data: FinishedProduct[], pagination: any }> {
    try {
      const params: any = { page, limit };
      if (machineSystemId) {
        params.machineSystemId = machineSystemId;
      }
      if (dateRange?.thoiGianChienFrom) {
        params.thoiGianChienFrom = dateRange.thoiGianChienFrom;
      }
      if (dateRange?.thoiGianChienTo) {
        params.thoiGianChienTo = dateRange.thoiGianChienTo;
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

  async exportToExcel(filters?: { search?: string; machineSystemId?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.machineSystemId) params.append('machineSystemId', filters.machineSystemId);
    const url = `${API_BASE_URL}/finished-products/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    await downloadFile(url, `danh-sach-thanh-pham-${Date.now()}.xlsx`);
  }

  /** GET /finished-products/:id/receipt-rows — pre-filled grade rows for the receipt modal */
  async getReceiptRows(id: string): Promise<ReceiptRow[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ReceiptRow[] }>(`/finished-products/${id}/receipt-rows`);
      return (response as any).data ?? [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** POST /finished-products/:id/warehouse-receipt — confirm receipt with user-edited rows */
  async confirmWarehouseReceipt(id: string, input: ConfirmWarehouseReceiptInput): Promise<unknown> {
    try {
      const response = await apiClient.post(`/finished-products/${id}/warehouse-receipt`, input);
      return (response as any).data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** POST /finished-products/bulk-warehouse-receipt — bulk receipt for multiple maChien */
  async bulkConfirmWarehouseReceipt(payload: BulkReceiptPayload): Promise<BulkReceiptResponse> {
    try {
      const response = await apiClient.post('/finished-products/bulk-warehouse-receipt', payload);
      return (response as any).data ?? { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** GET /finished-products/output-statistics — multi-dimensional output stats */
  async getOutputStatistics(filters: OutputStatisticsFilters): Promise<OutputStatisticsRow[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: OutputStatisticsRow[] }>(
        '/finished-products/output-statistics',
        { params: filters },
      );
      return (response as any).data ?? [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** PUT /finished-products/by-batch-machine — upsert a finished product by (maChien, machineSystemId) */
  async upsertByBatchMachine(data: Record<string, any>): Promise<FinishedProduct> {
    try {
      const response = await apiClient.put<{ success: boolean; data: FinishedProduct }>(
        '/finished-products/by-batch-machine',
        data,
      );
      return (response as any).data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}

export default new FinishedProductService();


