import apiClient, { ApiResponse } from './apiClient';

export type MachineSystemDetailType = 'THIET_BI' | 'CUM' | 'LINH_KIEN' | 'DIEM_KIEM_TRA' | 'Thiet bi' | 'Cum' | 'Linh kien' | 'Diem kiem tra';
export type SortOrder = 'asc' | 'desc';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type MachineSystemCategory =
  | 'SAN_XUAT'
  | 'DONG_GOI'
  | 'BAO_QUAN'
  | 'DIEN'
  | 'NUOC'
  | 'HOI'
  | 'KHI_NEN'
  | 'LAM_NONG'
  | 'VAN_CHUYEN'
  | 'PCCC'
  | 'CHAT_THAI'
  | 'KIEM_TRA_CL'
  | 'AN_TOAN'
  | 'KHAC';

export type MachineStatus = 'HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';

export interface MachineSystem {
  id: string;
  khuVuc?: string | null;
  viTri?: string | null;
  maHeThong: string;
  tenHeThong: string;
  chucNang?: string | null;
  loaiHeThong: MachineSystemCategory;
  maThietBi?: string | null;
  tenThietBi?: string | null;
  nhiemVu?: string | null;
  maNguoiThucHien?: string | null;
  nguoiThucHien?: string | null;
  fileDinhKem?: string | null;
  hoatDong: boolean;
  trangThai?: MachineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MachineSystemDetail {
  id: string;
  machineSystemId: string;
  parentDetailId?: string | null;
  loaiChiTiet: MachineSystemDetailType;
  maChiTiet: string;
  tenChiTiet: string;
  viTri?: string | null;
  moTa?: string | null;
  maNguoiPhuTrach?: string | null;
  nguoiPhuTrach?: string | null;
  fileDinhKem?: string | null;
  thuTu: number;
  hoatDong: boolean;
  trangThai: string;
  createdAt: string;
  updatedAt: string;
  machineSystem?: MachineSystem;
  parentDetail?: MachineSystemDetail | null;
  childDetails?: MachineSystemDetail[];
}

export interface MachineSystemFilters {
  page?: number;
  limit?: number;
  search?: string;
  hoatDong?: boolean;
  trangThai?: MachineStatus;
  loaiHeThong?: MachineSystemCategory;
  maHeThongPrefix?: string;
  khuVuc?: string;
  sortBy?: 'maHeThong' | 'tenHeThong' | 'createdAt' | 'updatedAt';
  sortOrder?: SortOrder;
}

export interface MachineSystemDetailFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemId?: string;
  loaiChiTiet?: MachineSystemDetailType;
  hoatDong?: boolean;
  trangThai?: string;
  sortBy?: 'maChiTiet' | 'tenChiTiet' | 'loaiChiTiet' | 'thuTu' | 'createdAt' | 'updatedAt';
  sortOrder?: SortOrder;
}

export interface CreateMachineSystemRequest {
  khuVuc?: string;
  viTri?: string;
  maHeThong: string;
  tenHeThong: string;
  chucNang?: string;
  loaiHeThong: MachineSystemCategory;
  nhiemVu?: string;
  maNguoiThucHien?: string;
  nguoiThucHien?: string;
  hoatDong?: boolean;
}

export type UpdateMachineSystemRequest = Partial<CreateMachineSystemRequest>;

export interface CreateMachineSystemDetailRequest {
  machineSystemId: string;
  parentDetailId?: string | null;
  loaiChiTiet: MachineSystemDetailType;
  maChiTiet: string;
  tenChiTiet: string;
  viTri?: string;
  moTa?: string;
  maNguoiPhuTrach?: string;
  nguoiPhuTrach?: string;
  thuTu?: number;
  hoatDong?: boolean;
  trangThai?: string;
}

export type UpdateMachineSystemDetailRequest = Partial<CreateMachineSystemDetailRequest>;

export interface MachineStatusLog {
  id: string;
  machineSystemId: string;
  trangThaiCu?: string | null;
  trangThaiMoi: MachineStatus;
  nguyenNhan: string;
  nguoiCapNhat: string;
  ghiChu?: string | null;
  thoiDiem: string;
  createdAt: string;
  updatedAt: string;
  machineSystem?: MachineSystem | null;
}

export interface MachineStatusLogFilters {
  machineSystemId?: string;
  trangThaiMoi?: MachineStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CloneMachineSystemRequest {
  maHeThong?: string;
  overrides?: {
    maHeThong?: string;
    tenHeThong?: string;
  };
}

export interface UpdateMachineStatusRequest {
  trangThaiMoi: MachineStatus;
  nguyenNhan: string;
  ghiChu?: string;
}

export interface MachineSystemSummary {
  machine: MachineSystem;
  faultRecords: any[];
  repairItems: any[];
  handoverItems: any[];
  systemOperations: any[];
  maintenanceRecords: any[];
  statusLogs: MachineStatusLog[];
  maintenancePlans: any[];
  finishedProducts: any[];
  qualityEvaluations: any[];
  parentSystem: { id: string; maHeThong: string; tenHeThong: string } | null;
  clonedSystemsCount: number;
}

const appendFormFields = (formData: FormData, data: Record<string, unknown>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    formData.append(key, value === null ? '' : String(value));
  });
};

