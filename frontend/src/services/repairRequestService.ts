import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { MachineSystem, MachineSystemDetail } from './machineSystemService';

// ── Discriminator & Status ───────────────────────────────────────────────

export type RequestType = 'KIEM_TRA' | 'SUA_CHUA';

export type RepairRequestStatus =
  | 'CHO_XU_LY'
  | 'DA_TIEP_NHAN'
  | 'LEN_KE_HOACH'
  | 'DANG_SUA_CHUA'
  | 'CHO_NGHIEM_THU'
  | 'DA_NGHIEM_THU'
  | 'HOAN_THANH'
  | 'DA_HUY'
  | 'TU_CHOI';

export const STATUS_LABELS: Record<RepairRequestStatus, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  CHO_XU_LY: { label: 'Chờ xử lý', tone: 'gray' },
  DA_TIEP_NHAN: { label: 'Đã tiếp nhận', tone: 'blue' },
  LEN_KE_HOACH: { label: 'Lên kế hoạch', tone: 'yellow' },
  DANG_SUA_CHUA: { label: 'Đang sửa chữa', tone: 'blue' },
  CHO_NGHIEM_THU: { label: 'Chờ nghiệm thu', tone: 'yellow' },
  DA_NGHIEM_THU: { label: 'Đã nghiệm thu', tone: 'green' },
  HOAN_THANH: { label: 'Hoàn thành', tone: 'green' },
  DA_HUY: { label: 'Đã hủy', tone: 'red' },
  TU_CHOI: { label: 'Từ chối', tone: 'red' },
};

export const REQUEST_TYPE_LABELS: Record<RequestType, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  KIEM_TRA: { label: 'Kiểm tra', tone: 'yellow' },
  SUA_CHUA: { label: 'Sửa chữa', tone: 'blue' },
};

export type AssigneeRole = 'CHINH' | 'PHU';
export type NghiemThuKetQua = 'DAT' | 'KHONG_DAT';

// ── Status log & item types ─────────────────────────────────────────────

