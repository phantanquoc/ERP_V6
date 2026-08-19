import apiClient from './apiClient';

export interface WarehouseReceiptLine {
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
  // BM01 per-line fields
  soLoKeHoach?: string | null;
  soLoThucTe?: string | null;
  soKienKeHoach?: string | string[] | null;
  soKienThucTe?: string | string[] | null;
  tinhTrang?: string | null;
  quyCach?: string | null;
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
  nguoiDeNghi?: string | null;
  maNguoiDeNghi?: string | null;
  boPhan?: string | null;
  boPhanId?: string | null;
  daIn?: boolean;
  inLanDauAt?: string | null;
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
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  items: WarehouseReceiptLine[];
}

export interface UpdateWarehouseReceiptData {
  ngayNhap?: string;
  mucDich?: string;
  ghiChu?: string;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
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

  markPrinted: async (id: string) => {
    return apiClient.post(`/warehouse-receipts/${id}/mark-printed`, {});
  },

  exportXlsx: async (id: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/warehouse-receipts/${id}/export-xlsx`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phieu-nhap-${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default warehouseReceiptService;
