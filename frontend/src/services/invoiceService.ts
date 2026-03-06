import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllInvoices(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse<Invoice>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/invoices`, {
        params: { page, limit, search },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const response = await axios.get(`${API_BASE_URL}/invoices/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await axios.post(`${API_BASE_URL}/invoices`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await axios.put(`${API_BASE_URL}/invoices/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/invoices/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return error instanceof Error ? error : new Error('Unknown error');
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE}/invoices/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
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

