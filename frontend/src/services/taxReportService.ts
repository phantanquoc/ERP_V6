import axios from 'axios';

const API_URL = 'http://localhost:5000/api/tax-reports';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

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
    const token = getAuthToken();
    const params: any = { page, limit };
    if (search) params.search = search;

    const response = await axios.get<ApiResponse<TaxReport[]>>(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data;
  }

  // Get tax report by ID
  async getTaxReportById(id: string) {
    const token = getAuthToken();
    const response = await axios.get<ApiResponse<TaxReport>>(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Get tax report by order ID
  async getTaxReportByOrderId(orderId: string) {
    const token = getAuthToken();
    const response = await axios.get<ApiResponse<TaxReport>>(`${API_URL}/order/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Create tax report from order
  async createTaxReportFromOrder(orderId: string, input?: TaxReportInput) {
    const token = getAuthToken();
    const response = await axios.post<ApiResponse<TaxReport>>(
      `${API_URL}/order/${orderId}`,
      input || {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  // Update tax report
  async updateTaxReport(id: string, input: TaxReportInput) {
    const token = getAuthToken();
    const response = await axios.put<ApiResponse<TaxReport>>(`${API_URL}/${id}`, input, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Delete tax report
  async deleteTaxReport(id: string) {
    const token = getAuthToken();
    const response = await axios.delete<ApiResponse<void>>(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

export default new TaxReportService();

