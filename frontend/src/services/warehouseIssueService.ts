import apiClient from './apiClient';

export interface WarehouseIssueLine {
  id?: string;
  stt?: number;
  lotProductId: string;
  maKien?: string | null;
  maSanPham?: string | null;
  maKho?: string | null;
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
  soLoKeHoach?: string | null;
  soLoThucTe?: string | null;
  soKienKeHoach?: string | string[] | null;
  soKienThucTe?: string | string[] | null;
  tinhTrang?: string | null;
  quyCach?: string | null;
}

export interface WarehouseIssue {
  id: string;
  maPhieuXuat: string;
  ngayXuat: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  ghiChu?: string;
  lyDoChenhLech?: string | null;
  outboundPlan?: { lyDoChenhLech?: string | null } | null;
  tongSoLuongThucTe?: number;
  soDongHang?: number;
  isLocked?: boolean;
  supplyRequestId?: string | null;
  nguoiDeNghi?: string | null;
  maNguoiDeNghi?: string | null;
  boPhan?: string | null;
  boPhanId?: string | null;
  lyDoXuatKho?: string | null;
  isVoided?: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidedByName?: string | null;
  daIn?: boolean;
  inLanDauAt?: string | null;
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
  outboundPlanId?: string | null;
  lyDoChenhLech?: string | null;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  lyDoXuatKho?: string;
  items: WarehouseIssueLine[];
}

export interface UpdateWarehouseIssueData {
  ngayXuat?: string;
  ghiChu?: string;
  lyDoChenhLech?: string | null;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  lyDoXuatKho?: string;
  items: WarehouseIssueLine[];
}

const warehouseIssueService = {
  generateIssueCode: async () => {
    return apiClient.get('/warehouse-issues/generate-code');
  },

  createWarehouseIssue: async (data: CreateWarehouseIssueData) => {
    return apiClient.post('/warehouse-issues', data);
  },

  getAllWarehouseIssues: async (params?: Record<string, unknown>, config?: { signal?: AbortSignal }) => {
    return apiClient.get('/warehouse-issues', { params: params as Record<string, string>, signal: config?.signal } as any);
  },

  getWarehouseIssueById: async (id: string) => {
    return apiClient.get(`/warehouse-issues/${id}`);
  },

  updateWarehouseIssue: async (id: string, data: UpdateWarehouseIssueData) => {
    return apiClient.put(`/warehouse-issues/${id}`, data);
  },

  deleteWarehouseIssue: async (id: string, data?: { lyDo?: string }) => {
    return apiClient.delete(`/warehouse-issues/${id}`, { data } as any);
  },

  markPrinted: async (id: string) => {
    return apiClient.post(`/warehouse-issues/${id}/mark-printed`, {});
  },

  voidWarehouseIssue: async (id: string, data: { voidReason: string }) => {
    return apiClient.post(`/warehouse-issues/${id}/void`, data);
  },

  unvoidWarehouseIssue: async (id: string) => {
    return apiClient.post(`/warehouse-issues/${id}/unvoid`, {});
  },

  exportXlsx: async (id: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/warehouse-issues/${id}/export-xlsx`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phieu-xuat-${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default warehouseIssueService;
