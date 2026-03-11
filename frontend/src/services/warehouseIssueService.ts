import apiClient from './apiClient';

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
    return apiClient.get('/warehouse-issues/generate-code');
  },

  createWarehouseIssue: async (data: CreateWarehouseIssueData) => {
    return apiClient.post('/warehouse-issues', data);
  },

  getAllWarehouseIssues: async () => {
    return apiClient.get('/warehouse-issues');
  },
};

export default warehouseIssueService;

