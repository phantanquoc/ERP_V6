import apiClient from './apiClient';

export interface WarehouseReceiptLine {
  id?: string;
  stt?: number;
  lotProductId: string;
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

export interface WarehouseReceipt {
  id: string;
  maPhieuNhap: string;
  ngayNhap: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  mucDich?: string | null;
  ghiChu?: string;
  tongSoLuongThucTe?: number;
  soDongHang?: number;
  isLocked?: boolean;
  supplyRequestId?: string | null;
  items?: WarehouseReceiptLine[];
  // Deprecated header-level fields (kept for backward compat)
  warehouseId?: string;
  tenKho?: string;
  lotId?: string;
  tenLo?: string;
  lotProductId?: string;
  tenSanPham?: string;
  soLuongNhap?: number;
  donViTinh?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseReceiptData {
  maPhieuNhap?: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  ngayNhap?: string;
  mucDich?: string;
  ghiChu?: string;
  supplyRequestId?: string;
  items: WarehouseReceiptLine[];
}

export interface UpdateWarehouseReceiptData {
  ngayNhap?: string;
  mucDich?: string;
  ghiChu?: string;
  items: WarehouseReceiptLine[];
}

const warehouseReceiptService = {
  generateReceiptCode: async () => {
    return apiClient.get('/warehouse-receipts/generate-code');
  },

  createWarehouseReceipt: async (data: CreateWarehouseReceiptData) => {
    return apiClient.post('/warehouse-receipts', data);
  },

  getAllWarehouseReceipts: async () => {
    return apiClient.get('/warehouse-receipts');
  },

  getWarehouseReceiptById: async (id: string) => {
    return apiClient.get(`/warehouse-receipts/${id}`);
  },

  updateWarehouseReceipt: async (id: string, data: UpdateWarehouseReceiptData) => {
    return apiClient.put(`/warehouse-receipts/${id}`, data);
  },

  deleteWarehouseReceipt: async (id: string) => {
    return apiClient.delete(`/warehouse-receipts/${id}`);
  },
};

export default warehouseReceiptService;
