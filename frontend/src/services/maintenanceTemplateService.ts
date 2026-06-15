import apiClient, { ApiResponse } from './apiClient';

export interface MaintenanceTemplate {
  id: string;
  machineSystemDetailId: string | null;
  noiDung: string;
  tanSuat: string;
  toThucHien: string;
  hoatDong: boolean;
  createdAt: string;
  updatedAt: string;
  machineSystemDetail?: { id: string; maChiTiet: string; tenChiTiet: string; machineSystemId: string } | null;
}

export interface CreateMaintenanceTemplateRequest {
  machineSystemDetailId?: string;
  noiDung: string;
  tanSuat?: string;
  toThucHien?: string;
}

export type UpdateMaintenanceTemplateRequest = Partial<CreateMaintenanceTemplateRequest> & { hoatDong?: boolean };

export interface MaintenanceTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  machineSystemDetailId?: string;
  machineSystemId?: string;
  hoatDong?: boolean;
}

class MaintenanceTemplateService {
  async getAll(filters: MaintenanceTemplateFilters = {}) {
    return apiClient.get<MaintenanceTemplate[]>('/maintenance-templates', { params: filters as Record<string, string> });
  }

  async getById(id: string) {
    return apiClient.get<MaintenanceTemplate>(`/maintenance-templates/${id}`);
  }

  async create(data: CreateMaintenanceTemplateRequest) {
    return apiClient.post<MaintenanceTemplate>('/maintenance-templates', data);
  }

  async update(id: string, data: UpdateMaintenanceTemplateRequest) {
    return apiClient.put<MaintenanceTemplate>(`/maintenance-templates/${id}`, data);
  }

  async delete(id: string) {
    return apiClient.delete<void>(`/maintenance-templates/${id}`);
  }
}

export default new MaintenanceTemplateService();
