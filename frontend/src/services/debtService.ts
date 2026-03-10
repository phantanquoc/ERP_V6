import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_URL = `${API_BASE}/debts`;

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

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
  getAllDebts: () => axios.get(`${API_URL}`, { headers: getAuthHeaders() }),

  // Get debt by ID
  getDebtById: (id: string) => axios.get(`${API_URL}/${id}`, { headers: getAuthHeaders() }),

  // Get debt summary
  getDebtSummary: () => axios.get(`${API_URL}/summary`, { headers: getAuthHeaders() }),

  // Create debt
  createDebt: (data: CreateDebtData, file?: File) => {
    if (file) {
      const formData = buildFormData(data as Record<string, any>, file);
      return axios.post(`${API_URL}`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
    }
    return axios.post(`${API_URL}`, data, { headers: getAuthHeaders() });
  },

  // Update debt
  updateDebt: (id: string, data: UpdateDebtData, file?: File) => {
    if (file) {
      const formData = buildFormData(data as Record<string, any>, file);
      return axios.put(`${API_URL}/${id}`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
    }
    return axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeaders() });
  },

  // Delete debt
  deleteDebt: (id: string) => axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() }),

  // Export to Excel
  exportToExcel: async (): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/export/excel`;

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

