import apiClient from './apiClient';

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
  isLocked?: boolean;
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
  lotProductId?: string;
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh: string;
  ghiChu?: string;
  supplyRequestId?: string;
}

const warehouseReceiptService = {
  generateReceiptCode: async () => {
    return apiClient.get('/warehouse-receipts/generate-code');
  },

  createWarehouseReceipt: async (data: CreateWarehouseReceiptData) => {
    return apiClient.post('/warehouse-receipts', data);
  },

  batchCreateWarehouseReceipts: async (data: { items: CreateWarehouseReceiptData[]; supplyRequestId?: string }) => {
    return apiClient.post('/warehouse-receipts/batch', data);
  },

  getAllWarehouseReceipts: async () => {
    return apiClient.get('/warehouse-receipts');
  },

  updateWarehouseReceipt: async (id: string, data: Partial<CreateWarehouseReceiptData>) => {
    return apiClient.put(`/warehouse-receipts/${id}`, data);
  },

  deleteWarehouseReceipt: async (id: string) => {
    return apiClient.delete(`/warehouse-receipts/${id}`);
  },
};

export default warehouseReceiptService;

