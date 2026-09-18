import apiClient from './apiClient';

export interface InboundPlan {
  id: string;
  maKeHoach: string;
  purchaseRequestId: string;
  ngayDuKien: string;
  ngayDuKienMoi?: string | null;
  warehouseId?: string | null;
  trangThai: string;
  lyDoChenhLech?: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseRequest?: {
    id: string;
    maYeuCau: string;
    tenNhanVien?: string;
    nhaCungCapId?: string;
    supplier?: { tenNhaCungCap: string } | null;
    items?: { id?: string; tenHangHoa: string; soLuong: number; donViTinh: string; phanLoai?: string; giaDuKien?: number | null }[];
    supplyRequest?: { id: string; maYeuCau: string; trangThai: string } | null;
    warehouse?: { id: string; tenKho: string; maKho: string } | null;
    warehouseId?: string | null;
  } | null;
  warehouse?: { id: string; tenKho: string; maKho: string } | null;
  receipts?: { id: string; maPhieuNhap: string; ngayNhap: string }[];
  logs?: { id: string; hanhDong: string; lyDo?: string | null; createdAt: string }[];
}

const inboundPlanService = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<InboundPlan[]>('/inbound-plans', { params: params as Record<string, string> }),

  getById: (id: string) =>
    apiClient.get<InboundPlan>(`/inbound-plans/${id}`),

  update: (id: string, data: { ngayDuKien?: string; lyDo?: string }) =>
    apiClient.put<InboundPlan>(`/inbound-plans/${id}`, data),

  cancel: (id: string, data: { lyDo: string }) =>
    apiClient.post<InboundPlan>(`/inbound-plans/${id}/cancel`, data),

  markReceived: (id: string, data?: { soLuongThucTe?: number; lyDoChenhLech?: string }) =>
    apiClient.post<InboundPlan>(`/inbound-plans/${id}/mark-received`, data ?? {}),
};

export default inboundPlanService;
