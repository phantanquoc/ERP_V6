import apiClient, { ApiResponse } from './apiClient';
import type { MachineSystem, MachineSystemDetail, SortOrder } from './machineSystemService';

export interface RepairStep {
  id: string;
  faultTemplateId: string;
  stepNumber: number;
  moTa: string;
  thoiGianUocTinh?: number | null;
  dungCu?: string | null;
  ghiChu?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairStepInput {
  moTa: string;
  thoiGianUocTinh?: number | null;
  dungCu?: string | null;
  ghiChu?: string | null;
}

export interface FaultTemplate {
  id: string;
  maMauLoi: string;
  tenMauLoi: string;
  moTa: string;
  mucDo: string;
  machineSystemId: string;
  machineSystemDetailId: string;
  hoatDong: boolean;
  trangThai: string;
  ghiChu?: string | null;
  fileDinhKem?: string | null;
  createdAt: string;
  updatedAt: string;
  machineSystem?: MachineSystem;
  machineSystemDetail?: MachineSystemDetail;
  _count?: {
    faultRecords: number;
  };
  repairSteps?: RepairStep[];
}

export interface FaultTemplateSummaryRecord {
  id: string;
  maLoi: string;
  tenLoi: string;
  mucDo: string;
  trangThai: string;
  ngayPhatHien: string;
  nguoiPhatHien: string;
  machineSystem?: { tenHeThong: string; maHeThong: string } | null;
  machineSystemDetail?: { tenChiTiet: string } | null;
}

export interface FaultTemplateSummary {
  id: string;
  maMauLoi: string;
  tenMauLoi: string;
  moTa: string;
  mucDo: string;
  hoatDong: boolean;
  trangThai: string;
  ghiChu?: string | null;
  createdAt: string;
  updatedAt: string;
  repairSteps: RepairStep[];
  totalRecords: number;
  recentRecords: FaultTemplateSummaryRecord[];
  monthlyTimeline: Array<{ month: string; count: number }>;
}

export interface FaultTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  mucDo?: string;
  trangThai?: string;
  hoatDong?: boolean;
  activeOnly?: boolean;
  sortBy?: 'maMauLoi' | 'tenMauLoi' | 'mucDo' | 'createdAt' | 'updatedAt';
  sortOrder?: SortOrder;
}

export interface CreateFaultTemplateRequest {
  maMauLoi?: string;
  tenMauLoi: string;
  moTa: string;
  mucDo: string;
  machineSystemId?: string;
  machineSystemDetailId: string;
  hoatDong?: boolean;
  trangThai?: string;
  ghiChu?: string;
  repairSteps?: RepairStepInput[];
}

export type UpdateFaultTemplateRequest = Partial<CreateFaultTemplateRequest>;

const appendFormFields = (formData: FormData, data: Record<string, unknown>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'repairSteps') {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, value === null ? '' : String(value));
  });
};

class FaultTemplateService {
  async getAll(filters: FaultTemplateFilters = {}): Promise<ApiResponse<FaultTemplate[]>> {
    return apiClient.get<FaultTemplate[]>('/fault-templates', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        machineSystemId: filters.machineSystemId,
        machineSystemDetailId: filters.machineSystemDetailId,
        mucDo: filters.mucDo,
        trangThai: filters.trangThai,
        hoatDong: filters.hoatDong,
        activeOnly: filters.activeOnly,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    });
  }

  async getById(id: string): Promise<ApiResponse<FaultTemplate>> {
    return apiClient.get<FaultTemplate>(`/fault-templates/${id}`);
  }

  async getSummary(id: string): Promise<ApiResponse<FaultTemplateSummary>> {
    return apiClient.get<FaultTemplateSummary>(`/fault-templates/${id}/summary`);
  }

  async create(data: CreateFaultTemplateRequest, file?: File): Promise<ApiResponse<FaultTemplate>> {
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<FaultTemplate>('/fault-templates', formData);
  }

  async update(id: string, data: UpdateFaultTemplateRequest, file?: File): Promise<ApiResponse<FaultTemplate>> {
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<FaultTemplate>(`/fault-templates/${id}`, formData);
  }

  async deactivate(id: string): Promise<ApiResponse<FaultTemplate>> {
    return apiClient.patch<FaultTemplate>(`/fault-templates/${id}/deactivate`, {});
  }

  async delete(id: string): Promise<ApiResponse<FaultTemplate>> {
    return apiClient.delete<FaultTemplate>(`/fault-templates/${id}`);
  }
}

export default new FaultTemplateService();
