import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface Invoice {
  id: string;
  soHoaDon: string;
  ngayLap: string;
  khachHang: string;
  maSoThue?: string;
  tongTien: number;
  thue: number;
  thanhTien: number;
  trangThai: string;
  loaiHoaDon: string;
  phuongThucThanhToan?: string;
  ngayThanhToan?: string | null;
  nhanVienLap?: string;
  ghiChu?: string;
  boPhanSuDung?: string;
  mucDichSuDung?: string;
  nhaCungCap?: string;
  files?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class InvoiceService {
  async getAllInvoices(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse<Invoice>> {
    try {
      const response = await apiClient.get('/invoices', {
        params: { page, limit, search },
      });
      return response as unknown as PaginatedResponse<Invoice>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.get(`/invoices/${id}`);
      return response.data as unknown as Invoice;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await apiClient.post('/invoices', data);
      return response.data as unknown as Invoice;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await apiClient.put(`/invoices/${id}`, data);
      return response.data as unknown as Invoice;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    try {
      await apiClient.delete(`/invoices/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadFiles(files: File[]): Promise<{ success: boolean; data: { fileUrl: string; fileName: string }[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await apiClient.post('/processes/upload-files', formData);
    return response as unknown as { success: boolean; data: { fileUrl: string; fileName: string }[] };
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('Unknown error');
  }

  async generateInvoiceNumber(): Promise<string> {
    try {
      const response = await apiClient.get('/invoices/generate-code');
      return (response as any).data?.soHoaDon ?? (response as any).data?.code ?? '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/invoices/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-hoa-don-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;

