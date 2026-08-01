import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { MachineSystem, MachineSystemDetail } from './machineSystemService';

// 7.1 Typed enum matching the Prisma enum on the backend
export type RepairRequestStatus = 'CHO_XU_LY' | 'DANG_SUA_CHUA' | 'HOAN_THANH' | 'DA_HUY';

export const STATUS_LABELS: Record<RepairRequestStatus, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' }> = {
  CHO_XU_LY: { label: 'Chờ xử lý', tone: 'gray' },
  DANG_SUA_CHUA: { label: 'Đang sửa chữa', tone: 'blue' },
  HOAN_THANH: { label: 'Hoàn thành', tone: 'green' },
  DA_HUY: { label: 'Đã hủy', tone: 'red' },
};

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
}

export interface RepairRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  tenHeThong?: string | null;
  tinhTrangThietBi?: string | null;
  loaiLoi?: string | null;
  mucDoUuTien: string;
  noiDungLoi?: string | null;
  ghiChu?: string | null;
  trangThai: RepairRequestStatus;
  fileDinhKem?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RepairRequestItem[];
  acceptanceHandovers?: AcceptanceHandoverSummary[];
}

export interface RepairRequestItemInput {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultRecordId?: string | null;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
}

export interface CreateRepairRequestRequest {
  ngayThang: string;
  maYeuCau: string;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien: string;
  noiDungLoi?: string;
  ghiChu?: string;
  items?: RepairRequestItemInput[];
}

export type UpdateRepairRequestRequest = Partial<Omit<CreateRepairRequestRequest, 'maYeuCau'>>;

export interface RepairRequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: RepairRequestStatus;
}

// 9.1: Stats types matching backend getStats response shape
export interface RepairRequestStatsFilters {
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
  machineSystemId?: string;
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
  avgCompletionHours: number | null;
  delta: {
    total: number;
    byStatus: Record<string, number>;
    avgCompletionHours: number | null;
  };
  topMachines: RepairRequestStatsMachine[];
  recurringItems: RepairRequestStatsRecurring[];
  monthlyTrend: Array<{ month: string; total: number; hoanThanh: number }>;
  recentlyCreated: RepairRequestStatsRecentlyCreated[];
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
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
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

  // 7.2 New business-event methods

  async startRepair(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<RepairRequest>(`/repair-requests/${id}/start-repair`, {});
  }

  async cancel(id: number | string, reason?: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<RepairRequest>(`/repair-requests/${id}/cancel`, { reason });
  }

  async getStatusHistory(id: number | string): Promise<ApiResponse<RepairRequestStatusLogEntry[]>> {
    return apiClient.get<RepairRequestStatusLogEntry[]>(`/repair-requests/${id}/status-history`);
  }

  // 9.1: Stats endpoint
  async getStats(filters?: RepairRequestStatsFilters): Promise<ApiResponse<RepairRequestStatsResponse>> {
    const params: Record<string, string> = {};
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.machineSystemId) params.machineSystemId = filters.machineSystemId;
    return apiClient.get<RepairRequestStatsResponse>('/repair-requests/stats', { params });
  }
}

export default new RepairRequestService();
