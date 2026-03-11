import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Tax Report Status enum
export enum TaxReportStatus {
  CHUA_BAO_CAO = 'CHUA_BAO_CAO',
  DANG_CAP_NHAT_HO_SO = 'DANG_CAP_NHAT_HO_SO',
  DA_DAY_DU_HO_SO = 'DA_DAY_DU_HO_SO',
  DA_BAO_CAO = 'DA_BAO_CAO',
  DA_QUYET_TOAN = 'DA_QUYET_TOAN',
}

// Tax Report interface
export interface TaxReport {
  id: string;
  orderId: string;
  ngayDatHang: string;
  maDonHang: string;
  tenHangHoa: string;
  soLuong: number;
  donVi: string;
  giaTriDonHang: number;
  soTienDongThue?: number;
  trangThai: TaxReportStatus;
  ghiChi?: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
  order?: any;
}

// Create/Update input
export interface TaxReportInput {
  soTienDongThue?: number;
  trangThai?: TaxReportStatus;
  ghiChi?: string;
  fileDinhKem?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class TaxReportService {
  // Get all tax reports
  async getAllTaxReports(page: number = 1, limit: number = 10, search?: string) {
    const params: any = { page, limit };
    if (search) params.search = search;

    const response = await apiClient.get('/tax-reports', { params });
    return response;
  }

  // Get tax report by ID
  async getTaxReportById(id: string) {
    const response = await apiClient.get(`/tax-reports/${id}`);
    return response;
  }

  // Get tax report by order ID
  async getTaxReportByOrderId(orderId: string) {
    const response = await apiClient.get(`/tax-reports/order/${orderId}`);
    return response;
  }

  // Create tax report from order
  async createTaxReportFromOrder(orderId: string, input?: TaxReportInput, file?: File) {
    if (file) {
      const formData = new FormData();
      if (input) {
        Object.entries(input).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'fileDinhKem') {
            formData.append(key, value.toString());
          }
        });
      }
      formData.append('file', file);
      const response = await apiClient.post(`/tax-reports/order/${orderId}`, formData);
      return response;
    }
    const response = await apiClient.post(`/tax-reports/order/${orderId}`, input || {});
    return response;
  }

  // Update tax report
  async updateTaxReport(id: string, input: TaxReportInput, file?: File) {
    if (file) {
      const formData = new FormData();
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'fileDinhKem') {
          formData.append(key, value.toString());
        }
      });
      formData.append('file', file);
      const response = await apiClient.put(`/tax-reports/${id}`, formData);
      return response;
    }
    const response = await apiClient.put(`/tax-reports/${id}`, input);
    return response;
  }

  // Delete tax report
  async deleteTaxReport(id: string) {
    const response = await apiClient.delete(`/tax-reports/${id}`);
    return response;
  }

  // Export to Excel
  async exportToExcel(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const url = `${API_BASE_URL}/tax-reports/export/excel`;

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
    link.download = `bao-cao-thue-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new TaxReportService();

