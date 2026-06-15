import apiClient from './apiClient';

export interface MaintenanceRecord {
  id: string;
  maBienBan: string;
  maintenancePlanId: string | null;
  machineSystemId: string;
  machineSystemDetailId: string;
  loai: string;
  noiDung: string;
  tinhTrangTruoc: string;
  tinhTrangSau: string;
  deXuat: string | null;
  thoiGianThucHien: string | null;
  ngayThucHien: string;
  nguoiThucHien: string;
  fileDinhKem: string | null;
  createdAt: string;
  updatedAt: string;
  machineSystem?: { id: string; maHeThong: string; tenHeThong: string; khuVuc: string };
  machineSystemDetail?: { id: string; maChiTiet: string; tenChiTiet: string };
  maintenancePlan?: { id: string; maKeHoach: string } | null;
}

export interface CreateMaintenanceRecordRequest {
  maintenancePlanId?: string;
  machineSystemId: string;
  machineSystemDetailId: string;
  loai: string;
  noiDung: string;
  tinhTrangTruoc: string;
  tinhTrangSau: string;
  deXuat?: string;
  thoiGianThucHien?: string;
  ngayThucHien: string;
  nguoiThucHien: string;
}

export type UpdateMaintenanceRecordRequest = Partial<CreateMaintenanceRecordRequest>;

export interface MaintenanceRecordFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  loai?: string;
  maintenancePlanId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

class MaintenanceRecordService {
  async getAll(filters: MaintenanceRecordFilters = {}) {
    return apiClient.get<MaintenanceRecord[]>('/maintenance-records', { params: filters as Record<string, string> });
  }

  async getById(id: string) {
    return apiClient.get<MaintenanceRecord>(`/maintenance-records/${id}`);
  }

  async generateCode() {
    return apiClient.get<{ code: string }>('/maintenance-records/generate-code');
  }

  async create(data: CreateMaintenanceRecordRequest, file?: File) {
    if (file) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append('file', file);
      return apiClient.post<MaintenanceRecord>('/maintenance-records', formData);
    }
    return apiClient.post<MaintenanceRecord>('/maintenance-records', data);
  }

  async update(id: string, data: UpdateMaintenanceRecordRequest, file?: File) {
    if (file) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append('file', file);
      return apiClient.put<MaintenanceRecord>(`/maintenance-records/${id}`, formData);
    }
    return apiClient.put<MaintenanceRecord>(`/maintenance-records/${id}`, data);
  }

  async delete(id: string) {
    return apiClient.delete<void>(`/maintenance-records/${id}`);
  }

  async exportExcel(filters: MaintenanceRecordFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value));
    });
    const url = `/maintenance-records/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<Blob>(url, { responseType: 'blob' } as any);
  }
}

export default new MaintenanceRecordService();
