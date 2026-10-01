import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { MachineSystem, MachineSystemDetail } from './machineSystemService';

// ── Status ───────────────────────────────────────────────────────────────────

export type InspectionRequestStatus =
  | 'CHO_XU_LY'
  | 'DA_TIEP_NHAN'
  | 'DANG_KIEM_TRA'
  | 'DA_KIEM_TRA'
  | 'CHO_NGHIEM_THU'
  | 'HOAN_THANH'
  | 'DA_HUY'
  | 'TU_CHOI';

export const STATUS_LABELS: Record<InspectionRequestStatus, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  CHO_XU_LY: { label: 'Chờ xử lý', tone: 'gray' },
  DA_TIEP_NHAN: { label: 'Đã tiếp nhận', tone: 'blue' },
  DANG_KIEM_TRA: { label: 'Đang kiểm tra', tone: 'yellow' },
  DA_KIEM_TRA: { label: 'Đã kiểm tra', tone: 'blue' },
  CHO_NGHIEM_THU: { label: 'Chờ xác nhận nghiệm thu', tone: 'yellow' },
  HOAN_THANH: { label: 'Hoàn thành', tone: 'green' },
  DA_HUY: { label: 'Đã hủy', tone: 'red' },
  TU_CHOI: { label: 'Từ chối', tone: 'red' },
};
export const INSPECTION_STATUS_LABELS = STATUS_LABELS;

export interface InspectionRequestStatusLogEntry {
  id: string;
  inspectionRequestId: number;
  oldStatus: InspectionRequestStatus | null;
  newStatus: InspectionRequestStatus;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface InspectionRequestItem {
  id: string;
  inspectionRequestId: number;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  faultRecordId?: string | null;
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

export interface InspectionRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string | null;
  trangThai: InspectionRequestStatus;
  fileDinhKem?: string | null;
  phongBanId?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  ketQuaKiemTra?: string | null;
  mucDoHuHong?: string | null;
  deXuatXuLy?: string | null;
  thoiGianKiemTra?: string | null;
  nguoiKiemTra?: string | null;
  ketLuan?: string | null;
  anhKiemTra?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InspectionRequestItem[];
  statusLogs?: InspectionRequestStatusLogEntry[];
  acceptanceHandovers?: InspectionAcceptanceSlip[];
  repairRequests?: { id: number; maYeuCau: string; trangThai: string }[];
}

export interface InspectionRequestItemInput {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultRecordId?: string | null;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
}

export interface CreateInspectionRequestRequest {
  ngayThang: string;
  maYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  phongBanId?: string | null;
  items?: InspectionRequestItemInput[];
}

export type UpdateInspectionRequestRequest = Partial<Omit<CreateInspectionRequestRequest, 'maYeuCau'>>;

export type MucDoHuHong = 'nhe' | 'trung_binh' | 'nang';
export type KetLuan = 'CAN_SUA_CHUA' | 'DA_KHAC_PHUC';

/** Acceptance data required when ketLuan = DA_KHAC_PHUC */
export interface InspectionAcceptanceInput {
  tinhTrangSau: string;
  ghiChuNghiemThu?: string;
  file: File;
}

/** Acceptance slip (shared AcceptanceHandover) as returned on inspection detail */
export interface InspectionAcceptanceSlip {
  id: string;
  maNghiemThu: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  fileDinhKem?: string | null;
  ghiChu?: string | null;
  ketQua?: 'DAT' | 'KHONG_DAT' | null;
  nguoiXacNhanId?: string | null;
  nguoiXacNhanTen?: string | null;
  xacNhanLuc?: string | null;
  lyDoXacNhan?: string | null;
  createdAt: string;
}
export interface InspectionDetailsInput {
  ketQuaKiemTra?: string | null;
  mucDoHuHong?: MucDoHuHong | string | null;
  deXuatXuLy?: string | null;
  thoiGianKiemTra?: string | null;
  nguoiKiemTra?: string | null;
  ketLuan?: KetLuan | string | null;
  anhKiemTra?: string | null;
}

export interface InspectionRequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: InspectionRequestStatus;
}