class MachineSystemService {
  async getMachineSystems(filters: MachineSystemFilters = {}): Promise<ApiResponse<MachineSystem[]>> {
    return apiClient.get<MachineSystem[]>('/machine-systems', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        hoatDong: filters.hoatDong,
        trangThai: filters.trangThai,
        loaiHeThong: filters.loaiHeThong,
        maHeThongPrefix: filters.maHeThongPrefix,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    });
  }

  async getMachineSystemById(id: string): Promise<ApiResponse<MachineSystem>> {
    return apiClient.get<MachineSystem>(`/machine-systems/${id}`);
  }

  async createMachineSystem(data: CreateMachineSystemRequest, file?: File): Promise<ApiResponse<MachineSystem>> {
    const formData = new FormData();
    appendFormFields(formData, data as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<MachineSystem>('/machine-systems', formData);
  }

  async updateMachineSystem(id: string, data: UpdateMachineSystemRequest, file?: File): Promise<ApiResponse<MachineSystem>> {
    const formData = new FormData();
    appendFormFields(formData, data as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<MachineSystem>(`/machine-systems/${id}`, formData);
  }

  async deleteMachineSystem(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/machine-systems/${id}`);
  }

  async getDetails(filters: MachineSystemDetailFilters = {}): Promise<ApiResponse<MachineSystemDetail[]>> {
    return apiClient.get<MachineSystemDetail[]>('/machine-system-details', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        machineSystemId: filters.machineSystemId,
        loaiChiTiet: filters.loaiChiTiet,
        hoatDong: filters.hoatDong,
        trangThai: filters.trangThai,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    });
  }

  async getDetailById(id: string): Promise<ApiResponse<MachineSystemDetail>> {
    return apiClient.get<MachineSystemDetail>(`/machine-system-details/${id}`);
  }

  async createDetail(data: CreateMachineSystemDetailRequest, file?: File): Promise<ApiResponse<MachineSystemDetail>> {
    const formData = new FormData();
    appendFormFields(formData, data as unknown as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<MachineSystemDetail>('/machine-system-details', formData);
  }

  async updateDetail(id: string, data: UpdateMachineSystemDetailRequest, file?: File): Promise<ApiResponse<MachineSystemDetail>> {
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<MachineSystemDetail>(`/machine-system-details/${id}`, formData);
  }

  async deactivateDetail(id: string): Promise<ApiResponse<MachineSystemDetail>> {
    return apiClient.patch<MachineSystemDetail>(`/machine-system-details/${id}/deactivate`, {});
  }

  async deleteDetail(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/machine-system-details/${id}`);
  }

  async getNextCode(loaiHeThong: MachineSystemCategory): Promise<ApiResponse<{ code: string }>> {
    return apiClient.get<{ code: string }>('/machine-systems/generate-code', {
      params: { loaiHeThong },
    });
  }

  async getDistinctFields(): Promise<ApiResponse<{ khuVuc: string[]; viTri: string[] }>> {
    return apiClient.get<{ khuVuc: string[]; viTri: string[] }>('/machine-systems/distinct-fields');
  }

  async getMachinesForSystem(systemId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`/machine-systems/${systemId}/machines`);
  }

  async generateDetailCode(loaiChiTiet: string): Promise<ApiResponse<{ code: string }>> {
    return apiClient.get<{ code: string }>('/machine-system-details/generate-code', {
      params: { loaiChiTiet },
    });
  }

  async getDetailTree(machineSystemId: string): Promise<ApiResponse<MachineSystemDetail[]>> {
    return apiClient.get<MachineSystemDetail[]>('/machine-system-details/tree', {
      params: { machineSystemId },
    });
  }

  async cloneMachineSystem(id: string, data: CloneMachineSystemRequest): Promise<ApiResponse<MachineSystem>> {
    return apiClient.post<MachineSystem>(`/machine-systems/${id}/clone`, data);
  }

  async updateMachineStatus(id: string, data: UpdateMachineStatusRequest): Promise<ApiResponse<MachineSystem>> {
    return apiClient.post<MachineSystem>(`/machine-systems/${id}/status`, data);
  }

  async getMachineSystemSummary(id: string, recentLimit?: number): Promise<ApiResponse<MachineSystemSummary>> {
    return apiClient.get<MachineSystemSummary>(`/machine-systems/${id}/summary`, {
      params: recentLimit !== undefined ? { recentLimit } : undefined,
    });
  }

  async getMachineStatusLogs(filters: MachineStatusLogFilters = {}): Promise<ApiResponse<MachineStatusLog[]>> {
    return apiClient.get<MachineStatusLog[]>('/machine-status-logs', {
      params: {
        machineSystemId: filters.machineSystemId,
        trangThaiMoi: filters.trangThaiMoi,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      },
    });
  }

  /**
   * GET /api/machine-systems/active-production
   * Returns machines eligible for system operations:
   * loaiHeThong = SAN_XUAT (nồi chiên chân không) and trangThai = HOAT_DONG.
   * This is the single source of truth — replaces the old regex-based frontend filter.
   */
  async getActiveProductionMachines(): Promise<ApiResponse<MachineSystem[]>> {
    return apiClient.get<MachineSystem[]>('/machine-systems/active-production');
  }
}

export default new MachineSystemService();