export interface RepairRequestStatusLogEntry {
  id: string;
  repairRequestId: number;
  oldStatus: RepairRequestStatus;
  newStatus: RepairRequestStatus;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface RepairRequestItem {
  id: string;
  repairRequestId: number;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  machineId?: string | null;
  faultRecordId?: string | null;
  sourceInspectionItemId?: string | null;
  phuongAnSua?: string | null;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  createdAt?: string;
  updatedAt?: string;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
  machine?: { id: string; maMay: string; tenMay: string; trangThai: string } | null;
  faultRecord?: { id: string; maLoi: string; tenLoi: string } | null;
}

export interface AcceptanceHandoverSummary {
  id: string;
  maNghiemThu: string;
  ngayNghiemThu: string;
  tenHeThongThietBi?: string | null;
  tinhTrangTruocSuaChua?: string | null;
  tinhTrangSauSuaChua?: string | null;
  nguoiBanGiao?: string | null;
  nguoiNhan?: string | null;
  warehouseIssueId?: string | null;
  ketQua?: NghiemThuKetQua | null;
  chiPhiThucTe?: number | null;
  fileDinhKem?: string | null;
  createdAt?: string;
  // Requester confirmation (creator of source YCKT, else creator of the YCSC)
  nguoiXacNhanId?: string | null;
  nguoiXacNhanTen?: string | null;
  xacNhanLuc?: string | null;
  lyDoXacNhan?: string | null;
}

// ── Sub-resource types ──────────────────────────────────────────────────

export interface RepairRequestAssignee {
  id: string;
  repairRequestId: number;
  userId: string | null;
  userName: string | null;
  vaiTro: AssigneeRole;
  isLead: boolean;
  assignedAt: string;
  assignedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignAssigneeRequest {
  userId?: string;
  userName?: string;
  vaiTro?: AssigneeRole;
  isLead?: boolean;
}

export interface RepairMaterialNeed {
  id: string;
  repairRequestId: number;
  repairRequestItemId: string;
  tenVatTu: string;
  maVatTu: string | null;
  donVi: string | null;
  soLuongDuKien: number;
  soLuongThucTe: number | null;
  ghiChu: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialNeedRequest {
  repairRequestItemId: string;
  tenVatTu: string;
  maVatTu?: string | null;
  donVi?: string | null;
  soLuongDuKien: number;
  soLuongThucTe?: number | null;
  ghiChu?: string | null;
}

export type UpdateMaterialNeedRequest = Partial<CreateMaterialNeedRequest>;

export interface RepairSupplyLink {
  id: string;
  repairRequestId: number;
  repairRequestItemId: string | null;
  supplyRequestId: string;
  supplyRequestItemId: string | null;
  soLuong: number | null;
  ghiChu: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface CreateSupplyLinkRequest {
  supplyRequestId: string;
  repairRequestItemId?: string | null;
  supplyRequestItemId?: string | null;
  soLuong?: number | null;
  ghiChu?: string | null;
}

export interface RepairIncidentalCost {
  id: string;
  repairRequestId: number;
  tenKhoan: string;
  soTien: number;
  lyDo: string;
  fileMinhChung?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentalCostRequest {
  tenKhoan: string;
  soTien: number;
  lyDo: string;
  fileMinhChung?: string | null;
}

export type UpdateIncidentalCostRequest = Partial<CreateIncidentalCostRequest>;

export interface SupplyChainEntry {
  link: RepairSupplyLink;
  supplyRequest: { id: string; maYeuCau: string; trangThai: string; createdAt: string } | null;
  replenishmentRequest: { id: string; maYeuCau: string; trangThai: string; phanLoaiGroup?: string; createdAt: string; convertedPurchaseRequestId: string | null } | null;
  purchaseRequest: { id: string; maYeuCau: string; trangThai: string; sourceType: string; createdAt: string } | null;
  inboundPlan: { id: string; maKeHoach: string; trangThai: string; purchaseRequestId: string } | null;
  warehouseIssue: { id: string; maPhieu: string; trangThai: string | null } | null;
  decisionsMeta: { shortageQty: number | null; reason: string | null; decidedAt: string } | null;
}

// ── RepairRequest main types ────────────────────────────────────────────

export interface RepairRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  requestType: RequestType;
  sourceInspectionRequestId: string | null;
  tenHeThong?: string | null;
  tinhTrangThietBi?: string | null;
  loaiLoi?: string | null;
  mucDoUuTien: string;
  noiDungLoi?: string | null;
  ghiChu?: string | null;
  trangThai: RepairRequestStatus;
  fileDinhKem?: string | null;
  ngayHoanThienDuKien?: string | null;
  ngayBatDauKeHoach?: string | null;
  keHoachChiTiet?: string | null;
  phuongAn?: string | null;
  bienPhapAnToan?: string | null;
  chiPhiDuKien?: number | null;
  chiPhiThucTe?: number | null;
  noiDungThucHien?: string | null;
  gioCongThucTe?: number | null;
  ketQuaNghiemThu?: NghiemThuKetQua | null;
  canNgungMay?: boolean;
  phongBanId?: string | null;
  ngayHoanThanhThucTe?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RepairRequestItem[];
  acceptanceHandovers?: AcceptanceHandoverSummary[];
  assignees?: RepairRequestAssignee[];
  supplyLinks?: RepairSupplyLink[];
  materialNeeds?: RepairMaterialNeed[];
  incidentalCosts?: RepairIncidentalCost[];
}

export interface RepairRequestItemInput {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultRecordId?: string | null;
  sourceInspectionItemId?: string | null;
  phuongAnSua?: string | null;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
}

export interface CreateRepairRequestRequest {
  ngayThang: string;
  maYeuCau: string;
  requestType?: RequestType;
  sourceInspectionRequestId?: string | null;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien: string;
  noiDungLoi?: string;
  ghiChu?: string;
  ngayHoanThienDuKien?: string | null;
  ngayBatDauKeHoach?: string | null;
  keHoachChiTiet?: string | null;
  phuongAn?: string | null;
  bienPhapAnToan?: string | null;
  chiPhiDuKien?: number | null;
  canNgungMay?: boolean;
  phongBanId?: string | null;
  items?: RepairRequestItemInput[];
}

export type UpdateRepairRequestRequest = Partial<Omit<CreateRepairRequestRequest, 'maYeuCau' | 'requestType' | 'sourceInspectionRequestId'>> & {
  chiPhiThucTe?: number | null;
  noiDungThucHien?: string | null;
  gioCongThucTe?: number | null;
  ketQuaNghiemThu?: NghiemThuKetQua | null;
  ngayHoanThanhThucTe?: string | null;
};

export interface RepairRequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: RepairRequestStatus;
  requestType?: RequestType;
  sourceInspectionRequestId?: string;
}

// Stats types
export interface RepairRequestStatsFilters {
  dateFrom?: string;
  dateTo?: string;
  machineSystemId?: string;
  requestType?: RequestType;
}

export interface RepairRequestStatsMachine {
  machineSystemId: string | null;
  tenHeThong: string | null;
  count: number;
}

export interface RepairRequestStatsRecurring {
  machineSystemDetailId: string | null;
  tenChiTiet: string | null;
  count: number;
  latestMaYeuCau: string | null;
}

export interface RepairRequestStatsRecentlyCreated {
  id: number;
  maYeuCau: string;
  tenHeThongThietBi: string | null;
  trangThai: RepairRequestStatus;
  createdAt: string;
  itemCount: number;
}

export interface RepairRequestStatsResponse {
  total: number;
  byStatus: Record<string, number>;
  byRequestType?: Record<string, number>;
  avgCompletionHours: number | null;
  delta: {
    total: number;
    byStatus: Record<string, number>;
    byRequestType?: Record<string, number>;
    avgCompletionHours: number | null;
  };
  topMachines: RepairRequestStatsMachine[];
  recurringItems: RepairRequestStatsRecurring[];
  monthlyTrend: Array<{ month: string; total: number; hoanThanh: number }>;
  recentlyCreated: RepairRequestStatsRecentlyCreated[];
}

// Planning / status transition payloads
export interface PlanRepairRequestPayload {
  keHoachChiTiet?: string;
  phuongAn?: string;
  bienPhapAnToan?: string;
  ngayHoanThienDuKien?: string;
  ngayBatDauKeHoach?: string;
  chiPhiDuKien?: number;
  canNgungMay?: boolean;
  phongBanId?: string;
}

export interface ConfirmAcceptancePayload {
  ketQua: NghiemThuKetQua;
  chiPhiThucTe?: number;
  /** Required when ketQua = KHONG_DAT */
  lyDo?: string;
}

const appendFormFields = (formData: FormData, data: Record<string, unknown>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, value === null ? '' : String(value));
  });
};

