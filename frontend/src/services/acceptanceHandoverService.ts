import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { MachineSystem, MachineSystemDetail } from './machineSystemService';
import type { RepairRequest, RepairRequestItem } from './repairRequestService';

export interface AcceptanceHandoverItem {
  id: string;
  acceptanceHandoverId: string;
  repairRequestItemId: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  tenHeThong: string;
  tenChiTiet?: string | null;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  ghiChu?: string | null;
  createdAt?: string;
  updatedAt?: string;
  repairRequestItem?: RepairRequestItem;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
}

export interface AcceptanceHandover {
  id: string;
  maNghiemThu: string;
  ngayNghiemThu: string;
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
  repairRequest?: RepairRequest;
  items?: AcceptanceHandoverItem[];
}

export interface AcceptanceHandoverItemInput {
  repairRequestItemId: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  ghiChu?: string;
}

export interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemInput[];
}

export type UpdateAcceptanceHandoverRequest = Partial<CreateAcceptanceHandoverRequest>;

export interface AcceptanceHandoverFilters {
  page?: number;
  limit?: number;
  search?: string;
  repairRequestId?: number;
}

const appendFormFields = (formData: FormData, data: Record<string, unknown>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

class AcceptanceHandoverService {
  async getAllAcceptanceHandovers(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<ApiResponse<AcceptanceHandover[]>> {
    try {
      const params: Record<string, unknown> = { page, limit };
      if (search) {
        params.search = search;
      }

       const response = await apiClient.get<AcceptanceHandover[]>('/acceptance-handovers', { params });
       return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy danh sách nghiệm thu bàn giao'));
    }
  }

  async getAll(filters: AcceptanceHandoverFilters = {}): Promise<ApiResponse<AcceptanceHandover[]>> {
    return this.getAllAcceptanceHandovers(filters.page ?? 1, filters.limit ?? 10, filters.search);
  }

  async getAcceptanceHandoverById(id: string): Promise<ApiResponse<AcceptanceHandover>> {
    try {
       const response = await apiClient.get<AcceptanceHandover>(`/acceptance-handovers/${id}`);
       return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy thông tin nghiệm thu bàn giao'));
    }
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest, file?: File): Promise<ApiResponse<AcceptanceHandover>> {
    try {
      const formData = new FormData();
      appendFormFields(formData, data as Record<string, unknown>);
      if (file) {
        formData.append('file', file);
      }

       const response = await apiClient.post<AcceptanceHandover>('/acceptance-handovers', formData);
       return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi tạo nghiệm thu bàn giao'));
    }
  }

  async updateAcceptanceHandover(id: string, data: UpdateAcceptanceHandoverRequest, file?: File): Promise<ApiResponse<AcceptanceHandover>> {
    try {
      const formData = new FormData();
      appendFormFields(formData, data as Record<string, unknown>);
      if (file) {
        formData.append('file', file);
      }

       const response = await apiClient.put<AcceptanceHandover>(`/acceptance-handovers/${id}`, formData);
       return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật nghiệm thu bàn giao'));
    }
  }

  async deleteAcceptanceHandover(id: string): Promise<ApiResponse<void>> {
    try {
       const response = await apiClient.delete<void>(`/acceptance-handovers/${id}`);
       return response;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa nghiệm thu bàn giao'));
    }
  }

  async generateCode() {
    try {
       const response = await apiClient.get<{ code: string }>('/acceptance-handovers/generate-code');
       return response.data?.code ?? '';
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi tạo mã nghiệm thu bàn giao'));
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
     const url = `${API_BASE_URL}/acceptance-handovers/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-nghiem-thu-ban-giao-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new AcceptanceHandoverService();
