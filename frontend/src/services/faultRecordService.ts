import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { FaultTemplate, RepairStepInput } from './faultTemplateService';
import type { MachineSystem, MachineSystemDetail, SortOrder } from './machineSystemService';

export interface FaultRecord {
  id: string;
  maLoi: string;
  tenLoi: string;
  moTa: string;
  maHeThong?: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  machineId?: string | null;
  faultTemplateId?: string | null;
  mucDo: string;
  trangThai: string;
  nguoiPhatHien: string;
  ngayPhatHien: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
  machine?: { id: string; maMay: string; tenMay: string; trangThai: string } | null;
  faultTemplate?: FaultTemplate | null;
}

export interface FaultRecurrenceRecord {
  id: string;
  maLoi: string;
  ngayPhatHien: string;
  trangThai: string;
  mucDo: string;
  nguoiPhatHien: string;
}

export interface FaultRecurrenceResponse {
  count: number;
  records: FaultRecurrenceRecord[];
  mode: 'template' | 'text';
}

export interface FaultStatsMachine {
  machineSystemId: string;
  tenHeThong: string;
  maHeThong: string;
  count: number;
}

export interface FaultStatsRecurring {
  faultTemplateId: string;
  tenMauLoi: string;
  machineSystemDetailId: string;
  tenChiTiet: string;
  count: number;
  lastSeenAt: string | null;
}

export interface FaultStatsResponse {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  bySeverityByStatus: Record<string, Record<string, number>>;
  last7Days: number;
  last30Days: number;
  thisMonth: number;
  prevMonth: number;
  monthlyTrend: Array<{ month: string; count: number }>;
  recent: { today: FaultRecord[]; thisWeek: FaultRecord[] };
  topMachines: FaultStatsMachine[];
  topRecurring: FaultStatsRecurring[];
  mttrDays: number | null;
}

export interface FaultHeatmapCell {
  machineSystemId: string;
  tenHeThong: string;
  faultTemplateId: string;
  tenMauLoi: string;
  count: number;
}

export type FaultHeatmapResponse = FaultHeatmapCell[];

export interface CreateFaultRecordRequest {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  machineId?: string;
  faultTemplateId?: string;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien: string;
  ngayPhatHien?: string;
  repairSteps?: RepairStepInput[];
}

export type UpdateFaultRecordRequest = Partial<CreateFaultRecordRequest>;

export interface CreateFaultRecordFromTemplateRequest {
  faultTemplateId: string;
  nguoiPhatHien: string;
  ngayPhatHien?: string;
  trangThai?: string;
  tenLoi?: string;
  moTa?: string;
  mucDo?: string;
}

export interface FaultRecordFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
  mucDo?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultTemplateId?: string;
  sortBy?: 'maLoi' | 'tenLoi' | 'mucDo' | 'trangThai' | 'ngayPhatHien' | 'createdAt';
  sortOrder?: SortOrder;
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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

class FaultRecordService {
  async getAll(filters: FaultRecordFilters = {}): Promise<ApiResponse<FaultRecord[]>> {
    try {
      const params: Record<string, unknown> = {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      };
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      if (filters.mucDo) params.mucDo = filters.mucDo;
      if (filters.machineSystemId) params.machineSystemId = filters.machineSystemId;
      if (filters.machineSystemDetailId) params.machineSystemDetailId = filters.machineSystemDetailId;
      if (filters.faultTemplateId) params.faultTemplateId = filters.faultTemplateId;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      return await apiClient.get<FaultRecord[]>('/fault-records', { params });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy danh sách lỗi'));
    }
  }

  async getById(id: string): Promise<ApiResponse<FaultRecord>> {
    try {
      return await apiClient.get<FaultRecord>(`/fault-records/${id}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Không tìm thấy bản ghi lỗi'));
    }
  }

  async create(data: CreateFaultRecordRequest, file?: File): Promise<ApiResponse<FaultRecord>> {
    try {
      const formData = new FormData();
      appendFormFields(formData, data as Record<string, unknown>);
      if (file) formData.append('file', file);

      return await apiClient.post<FaultRecord>('/fault-records', formData);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi tạo bản ghi lỗi'));
    }
  }

  async createFromTemplate(data: CreateFaultRecordFromTemplateRequest, file?: File): Promise<ApiResponse<FaultRecord>> {
    return this.create(data, file);
  }

  async update(id: string, data: UpdateFaultRecordRequest, file?: File): Promise<ApiResponse<FaultRecord>> {
    try {
      const formData = new FormData();
      appendFormFields(formData, data as Record<string, unknown>);
      if (file) formData.append('file', file);

      return await apiClient.put<FaultRecord>(`/fault-records/${id}`, formData);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật bản ghi lỗi'));
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/fault-records/${id}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa bản ghi lỗi'));
    }
  }

  async getRecurrence(params: { faultTemplateId?: string; machineSystemDetailId?: string; tenLoi?: string }): Promise<ApiResponse<FaultRecurrenceResponse>> {
    try {
      const queryParams: Record<string, string> = {};
      if (params.faultTemplateId) queryParams.faultTemplateId = params.faultTemplateId;
      if (params.machineSystemDetailId) queryParams.machineSystemDetailId = params.machineSystemDetailId;
      if (params.tenLoi) queryParams.tenLoi = params.tenLoi;
      return await apiClient.get<FaultRecurrenceResponse>('/fault-records/recurrence', {
        params: queryParams,
      });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi kiểm tra tái phát'));
    }
  }

  async getStats(machineSystemId?: string): Promise<ApiResponse<FaultStatsResponse>> {
    try {
      const params: Record<string, string> = {};
      if (machineSystemId) params.machineSystemId = machineSystemId;
      return await apiClient.get<FaultStatsResponse>('/fault-records/stats', { params });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy thống kê lỗi'));
    }
  }

  async getHeatmap(machineSystemId?: string): Promise<ApiResponse<FaultHeatmapResponse>> {
    try {
      const params: Record<string, string> = {};
      if (machineSystemId) params.machineSystemId = machineSystemId;
      return await apiClient.get<FaultHeatmapResponse>('/fault-records/heatmap', { params });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy dữ liệu heatmap'));
    }
  }

  async exportExcel(filters: Omit<FaultRecordFilters, 'page' | 'limit'> = {}) {
    try {
      const params: Record<string, unknown> = {};
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      if (filters.mucDo) params.mucDo = filters.mucDo;

      const token = localStorage.getItem('accessToken');
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();
      const response = await fetch(`${API_BASE_URL}/fault-records/export/excel${queryString ? `?${queryString}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Lỗi khi xuất Excel');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-loi-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xuất Excel'));
    }
  }
}

export default new FaultRecordService();
