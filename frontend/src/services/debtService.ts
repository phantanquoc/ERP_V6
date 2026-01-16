import axios from 'axios';

const API_URL = 'http://localhost:5000/api/debts';

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

const debtService = {
  // Get all debts
  getAllDebts: () => axios.get(`${API_URL}`),

  // Get debt by ID
  getDebtById: (id: string) => axios.get(`${API_URL}/${id}`),

  // Get debt summary
  getDebtSummary: () => axios.get(`${API_URL}/summary`),

  // Create debt
  createDebt: (data: CreateDebtData) => axios.post(`${API_URL}`, data),

  // Update debt
  updateDebt: (id: string, data: UpdateDebtData) => axios.put(`${API_URL}/${id}`, data),

  // Delete debt
  deleteDebt: (id: string) => axios.delete(`${API_URL}/${id}`),
};

export default debtService;

