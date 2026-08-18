import apiClient from './apiClient';

export interface WarehouseIssueLine {
  id?: string;
  stt?: number;
  lotProductId: string;
  maKien?: string | null;
  tenSanPham: string;
  donViTinh?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  soLuongYeuCau?: number;
  soLuongThucTe: number;
  soLuongTruoc?: number;
  soLuongSau?: number;
  ghiChu?: string;
}

export interface WarehouseIssue {
  id: string;
  maPhieuXuat: string;
  ngayXuat: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  ghiChu?: string;
  tongSoLuongThucTe?: number;
  soDongHang?: number;
  isLocked?: boolean;
  supplyRequestId?: string | null;
  items?: WarehouseIssueLine[];
  // Deprecated header-level fields (kept for backward compat)
  warehouseId?: string;
  tenKho?: string;
  lotId?: string;
  tenLo?: string;
  lotProductId?: string;
  tenSanPham?: string;
  soLuongXuat?: number;
  donViTinh?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseIssueData {
  maPhieuXuat?: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  ngayXuat?: string;
  ghiChu?: string;
  supplyRequestId?: string;
  items: WarehouseIssueLine[];
}

export interface UpdateWarehouseIssueData {
  ngayXuat?: string;
  ghiChu?: string;
  items: WarehouseIssueLine[];
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

  getWarehouseIssueById: async (id: string) => {
    return apiClient.get(`/warehouse-issues/${id}`);
  },

  updateWarehouseIssue: async (id: string, data: UpdateWarehouseIssueData) => {
    return apiClient.put(`/warehouse-issues/${id}`, data);
  },

  deleteWarehouseIssue: async (id: string) => {
    return apiClient.delete(`/warehouse-issues/${id}`);
  },
};

export default warehouseIssueService;
