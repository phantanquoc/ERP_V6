import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Debt {
  id: string;
  ngayPhatSinh: string;
  loaiChiPhi?: string;
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap?: string;
  cungCap?: string;
  noiDungChiCho?: string;
  loaiHinh?: string;
  soTienPhaiTra: number;
  soTienDaThanhToan: number;
  ngayHoachToan?: string;
  ngayDenHan?: string;
  soTaiKhoan?: string;
  ghiChu?: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtData {
  ngayPhatSinh: string;
  loaiChiPhi?: string;
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap?: string;
  cungCap?: string;
  noiDungChiCho?: string;
  loaiHinh?: string;
  soTienPhaiTra?: number;
  soTienDaThanhToan?: number;
  ngayHoachToan?: string;
  ngayDenHan?: string;
  soTaiKhoan?: string;
  ghiChu?: string;
  fileDinhKem?: string;
}

export interface UpdateDebtData {
  ngayPhatSinh?: string;
  loaiChiPhi?: string;
  maNhaCungCap?: string;
  tenNhaCungCap?: string;
  loaiCungCap?: string;
  cungCap?: string;
  noiDungChiCho?: string;
  loaiHinh?: string;
  soTienPhaiTra?: number;
  soTienDaThanhToan?: number;
  ngayHoachToan?: string;
  ngayDenHan?: string;
  soTaiKhoan?: string;
  ghiChu?: string;
  fileDinhKem?: string;
}

export interface DebtSummary {
  tongPhaiTra: number;
  daThanhToan: number;
  conNo: number;
  soLuongCongNo: number;
  chuaThanhToan: number;
  daThanhToanHet: number;
}

const buildFormData = (data: Record<string, any>, file?: File): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });
  if (file) {
    formData.append('file', file);
  }
  return formData;
};

const debtService = {
  // Get all debts
  getAllDebts: () => apiClient.get('/debts'),

  // Get debt by ID
  getDebtById: (id: string) => apiClient.get(`/debts/${id}`),

  // Get debt summary
  getDebtSummary: () => apiClient.get('/debts/summary'),

  // Create debt
  createDebt: (data: CreateDebtData, file?: File) => {
    if (file) {
      const formData = buildFormData(data as Record<string, any>, file);
      return apiClient.post('/debts', formData);
    }
    return apiClient.post('/debts', data);
  },

  // Update debt
  updateDebt: (id: string, data: UpdateDebtData, file?: File) => {
    if (file) {
      const formData = buildFormData(data as Record<string, any>, file);
      return apiClient.put(`/debts/${id}`, formData);
    }
    return apiClient.put(`/debts/${id}`, data);
  },

  // Delete debt
  deleteDebt: (id: string) => apiClient.delete(`/debts/${id}`),

  // Export to Excel
  exportToExcel: async (): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const url = `${API_BASE_URL}/debts/export/excel`;

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
    link.download = `cong-no-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export default debtService;

