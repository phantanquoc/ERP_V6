import apiClient from './apiClient';

export interface OutboundPlan {
  id: string;
  maKeHoach: string;
  supplyRequestId?: string | null;
  ngayDuKien: string;
  ngayDuKienMoi?: string | null;
  warehouseId?: string | null;
  trangThai: string;
  ghiChu?: string | null;
  lyDoChenhLech?: string | null;
  createdAt: string;
  updatedAt: string;
  supplyRequest?: {
    id: string; maYeuCau: string; trangThai: string; tenNhanVien?: string; boPhan?: string;
    items?: { id: string; tenGoi: string; soLuong: number; donViTinh: string; phanLoai?: string; fulfilledQty?: number; fulfillmentStatus?: string }[];
  } | null;
  warehouse?: { id: string; tenKho: string; maKho: string } | null;
}

const outboundPlanService = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<OutboundPlan[]>('/outbound-plans', { params: params as Record<string, string> }),

  getById: (id: string) =>
    apiClient.get<OutboundPlan>(`/outbound-plans/${id}`),

  update: (id: string, data: { ngayDuKien?: string; ghiChu?: string; warehouseId?: string | null }) =>
    apiClient.put<OutboundPlan>(`/outbound-plans/${id}`, data),

  cancel: (id: string, data: { lyDo: string }) =>
    apiClient.post<OutboundPlan>(`/outbound-plans/${id}/cancel`, data),

  markReceived: (id: string, data?: { soLuongThucTe?: number; lyDoChenhLech?: string }) =>
    apiClient.post<OutboundPlan>(`/outbound-plans/${id}/mark-received`, data ?? {}),
};

export default outboundPlanService;
