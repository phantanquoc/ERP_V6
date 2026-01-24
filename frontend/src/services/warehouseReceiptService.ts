import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface WarehouseReceipt {
  id: string;
  maPhieuNhap: string;
  ngayNhap: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  warehouseId: string;
  tenKho: string;
  lotId: string;
  tenLo: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongTruoc: number; // Số lượng tồn kho trước khi nhập
  soLuongNhap: number;
  soLuongSau: number;   // Số lượng tồn kho sau khi nhập
  donViTinh: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseReceiptData {
  maPhieuNhap: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  warehouseId: string;
  tenKho: string;
  lotId: string;
  tenLo: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh: string;
  ghiChu?: string;
}

const warehouseReceiptService = {
  generateReceiptCode: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/warehouse-receipts/generate-code`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  createWarehouseReceipt: async (data: CreateWarehouseReceiptData) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/warehouse-receipts`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getAllWarehouseReceipts: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/warehouse-receipts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};

export default warehouseReceiptService;

