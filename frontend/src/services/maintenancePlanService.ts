import apiClient, { ApiResponse } from './apiClient';

export interface MaintenancePlanItemLog {
  id: string;
  maintenancePlanItemId: string;
  thang: number;
  lanThu: number;
  hoanThanh: boolean;
  ghiChu: string | null;
  ngayThucHien: string | null;
  nguoiThucHien: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePlanItem {
  id: string;
  maintenancePlanId: string;
  machineSystemDetailId: string;
  maintenanceTemplateId: string | null;
  noiDung: string;
  tanSuat: string;
  toThucHien: string;
  soLuong: number;
  thangBatDau: number;
  createdAt: string;
  updatedAt: string;
  machineSystemDetail?: { id: string; maChiTiet: string; tenChiTiet: string; hoatDong?: boolean; parentDetailId?: string | null; loaiChiTiet?: string };
  maintenanceTemplate?: { id: string; noiDung: string } | null;
  logs?: MaintenancePlanItemLog[];
}

export interface MaintenancePlan {
  id: string;
  maKeHoach: string;
  machineSystemId: string;
  nam: number;
  nguoiLap: string;
  ngayLap: string;
  ghiChu: string | null;
  trangThai: string;
  fileDinhKem: string | null;
  createdAt: string;
  updatedAt: string;
  machineSystem?: { id: string; maHeThong: string; tenHeThong: string; khuVuc: string; viTri: string };
  items?: MaintenancePlanItem[];
  _count?: { records: number };
}

export interface CreatePlanItemRequest {
  id?: string;
  machineSystemDetailId: string;
  maintenanceTemplateId?: string;
  noiDung?: string;
  tanSuat?: string;
  toThucHien?: string;
  soLuong?: number;
  thangBatDau?: number;
}

export interface CreateMaintenancePlanRequest {
  maKeHoach?: string;
  machineSystemId: string;
  nam: number;
  nguoiLap: string;
  ghiChu?: string;
  items?: CreatePlanItemRequest[];
}

export interface UpdateMaintenancePlanRequest {
  nguoiLap?: string;
  ghiChu?: string;
  trangThai?: string;
  items?: CreatePlanItemRequest[];
}

export interface MaintenancePlanFilters {
  page?: number;
  limit?: number;
  machineSystemId?: string;
  nam?: number;
  trangThai?: string;
  search?: string;
}

class MaintenancePlanService {
  async getAll(filters: MaintenancePlanFilters = {}) {
    return apiClient.get<MaintenancePlan[]>('/maintenance-plans', { params: filters as Record<string, string> });
  }

  async getById(id: string) {
    return apiClient.get<MaintenancePlan>(`/maintenance-plans/${id}`);
  }

  async generateCode() {
    return apiClient.get<{ code: string }>('/maintenance-plans/generate-code');
  }

  async create(data: CreateMaintenancePlanRequest, file?: File) {
    if (file) {
      const formData = new FormData();
      formData.append('machineSystemId', data.machineSystemId);
      formData.append('nam', String(data.nam));
      formData.append('nguoiLap', data.nguoiLap);
      if (data.maKeHoach) formData.append('maKeHoach', data.maKeHoach);
      if (data.ghiChu) formData.append('ghiChu', data.ghiChu);
      formData.append('items', JSON.stringify(data.items));
      formData.append('file', file);
      return apiClient.post<MaintenancePlan>('/maintenance-plans', formData);
    }
    return apiClient.post<MaintenancePlan>('/maintenance-plans', data);
  }

  async update(id: string, data: UpdateMaintenancePlanRequest, file?: File) {
    if (file) {
      const formData = new FormData();
      if (data.nguoiLap) formData.append('nguoiLap', data.nguoiLap);
      if (data.ghiChu) formData.append('ghiChu', data.ghiChu);
      if (data.trangThai) formData.append('trangThai', data.trangThai);
      if (data.items) formData.append('items', JSON.stringify(data.items));
      formData.append('file', file);
      return apiClient.put<MaintenancePlan>(`/maintenance-plans/${id}`, formData);
    }
    return apiClient.put<MaintenancePlan>(`/maintenance-plans/${id}`, data);
  }

  async toggleMonth(planId: string, itemId: string, month: number, lanThu: number = 1, ghiChu?: string, nguoiThucHien?: string) {
    return apiClient.patch<MaintenancePlanItemLog>(`/maintenance-plans/${planId}/items/${itemId}/toggle`, { month, lanThu, ghiChu, nguoiThucHien });
  }

  async updateLogNote(logId: string, data: { ghiChu?: string; nguoiThucHien?: string }) {
    return apiClient.patch<MaintenancePlanItemLog>(`/maintenance-plans/logs/${logId}/note`, data);
  }

  async syncDetails(id: string) {
    return apiClient.post<MaintenancePlan>(`/maintenance-plans/${id}/sync-details`);
  }

  async delete(id: string) {
    return apiClient.delete<void>(`/maintenance-plans/${id}`);
  }
}

export default new MaintenancePlanService();
