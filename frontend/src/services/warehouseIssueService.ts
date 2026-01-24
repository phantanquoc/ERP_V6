import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface WarehouseIssue {
  id: string;
  maPhieuXuat: string;
  ngayXuat: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  warehouseId: string;
  tenKho: string;
  lotId: string;
  tenLo: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongTruoc: number; // Số lượng tồn kho trước khi xuất
  soLuongXuat: number;
  soLuongSau: number;   // Số lượng tồn kho sau khi xuất
  donViTinh: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseIssueData {
  maPhieuXuat: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  warehouseId: string;
  tenKho: string;
  lotId: string;
  tenLo: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongXuat: number;
  donViTinh: string;
  ghiChu?: string;
}

const warehouseIssueService = {
  generateIssueCode: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/warehouse-issues/generate-code`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  
  createWarehouseIssue: async (data: CreateWarehouseIssueData) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/warehouse-issues`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  
  getAllWarehouseIssues: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/warehouse-issues`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};

export default warehouseIssueService;