export interface InspectionRequestStatsFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface InspectionRequestStatsResponse {
  total: number;
  byStatus: Record<string, number>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

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

class InspectionRequestService {
  async getAll(filters: InspectionRequestFilters = {}): Promise<ApiResponse<InspectionRequest[]>> {
    return apiClient.get<InspectionRequest[]>('/inspection-requests', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        trangThai: filters.trangThai,
      },
    });
  }

  async getById(id: number | string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.get<InspectionRequest>(`/inspection-requests/${id}`);
  }

  async create(data: CreateInspectionRequestRequest, file?: File): Promise<ApiResponse<InspectionRequest>> {
    const formData = new FormData();
    appendFormFields(formData, data as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<InspectionRequest>('/inspection-requests', formData);
  }

  async update(id: number | string, data: UpdateInspectionRequestRequest, file?: File): Promise<ApiResponse<InspectionRequest>> {
    const { trangThai: _ignored, ...rest } = data as UpdateInspectionRequestRequest & { trangThai?: unknown };
    void _ignored;
    const formData = new FormData();
    appendFormFields(formData, rest as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<InspectionRequest>(`/inspection-requests/${id}`, formData);
  }

  async delete(id: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/inspection-requests/${id}`);
  }

  async generateCode(): Promise<string> {
    const response = await apiClient.get<{ code: string }>('/inspection-requests/generate-code');
    return response.data?.code ?? '';
  }

  async exportExcel(filters: Pick<InspectionRequestFilters, 'search'> = {}): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/inspection-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Lỗi khi xuất Excel phiếu kiểm tra');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-phieu-kiem-tra-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ── Status transitions ────────────────────────────────────────────────

  async accept(id: number | string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/accept`, {});
  }

  async complete(id: number | string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/complete`, {});
  }

  async startInspection(id: number | string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/start-inspection`, {});
  }

  async updateDetails(id: number | string, data: InspectionDetailsInput, file?: File): Promise<ApiResponse<InspectionRequest>> {
    if (file) {
      const fd = new FormData();
      Object.entries(data).forEach(([k,v])=> { if(v!==undefined) fd.append(k, v===null?'':String(v)); });
      fd.append('file', file);
      return apiClient.put<InspectionRequest>(`/inspection-requests/${id}/details`, fd);
    }
    return apiClient.put<InspectionRequest>(`/inspection-requests/${id}/details`, data as unknown as Record<string,unknown>);
  }

  /** Submit result. For DA_KHAC_PHUC pass acceptance data (file is mandatory server-side). */
  async submitInspection(id: number | string, acceptance?: InspectionAcceptanceInput): Promise<ApiResponse<InspectionRequest>> {
    if (acceptance) {
      const fd = new FormData();
      fd.append('tinhTrangSau', acceptance.tinhTrangSau);
      if (acceptance.ghiChuNghiemThu) fd.append('ghiChuNghiemThu', acceptance.ghiChuNghiemThu);
      fd.append('file', acceptance.file);
      return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/submit`, fd);
    }
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/submit`, {});
  }

  /** YCKT creator confirms the "Đã khắc phục" acceptance slip. */
  async confirmAcceptance(id: number | string, payload: { ketQua: 'DAT' | 'KHONG_DAT'; lyDo?: string }): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/confirm-acceptance`, payload);
  }

  async reject(id: number | string, reason?: string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.patch<InspectionRequest>(`/inspection-requests/${id}/reject`, { reason });
  }

  async cancel(id: number | string, reason?: string): Promise<ApiResponse<InspectionRequest>> {
    return apiClient.post<InspectionRequest>(`/inspection-requests/${id}/cancel`, { reason });
  }

  async getStatusHistory(id: number | string): Promise<ApiResponse<InspectionRequestStatusLogEntry[]>> {
    return apiClient.get<InspectionRequestStatusLogEntry[]>(`/inspection-requests/${id}/status-history`);
  }

  async getStats(filters?: InspectionRequestStatsFilters): Promise<ApiResponse<InspectionRequestStatsResponse>> {
    const params: Record<string, string> = {};
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    return apiClient.get<InspectionRequestStatsResponse>('/inspection-requests/stats', { params });
  }
}

export default new InspectionRequestService();