class RepairRequestService {
  async getAll(filters: RepairRequestFilters = {}): Promise<ApiResponse<RepairRequest[]>> {
    return apiClient.get<RepairRequest[]>('/repair-requests', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        trangThai: filters.trangThai,
        requestType: filters.requestType,
        sourceInspectionRequestId: filters.sourceInspectionRequestId,
      },
    });
  }

  async getById(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.get<RepairRequest>(`/repair-requests/${id}`);
  }

  async create(data: CreateRepairRequestRequest, file?: File): Promise<ApiResponse<RepairRequest>> {
    const formData = new FormData();
    appendFormFields(formData, data as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<RepairRequest>('/repair-requests', formData);
  }

  async update(id: number | string, data: UpdateRepairRequestRequest, file?: File): Promise<ApiResponse<RepairRequest>> {
    // trangThai is never sent from client — status changes only via transition endpoints
    const { trangThai: _ignored, ...rest } = data as UpdateRepairRequestRequest & { trangThai?: unknown };
    void _ignored;
    const formData = new FormData();
    appendFormFields(formData, rest as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<RepairRequest>(`/repair-requests/${id}`, formData);
  }

  async delete(id: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}`);
  }

  async generateCode(): Promise<string> {
    const response = await apiClient.get<{ code: string }>('/repair-requests/generate-code');
    return response.data?.code ?? '';
  }

  async exportExcel(filters: Pick<RepairRequestFilters, 'search'> = {}): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/repair-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Lỗi khi xuất Excel yêu cầu sửa chữa');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-sua-chua-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ── Status transitions ────────────────────────────────────────────────

  async accept(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/accept`, {});
  }

  async plan(id: number | string, payload?: PlanRepairRequestPayload): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/plan`, payload as Record<string, unknown> ?? {});
  }

  async startRepair(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<RepairRequest>(`/repair-requests/${id}/start-repair`, {});
  }

  // Alias for PATCH /:id/start
  async start(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/start`, {});
  }

  async submitAcceptance(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/submit-acceptance`, {});
  }

  async confirmAcceptance(id: number | string, payload: ConfirmAcceptancePayload): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/confirm-acceptance`, payload as unknown as Record<string, unknown>);
  }

  async reject(id: number | string, reason?: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/reject`, { reason });
  }

  async cancel(id: number | string, reason?: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<RepairRequest>(`/repair-requests/${id}/cancel`, { reason });
  }

  // Alias PATCH /:id/cancel
  async cancelPatch(id: number | string, reason?: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/cancel`, { reason });
  }

  async complete(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<RepairRequest>(`/repair-requests/${id}/complete`, {});
  }

  async getStatusHistory(id: number | string): Promise<ApiResponse<RepairRequestStatusLogEntry[]>> {
    return apiClient.get<RepairRequestStatusLogEntry[]>(`/repair-requests/${id}/status-history`);
  }

  async getStats(filters?: RepairRequestStatsFilters): Promise<ApiResponse<RepairRequestStatsResponse>> {
    const params: Record<string, string> = {};
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.machineSystemId) params.machineSystemId = filters.machineSystemId;
    if (filters?.requestType) params.requestType = filters.requestType;
    return apiClient.get<RepairRequestStatsResponse>('/repair-requests/stats', { params });
  }

  // ── Assignees ─────────────────────────────────────────────────────────

  async listAssignees(id: number | string): Promise<ApiResponse<RepairRequestAssignee[]>> {
    return apiClient.get<RepairRequestAssignee[]>(`/repair-requests/${id}/assignees`);
  }

  async assignUser(id: number | string, payload: AssignAssigneeRequest): Promise<ApiResponse<RepairRequestAssignee>> {
    return apiClient.post<RepairRequestAssignee>(`/repair-requests/${id}/assignees`, payload as unknown as Record<string, unknown>);
  }

  async unassignUser(id: number | string, assigneeId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}/assignees/${assigneeId}`);
  }

  // ── Material needs ────────────────────────────────────────────────────

  async listMaterialNeeds(id: number | string): Promise<ApiResponse<RepairMaterialNeed[]>> {
    return apiClient.get<RepairMaterialNeed[]>(`/repair-requests/${id}/material-needs`);
  }

  async createMaterialNeed(id: number | string, payload: CreateMaterialNeedRequest): Promise<ApiResponse<RepairMaterialNeed>> {
    return apiClient.post<RepairMaterialNeed>(`/repair-requests/${id}/material-needs`, payload as unknown as Record<string, unknown>);
  }

  async updateMaterialNeed(id: number | string, needId: string, payload: UpdateMaterialNeedRequest): Promise<ApiResponse<RepairMaterialNeed>> {
    return apiClient.put<RepairMaterialNeed>(`/repair-requests/${id}/material-needs/${needId}`, payload as unknown as Record<string, unknown>);
  }

  async deleteMaterialNeed(id: number | string, needId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}/material-needs/${needId}`);
  }

  // ── Supply links ──────────────────────────────────────────────────────

  async listSupplyLinks(id: number | string): Promise<ApiResponse<RepairSupplyLink[]>> {
    return apiClient.get<RepairSupplyLink[]>(`/repair-requests/${id}/supply-links`);
  }

  async linkSupplyRequest(id: number | string, payload: CreateSupplyLinkRequest): Promise<ApiResponse<RepairSupplyLink>> {
    return apiClient.post<RepairSupplyLink>(`/repair-requests/${id}/supply-links`, payload as unknown as Record<string, unknown>);
  }

  async unlinkSupplyRequest(id: number | string, linkId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}/supply-links/${linkId}`);
  }

  // ── Supply chain ──────────────────────────────────────────────────────

  async getSupplyChain(id: number | string): Promise<ApiResponse<SupplyChainEntry[]>> {
    return apiClient.get<SupplyChainEntry[]>(`/repair-requests/${id}/supply-chain`);
  }

  // ── Incidental costs ──────────────────────────────────────────────────

  async listIncidentalCosts(id: number | string): Promise<ApiResponse<RepairIncidentalCost[]>> {
    return apiClient.get<RepairIncidentalCost[]>(`/repair-requests/${id}/incidental-costs`);
  }

  async createIncidentalCost(id: number | string, payload: CreateIncidentalCostRequest): Promise<ApiResponse<RepairIncidentalCost>> {
    return apiClient.post<RepairIncidentalCost>(`/repair-requests/${id}/incidental-costs`, payload as unknown as Record<string, unknown>);
  }

  async updateIncidentalCost(id: number | string, costId: string, payload: UpdateIncidentalCostRequest): Promise<ApiResponse<RepairIncidentalCost>> {
    return apiClient.put<RepairIncidentalCost>(`/repair-requests/${id}/incidental-costs/${costId}`, payload as unknown as Record<string, unknown>);
  }

  async deleteIncidentalCost(id: number | string, costId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}/incidental-costs/${costId}`);
  }

  async getCostSummary(id: number | string): Promise<ApiResponse<{ duKien: number | null; thucTe: number; chenhLech: number | null; incidentalTotal: number; itemsWithNullPrice: { tenGoi: string }[]; items: { tenGoi: string; qty: number; price: number | null }[] }>> {
    return apiClient.get(`/repair-requests/${id}/cost-summary`);
  }
}

export default new RepairRequestService();
